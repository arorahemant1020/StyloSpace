"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface RoomDimensionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (width: number, length: number, height: number) => void
}

export function RoomDimensionsModal({ open, onOpenChange, onSubmit }: RoomDimensionsModalProps) {
  const [width, setWidth] = useState("10")
  const [length, setLength] = useState("10")
  const [height, setHeight] = useState("4")
  const [error, setError] = useState("")

  const handleSubmit = () => {
    const widthNum = Number.parseFloat(width)
    const lengthNum = Number.parseFloat(length)
    const heightNum = Number.parseFloat(height)

    if (isNaN(widthNum) || isNaN(lengthNum) || isNaN(heightNum)) {
      setError("Please enter valid numbers")
      return
    }

    if (widthNum <= 0 || lengthNum <= 0 || heightNum <= 0) {
      setError("Dimensions must be greater than zero")
      return
    }

    if (widthNum > 50 || lengthNum > 50) {
      setError("Maximum width/length is 50 feet")
      return
    }

    if (heightNum > 20) {
      setError("Maximum height is 20 feet")
      return
    }

    setError("")
    onSubmit(widthNum, lengthNum, heightNum)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-[#fbf3e3] text-[#3b2e22]">
        <DialogHeader>
          <DialogTitle className="text-[#3b2e22]">Room Dimensions</DialogTitle>
          <DialogDescription className="text-[#3b2e22]/70">
            Enter the dimensions of your room in feet.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="width" className="text-right text-[#3b2e22]">
              Width (ft)
            </Label>
            <Input
              id="width"
              type="number"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className="col-span-3 border-[#3b2e22]/30 focus-visible:ring-[#3b2e22]"
              min="1"
              max="50"
              step="0.5"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="length" className="text-right text-[#3b2e22]">
              Length (ft)
            </Label>
            <Input
              id="length"
              type="number"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="col-span-3 border-[#3b2e22]/30 focus-visible:ring-[#3b2e22]"
              min="1"
              max="50"
              step="0.5"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="height" className="text-right text-[#3b2e22]">
              Height (ft)
            </Label>
            <Input
              id="height"
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="col-span-3 border-[#3b2e22]/30 focus-visible:ring-[#3b2e22]"
              min="6"
              max="20"
              step="0.5"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} className="bg-[#3b2e22] text-[#fbf3e3] hover:bg-[#4a3c30]">
            Create Room
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
