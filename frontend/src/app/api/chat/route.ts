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

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const SYSTEM_PROMPT = `
You are AIVA (AeroVault Intelligent Virtual Assistant).
You are professional, concise, helpful, and customer-first.
Assist users with flight search, booking help, route guidance, and airline policies.
Use the provided knowledge base context when it is relevant.
If details are missing, ask follow-up questions.
Do not invent unavailable real-time data; provide clear next steps.
`;

function normalizeMessages(messages: ChatMessage[]) {
  return messages
    .filter((message) => typeof message?.text === "string" && message.text.trim())
    .map((message) => ({
      role: message.sender === "user" ? "user" : "assistant",
      content: message.text,
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

async function findRelevantKnowledge(supabase: Awaited<ReturnType<typeof createClient>>, query: string) {
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

async function callOpenAI(messages: ChatMessage[], knowledgeItems: KnowledgeItem[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const contextBlock = buildKnowledgeContext(knowledgeItems);

  const completionMessages = [
    {
      role: "system",
      content: `${SYSTEM_PROMPT}\n\nCustom knowledge base:\n${contextBlock}`,
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
      temperature: 0.7,
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
    const relevantKnowledge = await findRelevantKnowledge(supabase, latestUserMessage.text);

    const reply = await callOpenAI(messages, relevantKnowledge);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: logError } = await supabase.from("ai_chat_logs").insert({
      user_id: user?.id ?? null,
      user_message: latestUserMessage.text,
      assistant_reply: reply,
      matched_knowledge: relevantKnowledge,
    });

    if (logError) {
      console.error("Failed to store chat log", logError);
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("AIVA route error:", error);
    return NextResponse.json({ error: "Failed to process chat request." }, { status: 500 });
  }
}
