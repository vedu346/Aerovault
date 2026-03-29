import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

type ExternalFlight = {
  flight?: {
    iata?: string | null;
    icao?: string | null;
  } | null;
  departure?: {
    airport?: string | null;
    iata?: string | null;
    scheduled?: string | null;
    estimated?: string | null;
    actual?: string | null;
  } | null;
  arrival?: {
    airport?: string | null;
    iata?: string | null;
    scheduled?: string | null;
    estimated?: string | null;
    actual?: string | null;
  } | null;
  flight_status?: string | null;
};

type NormalizedFlight = {
  flight_number: string;
  source: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  status: string;
};

function isAuthorized(req: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const syncSecret = process.env.FLIGHT_SYNC_SECRET;
  const headerSecret = req.headers.get("x-sync-secret");
  if (syncSecret && headerSecret === syncSecret) {
    return true;
  }

  return false;
}

function toIso(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function mapStatus(value?: string | null) {
  const status = (value || "").toLowerCase();
  if (status.includes("cancel")) return "cancelled";
  if (status.includes("delay")) return "delayed";
  return "scheduled";
}

function normalizeExternalFlight(item: ExternalFlight): NormalizedFlight | null {
  const flightNumber = item.flight?.iata || item.flight?.icao;
  const source = item.departure?.airport || item.departure?.iata;
  const destination = item.arrival?.airport || item.arrival?.iata;
  const departureIso = toIso(item.departure?.scheduled || item.departure?.estimated || item.departure?.actual);
  const arrivalIso = toIso(item.arrival?.scheduled || item.arrival?.estimated || item.arrival?.actual);

  if (!flightNumber || !source || !destination || !departureIso || !arrivalIso) {
    return null;
  }

  return {
    flight_number: String(flightNumber).toUpperCase().trim(),
    source: String(source).trim(),
    destination: String(destination).trim(),
    departure_time: departureIso,
    arrival_time: arrivalIso,
    status: mapStatus(item.flight_status),
  };
}

function buildKey(flightNumber: string, departureTime: string) {
  return `${flightNumber.toUpperCase()}|${departureTime.slice(0, 10)}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized sync request" }, { status: 401 });
  }

  const aviationKey = process.env.AVIATION_STACK_KEY;
  if (!aviationKey) {
    return NextResponse.json({ error: "AVIATION_STACK_KEY is missing" }, { status: 500 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is missing, sync cannot write to DB" },
      { status: 500 }
    );
  }

  const url = new URL("http://api.aviationstack.com/v1/flights");
  url.searchParams.set("access_key", aviationKey);
  url.searchParams.set("limit", "100");
  url.searchParams.set("flight_status", "scheduled");

  const externalResponse = await fetch(url.toString(), { cache: "no-store" });
  if (!externalResponse.ok) {
    const text = await externalResponse.text();
    return NextResponse.json(
      { error: `AviationStack failed: ${externalResponse.status}`, details: text.slice(0, 400) },
      { status: 502 }
    );
  }

  const externalPayload = await externalResponse.json();
  const externalItems = Array.isArray(externalPayload?.data) ? (externalPayload.data as ExternalFlight[]) : [];

  const normalizedMap = new Map<string, NormalizedFlight>();
  for (const item of externalItems) {
    const normalized = normalizeExternalFlight(item);
    if (!normalized) continue;
    normalizedMap.set(buildKey(normalized.flight_number, normalized.departure_time), normalized);
  }

  const normalizedFlights = Array.from(normalizedMap.values());
  if (!normalizedFlights.length) {
    return NextResponse.json({
      synced: false,
      reason: "No valid flights returned by external API",
      sourceCount: externalItems.length,
    });
  }

  const flightNumbers = Array.from(new Set(normalizedFlights.map((flight) => flight.flight_number)));

  const existingResponse = await admin
    .from("flights")
    .select("id, flight_number, departure_time, airline_id, available_seats, total_seats")
    .in("flight_number", flightNumbers);

  if (existingResponse.error) {
    return NextResponse.json(
      { error: "Failed reading existing flights", details: existingResponse.error.message },
      { status: 500 }
    );
  }

  const existingByKey = new Map<string, any>();
  for (const existing of existingResponse.data || []) {
    if (!existing?.flight_number || !existing?.departure_time) continue;
    existingByKey.set(buildKey(existing.flight_number, existing.departure_time), existing);
  }

  let defaultAirlineId = process.env.SYNC_AIRLINE_ID || null;
  if (!defaultAirlineId) {
    const fromExisting = (existingResponse.data || []).find((flight) => flight?.airline_id)?.airline_id;
    if (fromExisting) {
      defaultAirlineId = fromExisting;
    }
  }

  if (!defaultAirlineId) {
    const airlineUserResponse = await admin
      .from("users")
      .select("airline_id")
      .eq("role", "flight_company")
      .not("airline_id", "is", null)
      .limit(1)
      .single();

    if (!airlineUserResponse.error) {
      defaultAirlineId = airlineUserResponse.data?.airline_id || null;
    }
  }

  const defaultPrice = Number.parseFloat(process.env.SYNC_DEFAULT_PRICE || "5000");
  const defaultSeats = Number.parseInt(process.env.SYNC_DEFAULT_SEATS || "180", 10);

  let updated = 0;
  let inserted = 0;
  let skippedNoAirline = 0;
  const errors: string[] = [];

  for (const flight of normalizedFlights) {
    const key = buildKey(flight.flight_number, flight.departure_time);
    const existing = existingByKey.get(key);

    if (existing?.id) {
      const { error } = await admin
        .from("flights")
        .update({
          source: flight.source,
          destination: flight.destination,
          departure_time: flight.departure_time,
          arrival_time: flight.arrival_time,
          status: flight.status,
        })
        .eq("id", existing.id);

      if (error) {
        errors.push(`update ${flight.flight_number}: ${error.message}`);
      } else {
        updated += 1;
      }

      continue;
    }

    if (!defaultAirlineId) {
      skippedNoAirline += 1;
      continue;
    }

    const { error } = await admin.from("flights").insert({
      airline_id: defaultAirlineId,
      flight_number: flight.flight_number,
      source: flight.source,
      destination: flight.destination,
      departure_time: flight.departure_time,
      arrival_time: flight.arrival_time,
      price: Number.isFinite(defaultPrice) ? defaultPrice : 5000,
      total_seats: Number.isFinite(defaultSeats) ? defaultSeats : 180,
      available_seats: Number.isFinite(defaultSeats) ? defaultSeats : 180,
      meal_available: true,
      status: flight.status,
    });

    if (error) {
      errors.push(`insert ${flight.flight_number}: ${error.message}`);
    } else {
      inserted += 1;
    }
  }

  return NextResponse.json({
    synced: true,
    sourceCount: externalItems.length,
    normalizedCount: normalizedFlights.length,
    updated,
    inserted,
    skippedNoAirline,
    errorCount: errors.length,
    errors: errors.slice(0, 20),
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
