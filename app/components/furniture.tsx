"use client"

import { useRef, useEffect, useMemo, useState } from "react"
import { useGLTF } from "@react-three/drei"
import * as THREE from "three"

// Convert feet to meters for the 3D scene (1 foot = 0.3048 meters)
const FEET_TO_METERS = 0.3048

// Define furniture types with their models and scales
const FURNITURE_CONFIGS: Record<
  string,
  {
    model: string
    relativeScale: [number, number, number]
    yOffset: number
  }
> = {
  sofa: {
    model: "/assets/3d/sofa.glb",
    relativeScale: [0.050, 0.052, 0.055],
    yOffset: 0,
  },
  bigSofa: {
    model: "/assets/3d/big-sofa.glb",
    relativeScale: [2, 2, 2],
    yOffset: 0,
  },
  chair: {
    model: "/assets/3d/chair.glb",
    relativeScale: [0.03, 0.03, 0.03],
    yOffset: 0,
  },
  table: {
    model: "/assets/3d/table.glb",
    relativeScale: [8, 8, 8],
    yOffset: 0,
  },
    centreTable: {
    model: "/assets/3d/centre-table.glb",
    relativeScale: [0.3, 0.3, 0.3],
    yOffset: 0,
  },
  lamp: {
    model: "/assets/3d/lamp.glb",
    relativeScale: [0.015, 0.015, 0.015],
    yOffset: 0,
  },
  bed: {
    model: "/assets/3d/bed.glb",
    relativeScale: [0.025, 0.025, 0.025],
    yOffset: 0,
  },
  bigCupBoard: {
    model: "/assets/3d/big-cupboard.glb",
    relativeScale: [0.5, 0.5, 0.5],
    yOffset: 0,
  },
  smallCupBoard: {
    model: "/assets/3d/small-cupboard.glb",
    relativeScale: [2, 2, 2],
    yOffset: 0,
  },
  tvCabinet: {
    model: "/assets/3d/tv-cabinet.glb",
    relativeScale: [2, 1.7, 2],
    yOffset: 0,
  },
  tv: {
    model: "/assets/3d/tv.glb",
    relativeScale: [0.6, 0.6, 0.6],
    yOffset: 0,
  },
  // Office components
  officeChair: {
    model: "/assets/3d/office-chair.glb",
    relativeScale: [3.045, 3.045, 3.045],
    yOffset: 0,
  },
  desk: {
    model: "/assets/3d/desk.glb",
    relativeScale: [10.12, 10.06, 10.05],
    yOffset: 0,
  },
  bookshelf: {
    model: "/assets/3d/bookshelf.glb",
    relativeScale: [1.2, 1.2, 1.2],
    yOffset: 0,
  },
  waterCooler: {
    model: "/assets/3d/water-cooler.glb",
    relativeScale: [3, 3, 3],
    yOffset: 0,
  },
}

export const FURNITURE_DISPLAY_NAMES: Record<string, string> = {
  sofa: "Recliner",
  bigSofa: "Sofa",
  chair: "Chair",
  table: "Table",
  centreTable: "Centre Table",
  lamp: "Floor Lamp",
  bed: "Bed",
  bigCupBoard: "Big Cupboard",
  smallCupBoard: "Small Cupboard",
  tvCabinet: "TV Cabinet",
  tv: "Wall TV",
  officeChair: "Office Chair",
  desk: "Desk",
  bookshelf: "Bookshelf",
  waterCooler: "Water Cooler",
}

export function getFurnitureDisplayName(type: string): string {
  return FURNITURE_DISPLAY_NAMES[type] ?? type
}

interface FurnitureProps {
  type: string
  position: [number, number, number]
  rotation: [number, number, number]
  // Update this type to accept the event
  onClick?: (e: any) => void 
  selected?: boolean
  roomDimensions?: { width: number; length: number }
  scale?: number
  color?: string
}

function FurnitureModel({
  type,
  position,
  rotation,
  onClick,
  selected,
  roomDimensions = { width: 10, length: 10 },
  scale = 1.0,
  color,
}: FurnitureProps) {
  const config = FURNITURE_CONFIGS[type as keyof typeof FURNITURE_CONFIGS]
  const { scene } = useGLTF(config?.model || "")
  const meshRef = useRef<THREE.Group>(null)
  const [, forceUpdate] = useState({})

  const avgRoomDimension = (roomDimensions.width + roomDimensions.length) / 2
  const scaleFactor = avgRoomDimension / 10

  const actualScale =
    (config?.relativeScale.map((s) => s * scaleFactor * FEET_TO_METERS * scale) as [number, number, number]) ||
    ([0.1, 0.1, 0.1] as [number, number, number])

  // Clone scene - only when scene or type changes (not color, to avoid expensive re-clones)
  const clonedScene = useMemo(() => {
    const cloned = scene.clone()
    // Set up raycast and clickable on all meshes
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.raycast = THREE.Mesh.prototype.raycast;
        child.userData.clickable = true;
      }
    });
    return cloned
  }, [scene, type])

  // Update materials ONLY when color is explicitly set (not on initial render or when undefined)
  useEffect(() => {
    if (!clonedScene) return;
    
    // Only update materials if color is explicitly provided (not undefined/null)
    // This preserves the original GLTF model colors when no custom color is set
    if (!color) return;

    const materialColor = color;

    // Update materials on the cloned scene
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Dispose old materials to prevent memory leaks
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            if (mat instanceof THREE.MeshStandardMaterial) {
              mat.dispose();
            }
          });
          // Handle multi-material
          child.material = child.material.map(() => {
            return new THREE.MeshStandardMaterial({
              color: materialColor,
              metalness: 0.1,
              roughness: 0.8,
            });
          });
        } else {
          // Dispose old material
          if (child.material instanceof THREE.MeshStandardMaterial) {
            child.material.dispose();
          }
          // Create new material with color
          child.material = new THREE.MeshStandardMaterial({
            color: materialColor,
            metalness: 0.1,
            roughness: 0.8,
          });
        }
      }
    });
    
    // Force a re-render to ensure Three.js picks up the changes
    forceUpdate({});
  }, [color, clonedScene]);

  const handlePointerDown = (e: any) => {
    e.stopPropagation()
    // Use pointer down as primary click handler since onClick can be unreliable
    if (onClick) {
      onClick(e)
    }
  }

  const handleClick = (e: any) => {
    e.stopPropagation()
    // Call the onClick handler if it exists
    if (onClick) {
      onClick(e)
    }
  }

  return (
    <primitive
      ref={meshRef}
      object={clonedScene}
      position={position}
      rotation={rotation}
      scale={actualScale}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
    />
  )
}

export function Furniture({
  type,
  position,
  rotation,
  onClick,
  selected,
  roomDimensions,
  scale,
  color,
}: FurnitureProps) {
  const config = FURNITURE_CONFIGS[type as keyof typeof FURNITURE_CONFIGS]

  if (!config) {
    return null
  }

  return (
    <FurnitureModel
      type={type}
      position={position}
      rotation={rotation}
      onClick={onClick}
      selected={selected}
      roomDimensions={roomDimensions}
      scale={scale}
      color={color}
    />
  )
}