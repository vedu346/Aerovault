import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import Navbar from "@/components/navbar"
import { InvoiceView } from "@/components/invoice/invoice-view"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface InvoicePageProps {
    params: Promise<{
        bookingId: string
    }>
}

export default async function InvoicePage({ params }: InvoicePageProps) {
    const { bookingId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login/user')
    }

    // Fetch booking with all related data
    const { data: booking, error } = await supabase
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
        .eq('id', bookingId)
        .eq('user_id', user.id) // Security: ensure user can only access their own invoices
        .single()

    if (error || !booking) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pt-24">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">Invoice Not Found</h1>
                        <p className="text-gray-600 mb-6">The invoice you're looking for doesn't exist or you don't have access to it.</p>
                        <Link href="/user/my-tickets">
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                Back to My Tickets
                            </Button>
                        </Link>
                    </div>
                </main>
            </div>
        )
    }

    const flight = booking.flights
    const passengers = booking.passengers || []
    const seats = booking.flight_seats || []
    const company = flight?.company

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pt-24">
                <div className="px-4 mb-6 print:hidden">
                    <Link href="/user/my-tickets">
                        <Button variant="ghost" className="text-gray-700 hover:text-blue-600">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to My Tickets
                        </Button>
                    </Link>
                </div>
                <div className="px-4">
                    <InvoiceView
                        booking={booking}
                        flight={flight}
                        passengers={passengers}
                        seats={seats}
                        company={company}
                    />
                </div>
            </main>
        </div>
    )
}
