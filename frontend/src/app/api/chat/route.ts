import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { generateInvoiceNumber, generateTicketId } from "@/utils/generate-ids";
import { createAdminClient } from "@/utils/supabase/admin";

type ChatMessage = {
  sender: "user" | "bot" | "aiva";
  text: string;
};

type KnowledgeItem = {
  id: string;
  question: string;
  answer: string;
  category: string;
};

type CurrentUserContext = {
  authUser: any | null;
  profile: any | null;
  bookings: any[];
};

type CachedResponse = {
  reply: string;
  expiresAt: number;
};

type Language = "en" | "hi";

type ReplyResult = {
  reply: string;
  usedModel: boolean;
  matchedKnowledge: KnowledgeItem[];
  language: Language;
  bookingCreated: boolean;
};

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "Asia/Kolkata";
const MAX_HISTORY_MESSAGES = 8;
const MAX_CONTEXT_FLIGHTS = 10;
const CACHE_TTL_MS = 2 * 60 * 1000;

const SYSTEM_PROMPT = `
You are AIVA (AeroVault Intelligent Virtual Assistant).
You are professional, concise, helpful, and customer-first.
Aerovault itself is the flight search and booking platform.
Never direct users to external websites or third-party booking apps.
When users ask for flights, availability, or booking, guide them to complete it inside Aerovault.
Always prioritize grounded data provided in context over assumptions.
If a requested value is unknown, say that clearly and offer the next best step.
Keep responses compact and actionable.
`;

const globalForCache = globalThis as typeof globalThis & {
  __aivaResponseCache?: Map<string, CachedResponse>;
};

const responseCache = globalForCache.__aivaResponseCache ?? new Map<string, CachedResponse>();
globalForCache.__aivaResponseCache = responseCache;

function pick(lang: Language, english: string, hindi: string) {
  return lang === "hi" ? hindi : english;
}

function getNowContext() {
  const now = new Date();

  return {
    iso: now.toISOString(),
    date: new Intl.DateTimeFormat("en-IN", {
      timeZone: APP_TIMEZONE,
      dateStyle: "full",
    }).format(now),
    time: new Intl.DateTimeFormat("en-IN", {
      timeZone: APP_TIMEZONE,
      timeStyle: "medium",
    }).format(now),
    timezone: APP_TIMEZONE,
  };
}

function formatDateTime(value?: string | null) {
  if (!value) return "N/A";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: APP_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function isHindiText(text: string) {
  return /[\u0900-\u097F]/.test(text);
}

function detectPreferredLanguage(messages: ChatMessage[]) {
  const userMessages = [...messages]
    .reverse()
    .filter((message) => message.sender === "user" && message.text?.trim());

  for (const message of userMessages) {
    const text = message.text.toLowerCase();
    if (text.includes("english") || text.includes("अंग्रेजी") || text.includes("अंग्रेज़ी")) {
      return "en" as const;
    }
    if (text.includes("hindi") || text.includes("हिंदी") || text.includes("हिन्दी")) {
      return "hi" as const;
    }
    if (isHindiText(message.text)) {
      return "hi" as const;
    }
  }

  return "en" as const;
}

function normalizeMessages(messages: ChatMessage[]) {
  return messages
    .filter((message) => typeof message?.text === "string" && message.text.trim())
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => ({
      role: message.sender === "user" ? "user" : "assistant",
      content: message.text.trim().slice(0, 1000),
    }));
}

function normalizeDigits(text: string) {
  const hindiDigits = "०१२३४५६७८९";
  return text.replace(/[०-९]/g, (digit) => String(hindiDigits.indexOf(digit)));
}

function includesAny(text: string, tokens: string[]) {
  return tokens.some((token) => text.includes(token));
}

function sanitizeRoutePart(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[^a-z\u0900-\u097F]+|[^a-z\u0900-\u097F]+$/gi, "")
    .trim();
}

function extractSearchTerms(message: string) {
  return Array.from(
    new Set(
      message
        .toLowerCase()
        .split(/[^a-z0-9\u0900-\u097F]+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 3)
    )
  ).slice(0, 6);
}

