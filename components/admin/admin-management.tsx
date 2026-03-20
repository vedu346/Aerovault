"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { 
    Trash2, 
    UserCog, 
    XCircle, 
    Eye, 
    Plus, 
    Edit, 
    Loader2,
    CheckCircle2
} from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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
import { useForm } from "react-hook-form"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

// Delete User Component
export function DeleteUserButton({ userId, email }: { userId: string, email: string }) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete user ${email}? This will remove all their data.`)) return
        
        setLoading(true)
        const { error } = await supabase.from('users').delete().eq('id', userId)
        
        if (error) {
            alert("Error deleting user: " + error.message)
        } else {
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            onClick={handleDelete}
            disabled={loading}
        >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
    )
}

// Update User Role Component
export function UpdateUserRoleSelect({ userId, currentRole }: { userId: string, currentRole: string }) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleRoleChange = async (newRole: string) => {
        setLoading(true)
        const { error } = await supabase
            .from('users')
            .update({ role: newRole })
            .eq('id', userId)

        if (error) {
            alert("Error updating role: " + error.message)
        } else {
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <Select defaultValue={currentRole} onValueChange={handleRoleChange} disabled={loading}>
            <SelectTrigger className="w-[140px] h-8 text-xs font-semibold">
                <SelectValue placeholder="Select Role" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="airline_admin">Airline Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
        </Select>
    )
}

// Cancel Booking Component
export function CancelBookingButton({ bookingId }: { bookingId: string }) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleCancel = async () => {
        if (!confirm("Are you sure you want to cancel this booking?")) return
        
        setLoading(true)
        const { error } = await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', bookingId)

        if (error) {
            alert("Error canceling booking: " + error.message)
        } else {
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <Button 
            variant="ghost" 
            size="sm" 
            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 gap-1.5 font-semibold h-8 px-2.5"
            onClick={handleCancel}
            disabled={loading}
        >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
            <span className="text-[12px]">Cancel</span>
        </Button>
    )
}

// Passenger Details Modal
export function BookingDetailsDialog({ booking, bookingId, passengerCount, children }: { booking?: any, bookingId?: string, passengerCount?: number, children?: React.ReactNode }) {
    const [passengers, setPassengers] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    const finalBookingId = booking?.id || bookingId
    const finalPassengerCount = booking?.passengers?.length || passengerCount || 0

    const fetchPassengers = async () => {
        if (!finalBookingId) return
        setLoading(true)
        const { data, error } = await supabase
            .from('passengers')
            .select('*')
            .eq('booking_id', finalBookingId)
        
        if (data) setPassengers(data)
        setLoading(false)
    }

    return (
        <Dialog onOpenChange={(open: boolean) => open && fetchPassengers()}>
            <DialogTrigger asChild>
                {children ? (
                    <div className="cursor-pointer hover:opacity-80 transition-opacity">
                        {children}
                    </div>
                ) : (
                    <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-8 gap-1.5 font-semibold px-2.5">
                        <Eye className="h-3.5 w-3.5" /> 
                        <span className="text-[12px]">View ({passengerCount})</span>
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-[18px] font-bold">Passenger Details</DialogTitle>
                    <DialogDescription className="text-[14px]">
                        Information for all travelers in this booking.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {loading ? (
                        <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>
                    ) : (
                        <div className="space-y-3">
                            {passengers.map((p, i) => (
                                <div key={i} className="p-4 rounded-xl border bg-slate-50/50 border-slate-200">
                                    <p className="font-bold text-slate-900 text-[16px]">{p.first_name} {p.last_name}</p>
                                    <div className="flex gap-4 text-[14px] text-slate-500 mt-1 capitalize font-medium">
                                        <span>{p.gender}</span>
                                        <span className="h-1 w-1 rounded-full bg-slate-200 self-center" />
                                        <span>{p.age} Years</span>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">{p.email || 'No email'} | {p.phone || 'No phone'}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

// DELETE Flight Component
export function DeleteFlightButton({ flightId, flightNumber }: { flightId: string, flightNumber: string }) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to REMOVE flight ${flightNumber}? This will also cancel all associated bookings.`)) return
        
        setLoading(true)
        const { error } = await supabase.from('flights').delete().eq('id', flightId)
        
        if (error) {
            alert("Error deleting flight: " + error.message)
        } else {
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            onClick={handleDelete}
            disabled={loading}
        >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
    )
}

