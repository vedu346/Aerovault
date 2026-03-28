"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import Navbar from "@/components/navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const formSchema = z.object({
    flight_number: z.string().min(2, { message: "Flight number must be at least 2 characters." }),
    departure_city: z.string().min(2, { message: "Departure city is required." }),
    arrival_city: z.string().min(2, { message: "Arrival city is required." }),
    departure_time: z.string().min(1, { message: "Departure time is required." }),
    arrival_time: z.string().min(1, { message: "Arrival time is required." }),
    price: z.string().regex(/^\d+(\.\d{1,2})?$/, { message: "Invalid price format." }),
    seats_available: z.string().regex(/^\d+$/, { message: "Must be a number." }),
    meal_available: z.boolean(),
})

export default function NewFlightPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [companyId, setCompanyId] = useState<string | null>(null)
    const supabase = createClient()

    useEffect(() => {
        async function checkUser() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
            }
        }
        checkUser()
    }, [router, supabase.auth])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            flight_number: "",
            departure_city: "",
            arrival_city: "",
            departure_time: "",
            arrival_time: "",
            price: "",
            seats_available: "100",
            meal_available: false,
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // 1. Fetch user's profile to get their airline_id (company ID)
        const { data: profile } = await supabase
            .from('users')
            .select('airline_id')
            .eq('id', user.id)
            .single()

        if (!profile?.airline_id) {
            alert('Error: You are not assigned to an airline.')
            setLoading(false)
            return
        }

        const { error } = await supabase.from('flights').insert({
            airline_id: profile.airline_id,
            flight_number: values.flight_number,
            source: values.departure_city,
            destination: values.arrival_city,
            departure_time: new Date(values.departure_time).toISOString(),
            arrival_time: new Date(values.arrival_time).toISOString(),
            price: parseFloat(values.price),
            total_seats: parseInt(values.seats_available),
            available_seats: parseInt(values.seats_available),
            meal_available: values.meal_available,
        })

        setLoading(false)

        if (error) {
            alert('Error adding flight: ' + error.message)
        } else {
            router.push('/airline/dashboard')
            router.refresh()
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8 pt-24">
                <Card>
                    <CardHeader>
                        <CardTitle>Add New Flight</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="flight_number"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Flight Number</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. DA101" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="price"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Price ($)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="150.00" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="departure_city"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Departure City</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="New York" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="arrival_city"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Arrival City</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="London" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="departure_time"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Departure Time</FormLabel>
                                                <FormControl>
                                                    <Input type="datetime-local" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="arrival_time"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Arrival Time</FormLabel>
                                                <FormControl>
                                                    <Input type="datetime-local" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4 items-center">
                                    <FormField
                                        control={form.control}
                                        name="seats_available"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Seats Available</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="meal_available"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel>
                                                        Meal Inclusive
                                                    </FormLabel>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                                    {loading ? "Adding Flight..." : "Add Flight"}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