function detectIntent(message: string) {
  const text = normalizeDigits(message.toLowerCase());

  const asksTimeOrDate = includesAny(text, [
    "time",
    "date",
    "today",
    "right now",
    "current time",
    "current date",
    "what day",
    "समय",
    "टाइम",
    "तारीख",
    "आज",
    "दिन",
  ]);

  const asksBookings = includesAny(text, [
    "my booking",
    "my bookings",
    "my ticket",
    "my tickets",
    "booked",
    "reservation",
    "मेरी बुकिंग",
    "मेरे टिकट",
    "मेरा टिकट",
    "आरक्षण",
  ]);

  const asksProfile = includesAny(text, [
    "my profile",
    "my account",
    "who am i",
    "my role",
    "my email",
    "मेरा प्रोफाइल",
    "मेरी प्रोफाइल",
    "मेरा अकाउंट",
    "मेरा रोल",
    "मेरा ईमेल",
  ]);

  const asksFlightStatus = includesAny(text, [
    "flight status",
    "status of",
    "is flight",
    "delayed",
    "cancelled",
    "canceled",
    "फ्लाइट स्टेटस",
    "स्थिति",
    "देरी",
    "रद्द",
    "कैंसल",
  ]);

  const asksFlights = includesAny(text, [
    "flight",
    "flights",
    "search",
    "available",
    "travel",
    "trip",
    "from ",
    " to ",
    " se ",
    " tak ",
    "jana",
    "jaana",
    "cheapest",
    "उड़ान",
    "फ्लाइट",
    "उपलब्ध",
    "सस्ती",
    "से ",
    " तक",
  ]);

  const asksBookAction = includesAny(text, [
    "book",
    "reserve",
    "booking",
    "बुक",
    "टिकट बुक",
    "बुकिंग",
    "आरक्षित",
    "बुक कर",
    "बुक करो",
  ]);

  const greetingOnly = /^(hi|hello|hey|yo|hola|नमस्ते|नमस्कार|हेलो)\b/.test(text.trim());

  return {
    asksTimeOrDate,
    asksBookings,
    asksProfile,
    asksFlightStatus,
    asksFlights,
    asksBookAction,
    greetingOnly,
  };
}

function extractFlightNumber(text: string) {
  const match = normalizeDigits(text.toUpperCase()).match(/\b[A-Z]{1,3}\d{1,4}\b/);
  return match?.[0] ?? null;
}

function extractPassengerCount(text: string) {
  const normalized = normalizeDigits(text.toLowerCase());
  const explicit = normalized.match(
    /(\d+)\s*(passenger|passengers|ticket|tickets|seat|seats|यात्री|टिकट|सीट)/i
  );

  if (explicit) {
    const value = Number.parseInt(explicit[1], 10);
    if (!Number.isNaN(value)) {
      return Math.min(Math.max(value, 1), 9);
    }
  }

  const generic = normalized.match(/\b(\d+)\b/);
  if (generic) {
    const value = Number.parseInt(generic[1], 10);
    if (!Number.isNaN(value)) {
      return Math.min(Math.max(value, 1), 9);
    }
  }

  return 1;
}

function extractRoute(text: string) {
  const fromTo = text.match(
    /\bfrom\s+([a-z\u0900-\u097F\s]+?)\s+to\s+([a-z\u0900-\u097F\s]+?)(?:\s+(?:on|for|at|by|with|tonight|today|tomorrow|aaj|kal)\b|$)/i
  );
  if (fromTo) {
    return {
      source: sanitizeRoutePart(fromTo[1]),
      destination: sanitizeRoutePart(fromTo[2]),
    };
  }

  const hindiRoute = text.match(
    /([\u0900-\u097Fa-z\s]+?)\s+से\s+([\u0900-\u097Fa-z\s]+?)(?:\s+(?:तक|जाना)\b|$)/i
  );
  if (hindiRoute) {
    return {
      source: sanitizeRoutePart(hindiRoute[1]),
      destination: sanitizeRoutePart(hindiRoute[2]),
    };
  }

  const romanizedHindiRoute = text.match(
    /\b([a-z\s]+?)\s+se\s+([a-z\s]+?)(?:\s+(?:tak|jana|jaana|travel|trip|flight|flights)(?:\s+hai)?\b|$)/i
  );
  if (romanizedHindiRoute) {
    return {
      source: sanitizeRoutePart(romanizedHindiRoute[1]),
      destination: sanitizeRoutePart(romanizedHindiRoute[2]),
    };
  }

  const generic = text.match(/\b([a-z\u0900-\u097F\s]{3,})\s+to\s+([a-z\u0900-\u097F\s]{3,})\b/i);
  if (generic) {
    return {
      source: sanitizeRoutePart(generic[1]),
      destination: sanitizeRoutePart(generic[2]),
    };
  }

  return null;
}

function getLastMentionedRoute(messages: ChatMessage[], skipMessage?: string) {
  const skip = (skipMessage ?? "").trim().toLowerCase();

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.sender !== "user" || !message.text?.trim()) {
      continue;
    }

    const normalizedText = message.text.trim().toLowerCase();
    if (skip && normalizedText === skip) {
      continue;
    }

    const route = extractRoute(normalizeDigits(normalizedText));
    if (route) {
      return route;
    }
  }

  return null;
}

