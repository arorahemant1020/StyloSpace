"use client"

import { useState, useEffect } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"

interface DoorPlacementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (wall: "north" | "south" | "east" | "west", position: number, width: number, height: number) => void
  roomHeight?: number
}

export function DoorPlacementModal({ open, onOpenChange, onSubmit, roomHeight = 8 }: DoorPlacementModalProps) {
  const [wall, setWall] = useState<"north" | "south" | "east" | "west">("south")
  const [position, setPosition] = useState(0.5) // 0-1 position along the wall
  const [width, setWidth] = useState(3) // in feet
  const [height, setHeight] = useState(7) // in feet
  const [error, setError] = useState("")

  // Calculate max door height (0.5 feet below ceiling)
  const maxDoorHeight = Math.max(6, roomHeight - 0.5)

  // Update height if it exceeds room height
  useEffect(() => {
    // Ensure door height is always strictly less than room height
    if (height >= roomHeight) {
      setHeight(Math.max(3, roomHeight - 0.5))
    }
  }, [roomHeight, height])

  const handleSubmit = () => {
    if (width < 1 || width > 6) {
      setError("Door width must be between 1 and 6 feet")
      return
    }

    // Strict validation to ensure door height is ALWAYS less than room height
    if (height < 1 || height >= roomHeight) {
      setError(`Door height must be between 6 and less than ${roomHeight} feet (room height)`)
      return
    }

    setError("")
    onSubmit(wall, position, width, height)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-[#fbf3e3] text-[#3b2e22]">
        <DialogHeader>
          <DialogTitle className="text-[#3b2e22]">Add Door</DialogTitle>
          <DialogDescription className="text-[#3b2e22]/70">Select a wall and position for your door.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="wall" className="text-right text-[#3b2e22]">
              Wall
            </Label>
            <Select value={wall} onValueChange={(value) => setWall(value as "north" | "south" | "east" | "west")}>
              <SelectTrigger className="col-span-3 border-[#3b2e22]/30 focus:ring-[#3b2e22]">
                <SelectValue placeholder="Select a wall" />
              </SelectTrigger>
              <SelectContent className="bg-[#fbf3e3] text-[#3b2e22] border-[#3b2e22]/30">
                <SelectItem value="north">North (Back)</SelectItem>
                <SelectItem value="south">South (Front)</SelectItem>
                <SelectItem value="east">East (Right)</SelectItem>
                <SelectItem value="west">West (Left)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-[#3b2e22]">Position</Label>
            <div className="col-span-3">
              <Slider
                value={[position]}
                min={0.1}
                max={0.9}
                step={0.05}
                onValueChange={(value) => setPosition(value[0])}
                className="flex-1"
              />
              <div className="flex justify-between mt-1 text-xs text-[#3b2e22]/70">
                <span>Left</span>
                <span>Center</span>
                <span>Right</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="width" className="text-right text-[#3b2e22]">
              Width (ft)
            </Label>
            <Input
              id="width"
              type="number"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="col-span-3 border-[#3b2e22]/30 focus-visible:ring-[#3b2e22]"
              min="1"
              max="6"
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
              onChange={(e) => setHeight(Number(e.target.value))}
              className="col-span-3 border-[#3b2e22]/30 focus-visible:ring-[#3b2e22]"
              min="1"
              max={maxDoorHeight}
              step="0.5"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} className="bg-[#3b2e22] text-[#fbf3e3] hover:bg-[#4a3c30]">
            Add Door
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
