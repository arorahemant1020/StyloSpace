"use client"

import { RoomFloor, type RoomFloorFinish, DEFAULT_ROOM_FLOOR_FINISH } from "./room-floor"

export type { RoomFloorFinish }
export { DEFAULT_ROOM_FLOOR_FINISH } from "./room-floor"

interface RoomProps {
  width: number
  length: number
  height: number
  wallColor?: string
  floorFinish?: RoomFloorFinish
  onAddDoor?: (wall: "north" | "south" | "east" | "west", position: number) => void
  doors?: Array<{
    id: string
    wall: "north" | "south" | "east" | "west"
    position: number
    width: number
    height: number
    selected?: boolean
  }>
  onSelectDoor?: (id: string) => void
}

const FEET_TO_METERS = 0.3048

export const DEFAULT_ROOM_WALL_COLOR = "#f5f5f5"

export function Room({
  width,
  length,
  height,
  wallColor = DEFAULT_ROOM_WALL_COLOR,
  floorFinish = DEFAULT_ROOM_FLOOR_FINISH,
  doors = [],
  onSelectDoor,
}: RoomProps) {
  const widthMeters = width * FEET_TO_METERS
  const lengthMeters = length * FEET_TO_METERS
  const heightMeters = height * FEET_TO_METERS

  const wallThickness = 0.1 * FEET_TO_METERS

  const roomElevation = 0.01

  return (
    <group position={[0, roomElevation, 0]}>
      <RoomFloor finish={floorFinish} widthMeters={widthMeters} lengthMeters={lengthMeters} />

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, heightMeters, 0]} receiveShadow>
        <planeGeometry args={[widthMeters, lengthMeters]} />
        <meshStandardMaterial color="#f8f8f8" transparent opacity={0.5} />
      </mesh>

      <mesh position={[0, heightMeters / 2, -lengthMeters / 2]} castShadow receiveShadow>
        <boxGeometry args={[widthMeters, heightMeters, wallThickness]} />
        <meshStandardMaterial color={wallColor} transparent opacity={0.9} roughness={0.7} />
      </mesh>

      <mesh position={[0, heightMeters / 2, lengthMeters / 2]} castShadow receiveShadow>
        <boxGeometry args={[widthMeters, heightMeters, wallThickness]} />
        <meshStandardMaterial color={wallColor} transparent opacity={0.9} roughness={0.7} />
      </mesh>

      <mesh position={[-widthMeters / 2, heightMeters / 2, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[lengthMeters, heightMeters, wallThickness]} />
        <meshStandardMaterial color={wallColor} transparent opacity={0.9} roughness={0.7} />
      </mesh>

      <mesh position={[widthMeters / 2, heightMeters / 2, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[lengthMeters, heightMeters, wallThickness]} />
        <meshStandardMaterial color={wallColor} transparent opacity={0.9} roughness={0.7} />
      </mesh>

      {doors.map((door) => {
        const doorWidthMeters = door.width * FEET_TO_METERS
        const doorHeightMeters = door.height * FEET_TO_METERS

        let position: [number, number, number] = [0, 0, 0]
        let rotation: [number, number, number] = [0, 0, 0]

        switch (door.wall) {
          case "north":
            position = [door.position * widthMeters - widthMeters / 2, doorHeightMeters / 2, -lengthMeters / 2]
            rotation = [0, 0, 0]
            break
          case "south":
            position = [door.position * widthMeters - widthMeters / 2, doorHeightMeters / 2, lengthMeters / 2]
            rotation = [0, Math.PI, 0]
            break
          case "west":
            position = [-widthMeters / 2, doorHeightMeters / 2, door.position * lengthMeters - lengthMeters / 2]
            rotation = [0, Math.PI / 2, 0]
            break
          case "east":
            position = [widthMeters / 2, doorHeightMeters / 2, door.position * lengthMeters - lengthMeters / 2]
            rotation = [0, -Math.PI / 2, 0]
            break
        }

        return (
          <group
            key={door.id}
            position={position}
            rotation={rotation}
            onClick={(e) => {
              e.stopPropagation()
              if (onSelectDoor) onSelectDoor(door.id)
            }}
          >
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[doorWidthMeters, doorHeightMeters, wallThickness * 1.5]} />
              <meshStandardMaterial color="#8B4513" roughness={0.7} />
            </mesh>

            <mesh position={[0, 0, wallThickness * 0.6]}>
              <boxGeometry args={[doorWidthMeters * 0.9, doorHeightMeters * 0.95, wallThickness * 0.5]} />
              <meshStandardMaterial color={door.selected ? "#ff9999" : "#A0522D"} roughness={0.6} />
            </mesh>

            <mesh position={[doorWidthMeters * 0.3, 0, -wallThickness * 0.3]}>
              <sphereGeometry args={[0.03, 16, 16]} />
              <meshStandardMaterial color="#B87333" metalness={0.8} roughness={0.2} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}
