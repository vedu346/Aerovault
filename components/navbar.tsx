"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Plane, User, LogOut, Ticket } from "lucide-react"

export default function Navbar() {
    const pathname = usePathname()

    const [user, setUser] = useState<any>(null)
    const [mounted, setMounted] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const supabase = createClient()
    
    const isHome = pathname === '/'
    const isAdminPage = pathname?.startsWith('/admin')

    const navBackground = isHome 
        ? (scrolled ? "bg-black/40 backdrop-blur-xl border-b border-white/10 shadow-2xl" : "bg-black/10 backdrop-blur-md border-b border-white/20")
        : (scrolled ? "bg-white/90 backdrop-blur-2xl border-b border-gray-200/50 shadow-xl" : "bg-white/40 backdrop-blur-xl border-b border-white/50 shadow-sm")
        
    const textColor = isHome ? "text-white hover:text-white/80" : "text-gray-800 hover:text-blue-600"
    const subtleColor = isHome 
        ? "text-white/70 hover:text-white" 
        : "text-gray-500 hover:text-indigo-600"
    const logoColor = (isHome && !scrolled) 
        ? "text-white" 
        : "bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"


    useEffect(() => {
        setMounted(true)

        const handleScroll = () => {
            setScrolled(window.scrollY > 20)
        }
        window.addEventListener('scroll', handleScroll)

        const checkUser = async () => {
            const { data } = await supabase.auth.getUser()
            setUser(data.user)
        }
        checkUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
        })

        return () => {
            window.removeEventListener('scroll', handleScroll)
            subscription.unsubscribe()
        }
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        window.location.href = '/'
    }

    // Render a placeholder during SSR to avoid hydration mismatch from browser
    // extensions (e.g. Dark Reader) that inject attributes into SVG elements
    if (!mounted) {
        return (
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${navBackground}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16" />
                </div>
            </nav>
        )
    }

    return (
        <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${navBackground}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-2">
                        <div className={`p-2 rounded-full ${isHome ? 'bg-white/20' : 'bg-blue-600'}`}>
                            <Plane className="h-6 w-6 text-white" />
                        </div>
                        <span className={`text-xl font-bold ${logoColor}`}>
                            Aerovault
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        <Link href="/" className={`${textColor} transition-colors font-medium`}>
                            Home
                        </Link>
                        {!isAdminPage && (
                            <>
                                <Link href="/search" className={`${textColor} transition-colors font-medium`}>
                                    Book Flight
                                </Link>
                                <Link href="/tracker" className={`${textColor} transition-colors font-medium flex items-center gap-1`}>
                                    <Plane className="h-4 w-4" /> Live Status
                                </Link>
                                {mounted && user && (
                                    <Link href="/user/my-tickets" className={`${textColor} transition-colors font-medium flex items-center gap-1`}>
                                        <Ticket className="h-4 w-4" /> My Tickets
                                    </Link>
                                )}
                            </>
                        )}
                        {isAdminPage && (
                            <Link href="/admin/dashboard" className={`${textColor} transition-colors font-medium`}>
                                Dashboard
                            </Link>
                        )}
                    </div>

                    {/* Auth Buttons */}
                    <div className="flex items-center space-x-4">
                        {!mounted ? (
                            <div className="h-10 w-32" />
                        ) : user ? (
                            <>
                                <Button variant="ghost" size="icon" className={textColor}>
                                    <User className="h-5 w-5" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="hover:bg-red-500/10">
                                    <LogOut className="h-5 w-5 text-red-500" />
                                </Button>
                            </>
                        ) : (
                            <>
                                <div className="hidden md:flex gap-2 text-sm">
                                    <Link href="/login/admin" className={`${subtleColor} transition-colors`}>
                                        Admin
                                    </Link>
                                    <Link href="/login/company" className={`${subtleColor} transition-colors`}>
                                        Airline
                                    </Link>
                                </div>
                                <Link href="/login/user">
                                    <Button variant="ghost" className={`${textColor} font-medium`}>
                                        Login
                                    </Button>
                                </Link>
                                <Link href="/register">
                                    <Button variant="premium" className="rounded-full px-6">
                                        Sign Up
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    )
}