function normalizeLocation(value: string | undefined | null) {
  return (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function filterFlightsByRoute(flights: any[], route: { source: string; destination: string } | null) {
  if (!route) return flights;

  const source = normalizeLocation(route.source);
  const destination = normalizeLocation(route.destination);

  return flights.filter((flight) => {
    const flightSource = normalizeLocation(flight.source);
    const flightDestination = normalizeLocation(flight.destination);

    return flightSource.includes(source) && flightDestination.includes(destination);
  });
}

function buildFlightLine(flight: any) {
  const companyName = flight?.company?.company_name || flight?.airline_name || "Airline";
  const seats =
    typeof flight?.available_seats === "number" && typeof flight?.total_seats === "number"
      ? ` | Seats ${flight.available_seats}/${flight.total_seats}`
      : "";

  return `${flight.flight_number || "N/A"} | ${flight.source || "N/A"} → ${
    flight.destination || "N/A"
  } | ${formatDateTime(flight.departure_time)} | ₹${flight.price ?? "N/A"} | ${
    flight.status || "unknown"
  } | ${companyName}${seats}`;
}

async function findRelevantKnowledge(
  supabase: Awaited<ReturnType<typeof createClient>>,
  query: string
) {
  const terms = extractSearchTerms(query);

  if (!terms.length) {
    return [] as KnowledgeItem[];
  }

  const orFilter = terms
    .map((term) => `question.ilike.%${term}%,answer.ilike.%${term}%,category.ilike.%${term}%`)
    .join(",");

  const { data, error } = await supabase
    .from("ai_knowledge")
    .select("id, question, answer, category")
    .or(orFilter)
    .limit(5);

  if (error) {
    console.error("Knowledge lookup failed:", error);
    return [];
  }

  return (data ?? []) as KnowledgeItem[];
}

async function loadCurrentUserContext(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<CurrentUserContext> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      authUser: null,
      profile: null,
      bookings: [],
    };
  }

  const [profileResponse, bookingsResponse] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id).single(),
    supabase
      .from("bookings")
      .select(`
        id,
        status,
        total_price,
        booking_date,
        seats,
        ticket_id,
        invoice_number,
        flights (
          id,
          flight_number,
          source,
          destination,
          departure_time,
          arrival_time,
          status,
          price
        )
      `)
      .eq("user_id", user.id)
      .order("booking_date", { ascending: false })
      .limit(5),
  ]);

  return {
    authUser: user,
    profile: profileResponse.data ?? null,
    bookings: bookingsResponse.data ?? [],
  };
}

async function loadFlightsContext(supabase: Awaited<ReturnType<typeof createClient>>) {
  const nowIso = new Date().toISOString();

  let { data, error } = await supabase
    .from("flights")
    .select("*, company:flight_companies(company_name)")
    .gte("departure_time", nowIso)
    .order("departure_time", { ascending: true })
    .limit(30);

  if (error) {
    console.error("Upcoming flights query failed:", error);
    const fallback = await supabase
      .from("flights")
      .select("*, company:flight_companies(company_name)")
      .order("created_at", { ascending: false })
      .limit(30);

    data = fallback.data ?? [];
    error = fallback.error;
  }

  if (error) {
    console.error("Flights context query failed:", error);
  }

  return (data ?? []) as any[];
}

function buildBookingsReply(userContext: CurrentUserContext, lang: Language) {
  if (!userContext.authUser) {
    return pick(
      lang,
      "You are not logged in right now, so I cannot read your bookings. Please sign in and ask again.",
      "आप अभी लॉग इन नहीं हैं, इसलिए मैं आपकी बुकिंग नहीं पढ़ सकता। कृपया लॉग इन करके फिर पूछें।"
    );
  }

  if (!userContext.bookings.length) {
    return pick(
      lang,
      "I checked your account and you currently have no bookings.",
      "मैंने आपका अकाउंट देखा और अभी कोई बुकिंग नहीं मिली।"
    );
  }

  const lines = userContext.bookings.slice(0, 5).map((booking: any, index) => {
    const flight = booking?.flights || {};
    return `${index + 1}. ${flight.flight_number || "N/A"} (${flight.source || "N/A"} → ${
      flight.destination || "N/A"
    }) | ${booking.status || "unknown"} | ${pick(lang, "Depart", "प्रस्थान")} ${formatDateTime(
      flight.departure_time
    )} | ₹${booking.total_price ?? "N/A"} | ${pick(lang, "Ticket", "टिकट")} ${
      booking.ticket_id || "N/A"
    }`;
  });

  return `${pick(lang, "Here are your latest bookings:", "आपकी हाल की बुकिंग्स:")}\n${lines.join("\n")}`;
}

