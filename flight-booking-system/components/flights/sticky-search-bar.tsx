"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Suspense } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Search, PlaneTakeoff, PlaneLanding, Calendar } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const formSchema = z.object({
    source: z.string().min(2),
    destination: z.string().min(2),
    date: z.string().min(1),
    passengers: z.string(),
    class: z.string(),
})

export function StickySearchBar() {
    return (
        <Suspense fallback={<div className="h-[60px] w-full bg-white border-b shadow-md"></div>}>
            <StickySearchBarContent />
        </Suspense>
    )
}

function StickySearchBarContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            source: searchParams.get("source") || "",
            destination: searchParams.get("destination") || "",
            date: searchParams.get("date") || "",
            passengers: searchParams.get("passengers") || "1",
            class: searchParams.get("class") || "economy",
        },
    })

    function onSubmit(values: z.infer<typeof formSchema>) {
        const params = new URLSearchParams()
        if (values.source) params.set("source", values.source)
        if (values.destination) params.set("destination", values.destination)
        if (values.date) params.set("date", values.date)
        params.set("passengers", values.passengers)
        params.set("class", values.class)

        router.push(`/search?${params.toString()}`)
    }

    return (
        <div className="sticky top-16 z-40 bg-white border-b shadow-md py-3">
            <div className="max-w-7xl mx-auto px-4">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-wrap items-center gap-2 md:gap-4">
                        <div className="flex-1 min-w-[140px]">
                            <FormField
                                control={form.control}
                                name="source"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <div className="relative">
                                                <PlaneTakeoff className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                                <Input placeholder="From" className="pl-9 h-9 text-sm" {...field} />
                                            </div>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex-1 min-w-[140px]">
                            <FormField
                                control={form.control}
                                name="destination"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <div className="relative">
                                                <PlaneLanding className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                                <Input placeholder="To" className="pl-9 h-9 text-sm" {...field} />
                                            </div>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="w-[160px]">
                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                                <Input type="date" className="pl-9 h-9 text-sm" {...field} />
                                            </div>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="w-[120px]">
                            <FormField
                                control={form.control}
                                name="passengers"
                                render={({ field }) => (
                                    <FormItem>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-9 text-sm">
                                                    <SelectValue placeholder="Pax" />
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
                        </div>

                        <Button type="submit" size="sm" className="h-9 bg-blue-600 hover:bg-blue-700">
                            SEARCH
                        </Button>
                    </form>
                </Form>
            </div>
        </div>
    )
}
