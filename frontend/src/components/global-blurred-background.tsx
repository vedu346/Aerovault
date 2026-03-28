"use client"

import { usePathname } from 'next/navigation'

export default function GlobalBlurredBackground() {
    const pathname = usePathname()
    
    // The home page has its own unblurred clear background image implemented in page.tsx
    if (pathname === '/') return null

    return (
        <div className="fixed inset-0 -z-50 pointer-events-none overflow-hidden">
            <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-110 blur-[60px] opacity-60"
                style={{ backgroundImage: 'url("/images/hero-bg-2.jpg")' }}
            />
            {/* Soft white overlay to ensure text remains highly readable on all pages */}
            <div className="absolute inset-0 bg-white/70" />
        </div>
    )
}
