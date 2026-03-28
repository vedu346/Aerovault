import { NextResponse } from 'next/server';

export async function GET() {
    const API_KEY = process.env.AVIATION_STACK_KEY;

    if (!API_KEY) {
        return NextResponse.json({ error: 'API Key missing' }, { status: 500 });
    }

    try {
        // Fetching active flights (limit 10 for demo)
        const response = await fetch(`http://api.aviationstack.com/v1/flights?access_key=${API_KEY}&limit=10&flight_status=active`);

        if (!response.ok) {
            throw new Error(`External API error: ${response.statusText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