function buildProfileReply(userContext: CurrentUserContext, lang: Language) {
  if (!userContext.authUser) {
    return pick(
      lang,
      "You are not logged in right now, so I cannot load profile details.",
      "आप अभी लॉग इन नहीं हैं, इसलिए मैं प्रोफाइल विवरण नहीं ला सकता।"
    );
  }

  const metadata = userContext.authUser.user_metadata || {};
  const fullName = userContext.profile?.full_name || metadata.full_name || pick(lang, "Not set", "सेट नहीं");
  const role = userContext.profile?.role || "unknown";
  const email = userContext.authUser.email || pick(lang, "Not available", "उपलब्ध नहीं");
  const joined = formatDateTime(userContext.authUser.created_at || null);

  return pick(
    lang,
    `I can see this profile data:\n- Name: ${fullName}\n- Email: ${email}\n- Role: ${role}\n- Account created: ${joined}`,
    `मुझे यह प्रोफाइल जानकारी दिख रही है:\n- नाम: ${fullName}\n- ईमेल: ${email}\n- रोल: ${role}\n- अकाउंट बनाया गया: ${joined}`
  );
}

function buildTimeReply(lang: Language) {
  const now = getNowContext();
  return pick(
    lang,
    `Current date/time (${now.timezone}): ${now.date}, ${now.time}.`,
    `अभी की तारीख/समय (${now.timezone}): ${now.date}, ${now.time}।`
  );
}

function buildFlightsReply(
  message: string,
  flights: any[],
  lang: Language,
  fallbackRoute?: { source: string; destination: string } | null
) {
  if (!flights.length) {
    return pick(
      lang,
      "I currently have no flight records available.",
      "मेरे पास अभी कोई फ्लाइट रिकॉर्ड उपलब्ध नहीं है।"
    );
  }

  const text = normalizeDigits(message.toLowerCase());
  const route = extractRoute(text) ?? fallbackRoute ?? null;
  let filtered = filterFlightsByRoute(flights, route);

  if (!filtered.length && route) {
    return pick(
      lang,
      `I could not find flights for "${route.source} to ${route.destination}" right now. Try nearby city names or ask for all upcoming flights.`,
      `"${route.source} से ${route.destination}" के लिए अभी कोई फ्लाइट नहीं मिली। पास के शहर के नाम से कोशिश करें या सभी upcoming flights पूछें।`
    );
  }

  if (includesAny(text, ["cheapest", "lowest price", "lowest fare", "cheap", "सस्ती", "सबसे सस्ती"])) {
    filtered = [...filtered].sort(
      (a, b) => (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER)
    );
  }

  const selected = filtered.slice(0, 6);
  const lines = selected.map((flight, index) => `${index + 1}. ${buildFlightLine(flight)}`);

  const prefix = route
    ? pick(
        lang,
        `Found ${filtered.length} matching flight(s) for ${route.source} → ${route.destination}.`,
        `${route.source} → ${route.destination} के लिए ${filtered.length} matching flight मिलीं।`
      )
    : pick(lang, `Here are ${selected.length} upcoming flight option(s).`, `यह ${selected.length} upcoming flight options हैं।`);

  return `${prefix}\n${lines.join("\n")}`;
}

function buildFlightStatusReply(message: string, flights: any[], lang: Language) {
  const flightNumber = extractFlightNumber(message);
  if (!flightNumber) {
    return null;
  }

  const flight = flights.find(
    (item) => String(item?.flight_number || "").toUpperCase() === flightNumber
  );

  if (!flight) {
    return pick(
      lang,
      `I could not find flight ${flightNumber} in current records.`,
      `मुझे अभी के रिकॉर्ड में फ्लाइट ${flightNumber} नहीं मिली।`
    );
  }

  return pick(
    lang,
    `Status for ${flightNumber}: ${flight.status || "unknown"}.\nRoute: ${flight.source} → ${
      flight.destination
    }\nDeparture: ${formatDateTime(flight.departure_time)}\nArrival: ${formatDateTime(
      flight.arrival_time
    )}`,
    `${flightNumber} की स्थिति: ${flight.status || "unknown"}\nरूट: ${flight.source} → ${
      flight.destination
    }\nप्रस्थान: ${formatDateTime(flight.departure_time)}\nआगमन: ${formatDateTime(flight.arrival_time)}`
  );
}

