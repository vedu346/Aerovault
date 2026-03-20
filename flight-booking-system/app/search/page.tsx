"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { createClient } from "@/utils/supabase/client"
import Navbar from "@/components/navbar"
import { FlightSearchForm } from "@/components/flights/flight-search-form"
import { StickySearchBar } from "@/components/flights/sticky-search-bar"
import { FlightCard } from "@/components/flights/flight-card"
import { Loader2 } from "lucide-react"

function SearchResults() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const supabase = createClient()

    const [flights, setFlights] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const source = searchParams.get("source")
    const destination = searchParams.get("destination")
    const date = searchParams.get("date")

    useEffect(() => {
        async function fetchFlights() {
            setLoading(true)

            let query = supabase
                .from('flights')
                .select(`
                    *,
                    company:flight_companies(company_name)
                `)

            if (source) query = query.ilike('source', `%${source}%`)
            if (destination) query = query.ilike('destination', `%${destination}%`)

            const { data, error } = await query

            if (error) {
                console.error("Error fetching flights:", JSON.stringify(error, null, 2))
                // Also alert visible to user for easier debugging if it happens again
                if (Object.keys(error).length === 0) console.error("Empty error object usually means a Network/CORS failure or Foreign Key mismatch (e.g. requesting a column that doesn't exist on the joined table).")
            } else {
                setFlights(data || [])
            }
            setLoading(false)
        }

        fetchFlights()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [source, destination, date])

    const handleBook = (flight: any) => {
        const passengers = searchParams.get("passengers") || "1"
        router.push(`/book/${flight.id}?passengers=${passengers}`)
    }

    return (
        <>
            <StickySearchBar />

            <main className="max-w-5xl mx-auto px-4 mt-8 relative z-10 pb-20">
                {loading ? (
                    <div className="flex justify-center py-20 bg-white rounded-xl shadow-sm">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {flights.length > 0 ? (
                            flights.map(flight => (
                                <FlightCard
                                    key={flight.id}
                                    flight={flight}
                                    onBook={handleBook}
                                />
                            ))
                        ) : (
                            <div className="text-center py-20 bg-white rounded-xl shadow-sm">
                                <h3 className="text-xl font-medium text-gray-900">No flights found</h3>
                                <p className="text-gray-500 mt-2">Try different cities. (Tip: Try searching for "New York")</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </>
    )
}

export default function SearchPage() {
    return (
        <div className="min-h-screen bg-gray-50 pt-16">
            <Navbar />
            <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>}>
                <SearchResults />
            </Suspense>
        </div>
    )
}
