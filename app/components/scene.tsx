"use client"

import type React from "react"
import { useRef, useState, useEffect, useLayoutEffect } from "react"
import { Canvas, useThree } from "@react-three/fiber"
import {
  OrbitControls,
  Grid,
  PerspectiveCamera,
  Environment,
  TransformControls,
} from "@react-three/drei"
import * as THREE from "three"
import html2canvas from "html2canvas"

import { Furniture } from "./furniture"
import { Room, DEFAULT_ROOM_WALL_COLOR, DEFAULT_ROOM_FLOOR_FINISH, type RoomFloorFinish } from "./room"
import { RoomDimensionsModal } from "./room-dimensions-modal"
import { DoorPlacementModal } from "./door-placement-modal"

// Convert feet to meters for the 3D scene (1 foot = 0.3048 meters)
const FEET_TO_METERS = 0.3048

type TvWall = "north" | "south" | "east" | "west"

/** Wall-mounted TV: slightly below mid-wall height, flush inset from wall plane. */
function getTvMountOnWall(
  wall: TvWall,
  roomWidthFt: number,
  roomLengthFt: number,
  roomHeightFt: number,
  alongXMeters: number,
  alongZMeters: number,
): { position: [number, number, number]; rotation: [number, number, number] } {
  const W = roomWidthFt * FEET_TO_METERS
  const L = roomLengthFt * FEET_TO_METERS
  const wallInset = 0.08 * FEET_TO_METERS
  const alongMargin = 0.15 * FEET_TO_METERS
  // ~middle of wall, a bit lower (eye-level-ish for typical ceiling heights)
  const mountHeight = Math.max(1.8 * FEET_TO_METERS, (roomHeightFt * 0.5 - 0.85) * FEET_TO_METERS)

  const clampX = (x: number) => Math.max(-W / 2 + alongMargin, Math.min(W / 2 - alongMargin, x))
  const clampZ = (z: number) => Math.max(-L / 2 + alongMargin, Math.min(L / 2 - alongMargin, z))

  switch (wall) {
    case "north":
      return { position: [clampX(alongXMeters), mountHeight, L / 2 - wallInset], rotation: [0, Math.PI, 0] }
    case "south":
      return { position: [clampX(alongXMeters), mountHeight, -L / 2 + wallInset], rotation: [0, 0, 0] }
    case "east":
      return { position: [W / 2 - wallInset, mountHeight, clampZ(alongZMeters)], rotation: [0, -Math.PI / 2, 0] }
    case "west":
      return { position: [-W / 2 + wallInset, mountHeight, clampZ(alongZMeters)], rotation: [0, Math.PI / 2, 0] }
  }
}

// Simple UUID generator function
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

type FurnitureItem = {
  id: string
  type: string
  position: [number, number, number]
  rotation: [number, number, number]
  selected: boolean
  scale: number
  color?: string
  isDoor?: boolean
  doorWidth?: number
  doorHeight?: number
  doorPosition?: number
}

type LightingPreset = "daylight" | "warm" | "cool" | "evening"

type Door = {
  id: string
  wall: "north" | "south" | "east" | "west"
  position: number
  width: number
  height: number
  selected?: boolean
}

type HistoryAction = {
  type:
    | "add"
    | "remove"
    | "move"
    | "resize"
    | "rotate"
    | "add-door"
    | "remove-door"
    | "move-door"
    | "resize-door"
    | "delete"
    | "delete-door"
  furniture: FurnitureItem[]
  doors: Door[]
}

interface SceneProps {
  showMeasurements: boolean
  onShowMeasurementsChange: (show: boolean) => void
  transformMode: "translate" | "rotate" | "scale"
  onTransformModeChange: (mode: "translate" | "rotate" | "scale") => void
  onSelectedFurnitureChange?: (furniture: FurnitureItem | null) => void
  furnitureDimensionsFt?: { width: number; depth: number; height: number } | null
  onFurnitureDimensionsChange?: (dims: { width: number; depth: number; height: number } | null) => void
}

function CameraController({ width, length, height }: { width: number; length: number; height: number }) {
  const { camera } = useThree()

  useEffect(() => {
    const maxDimension = Math.max(width, length) * FEET_TO_METERS
    camera.position.set(maxDimension, maxDimension * 0.8, maxDimension)
    camera.lookAt(0, 0, 0)
  }, [camera, width, length, height])

  return null
}


