"use client"

import { Suspense, useEffect, useLayoutEffect, useMemo } from "react"
import { useTexture } from "@react-three/drei"
import * as THREE from "three"

export type RoomFloorFinish = "wood" | "marble"

export const DEFAULT_ROOM_FLOOR_FINISH: RoomFloorFinish = "wood"

const THREE_JS_TEX =
  "https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/textures"

const WALNUT_TINT = "#5c4033"

function drawMarbleVeins(
  ctx: CanvasRenderingContext2D,
  size: number,
  count: number,
  opts: { maxWidth: number; minAlpha: number; maxAlpha: number; rgb: string },
) {
  for (let v = 0; v < count; v++) {
    ctx.strokeStyle = `rgba(${opts.rgb},${opts.minAlpha + Math.random() * (opts.maxAlpha - opts.minAlpha)})`
    ctx.lineWidth = 0.35 + Math.random() * opts.maxWidth
    ctx.lineCap = "round"
    ctx.beginPath()
    let x = Math.random() * size
    let y = Math.random() * size
    ctx.moveTo(x, y)
    const segments = 4 + Math.floor(Math.random() * 6)
    for (let s = 0; s < segments; s++) {
      const nx = x + (Math.random() - 0.5) * 200
      const ny = y + (Math.random() - 0.5) * 200
      const cx = (x + nx) / 2 + (Math.random() - 0.5) * 55
      const cy = (y + ny) / 2 + (Math.random() - 0.5) * 55
      ctx.quadraticCurveTo(cx, cy, nx, ny)
      x = nx
      y = ny
    }
    ctx.stroke()
  }
}

