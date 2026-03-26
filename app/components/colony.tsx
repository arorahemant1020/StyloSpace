"use client"

import { useMemo } from "react"
import * as THREE from "three"

const FEET_TO_METERS = 0.3048

type ColonyProps = {
  roomWidthFt: number
  roomLengthFt: number
  roomHeightFt: number
}

type HouseSpec = {
  x: number
  z: number
  rotY: number
  baseW: number
  baseD: number
  baseH: number
  roofH: number
  wallColor: string
  roofColor: string
}

function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const noRaycast = (() => null) as any

function House({ spec }: { spec: HouseSpec }) {
  const windowW = spec.baseW * 0.18
  const windowH = Math.max(0.25, spec.baseH * 0.22)
  const windowT = 0.03

  const y1 = spec.baseH * 0.58
  const y2 = spec.baseH * 0.8
  const xL = -spec.baseW * 0.24
  const xR = spec.baseW * 0.24
  const frontZ = spec.baseD / 2 + windowT / 2

  const doorW = Math.max(0.25, spec.baseW * 0.12)
  const doorH = Math.max(0.55, spec.baseH * 0.45)
  const doorT = Math.max(0.04, spec.baseD * 0.05)
  const doorZ = frontZ
  const doorY = doorH / 2

  return (
    <group position={[spec.x, 0, spec.z]} rotation={[0, spec.rotY, 0]}>
      {/* Main house body */}
      <mesh raycast={noRaycast} castShadow={false} receiveShadow={false}>
        <boxGeometry args={[spec.baseW, spec.baseH, spec.baseD]} />
        <meshStandardMaterial color={spec.wallColor} roughness={0.95} metalness={0.05} />
      </mesh>

      {/* Roof */}
      <mesh
        raycast={noRaycast}
        castShadow={false}
        receiveShadow={false}
        position={[0, spec.baseH + spec.roofH / 2, 0]}
      >
        <boxGeometry args={[spec.baseW * 1.06, spec.roofH, spec.baseD * 1.02]} />
        <meshStandardMaterial color={spec.roofColor} roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Windows (2x2) */}
      <mesh raycast={noRaycast} castShadow={false} receiveShadow={false} position={[xL, y1, frontZ]}>
        <boxGeometry args={[windowW, windowH, windowT]} />
        <meshStandardMaterial color="#cfe8ff" emissive="#79aee8" emissiveIntensity={0.15} roughness={0.2} metalness={0.1} />
      </mesh>
      <mesh raycast={noRaycast} castShadow={false} receiveShadow={false} position={[xR, y1, frontZ]}>
        <boxGeometry args={[windowW, windowH, windowT]} />
        <meshStandardMaterial color="#cfe8ff" emissive="#79aee8" emissiveIntensity={0.15} roughness={0.2} metalness={0.1} />
      </mesh>
      <mesh raycast={noRaycast} castShadow={false} receiveShadow={false} position={[xL, y2, frontZ]}>
        <boxGeometry args={[windowW, windowH, windowT]} />
        <meshStandardMaterial color="#cfe8ff" emissive="#79aee8" emissiveIntensity={0.15} roughness={0.2} metalness={0.1} />
      </mesh>
      <mesh raycast={noRaycast} castShadow={false} receiveShadow={false} position={[xR, y2, frontZ]}>
        <boxGeometry args={[windowW, windowH, windowT]} />
        <meshStandardMaterial color="#cfe8ff" emissive="#79aee8" emissiveIntensity={0.15} roughness={0.2} metalness={0.1} />
      </mesh>

      {/* Door */}
      <mesh raycast={noRaycast} castShadow={false} receiveShadow={false} position={[0, doorY, doorZ]}>
        <boxGeometry args={[doorW, doorH, doorT]} />
        <meshStandardMaterial color="#5a3a2e" roughness={0.95} metalness={0.05} />
      </mesh>
    </group>
  )
}

