import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import Navbar from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus } from "lucide-react"
import { FlightActions } from "@/components/flights/flight-actions"
export const dynamic = 'force-dynamic'

export default async function AirlineDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Hard role guard — second layer after middleware
    // Also fetch company_id in the same query
    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'flight_company') {
        if (profile?.role === 'admin') redirect('/admin/dashboard')
        else redirect('/user')
    }

    // Fetch this airline's company record
    const { data: companyRecord } = await supabase
        .from('flight_companies')
        .select('id, company_name')
        .eq('user_id', user.id)
        .single()

    // Fetch flights belonging to this company
    const { data } = await supabase
        .from('flights')
        .select('*')
        .eq('company_id', companyRecord?.id || '00000000-0000-0000-0000-000000000000')
        .order('created_at', { ascending: false })

    const flights = data || []

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pt-24">
                <div className="flex justify-between items-center px-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Airline Dashboard</h1>
                        {companyRecord?.company_name && (
                            <p className="text-gray-500 text-sm mt-1">{companyRecord.company_name}</p>
                        )}
                    </div>
                    <Link href="/airline/flights/new">
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="mr-2 h-4 w-4" /> Add New Flight
                        </Button>
                    </Link>
                </div>

                <div className="px-4 grid grid-cols-1 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Manage Flights ({flights.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {flights.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">
                                    No flights added yet. Start by adding a new flight.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Flight No</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departure</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seats</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {flights.map((flight) => (
                                                <tr key={flight.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{flight.flight_number}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{flight.source} → {flight.destination}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {new Date(flight.departure_time).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{flight.price}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{flight.available_seats}/{flight.total_seats}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${flight.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                                                                flight.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                                    'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                            {flight.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <FlightActions flightId={flight.id} currentStatus={flight.status} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
