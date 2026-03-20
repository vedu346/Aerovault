"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export function LoginForm() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (role: string) => {
        setLoading(true)
        const { data: authData, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            alert(error.message) // Replace with proper toast
            setLoading(false)
        } else if (authData?.user) {
            // Fetch real role from DB
            const { data: profile } = await supabase
                .from('users')
                .select('role')
                .eq('id', authData.user.id)
                .single()

            const dbRole = profile?.role || 'user'

            if (dbRole === 'admin') router.push('/admin/dashboard')
            else if (dbRole === 'airline_admin') router.push('/airline/dashboard')
            else router.push('/user')

            router.refresh()
        }
    }

    return (
        <div className="flex justify-center items-center min-h-[80vh]">
            <Tabs defaultValue="customer" className="w-[400px]">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="customer">Customer</TabsTrigger>
                    <TabsTrigger value="company">Airline</TabsTrigger>
                    <TabsTrigger value="admin">Admin</TabsTrigger>
                </TabsList>

                {/* Customer Login */}
                <TabsContent value="customer">
                    <LoginCard
                        title="Customer Login"
                        description="Book your flights with ease"
                        role="customer"
                        email={email} setEmail={setEmail}
                        password={password} setPassword={setPassword}
                        handleLogin={() => handleLogin('customer')}
                        loading={loading}
                    />
                </TabsContent>

                {/* Airline Login */}
                <TabsContent value="company">
                    <LoginCard
                        title="Company Login"
                        description="Manage your flights and passengers"
                        role="company"
                        email={email} setEmail={setEmail}
                        password={password} setPassword={setPassword}
                        handleLogin={() => handleLogin('company')}
                        loading={loading}
                    />
                </TabsContent>

                {/* Admin Login */}
                <TabsContent value="admin">
                    <LoginCard
                        title="Admin Login"
                        description="Access the admin dashboard"
                        role="admin"
                        email={email} setEmail={setEmail}
                        password={password} setPassword={setPassword}
                        handleLogin={() => handleLogin('admin')}
                        loading={loading}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function LoginCard({ title, description, role, email, setEmail, password, setPassword, handleLogin, loading }: any) {
    return (
        <Card className="border-0 shadow-2xl">
            <CardHeader>
                <CardTitle className="text-2xl font-bold text-center">{title}</CardTitle>
                <CardDescription className="text-center">{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor={`email-${role}`}>Email</Label>
                    <Input
                        id={`email-${role}`}
                        type="email"
                        placeholder={role === 'admin' ? 'admin@bsw.com' : 'name@example.com'}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`password-${role}`}>Password</Label>
                    <Input
                        id={`password-${role}`}
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
                    Don't have an account? <span className="text-blue-600 cursor-pointer font-medium">Create Account</span>
                </div>
            </CardFooter>
        </Card>
    )
}
