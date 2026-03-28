import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

type ChatMessage = {
  sender: "user" | "bot" | "aiva";
  text: string;
};

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const SYSTEM_PROMPT = `
You are AIVA (AeroVault Intelligent Virtual Assistant).
You are professional, concise, helpful, and customer-first.
Assist users with flight search, booking help, route guidance, and airline policies.
If details are missing, ask follow-up questions.
Do not invent unavailable real-time data; provide clear next steps.
`;

function normalizeMessages(messages: ChatMessage[]) {
  return messages
    .filter((message) => typeof message?.text === "string" && message.text.trim())
    .map((message) => ({
      role: message.sender === "user" ? "user" : "model",
      parts: [{ text: message.text }]
    }));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? (body.messages as ChatMessage[]) : [];

    if (!messages.length) {
      return NextResponse.json({ error: "messages are required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        reply: "AIVA is temporarily unavailable. Please try again later."
      });
    }

    const contents = normalizeMessages(messages);
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7
      }
    });

    return NextResponse.json({
      reply: response.text?.trim() || "I can help with that. Could you share a bit more detail?"
    });
  } catch (error) {
    console.error("AIVA route error:", error);
    return NextResponse.json({ error: "Failed to process chat request." }, { status: 500 });
  }
}
