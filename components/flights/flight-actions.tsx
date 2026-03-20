"use client"

import { useState } from "react"
import { MoreHorizontal, Trash2, PauseCircle, PlayCircle } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface FlightActionsProps {
    flightId: string
    currentStatus: "scheduled" | "cancelled" | "delayed"
}

export function FlightActions({ flightId, currentStatus }: FlightActionsProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    async function toggleStatus() {
        setLoading(true)
        const newStatus = currentStatus === "cancelled" ? "scheduled" : "cancelled"

        const { error } = await supabase
            .from('flights')
            .update({ status: newStatus })
            .eq('id', flightId)

        if (error) {
            alert("Error updating status: " + error.message)
        } else {
            router.refresh()
        }
        setLoading(false)
    }

    async function deleteFlight() {
        if (!confirm("Are you sure you want to delete this flight?")) return

        setLoading(true)
        const { error } = await supabase
            .from('flights')
            .delete()
            .eq('id', flightId)

        if (error) {
            alert("Error deleting flight: " + error.message)
        } else {
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0" disabled={loading}>
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={toggleStatus}>
                    {currentStatus === "cancelled" ? (
                        <>
                            <PlayCircle className="mr-2 h-4 w-4" /> Resume Flight
                        </>
                    ) : (
                        <>
                            <PauseCircle className="mr-2 h-4 w-4" /> Put on Hold
                        </>
                    )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={deleteFlight} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Flight
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
