import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { SplashWrapper } from "./components/splash-wrapper"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "StyloSpace",
  description: "A 3D room planner application",
  icons: {
    icon: "/logo.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <SplashWrapper>{children}</SplashWrapper>
      </body>
    </html>
  )
}
