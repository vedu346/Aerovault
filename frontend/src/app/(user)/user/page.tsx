import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import Navbar from "@/components/navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function UserDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Hard role guard — second layer after middleware
    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'customer') {
        if (profile?.role === 'admin') redirect('/admin/dashboard')
        else if (profile?.role === 'flight_company') redirect('/airline/dashboard')
        else redirect('/login')
    }

    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
            *,
            flights (
                flight_number,
                source,
                destination,
                departure_time,
                arrival_time
            )
        `)
        .eq('user_id', user.id)
        .order('booking_date', { ascending: false })

    if (error) {
        console.error("Error fetching bookings:", JSON.stringify(error, null, 2))
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pt-24">
                <h1 className="text-3xl font-bold text-gray-900 mb-6 px-4">My Dashboard</h1>

                <div className="px-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>My Bookings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-500">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                                        <tr>
                                            <th className="px-6 py-3">Flight</th>
                                            <th className="px-6 py-3">Date</th>
                                            <th className="px-6 py-3">Seats</th>
                                            <th className="px-6 py-3">Total Price</th>
                                            <th className="px-6 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bookings?.map((booking: any) => {
                                            const flight = booking.flights || {}
                                            return (
                                                <tr key={booking.id} className="bg-white border-b hover:bg-gray-50">
                                                    <td className="px-6 py-4 font-medium text-gray-900">
                                                        <div>{flight.source} → {flight.destination}</div>
                                                        <div className="text-xs text-gray-500">{flight.flight_number}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {flight.departure_time ? (
                                                            <>
                                                                {new Date(flight.departure_time).toLocaleDateString()}
                                                                <br />
                                                                <span className="text-xs text-gray-500">
                                                                    {new Date(flight.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </>
                                                        ) : 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4">{booking.seats}</td>
                                                    <td className="px-6 py-4 font-bold text-blue-600">₹{booking.total_price}</td>
                                                    <td className="px-6 py-4">
                                                        <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                                                            {booking.status?.toUpperCase() || 'UNKNOWN'}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                        {(!bookings || bookings.length === 0) && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                                    No bookings found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
