"use client"

import { useState } from "react"
import { ChevronLeft, Sofa, Bed, Table, Armchair as Chair, BookOpen, GlassWater, Tv, Shirt, LampFloor} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const furnitureItems = {
  "Living Room": [
    { id: "sofa", name: "Recliner", icon: Sofa },
    { id: "bigSofa", name: "Sofa", icon: Sofa},
    { id: "chair", name: "Chair", icon: Chair },
    { id: "centreTable", name: "Centre Table", icon: Table },
    { id: "tv", name: "Wall TV", icon: Tv },
    { id: "tvCabinet", name: "TV Cabinet", icon: Tv},
    { id: "lamp", name: "Floor Lamp", icon: LampFloor},
  ],
  Bedroom: [
    { id: "bed", name: "Bed", icon: Bed },
    { id: "table", name: "Study Table", icon: Table },
    { id: "desk", name: "Desk", icon: Table },
    { id: "tv", name: "Wall TV", icon: Tv },
    { id: "tvCabinet", name: "TV Cabinet", icon: Tv},
    { id: "bigCupBoard", name: "Big Cupboard", icon: Shirt},
    { id: "smallCupBoard", name: "Small Cupboard", icon: Shirt},
    { id: "lamp", name: "Floor Lamp", icon: LampFloor},
  ],
  Office: [
    { id: "officeChair", name: "Office Chair", icon: Chair },
    { id: "desk", name: "Desk", icon: Table },
    { id: "tv", name: "Wall TV", icon: Tv },
    { id: "bookshelf", name: "Bookshelf", icon: BookOpen },
    { id: "waterCooler", name: "Water Cooler", icon: GlassWater },
    { id: "lamp", name: "Floor Lamp", icon: LampFloor},
  ],
}

export function Sidebar({
  showMeasurements,
  onShowMeasurementsChange,
}: { showMeasurements?: boolean; onShowMeasurementsChange?: (show: boolean) => void }) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div
      className={`relative border-r bg-[#3b2e22] text-[#fbf3e3] transition-all duration-300 ${isCollapsed ? "w-16" : "w-80"}`}
    >
      <div className="flex flex-col h-full">
        <div className="p-4">
          <h2 className={`font-semibold ${isCollapsed ? "hidden" : "block"}`}>Furniture</h2>
        </div>
        <Separator className="bg-[#fbf3e3]/30" />

        {!isCollapsed && (
          <div className="px-4 py-2 border-b border-[#fbf3e3]/30">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={showMeasurements || false}
                onChange={(e) => onShowMeasurementsChange?.(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              Show Measurements
            </label>
          </div>
        )}

        <Tabs defaultValue="Living Room" className="flex-1">
          <div className="p-4">
            <TabsList className={`${isCollapsed ? "hidden" : "block"} bg-[#4a3c30]`}>
              <TabsTrigger
                value="Living Room"
                className="data-[state=active]:bg-[#fbf3e3] data-[state=active]:text-[#3b2e22] data-[state=inactive]:text-[#fbf3e3]"
              >
                Living Room
              </TabsTrigger>
              <TabsTrigger
                value="Bedroom"
                className="data-[state=active]:bg-[#fbf3e3] data-[state=active]:text-[#3b2e22] data-[state=inactive]:text-[#fbf3e3]"
              >
                Bedroom
              </TabsTrigger>
              <TabsTrigger
                value="Office"
                className="data-[state=active]:bg-[#fbf3e3] data-[state=active]:text-[#3b2e22] data-[state=inactive]:text-[#fbf3e3]"
              >
                Office
              </TabsTrigger>
            </TabsList>
          </div>
          <ScrollArea className="flex-1">
            {Object.entries(furnitureItems).map(([category, items]) => (
              <TabsContent key={category} value={category} className="m-0 p-4 space-y-4">
                {items.map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className={`w-full justify-start gap-2 text-[#fbf3e3] hover:bg-[#4a3c30] ${isCollapsed ? "px-4" : ""}`}
                    draggable
                    type="button"
                    onDragStart={(e) => {
                      e.dataTransfer.setData("furniture", item.id)
                    }}
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent("room-planner:add-furniture", {
                          detail: { furnitureType: item.id },
                        }),
                      )
                    }}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span>{item.name}</span>}
                  </Button>
                ))}
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-4 top-4 z-10 bg-[#3b2e22] border border-[#fbf3e3]/30 rounded-full text-[#fbf3e3] hover:bg-[#4a3c30]"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <ChevronLeft className={`w-4 h-4 transition-transform ${isCollapsed ? "rotate-180" : ""}`} />
      </Button>
    </div>
  )
}