function buildCompactUserContext(userContext: CurrentUserContext) {
  if (!userContext.authUser) {
    return "User is not logged in.";
  }

  const metadata = userContext.authUser.user_metadata || {};
  const fullName = userContext.profile?.full_name || metadata.full_name || "unknown";
  const role = userContext.profile?.role || "unknown";
  const email = userContext.authUser.email || "unknown";
  const bookingCount = userContext.bookings.length;

  return `User: ${fullName} | Email: ${email} | Role: ${role} | Recent bookings: ${bookingCount}`;
}

function buildCompactBookingsContext(bookings: any[]) {
  if (!bookings.length) {
    return "No recent bookings.";
  }

  return bookings
    .slice(0, 5)
    .map((booking: any, index) => {
      const flight = booking?.flights || {};
      return `${index + 1}. ${flight.flight_number || "N/A"} ${flight.source || "N/A"}→${
        flight.destination || "N/A"
      } | ${booking.status || "unknown"} | ${formatDateTime(flight.departure_time)} | ₹${
        booking.total_price ?? "N/A"
      }`;
    })
    .join("\n");
}

function buildCompactFlightsContext(flights: any[]) {
  if (!flights.length) {
    return "No flights currently available.";
  }

  return flights
    .slice(0, MAX_CONTEXT_FLIGHTS)
    .map((flight, index) => `${index + 1}. ${buildFlightLine(flight)}`)
    .join("\n");
}

function containsExternalBookingReferral(text: string) {
  const normalized = text.toLowerCase();
  return includesAny(normalized, [
    "google flights",
    "skyscanner",
    "makemytrip",
    "cleartrip",
    "expedia",
    "kayak",
    "travel agency",
    "other app",
    "another app",
    "other website",
    "airline website",
  ]);
}

function buildKnowledgeContext(items: KnowledgeItem[]) {
  if (!items.length) {
    return "No relevant custom knowledge found.";
  }

  return items
    .map(
      (item, index) =>
        `${index + 1}. Category: ${item.category || "general"}\nQ: ${item.question}\nA: ${item.answer}`
    )
    .join("\n\n");
}

async function callOpenAI(
  messages: ChatMessage[],
  knowledgeItems: KnowledgeItem[],
  userContext: CurrentUserContext,
  flights: any[],
  language: Language
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return pick(
      language,
      "I can still help with live flights, your bookings, and profile details inside Aerovault. For open-ended questions, AI text generation is currently unavailable.",
      "मैं Aerovault के अंदर live flights, आपकी bookings और profile details में मदद कर सकता हूं। Open-ended सवालों के लिए AI text generation अभी उपलब्ध नहीं है।"
    );
  }

  const nowContext = getNowContext();
  const knowledgeContext = buildKnowledgeContext(knowledgeItems);
  const userContextSummary = buildCompactUserContext(userContext);
  const bookingsSummary = buildCompactBookingsContext(userContext.bookings);
  const flightsSummary = buildCompactFlightsContext(flights);
  const languageDirective =
    language === "hi"
      ? "Always respond in Hindi (Devanagari script), unless user explicitly asks for English."
      : "Respond in English unless user asks for Hindi.";

  const completionMessages = [
    {
      role: "system",
      content: `${SYSTEM_PROMPT}
${languageDirective}

Product constraints:
- Aerovault itself is the booking product.
- Do not redirect users to external apps or websites.
- If user asks to search/book flights, keep guidance inside Aerovault.

Current date/time:
- Date: ${nowContext.date}
- Time: ${nowContext.time}
- Timezone: ${nowContext.timezone}
- ISO: ${nowContext.iso}

Current logged-in user context:
${userContextSummary}

Recent user bookings:
${bookingsSummary}

Current flights data snapshot:
${flightsSummary}

Custom knowledge base:
${knowledgeContext}`,
    },
    ...normalizeMessages(messages),
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 260,
      messages: completionMessages,
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    console.error("OpenAI API error", payload);
    throw new Error(payload?.error?.message || "OpenAI request failed");
  }

  return (
    payload?.choices?.[0]?.message?.content?.trim() ||
    pick(
      language,
      "I can help with that. Could you share a bit more detail?",
      "मैं मदद कर सकता हूं। कृपया थोड़ा और विवरण साझा करें।"
    )
  );
}

