"use client"

import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { User, Phone, Mail, Plus, Trash2 } from "lucide-react"

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

const passengerSchema = z.object({
    first_name: z.string().min(2, "First name is required"),
    last_name: z.string().min(2, "Last name is required"),
    age: z.number().min(1, "Age must be at least 1").max(120, "Age must be less than 120"),
    gender: z.string().min(1, "Select gender"),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
})

const formSchema = z.object({
    contact_email: z.string().email("Invalid email address"),
    contact_phone: z.string().min(10, "Phone number must be at least 10 digits"),
    passengers: z.array(passengerSchema)
})

interface PassengerFormProps {
    passengersCount: number
    onSubmit: (data: any) => void
    initialData?: any
}

export function PassengerForm({ passengersCount, onSubmit, initialData }: PassengerFormProps) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData || {
            contact_email: "",
            contact_phone: "",
            passengers: Array(passengersCount).fill({
                first_name: "",
                last_name: "",
                age: 0,
                gender: "",
                email: "",
                phone: ""
            })
        },
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "passengers",
    })

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                {/* Contact Details */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Mail className="h-5 w-5 text-blue-600" />
                        Contact Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="contact_email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email Address</FormLabel>
                                    <FormControl>
                                        <Input placeholder="ticket@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="contact_phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Mobile Number</FormLabel>
                                    <FormControl>
                                        <Input placeholder="+1 234 567 8900" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Your ticket will be sent to this email address.</p>
                </div>

                {/* Passengers */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <User className="h-5 w-5 text-blue-600" />
                            Traveller Details
                        </h3>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={() => append({
                                first_name: "",
                                last_name: "",
                                age: 0,
                                gender: "",
                                email: "",
                                phone: ""
                            })}
                        >
                            <Plus className="h-4 w-4" />
                            Add Traveller
                        </Button>
                    </div>

                    {fields.map((field, index) => (
                        <div key={field.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative group">
                            <div className="flex justify-between items-center mb-4">
                                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">
                                    Passenger {index + 1}
                                </span>
                                {fields.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-gray-400 hover:text-red-500"
                                        onClick={() => remove(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <FormField
                                    control={form.control}
                                    name={`passengers.${index}.first_name`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>First Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="John" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`passengers.${index}.last_name`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Last Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Doe" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`passengers.${index}.gender`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Gender</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="male">Male</SelectItem>
                                                    <SelectItem value="female">Female</SelectItem>
                                                    <SelectItem value="other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`passengers.${index}.age`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Age</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="25"
                                                    {...field}
                                                    onChange={event => field.onChange(event.target.valueAsNumber)}
                                                    value={field.value || ""}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end">
                    <Button type="submit" size="lg" className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto">
                        Continue to Seat Selection
                    </Button>
                </div>
            </form>
        </Form>
    )
}
