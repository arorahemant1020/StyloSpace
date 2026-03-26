"use client"

import { Home, RefreshCw, Undo, Redo, Download } from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface ToolbarProps {
  onResetRoom?: () => void
  onUndo?: () => void
  onRedo?: () => void
  onExport?: () => void
  canUndo: boolean
  canRedo: boolean
}

export function Toolbar({ onResetRoom, onUndo, onRedo, onExport, canUndo, canRedo }: ToolbarProps) {
  return (
    <header className="flex items-center h-14 gap-2 px-4 border-b bg-[#3b2e22] text-[#fbf3e3]">
      <Button variant="ghost" size="icon" className="text-[#fbf3e3] hover:text-[#fbf3e3] hover:bg-[#4a3c30]">
        <Home className="w-4 h-4" />
      </Button>
      <div className="flex items-center ml-2">
        <Image src="/logo.png" alt="StyloSpace Logo" width={35} height={35} className="mr-2" />
        <h1 className="text-lg font-semibold">StyloSpace</h1>
      </div>
      <Separator orientation="vertical" className="h-6 ml-4 bg-[#fbf3e3]/30" />
      <Button
        variant="ghost"
        size="icon"
        onClick={onUndo}
        disabled={!canUndo}
        className={`text-[#fbf3e3] hover:text-[#fbf3e3] hover:bg-[#4a3c30] ${!canUndo ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <Undo className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRedo}
        disabled={!canRedo}
        className={`text-[#fbf3e3] hover:text-[#fbf3e3] hover:bg-[#4a3c30] ${!canRedo ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <Redo className="w-4 h-4" />
      </Button>

      <div className="flex items-center gap-2 ml-auto">
        {onExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="text-[#4a3c30] bg-[#fbf3e3] hover:bg-[#4a3c30] hover:text-[#fbf3e3]"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        )}
        {onResetRoom && (
          <Button
            variant="outline"
            size="sm"
            onClick={onResetRoom}
            className="text-[#4a3c30] bg-[#fbf3e3] hover:bg-[#4a3c30] hover:text-[#fbf3e3]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset Room
          </Button>
        )}
      </div>
    </header>
  )
}
