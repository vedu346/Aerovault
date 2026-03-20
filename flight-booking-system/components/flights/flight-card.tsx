"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plane, ChevronDown, ChevronUp, Utensils, Luggage, Info } from "lucide-react"

interface Flight {
    id: string
    flight_number: string
    airline_name?: string
    company?: {
        company_name: string
    }
    source: string
    destination: string
    arrival_time: string
    price: number
    duration?: string
    departure_time: string
    meal_available: boolean
    status: string
}

interface FlightCardProps {
    flight: Flight
    onBook: (flight: Flight) => void
}

// Helper function to format time
const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Helper to calculate duration
const calculateDuration = (start: string, end: string) => {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const diff = endTime - startTime;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
};

export function FlightCard({ flight, onBook }: FlightCardProps) {
    const [expanded, setExpanded] = useState(false);
    const companyName = flight.company?.company_name || flight.airline_name || "Unknown Airline";
    const duration = calculateDuration(flight.departure_time, flight.arrival_time);

    return (
        <Card className="group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-none bg-white rounded-[2rem] overflow-hidden mb-6 shadow-sm border border-gray-100">
            <CardContent className="p-0">
                <div className="p-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">

                        {/* Airline Info & Status */}
                        <div className="flex items-center gap-5 w-full md:w-1/4">
                            <div className="bg-blue-50 p-4 rounded-2xl group-hover:bg-blue-600 transition-all duration-300">
                                <Plane className="h-6 w-6 text-blue-600 group-hover:text-white transition-colors" />
                            </div>
                            <div>
                                <h3 className="font-bold text-xl text-gray-900 leading-tight">{companyName}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-xs text-gray-400 font-mono tracking-wider">{flight.flight_number}</p>
                                    <Badge variant={flight.status === 'cancelled' ? 'destructive' : 'secondary'} className="text-[10px] h-5 rounded-full px-2">
                                        {flight.status.toUpperCase()}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Itinerary */}
                        <div className="flex items-center gap-6 w-full md:w-2/5 justify-center">
                            <div className="text-right">
                                <p className="font-black text-2xl text-gray-900 leading-none">{formatTime(flight.departure_time)}</p>
                                <p className="text-sm text-gray-500 font-bold uppercase tracking-tight mt-1">{flight.source}</p>
                            </div>

                            <div className="flex flex-col items-center px-4 w-32 relative group/line">
                                <p className="text-[10px] font-bold text-blue-500 mb-2 uppercase tracking-widest">{duration}</p>
                                <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-gray-200 to-transparent relative flex items-center justify-center transition-all group-hover/line:via-blue-300">
                                    <div className="w-2 h-2 rounded-full border-2 border-gray-200 bg-white absolute left-0" />
                                    <Plane className="h-4 w-4 text-gray-300 absolute transform rotate-90 transition-all group-hover/line:text-blue-500" />
                                    <div className="w-2 h-2 rounded-full border-2 border-gray-200 bg-white absolute right-0" />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2 font-medium uppercase tracking-widest">Non-stop</p>
                            </div>

                            <div className="text-left">
                                <p className="font-black text-2xl text-gray-900 leading-none">{formatTime(flight.arrival_time)}</p>
                                <p className="text-sm text-gray-500 font-bold uppercase tracking-tight mt-1">{flight.destination}</p>
                            </div>
                        </div>

                        {/* Price & Action */}
                        <div className="flex items-center justify-between md:justify-end gap-8 w-full md:w-1/3 border-t md:border-t-0 pt-6 md:pt-0 mt-2 md:mt-0">
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Per traveler</p>
                                <p className="text-3xl font-black text-gray-900">₹{flight.price}</p>
                            </div>
                            <Button
                                onClick={() => onBook(flight)}
                                variant="premium"
                                className="px-10 h-14 text-lg font-bold rounded-2xl shadow-xl shadow-blue-500/20"
                                disabled={flight.status !== 'scheduled'}
                            >
                                {flight.status === 'scheduled' ? 'Select' : 'Full'}
                            </Button>
                        </div>

                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center gap-4 mt-6 pt-4 border-t border-dashed border-gray-200">
                        {flight.meal_available && (
                            <div className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded">
                                <Utensils className="h-3 w-3" /> Free Meal
                            </div>
                        )}
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:underline ml-auto focus:outline-none"
                        >
                            {expanded ? "Hide Details" : "View Flight Details"}
                            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                    </div>
                </div>

                {/* Expanded Details */}
                {expanded && (
                    <div className="bg-gray-50 p-6 border-t animate-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    <Luggage className="h-4 w-4 text-gray-500" /> Baggage
                                </h4>
                                <ul className="text-xs text-gray-600 space-y-1">
                                    <li>Check-in: 15kg (1 piece)</li>
                                    <li>Cabin: 7kg (1 piece)</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    <Plane className="h-4 w-4 text-gray-500" /> Aircraft Info
                                </h4>
                                <p className="text-xs text-gray-600">
                                    Airbus A320neo • Narrow body
                                </p>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    <Info className="h-4 w-4 text-gray-500" /> Booking Policy
                                </h4>
                                <p className="text-xs text-gray-600">
                                    Cancellation fee: ₹50 before 24h.
                                    <br />
                                    Non-refundable within 24h.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
