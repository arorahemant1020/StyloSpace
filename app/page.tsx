"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import { Loader2 } from "lucide-react"

import { Toolbar } from "./components/toolbar"
import { Sidebar } from "./components/sidebar"
import { BottomToolbar, type FurnitureDimensionsFt } from "./components/bottom-toolbar"
import { getFurnitureDisplayName } from "./components/furniture"

// Dynamically import the Canvas component to avoid SSR issues
const Scene = dynamic(() => import("./components/scene"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  ),
})

export default function Home() {
  const [canvasMounted, setCanvasMounted] = useState(false)
  const [showRoomModal, setShowRoomModal] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [showMeasurements, setShowMeasurements] = useState(false)
  const [selectedFurniture, setSelectedFurniture] = useState<any>(null)
  const [furnitureDimensionsFt, setFurnitureDimensionsFt] = useState<FurnitureDimensionsFt | null>(null)
  const [transformMode, setTransformMode] = useState<"translate" | "rotate" | "scale">("translate")

  const handleResetRoom = () => {
    setShowRoomModal(true)
    window.location.reload()
  }

  const handleExport = () => {
    window.dispatchEvent(new CustomEvent("room-planner:export"))
  }

  useEffect(() => {
    const handleDelete = () => {
      setSelectedFurniture(null)
      window.dispatchEvent(new CustomEvent("room-planner:delete-furniture"))
    }

    const handleResize = (e: Event) => {
      const customEvent = e as CustomEvent
      window.dispatchEvent(
        new CustomEvent("room-planner:resize-furniture", { detail: { scale: customEvent.detail.scale } }),
      )
    }

    const handleRotate = (e: Event) => {
      const customEvent = e as CustomEvent
      window.dispatchEvent(
        new CustomEvent("room-planner:rotate-furniture", { detail: { angle: customEvent.detail.angle } }),
      )
    }

    const handleAddDoor = () => {
      window.dispatchEvent(new CustomEvent("room-planner:add-door"))
    }

    const handleColorChange = (e: Event) => {
      const customEvent = e as CustomEvent
      window.dispatchEvent(
        new CustomEvent("room-planner:change-color-furniture", { detail: { color: customEvent.detail.color } }),
      )
    }

    window.addEventListener("room-planner:delete", handleDelete)
    window.addEventListener("room-planner:resize", handleResize)
    window.addEventListener("room-planner:rotate", handleRotate)
    window.addEventListener("room-planner:add-door", handleAddDoor)
    window.addEventListener("room-planner:change-color", handleColorChange)

    return () => {
      window.removeEventListener("room-planner:delete", handleDelete)
      window.removeEventListener("room-planner:resize", handleResize)
      window.removeEventListener("room-planner:rotate", handleRotate)
      window.removeEventListener("room-planner:add-door", handleAddDoor)
      window.removeEventListener("room-planner:change-color", handleColorChange)
    }
  }, [])

  useEffect(() => {
    const handleHistoryChange = (e: Event) => {
      const customEvent = e as CustomEvent
      setCanUndo(customEvent.detail.canUndo)
      setCanRedo(customEvent.detail.canRedo)
    }

    window.addEventListener("room-planner:history-change", handleHistoryChange as EventListener)

    return () => {
      window.removeEventListener("room-planner:history-change", handleHistoryChange as EventListener)
    }
  }, [])

  useEffect(() => {
    setCanvasMounted(true)
  }, [])

  return (
    <div className="flex flex-col w-full h-screen">
      <Toolbar
        onResetRoom={handleResetRoom}
        onUndo={() => window.dispatchEvent(new CustomEvent("room-planner:undo"))}
        onRedo={() => window.dispatchEvent(new CustomEvent("room-planner:redo"))}
        onExport={handleExport}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar showMeasurements={showMeasurements} onShowMeasurementsChange={setShowMeasurements} />
        <main className="relative flex-1 bg-muted">
          {canvasMounted ? (
            <Suspense
              fallback={
                <div className="flex items-center justify-center w-full h-full">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              }
            >
              <Scene
                showMeasurements={showMeasurements}
                onShowMeasurementsChange={setShowMeasurements}
                transformMode={transformMode}
                onTransformModeChange={setTransformMode}
                onSelectedFurnitureChange={setSelectedFurniture}
                furnitureDimensionsFt={furnitureDimensionsFt}
                onFurnitureDimensionsChange={setFurnitureDimensionsFt}
              />
            </Suspense>
          ) : (
            <div className="flex items-center justify-center w-full h-full min-h-[200px]">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
          {selectedFurniture && (
            <BottomToolbar
              onDelete={() => window.dispatchEvent(new CustomEvent("room-planner:delete"))}
              onResize={(scale) => window.dispatchEvent(new CustomEvent("room-planner:resize", { detail: { scale } }))}
              onRotate={(angle) => window.dispatchEvent(new CustomEvent("room-planner:rotate", { detail: { angle } }))}
              onAddDoor={() => window.dispatchEvent(new CustomEvent("room-planner:add-door"))}
              onChangeColor={(color) =>
                window.dispatchEvent(new CustomEvent("room-planner:change-color", { detail: { color } }))
              }
              currentScale={selectedFurniture.scale || 1}
              currentRotation={(selectedFurniture.rotation?.[1] || 0) * (180 / Math.PI)}
              isDoor={selectedFurniture.isDoor || false}
              doorWidth={selectedFurniture.doorWidth || 3}
              doorHeight={selectedFurniture.doorHeight || 7}
              doorPosition={selectedFurniture.doorPosition || 0.5}
              roomHeight={selectedFurniture.roomHeight || 8}
              currentColor={selectedFurniture.color || "#8B6F47"}
              furnitureLabel={getFurnitureDisplayName(selectedFurniture.type)}
              furnitureDimensionsFt={furnitureDimensionsFt}
              showTvWallControls={selectedFurniture.type === "tv"}
              onSnapTvWall={(wall) =>
                window.dispatchEvent(
                  new CustomEvent("room-planner:snap-tv-wall", { detail: { wall } }),
                )
              }
            />
          )}
        </main>
      </div>
    </div>
  )
}