export default function Scene({
  showMeasurements: externalShowMeasurements,
  onShowMeasurementsChange,
  transformMode: externalTransformMode = "translate",
  onTransformModeChange,
  onSelectedFurnitureChange,
  furnitureDimensionsFt = null,
  onFurnitureDimensionsChange,
}: SceneProps) {
  // state
  const [furniture, setFurniture] = useState<FurnitureItem[]>([])
  const [selectedFurniture, setSelectedFurniture] = useState<FurnitureItem | null>(null)
  const [selectedDoorId, setSelectedDoorId] = useState<string | null>(null)
  const [roomWidth, setRoomWidth] = useState<number>(12)
  const [roomLength, setRoomLength] = useState<number>(15)
  const [roomHeight, setRoomHeight] = useState<number>(8)
  const [roomWallColor, setRoomWallColor] = useState<string>(DEFAULT_ROOM_WALL_COLOR)
  const [roomFloorFinish, setRoomFloorFinish] = useState<RoomFloorFinish>(DEFAULT_ROOM_FLOOR_FINISH)
  const [showRoomModal, setShowRoomModal] = useState<boolean>(true)
  const [showDoorModal, setShowDoorModal] = useState<boolean>(false)
  const [roomCreated, setRoomCreated] = useState<boolean>(false)
  const [doors, setDoors] = useState<Door[]>([])
  const [history, setHistory] = useState<HistoryAction[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const [canUndo, setCanUndo] = useState<boolean>(false)
  const [canRedo, setCanRedo] = useState<boolean>(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  
  // Refs
  const groupRefs = useRef<Map<string, THREE.Group>>(new Map())
  const selectedFurnitureRef = useRef<FurnitureItem | null>(null)
  const doorsRef = useRef<Door[]>(doors)
  const isDragging = useRef(false) // Prevents deselecting while moving items
  const justSelected = useRef(false) // Prevents immediate deselection after selecting
  const [orbitEnabled, setOrbitEnabled] = useState(true)

  useEffect(() => {
    selectedFurnitureRef.current = selectedFurniture
  }, [selectedFurniture])

  useEffect(() => {
    doorsRef.current = doors
  }, [doors])

  const [transformPosition, setTransformPosition] = useState<[number, number, number]>([0, 0, 0])
  const [transformRotation, setTransformRotation] = useState<[number, number, number]>([0, 0, 0])
  const transformMode = externalTransformMode

  const [furnitureScale, setFurnitureScale] = useState<{ [key: string]: number }>({})

  // history helpers
  const addToHistory = (action: HistoryAction) => {
    const newHistory = history.slice(0, historyIndex + 1)
    setHistory([...newHistory, action])
    setHistoryIndex(newHistory.length)
    setCanUndo(true)
    setCanRedo(false)

    window.dispatchEvent(
      new CustomEvent("room-planner:history-change", {
        detail: { canUndo: true, canRedo: false },
      }),
    )
  }

  const handleUndo = () => {
    if (historyIndex >= 0) {
      const prevAction = history[historyIndex - 1]
      if (prevAction) {
        setFurniture(prevAction.furniture)
        setDoors(prevAction.doors)
        setSelectedFurniture(null) // Clear selection on undo to avoid sync issues
      } else {
        setFurniture([])
        setDoors([])
      }
      setHistoryIndex(historyIndex - 1)
      setCanRedo(true)
      setCanUndo(historyIndex - 1 >= 0)

      window.dispatchEvent(
        new CustomEvent("room-planner:history-change", {
          detail: { canUndo: historyIndex - 1 >= 0, canRedo: true },
        }),
      )
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextAction = history[historyIndex + 1]
      setFurniture(nextAction.furniture)
      setDoors(nextAction.doors)
      setSelectedFurniture(null)
      setHistoryIndex(historyIndex + 1)
      setCanUndo(true)
      setCanRedo(historyIndex + 1 < history.length - 1)

      window.dispatchEvent(
        new CustomEvent("room-planner:history-change", {
          detail: { canUndo: true, canRedo: historyIndex + 1 < history.length - 1 },
        }),
      )
    }
  }

  useEffect(() => {
    const handleUndoEvent = () => handleUndo()
    const handleRedoEvent = () => handleRedo()
    const handleExportEvent = () => handleExportDesign()

    window.addEventListener("room-planner:undo", handleUndoEvent)
    window.addEventListener("room-planner:redo", handleRedoEvent)
    window.addEventListener("room-planner:export", handleExportEvent)

    return () => {
      window.removeEventListener("room-planner:undo", handleUndoEvent)
      window.removeEventListener("room-planner:redo", handleRedoEvent)
      window.removeEventListener("room-planner:export", handleExportEvent)
    }
  }, [history, historyIndex])

  // Add furniture by clicking sidebar button (instead of drag-and-drop).
  useEffect(() => {
    const handleAddFurnitureEvent = (e: Event) => {
      if (isDragging.current) return

      const ce = e as CustomEvent<{ furnitureType?: string }>
      const furnitureType = ce.detail?.furnitureType
      if (!furnitureType) return
      if (!roomCreated) return

      const roomWidthMeters = roomWidth * FEET_TO_METERS
      const roomLengthMeters = roomLength * FEET_TO_METERS
      const margin = 0.8 * FEET_TO_METERS

      // Default placement: near center, clamped to room bounds.
      let posX = 0
      let posZ = 0
      posX = Math.max(-roomWidthMeters / 2 + margin, Math.min(roomWidthMeters / 2 - margin, posX))
      posZ = Math.max(-roomLengthMeters / 2 + margin, Math.min(roomLengthMeters / 2 - margin, posZ))

      let position: [number, number, number] = [posX, 0.01, posZ]
      let rotation: [number, number, number] = [0, 0, 0]

      // Default wall mount for TVs when added via click.
      if (furnitureType === "tv") {
        const mount = getTvMountOnWall("north", roomWidth, roomLength, roomHeight, 0, 0)
        position = mount.position
        rotation = mount.rotation
      }

      const newItem: FurnitureItem = {
        id: generateUUID(),
        type: furnitureType,
        position,
        rotation,
        selected: false,
        scale: 1.0,
        // Leave color undefined to preserve the GLB's original material.
      }

      const newFurniture = [...furniture, newItem]
      setFurniture(newFurniture)
      setSelectedFurniture(newItem)
      setSelectedDoorId(null)
      onSelectedFurnitureChange?.(newItem)

      addToHistory({
        type: "add",
        furniture: newFurniture,
        doors,
      })
    }

    window.addEventListener("room-planner:add-furniture", handleAddFurnitureEvent as EventListener)
    return () =>
      window.removeEventListener(
        "room-planner:add-furniture",
        handleAddFurnitureEvent as EventListener,
      )
  }, [
    roomCreated,
    roomWidth,
    roomLength,
    roomHeight,
    furniture,
    doors,
    history,
    historyIndex,
    onSelectedFurnitureChange,
  ])

  // sync transform position/rotation when selection changes
  useEffect(() => {
    if (selectedFurniture) {
      setTransformPosition(selectedFurniture.position)
      setTransformRotation(selectedFurniture.rotation)
    }
  }, [selectedFurniture])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keys if no inputs are focused
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      // Delete key
      if (e.key === "Backspace" || e.key === "Delete") {
         if (selectedFurniture) handleDeleteFurniture()
         if (selectedDoorId) handleDeleteDoor()
         return
      }

      // Arrow keys to move doors along walls
      if (selectedDoorId && !selectedFurniture) {
        const selectedDoor = doors.find(d => d.id === selectedDoorId)
        if (selectedDoor) {
          const moveStep = 0.05 // Move 5% along the wall per keypress
          let newPosition = selectedDoor.position
          let moved = false

          switch (e.key) {
            case "ArrowLeft":
            case "ArrowRight":
              e.preventDefault()
              if (selectedDoor.wall === "north" || selectedDoor.wall === "south") {
                newPosition += e.key === "ArrowRight" ? moveStep : -moveStep
                newPosition = Math.max(0.1, Math.min(0.9, newPosition))
                moved = true
              }
              break
            case "ArrowUp":
            case "ArrowDown":
              e.preventDefault()
              if (selectedDoor.wall === "east" || selectedDoor.wall === "west") {
                newPosition += e.key === "ArrowUp" ? moveStep : -moveStep
                newPosition = Math.max(0.1, Math.min(0.9, newPosition))
                moved = true
              }
              break
          }

          if (moved) {
            handleMoveDoor(newPosition)
          }
        }
      }

      // Arrow keys to move furniture
      if (selectedFurniture && !selectedDoorId) {
        const moveStep = 0.1 * FEET_TO_METERS // Move 0.1 feet per keypress
        const group = groupRefs.current.get(selectedFurniture.id)
        
        if (group) {
          let newX = group.position.x
          let newZ = group.position.z
          let moved = false

          switch (e.key) {
            case "ArrowUp":
            case "ArrowDown":
              e.preventDefault()
              newZ += e.key === "ArrowUp" ? moveStep : -moveStep
              moved = true
              break
            case "ArrowLeft":
            case "ArrowRight":
              e.preventDefault()
              newX += e.key === "ArrowRight" ? -moveStep : moveStep
              moved = true
              break
          }

          if (moved) {
            // Clamp to room boundaries
            const roomWidthMeters = roomWidth * FEET_TO_METERS
            const roomLengthMeters = roomLength * FEET_TO_METERS
            const margin = 0.3 * FEET_TO_METERS

            newX = Math.max(-roomWidthMeters / 2 + margin, Math.min(roomWidthMeters / 2 - margin, newX))
            newZ = Math.max(-roomLengthMeters / 2 + margin, Math.min(roomLengthMeters / 2 - margin, newZ))

            // Update the 3D object position
            group.position.x = newX
            group.position.z = newZ

            // Update state
            const newPosition: [number, number, number] = [newX, group.position.y, newZ]
            const newFurniture = furniture.map((item) => 
              item.id === selectedFurniture.id 
                ? { ...item, position: newPosition } 
                : item
            )
            setFurniture(newFurniture)
            setSelectedFurniture({ ...selectedFurniture, position: newPosition })

            // Add to history
            addToHistory({
              type: "move",
              furniture: newFurniture,
              doors
            })
          }
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedFurniture, selectedDoorId, furniture, doors, roomWidth, roomLength])

  const handleCreateRoom = (width: number, length: number, height: number) => {
    setRoomWidth(width)
    setRoomLength(length)
    setRoomHeight(height)
    setRoomCreated(true)

    if (doors.length > 0) {
      const adjustedDoors = doors.map((door) => {
        if (door.height >= height) {
          return { ...door, height: Math.max(6, height - 0.5) }
        }
        return door
      })

      if (JSON.stringify(doors) !== JSON.stringify(adjustedDoors)) {
        setDoors(adjustedDoors)
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!roomCreated) return

    const furnitureType = e.dataTransfer.getData("furniture")
    if (!furnitureType) return

    const canvas = e.currentTarget as HTMLElement
    const rect = canvas.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / canvas.clientWidth) * 2 - 1
    const y = -((e.clientY - rect.top) / canvas.clientHeight) * 2 + 1

    const roomWidthMeters = roomWidth * FEET_TO_METERS
    const roomLengthMeters = roomLength * FEET_TO_METERS

    const margin = 0.8 * FEET_TO_METERS
    let posX = ((x * roomWidthMeters) / 2) * 0.8
    let posZ = ((y * roomLengthMeters) / 2) * 0.8

    posX = Math.max(-roomWidthMeters / 2 + margin, Math.min(roomWidthMeters / 2 - margin, posX))
    posZ = Math.max(-roomLengthMeters / 2 + margin, Math.min(roomLengthMeters / 2 - margin, posZ))

    let position: [number, number, number] = [posX, 0.01, posZ]
    let rotation: [number, number, number] = [0, 0, 0]

    // Wall TV: pick wall from drop position before floor-item margin clamp (so any wall is reachable).
    if (furnitureType === "tv") {
      const rawX = ((x * roomWidthMeters) / 2) * 0.8
      const rawZ = ((y * roomLengthMeters) / 2) * 0.8

      const distances: Record<TvWall, number> = {
        north: Math.abs(roomLengthMeters / 2 - rawZ),
        south: Math.abs(-roomLengthMeters / 2 - rawZ),
        east: Math.abs(roomWidthMeters / 2 - rawX),
        west: Math.abs(-roomWidthMeters / 2 - rawX),
      }

      const nearestWall = (Object.entries(distances) as [TvWall, number][]).sort((a, b) => a[1] - b[1])[0][0]
      const mount = getTvMountOnWall(nearestWall, roomWidth, roomLength, roomHeight, rawX, rawZ)
      position = mount.position
      rotation = mount.rotation
    }

    const newItem: FurnitureItem = {
      id: generateUUID(),
      type: furnitureType,
      position,
      rotation,
      selected: false,
      scale: 1.0,
      // Don't set default color - let furniture keep its original GLTF model colors
      // color will only be set when user explicitly changes it via color picker
    }

    const newFurniture = [...furniture, newItem]
    setFurniture(newFurniture)
    addToHistory({
      type: "add",
      furniture: newFurniture,
      doors,
    })
  }

  const handleSelect = (id: string) => {
    if (isDragging.current) {
      return // Don't select if we are just finishing a drag
    }
    
    const selectedItem = furniture.find((item) => item.id === id)
    if (selectedItem) {
      // Set flag to prevent immediate deselection
      justSelected.current = true
      setSelectedFurniture(selectedItem)
      setSelectedDoorId(null)
      onSelectedFurnitureChange?.(selectedItem)
      
      // Reset the flag after a short delay to allow normal deselection on empty clicks
      setTimeout(() => {
        justSelected.current = false
      }, 200)
    }
  }

  const handleSelectDoor = (id: string) => {
    setSelectedFurniture(null)
    setSelectedDoorId(id)
  }

  // --- Handlers for Toolbar ---
  
  const handleTransformEnd = () => {
     // This is now handled inside TransformControls onMouseUp
  }

  const handleDeleteFurniture = () => {
    if (selectedFurniture) {
      const newFurniture = furniture.filter((item) => item.id !== selectedFurniture.id)
      setFurniture(newFurniture)
      setSelectedFurniture(null)

      addToHistory({
        type: "remove",
        furniture: newFurniture,
        doors,
      })
    }
  }

  const handleResizeFurniture = (scale: number) => {
    if (selectedFurniture) {
      setFurnitureScale((prev) => ({
        ...prev,
        [selectedFurniture.id]: scale,
      }))

      const newFurniture = furniture.map((item) => {
        if (item.id === selectedFurniture.id) {
          return { ...item, scale }
        }
        return item
      })

      setFurniture(newFurniture)
      // Update the selected item reference so UI updates
      setSelectedFurniture({ ...selectedFurniture, scale })
      
      addToHistory({
        type: "resize",
        furniture: newFurniture,
        doors,
      })
    }
  }

  const handleRotateFurniture = (angleDegrees: number) => {
    if (selectedFurniture) {
      const angleRadians = (angleDegrees * Math.PI) / 180
      const newRotation: [number, number, number] = [0, angleRadians, 0]
      setTransformRotation(newRotation)

      const newFurniture = furniture.map((item) => {
        if (item.id === selectedFurniture.id) {
          return { ...item, rotation: newRotation }
        }
        return item
      })

      setFurniture(newFurniture)
      setSelectedFurniture({ ...selectedFurniture, rotation: newRotation })

      addToHistory({
        type: "rotate",
        furniture: newFurniture,
        doors,
      })
    }
  }

  const handleAddDoor = () => {
    setShowDoorModal(true)
  }

  const handleCreateDoor = (
    wall: "north" | "south" | "east" | "west",
    position: number,
    width: number,
    height: number,
  ) => {
    const doorHeight = Math.min(height, roomHeight - 0.5)
    const newDoor: Door = {
        id: generateUUID(),
        wall,
        position,
        width,
        height: doorHeight,
        selected: false,
    }

    const newDoors = [...doors, newDoor]
    setDoors(newDoors)

    addToHistory({
        type: "add-door",
        furniture,
        doors: newDoors,
    })
  }

  const handleMoveDoor = (position: number) => {
    if (selectedDoorId) {
      const newDoors = doors.map((door) => {
        if (door.id === selectedDoorId) {
          return { ...door, position }
        }
        return door
      })

      setDoors(newDoors)
      addToHistory({
        type: "move-door",
        furniture,
        doors: newDoors,
      })
    }
  }

  const handleResizeDoor = (width: number, height: number) => {
    if (selectedDoorId) {
      const doorHeight = Math.min(height, roomHeight - 0.5)
      const newDoors = doors.map((door) => {
        if (door.id === selectedDoorId) {
          return { ...door, width, height: doorHeight }
        }
        return door
      })

      setDoors(newDoors)
      addToHistory({
        type: "resize-door",
        furniture,
        doors: newDoors,
      })
    }
  }

  const handleDeleteDoor = () => {
    if (selectedDoorId) {
      const newDoors = doors.filter((door) => door.id !== selectedDoorId)
      setDoors(newDoors)
      setSelectedDoorId(null)

      addToHistory({
        type: "remove-door",
        furniture,
        doors: newDoors,
      })
    }
  }

  // --- Measurement Box Dragging ---
  const [measurementPosition, setMeasurementPosition] = useState({ x: 50, y: 50 })
  const [isDraggingMeasurements, setIsDraggingMeasurements] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const handleMeasurementsDragStart = (e: React.MouseEvent) => {
    setIsDraggingMeasurements(true)
    setDragOffset({
      x: e.clientX - measurementPosition.x,
      y: e.clientY - measurementPosition.y,
    })
  }

  useEffect(() => {
    if (!isDraggingMeasurements) return

    const handleMouseMove = (e: MouseEvent) => {
      setMeasurementPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      })
    }

    const handleMouseUp = () => {
      setIsDraggingMeasurements(false)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDraggingMeasurements, dragOffset])

  const handleExportDesign = async () => {
    if (!canvasRef.current) return
    try {
      // Wait for the next frame to ensure everything is rendered
      await new Promise(resolve => requestAnimationFrame(resolve))
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const canvasElement = canvasRef.current.querySelector("canvas") as HTMLCanvasElement
      if (!canvasElement) {
        console.error("Canvas element not found")
        return
      }

      // Check canvas dimensions
      if (canvasElement.width === 0 || canvasElement.height === 0) {
        console.error("Canvas has zero dimensions")
        return
      }

      // With preserveDrawingBuffer: true, we should be able to use toDataURL directly
      let dataUrl: string
      try {
        dataUrl = canvasElement.toDataURL("image/png")
        
        // Verify the data URL is valid
        if (!dataUrl || dataUrl === "data:," || dataUrl.length < 100) {
          throw new Error("Invalid data URL from canvas")
        }
      } catch (error) {
        // Fallback: Use html2canvas if direct export fails
        console.log("Direct export failed, using html2canvas fallback")
        const exportCanvas = await html2canvas(canvasElement, {
          backgroundColor: "#f5f5f5",
          useCORS: true,
          allowTaint: true,
          scale: 1,
          logging: false,
          width: canvasElement.width,
          height: canvasElement.height,
        })
        dataUrl = exportCanvas.toDataURL("image/png")
      }
      
      // Download the image
      const link = document.createElement("a")
      link.href = dataUrl
      link.download = `room-design-${new Date().toISOString().split("T")[0]}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error during export:", error)
      alert("Failed to export image. Please try again.")
    }
  }

  const handleResetRoom = () => {
    setFurniture([])
    setDoors([])
    setSelectedFurniture(null)
    setSelectedDoorId(null)
    setHistory([])
    setHistoryIndex(-1)
    setCanUndo(false)
    setCanRedo(false)
    setRoomWallColor(DEFAULT_ROOM_WALL_COLOR)
    setRoomFloorFinish(DEFAULT_ROOM_FLOOR_FINISH)
    groupRefs.current.clear()
  }

  // Listen for toolbar events
  useEffect(() => {
    const handleDeleteEvent = () => {
      if (selectedFurniture) handleDeleteFurniture()
      else if (selectedDoorId) handleDeleteDoor()
    }
    const handleResizeEvent = (e: CustomEvent) => handleResizeFurniture(e.detail.scale)
    const handleRotateEvent = (e: CustomEvent) => handleRotateFurniture(e.detail.angle)
    const handleAddDoorEvent = () => setShowDoorModal(true)
    const handleColorChangeEvent = (e: CustomEvent) => {
      if (selectedFurniture && e.detail.color) {
        const updatedFurniture = furniture.map((f) => (f.id === selectedFurniture.id ? { ...f, color: e.detail.color } : f))
        setFurniture(updatedFurniture)
        setSelectedFurniture({ ...selectedFurniture, color: e.detail.color })
        
        // Add to history
        addToHistory({
          type: "resize", // Using resize type for color change
          furniture: updatedFurniture,
          doors
        })
      }
    }

    window.addEventListener("room-planner:delete-furniture", handleDeleteEvent as EventListener)
    window.addEventListener("room-planner:resize-furniture", handleResizeEvent as EventListener)
    window.addEventListener("room-planner:rotate-furniture", handleRotateEvent as EventListener)
    window.addEventListener("room-planner:add-door", handleAddDoorEvent as EventListener)
    window.addEventListener("room-planner:change-color-furniture", handleColorChangeEvent as EventListener)

    return () => {
      window.removeEventListener("room-planner:delete-furniture", handleDeleteEvent as EventListener)
      window.removeEventListener("room-planner:resize-furniture", handleResizeEvent as EventListener)
      window.removeEventListener("room-planner:rotate-furniture", handleRotateEvent as EventListener)
      window.removeEventListener("room-planner:add-door", handleAddDoorEvent as EventListener)
      window.removeEventListener("room-planner:change-color-furniture", handleColorChangeEvent as EventListener)
    }
  }, [selectedFurniture, selectedDoorId, furniture, doors])

  useEffect(() => {
    const handleSnapTvWall = (e: Event) => {
      const wall = (e as CustomEvent<{ wall: TvWall }>).detail?.wall
      if (!wall) return
      const sel = selectedFurnitureRef.current
      if (!sel || sel.type !== "tv") return

      const { position, rotation } = getTvMountOnWall(
        wall,
        roomWidth,
        roomLength,
        roomHeight,
        sel.position[0],
        sel.position[2],
      )

      setFurniture((prev) => {
        const next = prev.map((item) => (item.id === sel.id ? { ...item, position, rotation } : item))
        queueMicrotask(() =>
          addToHistory({ type: "move", furniture: next, doors: doorsRef.current }),
        )
        return next
      })
      setSelectedFurniture({ ...sel, position, rotation })

      const g = groupRefs.current.get(sel.id)
      if (g) {
        g.position.set(position[0], position[1], position[2])
        g.rotation.set(rotation[0], rotation[1], rotation[2])
      }
    }

    window.addEventListener("room-planner:snap-tv-wall", handleSnapTvWall as EventListener)
    return () => window.removeEventListener("room-planner:snap-tv-wall", handleSnapTvWall as EventListener)
  }, [roomWidth, roomLength, roomHeight])

  useLayoutEffect(() => {
    if (!selectedFurniture || selectedFurniture.isDoor) {
      onFurnitureDimensionsChange?.(null)
      return
    }

    const targetId = selectedFurniture.id
    let cancelled = false

    const run = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return
          const g = groupRefs.current.get(targetId)
          if (!g) {
            onFurnitureDimensionsChange?.(null)
            return
          }
          g.updateWorldMatrix(true, true)
          const box = new THREE.Box3().setFromObject(g)
          const size = new THREE.Vector3()
          box.getSize(size)
          onFurnitureDimensionsChange?.({
            width: size.x / FEET_TO_METERS,
            depth: size.z / FEET_TO_METERS,
            height: size.y / FEET_TO_METERS,
          })
        })
      })
    }

    run()
    return () => {
      cancelled = true
    }
  }, [
    selectedFurniture?.id,
    selectedFurniture?.scale,
    selectedFurniture?.rotation,
    selectedFurniture?.isDoor,
    roomWidth,
    roomLength,
    onFurnitureDimensionsChange,
  ])

  return (
    <div className="w-full h-screen flex flex-col bg-[#f5f5f5]">
      <RoomDimensionsModal open={showRoomModal} onOpenChange={setShowRoomModal} onSubmit={handleCreateRoom} />
      <DoorPlacementModal
        open={showDoorModal}
        onOpenChange={setShowDoorModal}
        roomHeight={roomHeight}
        onSubmit={handleCreateDoor}
      />

      {roomCreated && (
        <div className="absolute top-20 right-4 z-20 bg-[#3b2e22] text-[#fbf3e3] p-2.5 rounded-lg border border-[#fbf3e3]/30 flex flex-col gap-1.5 max-w-[220px] text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wide text-[#fbf3e3]/75 leading-none">Floor</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setRoomFloorFinish("wood")}
                className={`flex-1 px-1.5 py-0.5 rounded-sm text-[10px] leading-tight border transition-colors ${
                  roomFloorFinish === "wood"
                    ? "bg-[#fbf3e3] text-[#3b2e22] border-[#fbf3e3]"
                    : "bg-[#4a3c30] text-[#fbf3e3] border-[#fbf3e3]/40 hover:bg-[#5a4c40]"
                }`}
              >
                Wood
              </button>
              <button
                type="button"
                onClick={() => setRoomFloorFinish("marble")}
                className={`flex-1 px-1.5 py-0.5 rounded-sm text-[10px] leading-tight border transition-colors ${
                  roomFloorFinish === "marble"
                    ? "bg-[#fbf3e3] text-[#3b2e22] border-[#fbf3e3]"
                    : "bg-[#4a3c30] text-[#fbf3e3] border-[#fbf3e3]/40 hover:bg-[#5a4c40]"
                }`}
              >
                Marble
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-0.5 pt-0.5 border-t border-[#fbf3e3]/20">
            <span className="text-[10px] uppercase tracking-wide text-[#fbf3e3]/75 leading-none">Walls</span>
            <div className="flex flex-wrap items-center gap-1">
              <input
                type="color"
                value={roomWallColor}
                onChange={(e) => setRoomWallColor(e.target.value)}
                className="h-5 w-7 cursor-pointer rounded-sm border border-[#fbf3e3]/40 bg-transparent p-0 shrink-0"
                title="Pick wall color"
                aria-label="Wall color"
              />
              {[
                { hex: "#f5f5f5", label: "White" },
                { hex: "#fbf3e3", label: "Cream" },
                { hex: "#e8dfd4", label: "Sand" },
                { hex: "#d4c4b0", label: "Taupe" },
                { hex: "#c4b8a8", label: "Greige" },
                { hex: "#a8b8c8", label: "Blue-gray" },
                { hex: "#b8c4a8", label: "Sage" },
                { hex: "#2a2520", label: "Charcoal" },
              ].map(({ hex, label }) => (
                <button
                  key={hex}
                  type="button"
                  title={label}
                  onClick={() => setRoomWallColor(hex)}
                  className="h-3.5 w-3.5 rounded-sm border border-[#fbf3e3]/35 shrink-0 ring-offset-1 ring-offset-[#3b2e22] focus:outline-none focus:ring-1 focus:ring-[#fbf3e3]/50"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleResetRoom}
            className="px-2 py-1 bg-[#4a3c30] hover:bg-[#5a4c40] text-[#fbf3e3] rounded text-xs border border-[#fbf3e3]/30"
          >
            Reset Room
          </button>
        </div>
      )}

      {roomCreated && externalShowMeasurements && (
        <div
          className={`absolute bg-[#3b2e22] text-[#fbf3e3] p-4 rounded-lg border border-[#fbf3e3]/30 z-20 ${isDraggingMeasurements ? "cursor-grabbing" : "cursor-grab"}`}
          style={{
            left: `${measurementPosition.x}px`,
            top: `${measurementPosition.y}px`,
            userSelect: "none",
          }}
          onMouseDown={handleMeasurementsDragStart}
        >
          <div className="text-sm font-semibold mb-2 select-none">Room Information</div>
          <div className="text-xs space-y-1 select-none">
            <div>Width: {roomWidth} ft</div>
            <div>Length: {roomLength} ft</div>
            <div>Height: {roomHeight} ft</div>
            <div>Floor Area: {(roomWidth * roomLength).toFixed(1)} sq ft</div>
            <div>Furniture Items: {furniture.length}</div>
            <div>Doors: {doors.length}</div>
          </div>
        </div>
      )}

      <div className="flex-1 flex">
        <div className="flex-1 flex">
          <div
            ref={canvasRef}
            className="w-full h-full relative"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Canvas
              shadows
              camera={{ position: [5, 5, 5], fov: 50 }}
              className="w-full h-full"
              gl={{ preserveDrawingBuffer: true }}
              onPointerMissed={(e) => {
                 // Prevent deselection if we are dragging the transform controls
                 if (isDragging.current) return
                 
                 // Prevent deselection if we just selected something
                 if (justSelected.current) return
                 
                 // If we clicked on gizmos or other helpers, ignore
                 if ((e as any).object?.type === 'TransformControlsPlane') return
                 
                 // Only deselect if we actually clicked on empty space (not on furniture)
                 setSelectedFurniture(null)
                 setSelectedDoorId(null)
                 onSelectedFurnitureChange?.(null)
              }}
            >
              <PerspectiveCamera makeDefault position={[5, 5, 5]} fov={50} />
              <CameraController width={roomWidth} length={roomLength} height={roomHeight} />
              
              {/* Disable OrbitControls while using TransformControls to prevent conflict */}
              <OrbitControls
                enableDamping
                dampingFactor={0.05}
                minDistance={3}
                maxDistance={20}
                maxPolarAngle={Math.PI / 2}
                enablePan={true}
                screenSpacePanning={true}
                enabled={orbitEnabled}
              />

              <Grid
                args={[30, 30]}
                cellSize={1}
                cellThickness={1}
                cellColor="#6e6e6e"
                sectionSize={3}
                sectionThickness={1.5}
                sectionColor="#9d4b4b"
                fadeDistance={30}
                fadeStrength={1}
                followCamera={false}
                infiniteGrid
              />
              {roomCreated && (
                <Room
                  width={roomWidth}
                  length={roomLength}
                  height={roomHeight}
                  wallColor={roomWallColor}
                  floorFinish={roomFloorFinish}
                  doors={doors}
                  onSelectDoor={handleSelectDoor}
                />
              )}

              <ambientLight intensity={0.6} />
              <directionalLight position={[2.5, 8, 5]} intensity={1.5} castShadow>
                <orthographicCamera attach="shadow-camera" args={[-10, 10, -10, 10, 0.1, 50]} />
              </directionalLight>
              <Environment preset="apartment" />

              {/* FURNITURE RENDER LOOP (No Controls here!) */}
              {furniture.map((item) => (
                <group
                    key={item.id}
                    ref={(g) => {
                      if (g) groupRefs.current.set(item.id, g)
                      else groupRefs.current.delete(item.id)
                    }}
                    position={item.position}
                    rotation={item.rotation}
                  >
                    <Furniture
                      key={`${item.id}-${item.type}-${item.color || 'default'}`}
                      type={item.type}
                      position={[0, 0, 0]}
                      rotation={[0, 0, 0]}
                      selected={item.id === selectedFurniture?.id}
                      scale={item.scale}
                      color={item.color}
                      roomDimensions={{ width: roomWidth, length: roomLength }}
                      onClick={(e: any) => {
                        e.stopPropagation()
                        // Ensure we're not dragging before selecting
                        if (!isDragging.current) {
                        handleSelect(item.id)
                        }
                      }}
                    />
                  </group>
              ))}

              {/* SINGLE TRANSFORM CONTROLS - Manages the selected item */}
              {selectedFurniture && groupRefs.current.get(selectedFurniture.id) && (
                <TransformControls
                  object={groupRefs.current.get(selectedFurniture.id)}
                  mode={transformMode}
                  showX={true}
                  showY={transformMode === "scale"}
                  showZ={true}
                  size={0.5}
                  
                  // Dragging Logic
                  onMouseDown={() => {
                    isDragging.current = true
                    setOrbitEnabled(false)
                    justSelected.current = false // Clear the justSelected flag when starting to drag
                  }}
                  
                  onMouseUp={() => {
                    const group = groupRefs.current.get(selectedFurniture.id)
                    
                    if (group) {
                        // 1. READ FINAL STATE FROM 3D OBJECT
                        const finalPos: [number,number,number] = [group.position.x, group.position.y, group.position.z]
                        const finalRot: [number,number,number] = [group.rotation.x, group.rotation.y, group.rotation.z]

                        // 2. COMMIT TO REACT STATE
                        setTransformPosition(finalPos)
                        
                        const newFurniture = furniture.map((item) => 
                            item.id === selectedFurniture.id 
                                ? { ...item, position: finalPos, rotation: finalRot } 
                                : item
                        )
                        setFurniture(newFurniture)
                        
                        // Update the selected item reference too
                        setSelectedFurniture({ ...selectedFurniture, position: finalPos, rotation: finalRot })
                        
                        // 3. HISTORY
                        addToHistory({
                            type: "move",
                            furniture: newFurniture,
                            doors
                        })
                    }

                    setOrbitEnabled(true)

                    // Small delay to prevent immediate click-through to background
                    setTimeout(() => {
                        isDragging.current = false
                    }, 150)
                  }}
                  
                  onPointerDown={(e: any) => {
                    // Prevent TransformControls clicks from triggering onPointerMissed
                    e.stopPropagation()
                  }}

                  onObjectChange={() => {
                     // Visual update logic (Clamp boundaries) can go here 
                     // But we do NOT set state here to avoid re-renders during drag.
                     const group = groupRefs.current.get(selectedFurniture.id)
                     if(!group) return
                     
                     const roomWidthMeters = roomWidth * FEET_TO_METERS
                     const roomLengthMeters = roomLength * FEET_TO_METERS
                     const margin = 0.3 * FEET_TO_METERS

                     let newX = group.position.x
                     let newZ = group.position.z
                     
                     // Boundary Checks
                     if (newX > roomWidthMeters / 2 - margin) newX = roomWidthMeters / 2 - margin
                     if (newX < -roomWidthMeters / 2 + margin) newX = -roomWidthMeters / 2 + margin
                     if (newZ > roomLengthMeters / 2 - margin) newZ = roomLengthMeters / 2 - margin
                     if (newZ < -roomLengthMeters / 2 + margin) newZ = -roomLengthMeters / 2 + margin
                     
                     // Apply clamped values back to object directly
                     group.position.x = newX
                     group.position.z = newZ
                  }}
                />
              )}

            </Canvas>
          </div>
        </div>
      </div>
    </div>
  )
}