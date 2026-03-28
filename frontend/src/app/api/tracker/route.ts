import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.AVIATION_STACK_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "API key missing" }, { status: 500 });
  }

  try {
    const response = await fetch(
      `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&limit=10&flight_status=active`,
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(`External API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch flight tracker data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
