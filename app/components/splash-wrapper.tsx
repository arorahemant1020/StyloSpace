"use client"

import { useEffect, useMemo, useState } from "react"

type SplashWrapperProps = {
  children: React.ReactNode
}

const SPLASH_SEEN_KEY = "stylospace:splashSeen"
const SPLASH_THRESHOLD_MS = 8000

export function SplashWrapper({ children }: SplashWrapperProps) {
  // Default to showing splash to avoid a flash of the app
  // before we read sessionStorage.
  const [showSplash, setShowSplash] = useState(true)

  const canUseSessionStorage = useMemo(() => {
    try {
      return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    if (!canUseSessionStorage) {
      setShowSplash(true)
      return
    }

    const seen = window.sessionStorage.getItem(SPLASH_SEEN_KEY) === "1"
    setShowSplash(!seen)
  }, [canUseSessionStorage])

  const hide = () => {
    if (canUseSessionStorage) {
      try {
        window.sessionStorage.setItem(SPLASH_SEEN_KEY, "1")
      } catch {
        // ignore
      }
    }
    setShowSplash(false)
  }

  // Safety threshold: auto-hide splash after 8 seconds.
  useEffect(() => {
    if (!showSplash) return
    const t = window.setTimeout(() => hide(), SPLASH_THRESHOLD_MS)
    return () => window.clearTimeout(t)
  }, [showSplash])

  useEffect(() => {
    if (!showSplash) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [showSplash])

  return (
    <>
      {children}
      {showSplash && (
        <div
          className="fixed inset-0 z-[9999] bg-black"
          role="dialog"
          aria-label="Splash screen"
        >
          <video
            src="/video.mp4"
            className="h-full w-full object-cover"
            autoPlay
            muted
            playsInline
            onLoadedMetadata={(e) => {
              e.currentTarget.playbackRate = 1.25
            }}
            onPlay={(e) => {
              // Some browsers reset playbackRate; re-apply on play.
              e.currentTarget.playbackRate = 1.25
            }}
            onEnded={hide}
            onError={hide}
          />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              hide()
            }}
            className="absolute right-4 top-4 rounded-md bg-white/15 px-3 py-1.5 text-sm font-medium text-white backdrop-blur hover:bg-white/25"
          >
            Skip
          </button>
        </div>
      )}
    </>
  )
}

