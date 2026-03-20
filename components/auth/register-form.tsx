"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export function RegisterForm() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [fullName, setFullName] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleRegister = async () => {
        setLoading(true)
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: 'user', // Default role
                },
            },
        })

        if (error) {
            alert(error.message)
            setLoading(false)
        } else {
            alert("Registration successful! Please check your email.")
            router.push('/login')
        }
    }

    return (
        <div className="flex justify-center items-center min-h-[80vh]">
            <Card className="w-[400px] border-0 shadow-2xl">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
                    <CardDescription className="text-center">Start your journey today</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                            id="name"
                            type="text"
                            placeholder="John Doe"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleRegister} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sign Up
                    </Button>
                    <div className="text-sm text-center text-gray-500">
                        Already have an account? <span className="text-blue-600 cursor-pointer font-medium" onClick={() => router.push('/login')}>Sign In</span>
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
