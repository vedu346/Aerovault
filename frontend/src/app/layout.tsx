import type { Metadata } from "next";
import "./globals.css";
import GlobalBlurredBackground from "@/components/global-blurred-background";
import { AivaChatbot } from "@/components/aiva-chatbot";
import { inject } from "@vercel/analytics"; // ADD THIS

export const metadata: Metadata = {
  title: "Aerovault",
  description: "Book flights, track live status, and manage your travel with Aerovault Airlines.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  inject(); // ADD THIS

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <GlobalBlurredBackground />
        {children}
        <AivaChatbot />
      </body>
    </html>
  );
}