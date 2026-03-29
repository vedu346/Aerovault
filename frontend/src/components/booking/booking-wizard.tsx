"use client"

import { useState, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { BookingStepper } from "./booking-stepper"
import { PassengerForm } from "./passenger-form"
import { SeatMap } from "./seat-map"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/client"
import { generateTicketId, generateInvoiceNumber } from "@/utils/generate-ids"
import { Loader2 } from "lucide-react"

interface BookingWizardProps {
    flight: any
    currentUser: any
}

export function BookingWizard({ flight, currentUser }: BookingWizardProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    // Initialize state with default or search params
    const [passengersCount, setPassengersCount] = useState(
        parseInt(searchParams.get("passengers") || "1")
    )

    const [step, setStep] = useState(1)
    const [passengerData, setPassengerData] = useState<any>(null)
    const [selectedSeats, setSelectedSeats] = useState<string[]>([])
    const [isBooking, setIsBooking] = useState(false)

    const handlePassengerSubmit = (data: any) => {
        // Update passenger count based on the form data
        setPassengersCount(data.passengers.length)
        setPassengerData(data)
        setStep(2)
    }

    const handleSeatSelection = useCallback((seats: string[]) => {
        setSelectedSeats(seats)
    }, [])

    const handleConfirmBooking = async () => {
        let reservedSeatSnapshot: { previous: number } | null = null
        let createdBookingId: string | null = null

        try {
            console.log("Starting booking process...")
            setIsBooking(true)
            const supabase = createClient()

            if (!currentUser) {
                alert("User not logged in!")
                setIsBooking(false)
                return
            }

            // Reserve seats from flight inventory first to avoid overbooking.
            const { data: latestFlight, error: latestFlightError } = await supabase
                .from('flights')
                .select('status, available_seats, price')
                .eq('id', flight.id)
                .single()

            if (latestFlightError || !latestFlight) {
                alert("Could not verify live seat availability. Please try again.")
                setIsBooking(false)
                return
            }

            if (latestFlight.status !== 'scheduled') {
                alert(`This flight is currently ${latestFlight.status}. Booking is allowed only for scheduled flights.`)
                setIsBooking(false)
                return
            }

            const currentAvailableSeats = Number(latestFlight.available_seats)
            if (!Number.isFinite(currentAvailableSeats) || currentAvailableSeats < passengersCount) {
                alert(`Only ${currentAvailableSeats || 0} seats are available right now.`)
                setIsBooking(false)
                return
            }

            const nextAvailableSeats = currentAvailableSeats - passengersCount
            const { data: seatReserveRows, error: seatReserveError } = await supabase
                .from('flights')
                .update({ available_seats: nextAvailableSeats })
                .eq('id', flight.id)
                .eq('available_seats', currentAvailableSeats)
                .select('id')

            if (seatReserveError || !seatReserveRows || seatReserveRows.length === 0) {
                alert("Seat availability changed while booking. Please refresh and try again.")
                setIsBooking(false)
                return
            }

            reservedSeatSnapshot = { previous: currentAvailableSeats }

            // 1. Create Booking
            console.log("Creating booking record...")
            const totalPrice = Number(latestFlight.price ?? flight.price) * passengersCount

            // Generate unique ticket ID and invoice number
            const ticketId = generateTicketId()
            const invoiceNumber = generateInvoiceNumber()

            const { data: booking, error: bookingError } = await supabase
                .from('bookings')
                .insert({
                    user_id: currentUser.id,
                    flight_id: flight.id,
                    status: 'confirmed',
                    meal_selected: false,
                    seats: passengersCount,
                    total_price: totalPrice,
                    ticket_id: ticketId,
                    invoice_number: invoiceNumber
                })
                .select()
                .single()

            if (bookingError) {
                console.error("Booking error:", bookingError)
                if (reservedSeatSnapshot) {
                    await supabase
                        .from('flights')
                        .update({ available_seats: reservedSeatSnapshot.previous })
                        .eq('id', flight.id)
                }
                alert("Booking failed: " + bookingError.message)
                setIsBooking(false)
                return
            }
            console.log("Booking created:", booking.id)
            createdBookingId = booking.id

            // 2. Add Passengers
            console.log("Adding passengers...")
            const passengers = passengerData.passengers.map((p: any) => ({
                booking_id: booking.id,
                first_name: p.first_name,
                last_name: p.last_name,
                age: p.age,
                gender: p.gender,
                email: p.email || passengerData.contact_email,
                phone: p.phone || passengerData.contact_phone
            }))

            const { error: passengersError } = await supabase
                .from('passengers')
                .insert(passengers)

            if (passengersError) {
                console.error("Passenger error", passengersError)
            }

            // 3. Update Seats to Booked (Workaround for possible RLS UPDATE restriction)
            console.log("Updating seats:", selectedSeats)
            
            // Delete the 'locked' seats
            await supabase
                .from('flight_seats')
                .delete()
                .in('seat_number', selectedSeats)
                .eq('flight_id', flight.id)
                .eq('user_id', currentUser.id)
                
            // Re-insert as 'booked'
            const seatsToInsert = selectedSeats.map(seat => ({
                flight_id: flight.id,
                seat_number: seat,
                status: 'booked',
                user_id: currentUser.id,
                booking_id: booking.id
            }))
            
            const { error: seatsError } = await supabase
                .from('flight_seats')
                .insert(seatsToInsert)

            if (seatsError) {
                console.error("Seat update error", seatsError)
            }

            alert(`Booking Confirmed! ✈️\nTicket ID: ${ticketId}`)
            router.push('/user/my-tickets')
        } catch (err) {
            console.error("Unexpected booking error:", err)
            if (reservedSeatSnapshot && !createdBookingId) {
                const supabase = createClient()
                await supabase
                    .from('flights')
                    .update({ available_seats: reservedSeatSnapshot.previous })
                    .eq('id', flight.id)
            }
            alert("An unexpected error occurred. Please try again.")
        } finally {
            setIsBooking(false)
        }
    }

    return (
        <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600" /></div>}>
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <BookingStepper currentStep={step} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="md:col-span-2 space-y-6">
                        {step === 1 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Enter Passenger Details</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <PassengerForm
                                        passengersCount={passengersCount}
                                        onSubmit={handlePassengerSubmit}
                                        initialData={passengerData}
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {step === 2 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Select Your Seats</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <SeatMap
                                        flightId={flight.id}
                                        passengersCount={passengersCount}
                                        onSelectionChange={handleSeatSelection}
                                    />
                                    <div className="mt-6 flex justify-between">
                                        <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                                        <Button
                                            onClick={() => setStep(3)}
                                            disabled={selectedSeats.length !== passengersCount}
                                            className="bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            Continue to Payment
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {step === 3 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Review & Pay</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <h3 className="font-bold text-blue-900 mb-2">Flight Summary</h3>
                                        <p className="text-sm text-blue-800">{flight.company?.company_name || flight.airline_name} • {flight.flight_number}</p>
                                        <p className="text-sm text-blue-800">{flight.source} → {flight.destination}</p>
                                        <p className="text-sm text-blue-800 font-mono">
                                            {new Date(flight.departure_time).toLocaleString()}
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-gray-900 mb-2">Passengers</h3>
                                        <ul className="text-sm text-gray-600 space-y-1">
                                            {passengerData?.passengers.map((p: any, i: number) => (
                                                <li key={i}>{p.first_name} {p.last_name} ({p.gender}, {p.age})</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-gray-900 mb-2">Selected Seats</h3>
                                        <div className="flex gap-2">
                                            {selectedSeats.map(s => (
                                                <span key={s} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="border-t pt-4 flex justify-between items-center">
                                        <span className="text-lg font-medium">Total Amount</span>
                                        <span className="text-2xl font-bold text-blue-600">
                                            ₹{flight.price * passengersCount}
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <Button variant="outline" className="w-full" onClick={() => setStep(2)}>Back</Button>
                                        <Button
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg"
                                            onClick={handleConfirmBooking}
                                            disabled={isBooking}
                                        >
                                            {isBooking ? <Loader2 className="animate-spin" /> : "Confirm Booking"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar Summary (Visible on all steps) */}
                    <div className="md:col-span-1">
                        <Card className="sticky top-24">
                            <CardHeader>
                                <CardTitle className="text-base">Fare Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Base Fare ({passengersCount} travelers)</span>
                                    <span className="font-medium">₹{flight.price * passengersCount}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Taxes & Fees</span>
                                    <span className="font-medium">₹0</span>
                                </div>
                                <div className="border-t pt-4 flex justify-between items-center">
                                    <span className="font-bold">Total</span>
                                    <span className="font-bold text-xl text-blue-600">₹{flight.price * passengersCount}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </Suspense>
    )
}