function splitName(fullName: string) {
  const cleaned = fullName.trim().replace(/\s+/g, " ");
  if (!cleaned) {
    return {
      firstName: "Passenger",
      lastName: "User",
    };
  }

  const parts = cleaned.split(" ");
  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: "User",
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

type SeatReservationResult =
  | { ok: true; previousAvailable: number }
  | { ok: false; code: "flight_not_found" }
  | { ok: false; code: "not_scheduled"; status: string }
  | { ok: false; code: "insufficient_seats"; available: number }
  | { ok: false; code: "seat_conflict" }
  | { ok: false; code: "invalid_seat_data" };

async function reserveFlightSeats(
  userSupabase: Awaited<ReturnType<typeof createClient>>,
  adminSupabase: ReturnType<typeof createAdminClient>,
  flightId: string,
  seatsNeeded: number
): Promise<SeatReservationResult> {
  const seatClient = adminSupabase ?? userSupabase;

  const flightResponse = await seatClient
    .from("flights")
    .select("id, status, available_seats")
    .eq("id", flightId)
    .single();

  if (flightResponse.error || !flightResponse.data) {
    return { ok: false, code: "flight_not_found" };
  }

  const flightStatus = String(flightResponse.data.status || "unknown").toLowerCase();
  if (flightStatus !== "scheduled") {
    return { ok: false, code: "not_scheduled", status: flightStatus };
  }

  const currentAvailableSeats = Number(flightResponse.data.available_seats);
  if (!Number.isFinite(currentAvailableSeats)) {
    return { ok: false, code: "invalid_seat_data" };
  }

  if (currentAvailableSeats < seatsNeeded) {
    return { ok: false, code: "insufficient_seats", available: currentAvailableSeats };
  }

  const nextAvailableSeats = currentAvailableSeats - seatsNeeded;
  const seatUpdateResponse = await seatClient
    .from("flights")
    .update({ available_seats: nextAvailableSeats })
    .eq("id", flightId)
    .eq("available_seats", currentAvailableSeats)
    .select("id");

  if (
    seatUpdateResponse.error ||
    !seatUpdateResponse.data ||
    seatUpdateResponse.data.length === 0
  ) {
    return { ok: false, code: "seat_conflict" };
  }

  return {
    ok: true,
    previousAvailable: currentAvailableSeats,
  };
}

async function rollbackReservedSeats(
  userSupabase: Awaited<ReturnType<typeof createClient>>,
  adminSupabase: ReturnType<typeof createAdminClient>,
  flightId: string,
  previousAvailable: number
) {
  const seatClient = adminSupabase ?? userSupabase;
  const rollback = await seatClient
    .from("flights")
    .update({ available_seats: previousAvailable })
    .eq("id", flightId);

  if (rollback.error) {
    console.error("Seat rollback failed:", rollback.error);
  }
}

async function tryCreateBookingFromMessage(
  message: string,
  lang: Language,
  userContext: CurrentUserContext,
  flights: any[],
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const flightNumber = extractFlightNumber(message);
  if (!flightNumber) {
    return {
      handled: true,
      bookingCreated: false,
      reply: pick(
        lang,
        "To book from chat, share a flight number and passenger count. Example: `Book AI203 for 2 passengers`.",
        "चैट से बुक करने के लिए flight number और passengers बताएं। उदाहरण: `AI203 2 यात्री बुक करो`।"
      ),
    };
  }

  if (!userContext.authUser) {
    return {
      handled: true,
      bookingCreated: false,
      reply: pick(
        lang,
        "Please log in first to book tickets from chat.",
        "चैट से टिकट बुक करने के लिए पहले लॉग इन करें।"
      ),
    };
  }

  let flight =
    flights.find((item) => String(item?.flight_number || "").toUpperCase() === flightNumber) || null;

  if (!flight) {
    const lookup = await supabase
      .from("flights")
      .select("*, company:flight_companies(company_name)")
      .eq("flight_number", flightNumber)
      .single();

    if (lookup.error || !lookup.data) {
      return {
        handled: true,
        bookingCreated: false,
        reply: pick(
          lang,
          `I could not find flight ${flightNumber}. Please verify the flight number.`,
          `मुझे फ्लाइट ${flightNumber} नहीं मिली। कृपया flight number जांचें।`
        ),
      };
    }

    flight = lookup.data;
  }

  const passengerCount = extractPassengerCount(message);
  const adminSupabase = createAdminClient();
  const reservation = await reserveFlightSeats(
    supabase,
    adminSupabase,
    String(flight.id),
    passengerCount
  );

  if (!reservation.ok) {
    if (reservation.code === "flight_not_found") {
      return {
        handled: true,
        bookingCreated: false,
        reply: pick(
          lang,
          `I could not find flight ${flightNumber} in current records.`,
          `मुझे अभी के रिकॉर्ड में फ्लाइट ${flightNumber} नहीं मिली।`
        ),
      };
    }

    if (reservation.code === "not_scheduled") {
      return {
        handled: true,
        bookingCreated: false,
        reply: pick(
          lang,
          `Flight ${flightNumber} is currently ${reservation.status}. Booking is allowed only for scheduled flights.`,
          `फ्लाइट ${flightNumber} की स्थिति अभी ${reservation.status} है। बुकिंग केवल scheduled flights के लिए है।`
        ),
      };
    }

    if (reservation.code === "insufficient_seats") {
      return {
        handled: true,
        bookingCreated: false,
        reply: pick(
          lang,
          `Only ${reservation.available} seats are available on ${flightNumber}, but you asked for ${passengerCount}.`,
          `${flightNumber} में केवल ${reservation.available} सीट उपलब्ध हैं, जबकि आपने ${passengerCount} मांगी हैं।`
        ),
      };
    }

    if (reservation.code === "invalid_seat_data") {
      return {
        handled: true,
        bookingCreated: false,
        reply: pick(
          lang,
          "This flight has invalid seat inventory data. Please contact support.",
          "इस फ्लाइट का seat inventory data गलत है। कृपया support से संपर्क करें।"
        ),
      };
    }

    return {
      handled: true,
      bookingCreated: false,
      reply: pick(
        lang,
        "Seat availability changed while booking. Please try again.",
        "बुकिंग के दौरान seat availability बदल गई। कृपया फिर प्रयास करें।"
      ),
    };
  }

  const totalPrice = (Number(flight.price) || 0) * passengerCount;
  const ticketId = generateTicketId();
  const invoiceNumber = generateInvoiceNumber();

  const bookingInsert = await supabase
    .from("bookings")
    .insert({
      user_id: userContext.authUser.id,
      flight_id: flight.id,
      status: "confirmed",
      meal_selected: false,
      seats: passengerCount,
      total_price: totalPrice,
      ticket_id: ticketId,
      invoice_number: invoiceNumber,
    })
    .select("id, ticket_id, invoice_number, total_price")
    .single();

  if (bookingInsert.error || !bookingInsert.data) {
    console.error("Chat booking insert failed:", bookingInsert.error);
    await rollbackReservedSeats(
      supabase,
      adminSupabase,
      String(flight.id),
      reservation.previousAvailable
    );
    return {
      handled: true,
      bookingCreated: false,
      reply: pick(
        lang,
        "I could not complete booking right now. Please try again in a moment.",
        "मैं अभी बुकिंग पूरी नहीं कर पाया। कृपया थोड़ी देर बाद फिर प्रयास करें।"
      ),
    };
  }

  const metadata = userContext.authUser.user_metadata || {};
  const profileName =
    userContext.profile?.full_name ||
    metadata.full_name ||
    String(userContext.authUser.email || "").split("@")[0] ||
    "Passenger";
  const { firstName, lastName } = splitName(profileName);
  const email = userContext.authUser.email ?? null;
  const phone = userContext.profile?.phone ?? null;

  const passengerRows = Array.from({ length: passengerCount }).map((_, index) => ({
    booking_id: bookingInsert.data.id,
    first_name: index === 0 ? firstName : `${firstName}-${index + 1}`,
    last_name: lastName,
    age: 30,
    gender: "other",
    email,
    phone,
  }));

  const passengerInsert = await supabase.from("passengers").insert(passengerRows);
  if (passengerInsert.error) {
    console.error("Chat booking passenger insert failed:", passengerInsert.error);
  }

  const companyName = flight?.company?.company_name || "Airline";

  return {
    handled: true,
    bookingCreated: true,
    reply: pick(
      lang,
      `Done. I booked ${passengerCount} ticket(s) on ${flightNumber} (${flight.source} → ${flight.destination}, ${companyName}).
Ticket ID: ${bookingInsert.data.ticket_id}
Invoice: ${bookingInsert.data.invoice_number}
Total: ₹${bookingInsert.data.total_price}
You can view it in My Tickets.`,
      `बुकिंग हो गई। मैंने ${flightNumber} (${flight.source} → ${flight.destination}, ${companyName}) पर ${passengerCount} टिकट बुक किए।
टिकट आईडी: ${bookingInsert.data.ticket_id}
इनवॉइस: ${bookingInsert.data.invoice_number}
कुल राशि: ₹${bookingInsert.data.total_price}
आप इसे My Tickets में देख सकते हैं।`
    ),
  };
}

function buildGreetingReply(lang: Language) {
  const now = getNowContext();
  return pick(
    lang,
    `Hi, I’m AIVA. I can check live flights, your logged-in account data, and your bookings.
Current ${now.timezone} time: ${now.time}.`,
    `नमस्ते, मैं AIVA हूं। मैं live flights, आपके account data और bookings में मदद कर सकती हूं।
अभी ${now.timezone} समय: ${now.time}।`
  );
}

async function buildReply(
  message: string,
  messages: ChatMessage[],
  supabase: Awaited<ReturnType<typeof createClient>>,
  userContext: CurrentUserContext,
  flights: any[],
  language: Language
): Promise<ReplyResult> {
  const intent = detectIntent(message);

  if (intent.greetingOnly) {
    return {
      reply: buildGreetingReply(language),
      usedModel: false,
      matchedKnowledge: [],
      language,
      bookingCreated: false,
    };
  }

  if (intent.asksBookAction) {
    const bookingResult = await tryCreateBookingFromMessage(
      message,
      language,
      userContext,
      flights,
      supabase
    );
    if (bookingResult.handled) {
      return {
        reply: bookingResult.reply,
        usedModel: false,
        matchedKnowledge: [],
        language,
        bookingCreated: bookingResult.bookingCreated,
      };
    }
  }

  if (intent.asksTimeOrDate) {
    return {
      reply: buildTimeReply(language),
      usedModel: false,
      matchedKnowledge: [],
      language,
      bookingCreated: false,
    };
  }

  if (intent.asksProfile) {
    return {
      reply: buildProfileReply(userContext, language),
      usedModel: false,
      matchedKnowledge: [],
      language,
      bookingCreated: false,
    };
  }

  if (intent.asksBookings) {
    return {
      reply: buildBookingsReply(userContext, language),
      usedModel: false,
      matchedKnowledge: [],
      language,
      bookingCreated: false,
    };
  }

  if (intent.asksFlightStatus) {
    const statusReply = buildFlightStatusReply(message, flights, language);
    if (statusReply) {
      return {
        reply: statusReply,
        usedModel: false,
        matchedKnowledge: [],
        language,
        bookingCreated: false,
      };
    }
  }

  if (intent.asksFlights) {
    const fallbackRoute = getLastMentionedRoute(messages, message);
    return {
      reply: buildFlightsReply(message, flights, language, fallbackRoute),
      usedModel: false,
      matchedKnowledge: [],
      language,
      bookingCreated: false,
    };
  }

  const relevantKnowledge = await findRelevantKnowledge(supabase, message);

  const cacheKey = `${userContext.authUser?.id || "anon"}::${language}::${message
    .toLowerCase()
    .trim()}`;
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      reply: cached.reply,
      usedModel: true,
      matchedKnowledge: relevantKnowledge,
      language,
      bookingCreated: false,
    };
  }

  let reply = await callOpenAI(messages, relevantKnowledge, userContext, flights, language);
  if (containsExternalBookingReferral(reply)) {
    reply = pick(
      language,
      "I can help you search flights and book tickets directly inside Aerovault. Share your route, date/time, and passenger count, and I’ll continue here.",
      "मैं आपकी flight search और ticket booking सीधे Aerovault के अंदर कर सकता हूं। अपना route, date/time और passenger count बताइए, मैं यहीं आगे बढ़ाता हूं।"
    );
  }

  responseCache.set(cacheKey, {
    reply,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return {
    reply,
    usedModel: true,
    matchedKnowledge: relevantKnowledge,
    language,
    bookingCreated: false,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? (body.messages as ChatMessage[]) : [];

    if (!messages.length) {
      return NextResponse.json({ error: "messages are required" }, { status: 400 });
    }

    const latestUserMessage = [...messages].reverse().find((message) => message.sender === "user");
    if (!latestUserMessage?.text?.trim()) {
      return NextResponse.json({ error: "Latest user message is required" }, { status: 400 });
    }

    const language = detectPreferredLanguage(messages);

    const supabase = await createClient();
    const [userContext, flights] = await Promise.all([
      loadCurrentUserContext(supabase),
      loadFlightsContext(supabase),
    ]);

    const result = await buildReply(
      latestUserMessage.text,
      messages,
      supabase,
      userContext,
      flights,
      language
    );

    const { error: logError } = await supabase.from("ai_chat_logs").insert({
      user_id: userContext.authUser?.id ?? null,
      user_message: latestUserMessage.text,
      assistant_reply: result.reply,
      matched_knowledge: result.matchedKnowledge,
    });

    if (logError) {
      console.error("Failed to store chat log", logError);
    }

    return NextResponse.json({
      reply: result.reply,
      meta: {
        usedModel: result.usedModel,
        timezone: APP_TIMEZONE,
        language: result.language,
        bookingCreated: result.bookingCreated,
      },
    });
  } catch (error) {
    console.error("AIVA route error:", error);
    return NextResponse.json({ error: "Failed to process chat request." }, { status: 500 });
  }
}
