import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface PortfolioGlobeProps {
  className?: string
}

export function PortfolioGlobe({ className = '' }: PortfolioGlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const W = el.clientWidth
    const H = el.clientHeight

    // ── Renderer ──────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100)
    camera.position.set(0, 0, 4.8)

    // ── Colors ────────────────────────────────────────────
    const TEAL   = new THREE.Color('#008080')
    const TEAL_L = new THREE.Color('#00c8c8')
    const CREAM  = new THREE.Color('#F4E1C1')
    const SAND   = new THREE.Color('#c49a60')
    const INK    = new THREE.Color('#0d2b2b')

    // ── Central sphere (wireframe globe) ──────────────────
    const sphereGeo = new THREE.IcosahedronGeometry(1.05, 3)
    const sphereMat = new THREE.MeshBasicMaterial({
      color: TEAL,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    })
    const sphere = new THREE.Mesh(sphereGeo, sphereMat)
    scene.add(sphere)

    // Inner solid sphere (very faint)
    const innerGeo = new THREE.SphereGeometry(1.0, 32, 32)
    const innerMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#e6f5f5'),
      transparent: true,
      opacity: 0.06,
    })
    const innerSphere = new THREE.Mesh(innerGeo, innerMat)
    scene.add(innerSphere)

    // ── Node helper ───────────────────────────────────────
    function makeNode(color: THREE.Color, radius: number) {
      const g = new THREE.SphereGeometry(radius, 12, 12)
      const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
      return new THREE.Mesh(g, m)
    }

    // ── Stock nodes on surface ────────────────────────────
    const stockData = [
      { ticker: 'TCS',   lat: 30,  lon: 60,  color: TEAL,   r: 0.07 },
      { ticker: 'HDFC',  lat: -20, lon: 130, color: SAND,   r: 0.06 },
      { ticker: 'REL',   lat: 50,  lon: -80, color: TEAL,   r: 0.065 },
      { ticker: 'SUN',   lat: -45, lon: 20,  color: SAND,   r: 0.055 },
      { ticker: 'INFO',  lat: 10,  lon: -140,color: TEAL_L, r: 0.06 },
      { ticker: 'ICICI', lat: 70,  lon: 180, color: SAND,   r: 0.055 },
      { ticker: 'ITC',   lat: -65, lon: -60, color: TEAL,   r: 0.05 },
      { ticker: 'WIPRO', lat: 35,  lon: 100, color: TEAL_L, r: 0.05 },
    ]

    const surfaceNodes: THREE.Mesh[] = []
    const nodePivots: THREE.Group[] = []

    stockData.forEach((s) => {
      const latRad = (s.lat * Math.PI) / 180
      const lonRad = (s.lon * Math.PI) / 180
      const x = Math.cos(latRad) * Math.cos(lonRad)
      const y = Math.sin(latRad)
      const z = Math.cos(latRad) * Math.sin(lonRad)

      const node = makeNode(s.color, s.r)
      node.position.set(x * 1.05, y * 1.05, z * 1.05)
      scene.add(node)
      surfaceNodes.push(node)

      // Halo ring around each node
      const ring = new THREE.RingGeometry(s.r + 0.03, s.r + 0.055, 16)
      const ringMat = new THREE.MeshBasicMaterial({ color: s.color, side: THREE.DoubleSide, transparent: true, opacity: 0.4 })
      const ringMesh = new THREE.Mesh(ring, ringMat)
      ringMesh.position.copy(node.position)
      ringMesh.lookAt(0, 0, 0)
      scene.add(ringMesh)
    })

    // ── Connecting arcs (curved lines between nodes) ───────
    function makeArc(from: THREE.Vector3, to: THREE.Vector3, color: THREE.Color) {
      const mid = from.clone().add(to).multiplyScalar(0.5).normalize().multiplyScalar(1.45)
      const curve = new THREE.QuadraticBezierCurve3(from, mid, to)
      const points = curve.getPoints(40)
      const geo = new THREE.BufferGeometry().setFromPoints(points)
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.25 })
      return new THREE.Line(geo, mat)
    }

    const pairs = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[0,3],[1,4],[2,5]]
    pairs.forEach(([a, b]) => {
      if (surfaceNodes[a] && surfaceNodes[b]) {
        const arc = makeArc(surfaceNodes[a].position, surfaceNodes[b].position, TEAL)
        scene.add(arc)
      }
    })

    // ── Orbiting satellite rings ───────────────────────────
    function makeOrbitRing(radiusRing: number, tilt: number, color: THREE.Color, opacity: number) {
      const geo = new THREE.TorusGeometry(radiusRing, 0.005, 8, 80)
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.rotation.x = tilt
      return mesh
    }

    const ring1 = makeOrbitRing(1.55, Math.PI / 5,  TEAL,   0.35)
    const ring2 = makeOrbitRing(1.85, -Math.PI / 4, SAND,   0.25)
    const ring3 = makeOrbitRing(2.15, Math.PI / 2.5, TEAL_L, 0.18)
    scene.add(ring1, ring2, ring3)

    // ── Orbiting satellite dots ────────────────────────────
    interface Satellite { pivot: THREE.Group; speed: number; dot: THREE.Mesh }
    const satellites: Satellite[] = []

    function addSatellite(orbitR: number, tilt: number, color: THREE.Color, speed: number, dotR: number) {
      const pivot = new THREE.Group()
      pivot.rotation.x = tilt
      const dot = makeNode(color, dotR)
      dot.position.set(orbitR, 0, 0)
      pivot.add(dot)
      scene.add(pivot)
      satellites.push({ pivot, speed, dot })
    }

    addSatellite(1.55, Math.PI / 5,   TEAL,   0.4,  0.055)
    addSatellite(1.55, Math.PI / 5,   TEAL,   0.4,  0.04)
    addSatellite(1.85, -Math.PI / 4,  SAND,   0.25, 0.05)
    addSatellite(1.85, -Math.PI / 4,  SAND,   0.25, 0.04)
    addSatellite(2.15, Math.PI / 2.5, TEAL_L, 0.18, 0.045)

    // offset each satellite on its ring
    satellites[1].pivot.rotation.y = Math.PI
    satellites[3].pivot.rotation.y = Math.PI * 1.2
    satellites[4].pivot.rotation.y = Math.PI * 0.7

    // ── Floating data particles ────────────────────────────
    const particleCount = 120
    const positions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      const r = 1.2 + Math.random() * 1.6
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
    }
    const particleGeo = new THREE.BufferGeometry()
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const particleMat = new THREE.PointsMaterial({ color: TEAL, size: 0.025, transparent: true, opacity: 0.4 })
    const particles = new THREE.Points(particleGeo, particleMat)
    scene.add(particles)

    // ── Lighting (ambient fill) ────────────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambient)

    // ── Mouse interaction ──────────────────────────────────
    let mouseX = 0, mouseY = 0
    const onMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2
      mouseY = -((e.clientY - rect.top) / rect.height - 0.5) * 2
    }
    el.addEventListener('mousemove', onMouseMove)

    // ── Resize ────────────────────────────────────────────
    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    // ── Animate ───────────────────────────────────────────
    let raf: number
    const clock = new THREE.Clock()

    const animate = () => {
      raf = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()

      // Rotate globe
      sphere.rotation.y = t * 0.06
      sphere.rotation.x = Math.sin(t * 0.04) * 0.08
      innerSphere.rotation.y = t * 0.04

      // Surface nodes stay on globe
      surfaceNodes.forEach((n, i) => {
        const scale = 1 + Math.sin(t * 1.5 + i) * 0.12
        n.scale.setScalar(scale)
      })

      // Orbit rings
      ring1.rotation.z = t * 0.12
      ring2.rotation.z = -t * 0.09
      ring3.rotation.z = t * 0.07

      // Satellites
      satellites.forEach((s) => {
        s.pivot.rotation.y += s.speed * 0.008
      })

      // Particles drift
      particles.rotation.y = t * 0.015
      particles.rotation.x = t * 0.008

      // Mouse parallax
      const targetX = mouseX * 0.3
      const targetY = mouseY * 0.2
      sphere.rotation.y += (targetX - sphere.rotation.y) * 0.02
      sphere.rotation.x += (targetY - sphere.rotation.x) * 0.02

      // Pulse particle opacity
      particleMat.opacity = 0.25 + Math.sin(t * 0.8) * 0.15

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className={`w-full h-full ${className}`} />
}
