"use client"

import { useState, useEffect } from "react"
import Navbar from "@/components/navbar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plane, RefreshCw } from "lucide-react"
import dynamic from 'next/dynamic'

const FlightMap = dynamic(() => import('@/components/tracker/flight-map'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-900 flex items-center justify-center text-white">Loading Map...</div>
})

interface FlightStatus {
    id: string
    flight_number: string
    airline: string
    source: string
    destination: string
    status: "On Time" | "Delayed" | "In Air" | "Landed" | "Scheduled"
    departure_time: string
    arrival_time: string
    gate?: string
}

const INITIAL_FLIGHTS: FlightStatus[] = [
    { id: "1", flight_number: "DA101", airline: "Demo Airlines", source: "New York (JFK)", destination: "London (LHR)", status: "In Air", departure_time: "10:00 AM", arrival_time: "10:00 PM" },
    { id: "2", flight_number: "AA452", airline: "American", source: "Los Angeles (LAX)", destination: "Tokyo (HND)", status: "Scheduled", departure_time: "02:30 PM", arrival_time: "05:00 PM (+1)" },
    { id: "3", flight_number: "BA189", airline: "British Airways", source: "London (LHR)", destination: "Paris (CDG)", status: "Landed", departure_time: "08:00 AM", arrival_time: "10:15 AM" },
    { id: "4", flight_number: "DL992", airline: "Delta", source: "Atlanta (ATL)", destination: "Dubai (DXB)", status: "Delayed", departure_time: "06:45 PM", arrival_time: "08:30 PM (+1)" },
    { id: "5", flight_number: "EK202", airline: "Emirates", source: "New York (JFK)", destination: "Dubai (DXB)", status: "In Air", departure_time: "11:00 AM", arrival_time: "08:00 AM (+1)" },
]

export default function TrackerPage() {
    const [flights, setFlights] = useState<FlightStatus[]>(INITIAL_FLIGHTS)
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        async function fetchFlights() {
            try {
                const res = await fetch('/api/tracker')
                if (!res.ok) throw new Error('Failed to fetch')
                const data = await res.json()

                if (data.data && Array.isArray(data.data)) {
                    const apiFlights: FlightStatus[] = data.data
                        .filter((f: any) => f.flight?.iata && f.airline?.name && f.departure?.airport && f.arrival?.airport)
                        .map((f: any) => ({
                            id: f.flight.iata,
                            flight_number: f.flight.iata,
                            airline: f.airline.name,
                            source: f.departure.airport,
                            destination: f.arrival.airport,
                            status: f.flight_status === 'active' ? 'In Air' : f.flight_status === 'scheduled' ? 'Scheduled' : 'Landed',
                            departure_time: new Date(f.departure.scheduled).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            arrival_time: new Date(f.arrival.scheduled).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        }))
                    if (apiFlights.length > 0) setFlights(apiFlights)
                }
            } catch (error) {
                console.log("Using demo data due to API error/limit")
            }
            setLastUpdated(new Date())
        }

        fetchFlights()
        const interval = setInterval(fetchFlights, 60000)

        return () => clearInterval(interval)
    }, [])

    const getStatusColor = (status: string) => {
        switch (status) {
            case "On Time": return "bg-green-500 hover:bg-green-600"
            case "In Air": return "bg-blue-500 hover:bg-blue-600"
            case "Delayed": return "bg-red-500 hover:bg-red-600"
            case "Landed": return "bg-gray-500 hover:bg-gray-600"
            default: return "bg-slate-500 hover:bg-slate-600"
        }
    }

    // Render a loading skeleton during SSR to prevent Dark Reader hydration mismatch
    if (!mounted) {
        return (
            <div className="min-h-screen bg-gray-50/50">
                <Navbar />
                <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 pt-24">
                    <div className="flex justify-center items-center h-64">
                        <p className="text-gray-400 text-lg">Loading Flight Tracker...</p>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50/50">
            <Navbar />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 pt-24">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                            <Plane className="h-8 w-8 text-blue-600" />
                            Live Flight Tracker
                        </h1>
                        <p className="text-gray-500 mt-2">
                            Real-time flight status visualization.
                            <span className="text-xs ml-2 bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                                DEMO MODE
                            </span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-3 py-1.5 rounded-md border shadow-sm">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Updated: {lastUpdated.toLocaleTimeString()}
                    </div>
                </div>

                {/* Map View */}
                <Card className="mb-8 border-none shadow-lg overflow-hidden relative h-[400px] z-0">
                    <FlightMap flights={flights} />
                </Card>

                {/* Flight List */}
                <div className="grid gap-4">
                    {flights.map((flight) => (
                        <Card key={flight.id} className="hover:shadow-md transition-shadow duration-200">
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="flex items-center gap-4 w-full md:w-1/4">
                                        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold">
                                            {(flight.flight_number ?? '??').substring(0, 2)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-lg">{flight.flight_number}</p>
                                            <p className="text-sm text-gray-500">{flight.airline}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 w-full md:w-1/2 justify-center">
                                        <div className="text-right">
                                            <p className="font-medium text-gray-900">{flight.source}</p>
                                            <p className="text-xs text-gray-400">{flight.departure_time}</p>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <div className="w-24 h-[1px] bg-gray-300 relative">
                                                <Plane className="h-4 w-4 text-gray-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90" />
                                            </div>
                                        </div>
                                        <div className="text-left">
                                            <p className="font-medium text-gray-900">{flight.destination}</p>
                                            <p className="text-xs text-gray-400">{flight.arrival_time}</p>
                                        </div>
                                    </div>

                                    <div className="w-full md:w-1/4 flex justify-end">
                                        <Badge className={`px-4 py-1.5 text-sm font-medium ${getStatusColor(flight.status)} border-none text-white`}>
                                            {flight.status}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </main>
        </div>
    )
}
