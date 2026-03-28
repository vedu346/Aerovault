"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Shield, Plane, User } from "lucide-react"

// DB role enum values → dashboard routes
const ROLE_DASHBOARDS: Record<string, string> = {
    admin: '/admin/dashboard',
    flight_company: '/airline/dashboard',
    customer: '/user',
}

export function LoginForm() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async () => {
        setLoading(true)
        setError(null)

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (authError) {
            setError(authError.message)
            setLoading(false)
            return
        }

        if (authData?.user) {
            // Fetch real role from DB using the actual enum values
            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('role')
                .eq('id', authData.user.id)
                .single()

            if (profileError || !profile) {
                setError("Could not fetch your profile. Please try again.")
                setLoading(false)
                return
            }

            const dbRole = profile.role as string
            const destination = ROLE_DASHBOARDS[dbRole] || '/'

            console.log(`Login success: role=${dbRole}, redirecting to ${destination}`)
            router.push(destination)
            router.refresh()
        }
    }

    return (
        <div className="flex justify-center items-center min-h-[80vh]">
            <Tabs defaultValue="customer" className="w-[420px]">
                <TabsList className="grid w-full grid-cols-3 mb-4 bg-slate-100">
                    <TabsTrigger value="customer" className="flex items-center gap-1.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                        <User size={14} /> Customer
                    </TabsTrigger>
                    <TabsTrigger value="company" className="flex items-center gap-1.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                        <Plane size={14} /> Airline
                    </TabsTrigger>
                    <TabsTrigger value="admin" className="flex items-center gap-1.5 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                        <Shield size={14} /> Admin
                    </TabsTrigger>
                </TabsList>

                {/* Customer Login */}
                <TabsContent value="customer">
                    <LoginCard
                        title="Customer Login"
                        description="Book your flights with ease"
                        accentColor="blue"
                        placeholder="name@example.com"
                        email={email} setEmail={setEmail}
                        password={password} setPassword={setPassword}
                        handleLogin={handleLogin}
                        loading={loading}
                        error={error}
                    />
                </TabsContent>

                {/* Airline Login */}
                <TabsContent value="company">
                    <LoginCard
                        title="Airline Login"
                        description="Manage your flights and passengers"
                        accentColor="indigo"
                        placeholder="airline@example.com"
                        email={email} setEmail={setEmail}
                        password={password} setPassword={setPassword}
                        handleLogin={handleLogin}
                        loading={loading}
                        error={error}
                    />
                </TabsContent>

                {/* Admin Login */}
                <TabsContent value="admin">
                    <LoginCard
                        title="Admin Login"
                        description="Access the admin control panel"
                        accentColor="purple"
                        placeholder="admin@aerovault.com"
                        email={email} setEmail={setEmail}
                        password={password} setPassword={setPassword}
                        handleLogin={handleLogin}
                        loading={loading}
                        error={error}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}

const ACCENT_CLASSES: Record<string, { btn: string; border: string }> = {
    blue:   { btn: 'bg-blue-600 hover:bg-blue-700',   border: 'border-blue-200' },
    indigo: { btn: 'bg-indigo-600 hover:bg-indigo-700', border: 'border-indigo-200' },
    purple: { btn: 'bg-purple-600 hover:bg-purple-700', border: 'border-purple-200' },
}

function LoginCard({
    title, description, accentColor, placeholder,
    email, setEmail, password, setPassword,
    handleLogin, loading, error
}: {
    title: string
    description: string
    accentColor: string
    placeholder: string
    email: string
    setEmail: (v: string) => void
    password: string
    setPassword: (v: string) => void
    handleLogin: () => void
    loading: boolean
    error: string | null
}) {
    const accent = ACCENT_CLASSES[accentColor] || ACCENT_CLASSES.blue

    return (
        <Card className={`border-2 ${accent.border} shadow-2xl`}>
            <CardHeader>
                <CardTitle className="text-2xl font-bold text-center">{title}</CardTitle>
                <CardDescription className="text-center">{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm text-red-700 font-medium">
                        {error}
                    </div>
                )}
                <div className="space-y-2">
                    <Label htmlFor={`email-${accentColor}`}>Email</Label>
                    <Input
                        id={`email-${accentColor}`}
                        type="email"
                        placeholder={placeholder}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`password-${accentColor}`}>Password</Label>
                    <Input
                        id={`password-${accentColor}`}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    />
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
                <Button
                    className={`w-full text-white ${accent.btn}`}
                    onClick={handleLogin}
                    disabled={loading || !email || !password}
                >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                </Button>
                <div className="text-sm text-center text-gray-500">
                    Don&apos;t have an account?{' '}
                    <a href="/register" className="text-blue-600 hover:underline font-medium">
                        Create Account
                    </a>
                </div>
            </CardFooter>
        </Card>
    )
}
