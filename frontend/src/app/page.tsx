"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"

import { useState, useEffect } from "react"

const Navbar = dynamic(() => import("@/components/navbar"), { ssr: false })
const FlightSearchForm = dynamic(() => import("@/components/flights/flight-search-form").then(mod => mod.FlightSearchForm), { ssr: false })

export default function Home() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 selection:bg-blue-100" suppressHydrationWarning>
      <Navbar />

      {/* Hero Section with 4K Background */}
      <div className="relative min-h-[95vh] flex items-center justify-center overflow-hidden z-0">
        {/* Background Image Container */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 hover:scale-105"
          style={{ 
            backgroundImage: "url('/images/hero-bg-2.jpg')",
          }}
        />
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/80" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 pt-24">
          <div className={`inline-block px-4 py-1.5 mb-6 text-sm font-bold tracking-widest text-blue-400 uppercase bg-blue-400/10 backdrop-blur-md rounded-full border border-blue-400/20 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            Premium Sky Experience
          </div>
          <h1 className={`text-5xl md:text-8xl font-black tracking-tighter text-white mb-8 leading-[0.9] transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            EXPLORE THE WORLD <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              IN PREMIUM COMFORT
            </span>
          </h1>
          <p className={`max-w-2xl mx-auto text-xl text-blue-100/90 mb-12 leading-relaxed font-medium transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            Seamless booking, real-time tracking, and exclusive sky-high deals. 
            Join millions of travelers who trust our elite flight network.
          </p>

          <div className={`flex flex-col sm:flex-row justify-center gap-6 transition-all duration-1000 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <Link href="/search">
              <Button size="lg" variant="premium" className="h-16 px-10 text-xl rounded-2xl">
                Book a Flight
              </Button>
            </Link>
            <Link href="/tracker">
              <Button size="lg" variant="outline" className="h-16 px-10 text-xl rounded-2xl border-2 border-white/30 text-white hover:bg-white hover:text-blue-900 bg-white/10 backdrop-blur-md transition-all">
                Live Status
              </Button>
            </Link>
          </div>
        </div>

        {/* Bottom Fade */}
        <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-gray-50 to-transparent" />
      </div>

      {/* Search Section Container */}
      <div className={`max-w-6xl mx-auto px-4 -mt-24 relative z-30 pb-20 transition-all duration-1000 delay-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
        <div className="bg-white/95 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] p-2 border border-white/20">
          <div className="p-4 sm:p-8">
            <FlightSearchForm />
          </div>
        </div>
      </div>
    </div>
  )
}
