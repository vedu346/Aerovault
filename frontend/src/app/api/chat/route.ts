import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

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

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "Asia/Kolkata";
const MAX_HISTORY_MESSAGES = 8;
const MAX_CONTEXT_FLIGHTS = 10;
const CACHE_TTL_MS = 2 * 60 * 1000;

const SYSTEM_PROMPT = `
You are AIVA (AeroVault Intelligent Virtual Assistant).
You are professional, concise, helpful, and customer-first.
Always prioritize grounded data provided in context over assumptions.
If a requested value is unknown, say that clearly and offer the next best step.
Keep responses compact and actionable.
`;

const globalForCache = globalThis as typeof globalThis & {
  __aivaResponseCache?: Map<string, CachedResponse>;
};

const responseCache = globalForCache.__aivaResponseCache ?? new Map<string, CachedResponse>();
globalForCache.__aivaResponseCache = responseCache;

function getNowContext() {
  const now = new Date();

  return {
    iso: now.toISOString(),
    date: new Intl.DateTimeFormat("en-US", {
      timeZone: APP_TIMEZONE,
      dateStyle: "full",
    }).format(now),
    time: new Intl.DateTimeFormat("en-US", {
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

  return new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
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

function extractSearchTerms(message: string) {
  return Array.from(
    new Set(
      message
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 3)
    )
  ).slice(0, 6);
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

function includesAny(text: string, tokens: string[]) {
  return tokens.some((token) => text.includes(token));
}

function detectIntent(message: string) {
  const text = message.toLowerCase();
  const asksTimeOrDate = includesAny(text, [
    "time",
    "date",
    "today",
    "right now",
    "current time",
    "current date",
    "what day",
  ]);
  const asksBookings = includesAny(text, [
    "my booking",
    "my bookings",
    "my ticket",
    "my tickets",
    "booked",
    "reservation",
  ]);
  const asksProfile = includesAny(text, [
    "my profile",
    "my account",
    "who am i",
    "my role",
    "my email",
  ]);
  const asksFlightStatus = includesAny(text, ["flight status", "status of", "is flight", "delayed", "cancelled", "canceled"]);
  const asksFlights = includesAny(text, [
    "flight",
    "flights",
    "search",
    "available",
    "from ",
    " to ",
    "cheapest",
    "book",
  ]);
  const greetingOnly = /^(hi|hello|hey|yo|hola)\b/.test(text.trim());

  return {
    asksTimeOrDate,
    asksBookings,
    asksProfile,
    asksFlightStatus,
    asksFlights,
    greetingOnly,
  };
}

function extractFlightNumber(text: string) {
  const match = text.toUpperCase().match(/\b[A-Z]{1,3}\d{1,4}\b/);
  return match?.[0] ?? null;
}

function extractRoute(text: string) {
  const fromTo = text.match(/\bfrom\s+([a-z\s]+?)\s+to\s+([a-z\s]+)\b/i);
  if (fromTo) {
    return {
      source: fromTo[1].trim(),
      destination: fromTo[2].trim(),
    };
  }

  const generic = text.match(/\b([a-z\s]{3,})\s+to\s+([a-z\s]{3,})\b/i);
  if (generic) {
    return {
      source: generic[1].trim(),
      destination: generic[2].trim(),
    };
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
  const companyName =
    flight?.company?.company_name || flight?.airline_name || "Airline";
  const seats =
    typeof flight?.available_seats === "number" && typeof flight?.total_seats === "number"
      ? ` | Seats ${flight.available_seats}/${flight.total_seats}`
      : "";

  return `${flight.flight_number || "N/A"} | ${flight.source || "N/A"} → ${flight.destination || "N/A"} | ${formatDateTime(
    flight.departure_time
  )} | ₹${flight.price ?? "N/A"} | ${flight.status || "unknown"} | ${companyName}${seats}`;
}

function buildBookingsReply(userContext: CurrentUserContext) {
  if (!userContext.authUser) {
    return "You are not logged in right now, so I cannot read your bookings. Please sign in and ask again.";
  }

  if (!userContext.bookings.length) {
    return "I checked your account and you currently have no bookings.";
  }

  const lines = userContext.bookings.slice(0, 5).map((booking: any, index) => {
    const flight = booking?.flights || {};
    return `${index + 1}. ${flight.flight_number || "N/A"} (${flight.source || "N/A"} → ${flight.destination || "N/A"}) | ${booking.status || "unknown"} | Depart ${formatDateTime(
      flight.departure_time
    )} | ₹${booking.total_price ?? "N/A"} | Ticket ${booking.ticket_id || "N/A"}`;
  });

  return `Here are your latest bookings:\n${lines.join("\n")}`;
}

function buildProfileReply(userContext: CurrentUserContext) {
  if (!userContext.authUser) {
    return "You are not logged in right now, so I cannot load profile details.";
  }

  const metadata = userContext.authUser.user_metadata || {};
  const fullName = userContext.profile?.full_name || metadata.full_name || "Not set";
  const role = userContext.profile?.role || "unknown";
  const email = userContext.authUser.email || "Not available";
  const joined = formatDateTime(userContext.authUser.created_at || null);

  return `I can see this profile data:\n- Name: ${fullName}\n- Email: ${email}\n- Role: ${role}\n- Account created: ${joined}`;
}

function buildTimeReply() {
  const now = getNowContext();
  return `Current date/time (${now.timezone}): ${now.date}, ${now.time}.`;
}

function buildFlightsReply(message: string, flights: any[]) {
  if (!flights.length) {
    return "I currently have no flight records available.";
  }

  const text = message.toLowerCase();
  const route = extractRoute(text);
  let filtered = filterFlightsByRoute(flights, route);

  if (!filtered.length && route) {
    return `I could not find flights for "${route.source} to ${route.destination}" right now. Try nearby city names or ask for all upcoming flights.`;
  }

  if (includesAny(text, ["cheapest", "lowest price", "lowest fare", "cheap"])) {
    filtered = [...filtered].sort((a, b) => (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER));
  }

  const selected = filtered.slice(0, 6);
  const lines = selected.map((flight, index) => `${index + 1}. ${buildFlightLine(flight)}`);

  const prefix = route
    ? `Found ${filtered.length} matching flight(s) for ${route.source} → ${route.destination}.`
    : `Here are ${selected.length} upcoming flight option(s).`;

  return `${prefix}\n${lines.join("\n")}`;
}

function buildFlightStatusReply(message: string, flights: any[]) {
  const flightNumber = extractFlightNumber(message);
  if (!flightNumber) {
    return null;
  }

  const flight = flights.find(
    (item) => String(item?.flight_number || "").toUpperCase() === flightNumber
  );

  if (!flight) {
    return `I could not find flight ${flightNumber} in current records.`;
  }

  return `Status for ${flightNumber}: ${flight.status || "unknown"}.\nRoute: ${flight.source} → ${flight.destination}\nDeparture: ${formatDateTime(
    flight.departure_time
  )}\nArrival: ${formatDateTime(flight.arrival_time)}`;
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
  flights: any[]
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return "I can still help with live flights, your bookings, and profile details. For open-ended questions, AI text generation is currently unavailable.";
  }

  const nowContext = getNowContext();
  const knowledgeContext = buildKnowledgeContext(knowledgeItems);
  const userContextSummary = buildCompactUserContext(userContext);
  const bookingsSummary = buildCompactBookingsContext(userContext.bookings);
  const flightsSummary = buildCompactFlightsContext(flights);

  const completionMessages = [
    {
      role: "system",
      content: `${SYSTEM_PROMPT}

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
    "I can help with that. Could you share a bit more detail?"
  );
}

function buildGreetingReply() {
  const now = getNowContext();
  return `Hi, I’m AIVA. I can check live flights, your logged-in account data, and your bookings.\nCurrent ${now.timezone} time: ${now.time}.`;
}

async function buildReply(
  message: string,
  messages: ChatMessage[],
  supabase: Awaited<ReturnType<typeof createClient>>,
  userContext: CurrentUserContext,
  flights: any[]
) {
  const intent = detectIntent(message);

  if (intent.greetingOnly) {
    return {
      reply: buildGreetingReply(),
      usedModel: false,
      matchedKnowledge: [] as KnowledgeItem[],
    };
  }

  if (intent.asksTimeOrDate) {
    return {
      reply: buildTimeReply(),
      usedModel: false,
      matchedKnowledge: [] as KnowledgeItem[],
    };
  }

  if (intent.asksProfile) {
    return {
      reply: buildProfileReply(userContext),
      usedModel: false,
      matchedKnowledge: [] as KnowledgeItem[],
    };
  }

  if (intent.asksBookings) {
    return {
      reply: buildBookingsReply(userContext),
      usedModel: false,
      matchedKnowledge: [] as KnowledgeItem[],
    };
  }

  if (intent.asksFlightStatus) {
    const statusReply = buildFlightStatusReply(message, flights);
    if (statusReply) {
      return {
        reply: statusReply,
        usedModel: false,
        matchedKnowledge: [] as KnowledgeItem[],
      };
    }
  }

  if (intent.asksFlights) {
    return {
      reply: buildFlightsReply(message, flights),
      usedModel: false,
      matchedKnowledge: [] as KnowledgeItem[],
    };
  }

  const relevantKnowledge = await findRelevantKnowledge(supabase, message);

  const cacheKey = `${userContext.authUser?.id || "anon"}::${message.toLowerCase().trim()}`;
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      reply: cached.reply,
      usedModel: true,
      matchedKnowledge: relevantKnowledge,
    };
  }

  const reply = await callOpenAI(messages, relevantKnowledge, userContext, flights);
  responseCache.set(cacheKey, {
    reply,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return {
    reply,
    usedModel: true,
    matchedKnowledge: relevantKnowledge,
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
      flights
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
      },
    });
  } catch (error) {
    console.error("AIVA route error:", error);
    return NextResponse.json({ error: "Failed to process chat request." }, { status: 500 });
  }
}