export function Colony({ roomWidthFt, roomLengthFt, roomHeightFt }: ColonyProps) {
  const widthMeters = roomWidthFt * FEET_TO_METERS
  const lengthMeters = roomLengthFt * FEET_TO_METERS
  const heightMeters = roomHeightFt * FEET_TO_METERS
  const maxDim = Math.max(widthMeters, lengthMeters)

  // We want houses everywhere except the user's room footprint.
  // Keep a small non-zero gap so they don't visually intersect the room.
  const MIN_GAP_FROM_ROOM_FT = 3.5
  const minGapMeters = MIN_GAP_FROM_ROOM_FT * FEET_TO_METERS

  // Colony bounds: enough grid area around the room (not a narrow ring).
  const outerSize = maxDim * 1.0 + 8

  // More houses everywhere => slightly finer grid + less skipping.
  // Use larger spacing so fewer houses are rendered.
  const spacing = Math.max(1.6, Math.min(2.6, maxDim * 0.40))

  const houses = useMemo<HouseSpec[]>(() => {
    // Seed changes a bit with room size so each room feels different.
    const seed = Math.floor(widthMeters * 1000 + lengthMeters * 2000 + heightMeters * 500 + 1337)
    const randAt = (i: number, j: number, k: number) => {
      const s = (seed + i * 73856093 + j * 19349663 + k * 83492791) >>> 0
      return mulberry32(s)()
    }

    // Colorful but still "neighborhood-like" palettes.
    const paletteWalls = [
      "#ffd1dc", // pink
      "#ccecff", // sky
      "#d6ffb5", // mint
      "#fff1b8", // butter
      "#e7d2ff", // lavender
      "#ffd9b3", // peach
      "#d1f7f7", // aqua
      "#f7c6ff", // magenta
      "#d2ffd2", // light green
      "#fff7cc", // cream yellow
    ]
    const paletteRoofs = [
      "#c23b22", // terracotta red
      "#9b2c7a", // purple
      "#2f5bff", // blue
      "#2b7a0b", // forest green
      "#a66a00", // orange-brown
      "#5c2d91", // deep violet
      "#0b7285", // teal
      "#8a1e2a", // brick
      "#1f7a8c", // steel teal
      "#3b3b3b", // dark neutral
    ]

    const specs: HouseSpec[] = []

    // Slightly larger houses than the initial box-based sizes.
    const HOUSE_SIZE_BOOST = 1.15

    const maxIndex = Math.floor(outerSize / spacing)
    const roomHalfW = widthMeters / 2
    const roomHalfL = lengthMeters / 2

    // Keep probability for each symmetric grid cell (mirrored into 4 quadrants).
    // Higher threshold => fewer houses.
    const keepCut = 0.80 // keep ~20% of cells

    for (let i = 0; i <= maxIndex; i++) {
      const xBase = i * spacing
      for (let j = 0; j <= maxIndex; j++) {
        const zBase = j * spacing

        const rKeep = randAt(i, j, 0)
        if (rKeep < keepCut) continue

        const baseW = (1.35 + randAt(i, j, 1) * 0.9) * HOUSE_SIZE_BOOST
        const baseD = (1.15 + randAt(i, j, 2) * 0.8) * HOUSE_SIZE_BOOST
        const baseH = (1.05 + randAt(i, j, 3) * 0.85) * HOUSE_SIZE_BOOST
        const roofH = (0.18 + randAt(i, j, 4) * 0.22) * HOUSE_SIZE_BOOST

        const rotY = Math.floor(randAt(i, j, 5) * 4) * (Math.PI / 2)
        const wallColor = paletteWalls[Math.floor(randAt(i, j, 6) * paletteWalls.length)]
        const roofColor = paletteRoofs[Math.floor(randAt(i, j, 7) * paletteRoofs.length)]

        // Small jitter for a more organic colony, mirrored symmetrically.
        const jitterXMag = (randAt(i, j, 8) - 0.5) * (spacing * 0.22)
        const jitterZMag = (randAt(i, j, 9) - 0.5) * (spacing * 0.22)

        const xHalf = i === 0 ? 0 : xBase + jitterXMag
        const zHalf = j === 0 ? 0 : zBase + jitterZMag

        const xVals = i === 0 ? [0] : [xHalf, -xHalf]
        const zVals = j === 0 ? [0] : [zHalf, -zHalf]

        for (const cx of xVals) {
          for (const cz of zVals) {
            const houseHalfW = baseW / 2
            const houseHalfD = baseD / 2

            const overlapsRoom =
              Math.abs(cx) < roomHalfW + houseHalfW + minGapMeters &&
              Math.abs(cz) < roomHalfL + houseHalfD + minGapMeters
            if (overlapsRoom) continue

            specs.push({
              x: cx,
              z: cz,
              rotY,
              baseW,
              baseD,
              baseH,
              roofH,
              wallColor,
              roofColor,
            })
          }
        }
      }
    }

    return specs
  }, [widthMeters, lengthMeters, heightMeters, spacing, outerSize, minGapMeters])

  // Colony ground. Render a single plane behind the room.
  return (
    <group>
      <mesh
        raycast={noRaycast}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow={false}
        castShadow={false}
      >
        <planeGeometry args={[outerSize * 2.2, outerSize * 2.2]} />
        <meshStandardMaterial color="#2f6b3f" roughness={1} metalness={0} />
      </mesh>

      {houses.map((spec, idx) => (
        <House key={`${spec.x.toFixed(2)}-${spec.z.toFixed(2)}-${idx}`} spec={spec} />
      ))}
    </group>
  )
}

