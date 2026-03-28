"use client"

import { useState, useEffect, useMemo, Fragment } from "react"
import { createClient } from "@/utils/supabase/client"
import { Loader2 } from "lucide-react"

interface SeatMapProps {
    flightId: string
    passengersCount: number
    onSelectionChange: (seats: string[]) => void
}

interface SeatStatus {
    seat_number: string
    status: 'locked' | 'booked'
    user_id: string
}

const ROWS = 20
const SEATS_PER_ROW = ["A", "B", "C", "D", "E", "F"]

export function SeatMap({ flightId, passengersCount, onSelectionChange }: SeatMapProps) {
    const supabase = useMemo(() => createClient(), [])
    const [loading, setLoading] = useState(true)
    const [seatStatuses, setSeatStatuses] = useState<Record<string, SeatStatus>>({})
    const [mySeats, setMySeats] = useState<string[]>([])
    const [userId, setUserId] = useState<string | null>(null)
    const [booking, setBooking] = useState(false)

    useEffect(() => {
        async function init() {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            setUserId(user?.id || null)

            // Fetch current seat statuses
            const { data, error } = await supabase
                .from('flight_seats')
                .select('*')
                .eq('flight_id', flightId)

            if (data) {
                const map: Record<string, SeatStatus> = {}
                const mine: string[] = []
                data.forEach((s: any) => {
                    map[s.seat_number] = s
                    if (s.user_id === user?.id && s.status === 'locked') {
                        mine.push(s.seat_number)
                    }
                })
                setSeatStatuses(map)
                setMySeats(mine)
                // Notify parent of initial selection
                onSelectionChange(mine)
            }
            setLoading(false)
        }
        init()

        // Realtime subscription would go here
        const channel = supabase.channel(`seat-map-${flightId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'flight_seats', filter: `flight_id=eq.${flightId}` }, (payload) => {
                // Simplified refresh for demo consistency
                // In production, handle specific INSERT/DELETE events to be smoother
                // For now, just re-fetch to be safe and easy
                // actually, payload has new/old, so let's try to update locally
                // But user ID check is needed.
                // Let's just re-fetch for simplicity in this MVP
                // re-fetching init not ideal due to loading state.
                // manually update state:
                if (payload.eventType === 'INSERT') {
                    const newSeat = payload.new as any
                    setSeatStatuses(prev => ({ ...prev, [newSeat.seat_number]: newSeat }))
                } else if (payload.eventType === 'DELETE') {
                    const oldSeat = payload.old as any
                    // We need the ID or seat_number to remove. DELETE payload usually only has ID if RLS hidden, 
                    // but here we might need seat_number. 
                    // If delete payload doesn't have seat_number, we must refetch.
                    // Supabase DELETE payload only contains PK. 
                    // So we'd need to map PK to seat or just refetch. Refetching is safer.
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [flightId, supabase])


    const toggleSeat = async (seatNum: string) => {
        if (!userId) {
            alert("Please login to select seats")
            return
        }
        
        if (booking) return;

        const currentStatus = seatStatuses[seatNum]

        // Cannot toggle seats that are already permanently booked by anyone (including this user)
        if (currentStatus?.status === 'booked') return

        // If locked by someone else
        if (currentStatus && currentStatus.user_id !== userId) return

        // If I already have it locked -> Unlock it
        if (currentStatus && currentStatus.user_id === userId && currentStatus.status === 'locked') {
            // Deselect
            const { error } = await supabase
                .from('flight_seats')
                .delete()
                .eq('flight_id', flightId)
                .eq('seat_number', seatNum)
                .eq('user_id', userId) // Security measure

            if (!error) {
                const nextMySeats = mySeats.filter(s => s !== seatNum)
                setMySeats(nextMySeats)
                onSelectionChange(nextMySeats)

                setSeatStatuses(prev => {
                    const next = { ...prev }
                    delete next[seatNum]
                    return next
                })
            }
        } else {
            // Select (Lock)
            if (mySeats.length >= passengersCount) {
                alert(`You can only select ${passengersCount} seats.`)
                return
            }

            setBooking(true);
            try {
                const res = await fetch("/api/book-seat", {
                    method: "POST",
                    body: JSON.stringify({ flightId, seatNum, userId }),
                    headers: {
                        "Content-Type": "application/json"
                    }
                });

                const data = await res.json();

                if (!res.ok) {
                    // Show specific error messages based on status
                    if (res.status === 409) {
                         alert("This seat was just taken by another passenger.")
                    } else {
                         alert(data.message || "Booking failed. Please try again.")
                    }
                    
                    // Refresh map to get sync'd state
                    const { data: refreshData } = await supabase
                        .from('flight_seats')
                        .select('*')
                        .eq('flight_id', flightId)
                    if (refreshData) {
                        const map: Record<string, SeatStatus> = {}
                        refreshData.forEach((s: any) => map[s.seat_number] = s)
                        setSeatStatuses(map)
                    }
                } else {
                    const newStatus: SeatStatus = { seat_number: seatNum, status: 'locked', user_id: userId }
                    setSeatStatuses(prev => ({ ...prev, [seatNum]: newStatus }))

                    const nextMySeats = [...mySeats, seatNum]
                    setMySeats(nextMySeats)
                    onSelectionChange(nextMySeats)
                }
            } catch (err) {
                console.error("Booking error:", err);
                alert("Booking failed. Please try again.");
            } finally {
                setBooking(false);
            }
        }
    }

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600" /></div>

    return (
        <div className="w-full max-w-md mx-auto bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded border border-gray-300 bg-white" />
                    <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-green-500 border-green-600" />
                    <span>Selected</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-gray-300 cursor-not-allowed" />
                    <span>Booked</span>
                </div>
            </div>

            <div className="flex flex-col gap-2 items-center">
                {/* Headers */}
                <div className="grid grid-cols-8 gap-2 w-full mb-2">
                    <div className="text-center font-bold text-gray-400">#</div>
                    {SEATS_PER_ROW.map((col, i) => (
                        <Fragment key={col}>
                            {i === 3 && <div className="w-4" aria-hidden="true" />}
                            <div className="text-center font-bold text-gray-400">
                                {col}
                            </div>
                        </Fragment>
                    ))}
                </div>

                {Array.from({ length: ROWS }).map((_, r) => {
                    const rowNum = r + 1
                    return (
                        <div key={rowNum} className="grid grid-cols-8 gap-2 w-full">
                            <div className="flex items-center justify-center text-sm font-medium text-gray-400">
                                {rowNum}
                            </div>
                            {SEATS_PER_ROW.map((col, i) => {
                                const seatNum = `${rowNum}${col}`
                                const status = seatStatuses[seatNum]
                                
                                const isBooked = status?.status === 'booked' || (status?.status === 'locked' && status.user_id !== userId)
                                const isSelected = status?.status === 'locked' && status.user_id === userId

                                return (
                                    <Fragment key={seatNum}>
                                        {i === 3 && <div className="w-4" aria-hidden="true" />}
                                        <button
                                            onClick={() => toggleSeat(seatNum)}
                                            disabled={!!isBooked || booking}
                                            className={`
                                                h-10 w-full rounded border transition-colors relative
                                                ${isBooked
                                                    ? 'bg-gray-200 border-gray-200 text-gray-400 cursor-not-allowed'
                                                    : isSelected
                                                        ? 'bg-green-500 border-green-600 text-white shadow-sm'
                                                        : 'bg-white border-gray-300 hover:border-blue-500 hover:bg-blue-50 text-gray-700'
                                                }
                                            `}
                                        >
                                            <span className="text-xs">{col}</span>
                                        </button>
                                    </Fragment>
                                )
                            })}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
