import { createClient } from "@/utils/supabase/server"
import Navbar from "@/components/navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plane, Calendar, Users, MapPin, FileText } from "lucide-react"
import Link from "next/link"

export default async function MyTicketsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return <div className="p-8 text-center">Please log in to view your tickets.</div>
    }

    // Fetch bookings with all related data
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
            *,
            flights (
                id,
                flight_number,
                source,
                destination,
                departure_time,
                arrival_time,
                price,
                company:flight_companies (
                    company_name,
                    logo_url
                )
            ),
            passengers (
                first_name,
                last_name,
                age,
                gender,
                email,
                phone
            ),
            flight_seats!flight_seats_booking_id_fkey (
                seat_number
            )
        `)
        .eq('user_id', user.id)
        .order('booking_date', { ascending: false })

    if (error) {
        console.error("Error fetching tickets:", error)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            <Navbar />
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pt-24">
                <div className="px-4 mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">My Tickets</h1>
                    <p className="text-gray-600">View and manage all your flight bookings</p>
                </div>

                <div className="px-4 space-y-6">
                    {bookings && bookings.length > 0 ? (
                        bookings.map((booking: any) => {
                            const flight = booking.flights
                            const passengers = booking.passengers || []
                            const seats = booking.flight_seats || []
                            const company = flight?.company

                            return (
                                <Card key={booking.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 border-none bg-white/80 backdrop-blur-sm">
                                    <CardHeader className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white py-6">
                                        <div className="flex justify-between items-center">
                                            <div className="space-y-1">
                                                <CardTitle className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
                                                    {flight?.source} 
                                                    <Plane className="w-6 h-6 rotate-90" />
                                                    {flight?.destination}
                                                </CardTitle>
                                                <p className="text-blue-100/80 font-medium flex items-center gap-2">
                                                    <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
                                                        {company?.company_name || 'Airline'}
                                                    </span>
                                                    <span className="opacity-60">•</span>
                                                    <span className="font-mono tracking-wider">{flight?.flight_number}</span>
                                                </p>
                                            </div>
                                            <Badge
                                                className={`
                                                    px-4 py-1.5 rounded-full text-xs font-bold tracking-widest
                                                    ${booking.status === 'confirmed' 
                                                        ? 'bg-emerald-400/20 text-emerald-50 border border-emerald-400/30' 
                                                        : 'bg-white/20 text-white border border-white/30'}
                                                `}
                                            >
                                                {booking.status?.toUpperCase()}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            {/* Flight Details */}
                                            <div className="space-y-6">
                                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                    <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
                                                    Flight Logistics
                                                </h3>
                                                <div className="space-y-4">
                                                    <div className="flex items-start gap-4 p-3 rounded-xl border border-gray-100 hover:bg-blue-50/50 transition-colors">
                                                        <div className="p-2 bg-blue-50 rounded-lg">
                                                            <Calendar className="w-5 h-5 text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500 font-medium uppercase">Departure</p>
                                                            <p className="font-semibold text-gray-900">
                                                                {flight?.departure_time ? new Date(flight.departure_time).toLocaleString('en-IN', {
                                                                    dateStyle: 'medium',
                                                                    timeStyle: 'short'
                                                                }) : 'N/A'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-start gap-4 p-3 rounded-xl border border-gray-100 hover:bg-blue-50/50 transition-colors">
                                                        <div className="p-2 bg-indigo-50 rounded-lg">
                                                            <Calendar className="w-5 h-5 text-indigo-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500 font-medium uppercase">Arrival</p>
                                                            <p className="font-semibold text-gray-900">
                                                                {flight?.arrival_time ? new Date(flight.arrival_time).toLocaleString('en-IN', {
                                                                    dateStyle: 'medium',
                                                                    timeStyle: 'short'
                                                                }) : 'N/A'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-start gap-4 p-3 rounded-xl border border-gray-100 hover:bg-emerald-50/50 transition-colors">
                                                        <div className="p-2 bg-emerald-50 rounded-lg">
                                                            <FileText className="w-5 h-5 text-emerald-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500 font-medium uppercase">Assigned Seats</p>
                                                            <div className="flex gap-2 flex-wrap mt-1">
                                                                {seats.map((seat: any, idx: number) => (
                                                                    <span key={idx} className="bg-emerald-600 text-white px-3 py-1 rounded-md text-sm font-bold shadow-sm">
                                                                        {seat.seat_number}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Passenger Details */}
                                            <div className="space-y-6">
                                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                    <div className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                                                    Manifest ({passengers.length})
                                                </h3>
                                                <div className="space-y-3">
                                                    {passengers.map((passenger: any, idx: number) => (
                                                        <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-gray-50/80 border border-gray-100 hover:border-indigo-200 transition-colors">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                                                    {passenger.first_name[0]}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-gray-900">
                                                                        {passenger.first_name} {passenger.last_name}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500 font-medium">
                                                                        {passenger.gender.toUpperCase()} • {passenger.age} YEARS
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Booking Info & Actions */}
                                        <div className="mt-10 pt-8 border-t border-gray-100 flex flex-col lg:flex-row justify-between items-end gap-6">
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 w-full lg:w-auto">
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Ticket ID</p>
                                                    <p className="font-mono text-sm font-bold text-blue-600">{booking.ticket_id || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Invoice</p>
                                                    <p className="font-mono text-sm font-bold text-gray-700">{booking.invoice_number || 'N/A'}</p>
                                                </div>
                                                <div className="col-span-2 md:col-span-1">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Booking Date</p>
                                                    <p className="text-sm font-bold text-gray-700">
                                                        {new Date(booking.booking_date).toLocaleDateString('en-IN', {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-4 w-full lg:w-auto">
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Grand Total</p>
                                                    <p className="text-4xl font-black text-blue-700">₹{booking.total_price}</p>
                                                </div>
                                                <div className="flex gap-3 w-full sm:w-auto">
                                                    <Link href={`/user/invoice/${booking.id}`} className="flex-1 sm:flex-none">
                                                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 py-6 px-10 text-base font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-95">
                                                            <FileText className="w-5 h-5 mr-3" />
                                                            View Full Document
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })
                    ) : (
                        <Card>
                            <CardContent className="p-12 text-center">
                                <Plane className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">No tickets found</h3>
                                <p className="text-gray-600 mb-6">You haven't booked any flights yet.</p>
                                <Link href="/search">
                                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                        Search Flights
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    )
}
