import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import Navbar from "@/components/navbar"
import { BookingWizard } from "@/components/booking/booking-wizard"
import { Loader2 } from "lucide-react"
import { Suspense } from "react"

interface BookFlightPageProps {
    params: Promise<{
        flightId: string
    }>
}

export default async function BookFlightPage({ params }: BookFlightPageProps) {
    const { flightId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/login/user?redirect=/book/${flightId}`)
    }

    const { data: flight, error } = await supabase
        .from('flights')
        .select(`
            *,
            company:flight_companies(company_name)
        `)
        .eq('id', flightId)
        .single()

    if (error || !flight) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="flex flex-col items-center justify-center h-[80vh]">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Flight not found</h2>
                    <p className="text-gray-500">The flight you are looking for does not exist or has been removed.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-20">
            <Navbar />
            <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>}>
                <BookingWizard flight={flight} currentUser={user} />
            </Suspense>
        </div>
    )
}
