import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { seatNum, flightId, userId } = await request.json()

        // Logging as requested
        console.log("Booking attempt - seat_number:", seatNum, "flight_id:", flightId, "user_id:", userId)

        // The user says "Use an atomic conditional update so only available seats can be booked"
        // But our existing schema uses flight_seats with insert lock strategy.
        // If the row doesn't exist, it means the seat is available.
        // We do an insert. If it fails with a unique constraint, the seat is already taken.
        const { data, error, count } = await supabase
            .from('flight_seats')
            .insert({
                flight_id: flightId,
                seat_number: seatNum,
                status: 'locked',
                user_id: userId,
                locked_until: new Date(Date.now() + 10 * 60 * 1000).toISOString()
            })
            .select()

        // Let's log things as instructed
        console.log("Booking result data:", data)
        if (error) {
            console.error("Full Supabase insert error:", JSON.stringify(error, null, 2))
            
            // Error code 23505 is unique violation in Postgres
            if (error.code === '23505') {
                return NextResponse.json({
                    success: false,
                    message: "Seat already booked"
                }, { status: 409 })
            }
            
            // Error code 42501 is RLS violation
            if (error.code === '42501') {
                 return NextResponse.json({
                     success: false,
                     message: "Permission denied (RLS violation). You must be logged in or verify your role."
                 }, { status: 403 })
            }
            
            throw error
        }

        if (!data || data.length === 0) {
            return NextResponse.json({
                success: false,
                message: "Seat already booked"
            }, { status: 409 })
        }

        return NextResponse.json({
            success: true,
            message: "Seat booked successfully",
            data: data[0]
        }, { status: 200 })

    } catch (error: any) {
        console.error("Booking error fallback:", error)
        return NextResponse.json({
            success: false,
            message: "Booking failed. Please try again."
        }, { status: 500 })
    }
}
