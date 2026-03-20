"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { PlaneTakeoff, PlaneLanding, Search } from "lucide-react"
import { useForm } from "react-hook-form"
import * as z from "zod"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const formSchema = z.object({
    source: z.string().min(2, {
        message: "Source city is required.",
    }),
    destination: z.string().min(2, {
        message: "Destination city is required.",
    }),
    date: z.string().min(1, {
        message: "Date of flight is required.",
    }),
    passengers: z.string(),
    class: z.string(),
})

import { useRouter } from "next/navigation"

// ... (schema code)

export function FlightSearchForm() {
    const router = useRouter()
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            source: "",
            destination: "",
            date: "",
            passengers: "1",
            class: "economy",
        },
    })

    function onSubmit(values: z.infer<typeof formSchema>) {
        const params = new URLSearchParams()
        if (values.source) params.set("source", values.source)
        if (values.destination) params.set("destination", values.destination)
        if (values.date) params.set("date", values.date)
        params.set("passengers", values.passengers)
        params.set("class", values.class)

        // Redirect to search page
        // We use window.location.href because we might be on a client component deep in the tree and want a full nav, 
        // but router.push is better for SPA feel. I'll use router.push if I define router.
        // Wait, I need to add useRouter hook.
        router.push(`/search?${params.toString()}`)
    }

    return (
        <div className="w-full max-w-5xl mx-auto">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                        {/* Source */}
                        <div className="md:col-span-1">
                            <FormField
                                control={form.control}
                                name="source"
                                render={({ field }) => (
                                    <FormItem className="relative flex flex-col">
                                        <FormLabel className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] ml-1 mb-1.5 leading-none">From</FormLabel>
                                        <FormControl>
                                            <div className="relative group">
                                                <PlaneTakeoff className="absolute left-3 top-4 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                                <Input placeholder="City" className="pl-10 h-14 bg-gray-50/50 border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 rounded-2xl transition-all font-medium" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Destination */}
                        <div className="md:col-span-1">
                            <FormField
                                control={form.control}
                                name="destination"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] ml-1 mb-1.5 leading-none">To</FormLabel>
                                        <FormControl>
                                            <div className="relative group">
                                                <PlaneLanding className="absolute left-3 top-4 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                                <Input placeholder="City" className="pl-10 h-14 bg-gray-50/50 border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 rounded-2xl transition-all font-medium" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Date Picker (Native) */}
                        <div className="md:col-span-1">
                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] ml-1 mb-1.5 leading-none">Departure</FormLabel>
                                        <FormControl>
                                            <div className="relative group">
                                                <Input
                                                    type="date"
                                                    className="h-14 bg-gray-50/50 border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 rounded-2xl transition-all block w-full font-medium"
                                                    {...field}
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Search Button */}
                        <div className="md:col-span-1 flex flex-col justify-end h-full">
                            <div className="h-4 hidden md:block" /> {/* Alignment spacer for labels */}
                            <Button type="submit" variant="premium" className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-blue-500/20">
                                <Search className="mr-2 h-6 w-6" /> Search
                            </Button>
                        </div>
                    </div>

                    {/* Secondary Filters */}
                    <div className="flex gap-4 pt-2">
                        <FormField
                            control={form.control}
                            name="passengers"
                            render={({ field }) => (
                                <FormItem className="w-40">
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="bg-transparent border-none text-gray-600 font-medium hover:text-blue-600 p-0 h-auto">
                                                <SelectValue placeholder="Passengers" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="1">1 Passenger</SelectItem>
                                            <SelectItem value="2">2 Passengers</SelectItem>
                                            <SelectItem value="3">3 Passengers</SelectItem>
                                            <SelectItem value="4">4+ Passengers</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="class"
                            render={({ field }) => (
                                <FormItem className="w-40">
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="bg-transparent border-none text-gray-600 font-medium hover:text-blue-600 p-0 h-auto">
                                                <SelectValue placeholder="Class" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="economy">Economy</SelectItem>
                                            <SelectItem value="business">Business</SelectItem>
                                            <SelectItem value="first">First Class</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                    </div>
                </form>
            </Form>
        </div>
    )
}