function createMarbleTextures(): {
  colorMap: THREE.CanvasTexture
  roughnessMap: THREE.CanvasTexture
} {
  const size = 896
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!

  const bg = ctx.createLinearGradient(0, 0, size, size)
  bg.addColorStop(0, "#eef1ec")
  bg.addColorStop(0.35, "#e4e8e2")
  bg.addColorStop(0.65, "#dce2db")
  bg.addColorStop(1, "#d5dcd4")
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, size, size)

  for (let i = 0; i < 55; i++) {
    const g = ctx.createRadialGradient(
      Math.random() * size,
      Math.random() * size,
      0,
      Math.random() * size,
      Math.random() * size,
      70 + Math.random() * 140,
    )
    g.addColorStop(0, `rgba(255,255,255,${0.035 + Math.random() * 0.07})`)
    g.addColorStop(0.5, `rgba(248,250,252,${0.02 + Math.random() * 0.04})`)
    g.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  }

  ctx.save()
  ctx.globalCompositeOperation = "soft-light"
  for (let i = 0; i < 25; i++) {
    const g = ctx.createRadialGradient(
      Math.random() * size,
      Math.random() * size,
      0,
      Math.random() * size,
      Math.random() * size,
      40 + Math.random() * 90,
    )
    g.addColorStop(0, `rgba(175,188,198,${0.06 + Math.random() * 0.08})`)
    g.addColorStop(1, "rgba(175,188,198,0)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  }
  ctx.restore()

  ctx.save()
  ctx.globalCompositeOperation = "multiply"
  for (let i = 0; i < 30; i++) {
    const g = ctx.createRadialGradient(
      Math.random() * size,
      Math.random() * size,
      0,
      Math.random() * size,
      Math.random() * size,
      30 + Math.random() * 80,
    )
    g.addColorStop(0, `rgba(200,205,200,${0.88 + Math.random() * 0.1})`)
    g.addColorStop(1, "rgba(255,255,255,1)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  }
  ctx.restore()

  drawMarbleVeins(ctx, size, 52, { maxWidth: 2.2, minAlpha: 0.06, maxAlpha: 0.16, rgb: "78,88,90" })
  drawMarbleVeins(ctx, size, 38, { maxWidth: 1.1, minAlpha: 0.04, maxAlpha: 0.1, rgb: "95,108,118" })
  drawMarbleVeins(ctx, size, 28, { maxWidth: 0.55, minAlpha: 0.08, maxAlpha: 0.18, rgb: "55,58,60" })

  ctx.save()
  ctx.globalAlpha = 0.045
  ctx.strokeStyle = "#a8b0a8"
  for (let i = 0; i < 120; i++) {
    const y = Math.random() * size
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(size, y + (Math.random() - 0.5) * 14)
    ctx.lineWidth = 0.25 + Math.random() * 0.6
    ctx.stroke()
  }
  ctx.restore()

  ctx.save()
  ctx.globalCompositeOperation = "screen"
  ctx.globalAlpha = 0.12
  for (let i = 0; i < 18; i++) {
    ctx.beginPath()
    const ox = Math.random() * size
    const oy = Math.random() * size
    const r = 25 + Math.random() * 55
    for (let e = 0; e < 6; e++) {
      const a = (e / 6) * Math.PI * 2
      const px = ox + Math.cos(a) * r * (0.4 + Math.random() * 0.6)
      const py = oy + Math.sin(a) * r * (0.4 + Math.random() * 0.6)
      if (e === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fillStyle = "rgba(255,255,255,0.35)"
    ctx.fill()
  }
  ctx.restore()

  for (let i = 0; i < 12000; i++) {
    const g = Math.random() > 0.5 ? 85 + Math.random() * 40 : 200 + Math.random() * 55
    ctx.fillStyle = `rgba(${g},${g},${g + (Math.random() - 0.5) * 12},${0.04 + Math.random() * 0.07})`
    ctx.fillRect(Math.random() * size, Math.random() * size, 1.2, 1.2)
  }

  const colorMap = new THREE.CanvasTexture(canvas)
  colorMap.wrapS = colorMap.wrapT = THREE.RepeatWrapping
  colorMap.anisotropy = 8
  if ("colorSpace" in colorMap) {
    ;(colorMap as THREE.Texture & { colorSpace: string }).colorSpace = THREE.SRGBColorSpace
  }
  colorMap.needsUpdate = true

  const rCanvas = document.createElement("canvas")
  rCanvas.width = size
  rCanvas.height = size
  const rctx = rCanvas.getContext("2d")!
  rctx.fillStyle = "#b8b8b8"
  rctx.fillRect(0, 0, size, size)
  rctx.fillStyle = "#c8c8c8"
  for (let i = 0; i < 6000; i++) {
    rctx.fillRect(Math.random() * size, Math.random() * size, 1.5, 1.5)
  }
  rctx.fillStyle = "#989898"
  for (let i = 0; i < 3500; i++) {
    rctx.fillRect(Math.random() * size, Math.random() * size, 1, 1)
  }
  rctx.globalAlpha = 0.35
  rctx.strokeStyle = "#888888"
  rctx.lineWidth = 2
  for (let v = 0; v < 40; v++) {
    rctx.beginPath()
    let x = Math.random() * size
    let y = Math.random() * size
    rctx.moveTo(x, y)
    for (let s = 0; s < 5; s++) {
      const nx = x + (Math.random() - 0.5) * 180
      const ny = y + (Math.random() - 0.5) * 180
      rctx.lineTo(nx, ny)
      x = nx
      y = ny
    }
    rctx.stroke()
  }

  const roughnessMap = new THREE.CanvasTexture(rCanvas)
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping
  roughnessMap.anisotropy = 8
  if ("colorSpace" in roughnessMap) {
    ;(roughnessMap as THREE.Texture & { colorSpace: string }).colorSpace = THREE.NoColorSpace
  }
  roughnessMap.needsUpdate = true

  return { colorMap, roughnessMap }
}

function WoodFloorPlane({
  widthMeters,
  lengthMeters,
}: {
  widthMeters: number
  lengthMeters: number
}) {
  const [colorMap, bumpMap, roughnessMap] = useTexture([
    `${THREE_JS_TEX}/hardwood2_diffuse.jpg`,
    `${THREE_JS_TEX}/hardwood2_bump.jpg`,
    `${THREE_JS_TEX}/hardwood2_roughness.jpg`,
  ])

  useLayoutEffect(() => {
    for (const t of [colorMap, bumpMap, roughnessMap]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.anisotropy = 8
    }
    if ("colorSpace" in colorMap) {
      ;(colorMap as THREE.Texture & { colorSpace: string }).colorSpace = THREE.SRGBColorSpace
    }
    for (const t of [bumpMap, roughnessMap]) {
      if ("colorSpace" in t) {
        ;(t as THREE.Texture & { colorSpace: string }).colorSpace = THREE.NoColorSpace
      }
    }
    const u = Math.max(2, widthMeters / 1.2)
    const v = Math.max(2, lengthMeters / 1.2)
    colorMap.repeat.set(u, v)
    bumpMap.repeat.set(u, v)
    roughnessMap.repeat.set(u, v)
    colorMap.needsUpdate = true
    bumpMap.needsUpdate = true
    roughnessMap.needsUpdate = true
  }, [widthMeters, lengthMeters, colorMap, bumpMap, roughnessMap])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[widthMeters, lengthMeters]} />
      <meshStandardMaterial
        map={colorMap}
        color={WALNUT_TINT}
        bumpMap={bumpMap}
        bumpScale={0.042}
        roughnessMap={roughnessMap}
        roughness={1}
        metalness={0}
      />
    </mesh>
  )
}

function MarbleFloorPlane({
  widthMeters,
  lengthMeters,
}: {
  widthMeters: number
  lengthMeters: number
}) {
  const { colorMap, roughnessMap } = useMemo(() => createMarbleTextures(), [])

  useEffect(() => {
    return () => {
      colorMap.dispose()
      roughnessMap.dispose()
    }
  }, [colorMap, roughnessMap])

  useLayoutEffect(() => {
    const u = Math.max(1.5, widthMeters / 2.5)
    const v = Math.max(1.5, lengthMeters / 2.5)
    colorMap.repeat.set(u, v)
    roughnessMap.repeat.set(u, v)
    colorMap.needsUpdate = true
    roughnessMap.needsUpdate = true
  }, [widthMeters, lengthMeters, colorMap, roughnessMap])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[widthMeters, lengthMeters]} />
      <meshPhysicalMaterial
        map={colorMap}
        roughnessMap={roughnessMap}
        color="#f7f9f6"
        roughness={0.52}
        metalness={0.035}
        clearcoat={0.22}
        clearcoatRoughness={0.28}
        envMapIntensity={0.95}
        bumpMap={roughnessMap}
        bumpScale={0.008}
      />
    </mesh>
  )
}

function FloorFallback({
  widthMeters,
  lengthMeters,
  tint,
}: {
  widthMeters: number
  lengthMeters: number
  tint: string
}) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[widthMeters, lengthMeters]} />
      <meshStandardMaterial color={tint} roughness={0.85} />
    </mesh>
  )
}

export function RoomFloor({
  finish,
  widthMeters,
  lengthMeters,
}: {
  finish: RoomFloorFinish
  widthMeters: number
  lengthMeters: number
}) {
  if (finish === "marble") {
    return <MarbleFloorPlane widthMeters={widthMeters} lengthMeters={lengthMeters} />
  }

  return (
    <Suspense
      fallback={<FloorFallback widthMeters={widthMeters} lengthMeters={lengthMeters} tint="#4a3228" />}
    >
      <WoodFloorPlane widthMeters={widthMeters} lengthMeters={lengthMeters} />
    </Suspense>
  )
}
