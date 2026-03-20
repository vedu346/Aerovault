"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface SingleLoginFormProps {
    role: 'user' | 'airline_admin' | 'admin';
    title: string;
    description: string;
}

export function SingleLoginForm({ role, title, description }: SingleLoginFormProps) {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async () => {
        setLoading(true)
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            alert(error.message)
            setLoading(false)
        } else {
            // Fetch real role from DB
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single()

            const dbRole = profile?.role || 'user'

            if (dbRole === 'admin') router.push('/admin/dashboard')
            else if (dbRole === 'airline_admin') router.push('/airline/dashboard')
            else router.push('/user')

            router.refresh()
        }
    }

    return (
        <div className="flex justify-center items-center min-h-[60vh]">
            <Card className="w-[400px] border-0 shadow-2xl">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">{title}</CardTitle>
                    <CardDescription className="text-center">{description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder={role === 'admin' ? 'admin@bsw.com' : role === 'airline_admin' ? 'airline@company.com' : 'name@example.com'}
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
                    <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleLogin} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sign In
                    </Button>
                    <div className="text-sm text-center text-gray-500">
                        Don't have an account? <span className="text-blue-600 cursor-pointer font-medium" onClick={() => router.push('/register')}>Create Account</span>
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