// Flight Form Dialog (Add/Edit)
const flightSchema = z.object({
    flight_number: z.string().min(2),
    source: z.string().min(2),
    destination: z.string().min(2),
    departure_time: z.string().min(1),
    arrival_time: z.string().min(1),
    price: z.string().regex(/^\d+(\.\d{1,2})?$/),
    total_seats: z.string().regex(/^\d+$/),
    meal_available: z.boolean(),
    airline_id: z.string().uuid()
})

export function FlightManagementDialog({ flight, airlines }: { flight?: any, airlines: any[] }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const form = useForm<z.infer<typeof flightSchema>>({
        resolver: zodResolver(flightSchema),
        defaultValues: {
            flight_number: flight?.flight_number || "",
            source: flight?.source || "",
            destination: flight?.destination || "",
            departure_time: flight?.departure_time ? new Date(flight.departure_time).toISOString().slice(0, 16) : "",
            arrival_time: flight?.arrival_time ? new Date(flight.arrival_time).toISOString().slice(0, 16) : "",
            price: flight?.price?.toString() || "1000",
            total_seats: flight?.total_seats?.toString() || "100",
            meal_available: flight?.meal_available || false,
            airline_id: flight?.airline_id || (airlines[0]?.airline_id || "")
        }
    })

    const onSubmit = async (values: z.infer<typeof flightSchema>) => {
        setLoading(true)
        const flightData = {
            flight_number: values.flight_number,
            source: values.source,
            destination: values.destination,
            departure_time: new Date(values.departure_time).toISOString(),
            arrival_time: new Date(values.arrival_time).toISOString(),
            price: parseFloat(values.price),
            total_seats: parseInt(values.total_seats),
            available_seats: flight ? flight.available_seats : parseInt(values.total_seats),
            meal_available: values.meal_available,
            airline_id: values.airline_id
        }

        let error
        if (flight) {
            const { error: err } = await supabase.from('flights').update(flightData).eq('id', flight.id)
            error = err
        } else {
            const { error: err } = await supabase.from('flights').insert(flightData)
            error = err
        }

        if (error) {
            alert("Error: " + error.message)
        } else {
            setOpen(false)
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {flight ? (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                        <Edit className="h-3.5 w-3.5" />
                    </Button>
                ) : (
                    <Button className="bg-slate-900 hover:bg-slate-800 text-white font-semibold gap-2 shadow-sm">
                        <Plus className="h-4 w-4" /> Add Flight
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{flight ? 'Edit Flight' : 'Add New Flight'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="airline_id" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Airline</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Select Airline" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {airlines.map(a => (
                                                <SelectItem key={a.id} value={a.airline_id}>{a.company?.company_name || a.email}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="flight_number" render={({ field }) => (
                                <FormItem><FormLabel>Flight #</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                            )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="source" render={({ field }) => (
                                <FormItem><FormLabel>Source</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="destination" render={({ field }) => (
                                <FormItem><FormLabel>Destination</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                            )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="departure_time" render={({ field }) => (
                                <FormItem><FormLabel>Departure</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="arrival_time" render={({ field }) => (
                                <FormItem><FormLabel>Arrival</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl></FormItem>
                            )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="price" render={({ field }) => (
                                <FormItem><FormLabel>Price (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="total_seats" render={({ field }) => (
                                <FormItem><FormLabel>Seats</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="meal_available" render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <div className="space-y-1 leading-none"><FormLabel>Meal Inclusive</FormLabel></div>
                            </FormItem>
                        )} />
                        <DialogFooter>
                            <Button type="submit" className="w-full bg-blue-600" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin" /> : (flight ? 'Update Flight' : 'Create Flight')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
