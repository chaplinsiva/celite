"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

export function WebGLShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene | null
    camera: THREE.OrthographicCamera | null
    renderer: THREE.WebGLRenderer | null
    mesh: THREE.Mesh | null
    uniforms: any
    animationId: number | null
  }>({
    scene: null,
    camera: null,
    renderer: null,
    mesh: null,
    uniforms: null,
    animationId: null,
  })

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const { current: refs } = sceneRef

    // Clean up any existing renderer to avoid context conflicts
    if (refs.renderer) {
      try {
        refs.renderer.dispose()
      } catch (e) {
        // Ignore disposal errors
      }
      refs.renderer = null
    }

    // Clean up any existing WebGL context that might exist on the canvas
    // This prevents "Canvas has an existing context" errors
    const existingContext = canvas.getContext('webgl') || canvas.getContext('webgl2') || canvas.getContext('experimental-webgl')
    if (existingContext) {
      // Canvas already has a context, we'll let THREE.js handle it
      // but we should dispose it first if possible
      try {
        const gl = existingContext as WebGLRenderingContext
        const loseContext = gl.getExtension('WEBGL_lose_context')
        if (loseContext) {
          loseContext.loseContext()
        }
      } catch (e) {
        // Ignore errors when trying to lose context
      }
    }

    const vertexShader = `
      attribute vec3 position;
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `

    const fragmentShader = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;
      uniform float xScale;
      uniform float yScale;
      uniform float distortion;

      void main() {
        vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
        
        float d = length(p) * distortion;
        
        float rx = p.x * (1.0 + d);
        float gx = p.x;
        float bx = p.x * (1.0 - d);

        float r = 0.05 / abs(p.y + sin((rx + time) * xScale) * yScale);
        float g = 0.05 / abs(p.y + sin((gx + time) * xScale) * yScale);
        float b = 0.05 / abs(p.y + sin((bx + time) * xScale) * yScale);
        
        gl_FragColor = vec4(r, g, b, 1.0);
      }
    `

    const handleResize = () => {
      if (!refs.renderer || !refs.uniforms) return
      const width = window.innerWidth
      const height = window.innerHeight
      refs.renderer.setSize(width, height, false)
      refs.uniforms.resolution.value = [width, height]
    }

    const initScene = () => {
      // Check WebGL support using a temporary canvas to avoid context conflicts
      const checkWebGLSupport = () => {
        try {
          const testCanvas = document.createElement('canvas')
          const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')
          return !!gl
        } catch {
          return false
        }
      }

      if (!checkWebGLSupport()) {
        console.warn('WebGL is not supported or disabled in this browser')
        canvas.style.backgroundColor = '#000000'
        return
      }

      try {
        refs.scene = new THREE.Scene()
        
        try {
          refs.renderer = new THREE.WebGLRenderer({ 
            canvas,
            antialias: true,
            alpha: false,
            powerPreference: 'default'
          })
        } catch (rendererError: any) {
          console.error('Failed to create WebGL renderer:', rendererError)
          // Set fallback background
          canvas.style.backgroundColor = '#000000'
          return
        }

        if (!refs.renderer) {
          console.error('WebGL renderer is null')
          if (canvas) {
            canvas.style.backgroundColor = '#000000'
          }
          return
        }

        refs.renderer.setPixelRatio(window.devicePixelRatio)
        refs.renderer.setClearColor(new THREE.Color(0x000000))

      refs.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, -1)

      refs.uniforms = {
        resolution: { value: [window.innerWidth, window.innerHeight] },
        time: { value: 0.0 },
        xScale: { value: 1.0 },
        yScale: { value: 0.5 },
        distortion: { value: 0.05 },
      }

      const position = [
        -1.0, -1.0, 0.0,
         1.0, -1.0, 0.0,
        -1.0,  1.0, 0.0,
         1.0, -1.0, 0.0,
        -1.0,  1.0, 0.0,
         1.0,  1.0, 0.0,
      ]

      const positions = new THREE.BufferAttribute(new Float32Array(position), 3)
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute("position", positions)

      const material = new THREE.RawShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: refs.uniforms,
        side: THREE.DoubleSide,
      })

      refs.mesh = new THREE.Mesh(geometry, material)
      refs.scene.add(refs.mesh)

      handleResize()
      } catch (err) {
        console.error('Error initializing WebGL scene:', err)
        // Set fallback background on error
        if (canvas) {
          canvas.style.backgroundColor = '#000000'
        }
        // Clean up on error
        if (refs.renderer) {
          refs.renderer.dispose()
          refs.renderer = null
        }
        return
      }
    }

    const animate = () => {
      // Only animate if renderer was successfully created
      if (!refs.renderer || !refs.scene || !refs.camera) {
        return
      }

      if (refs.uniforms) refs.uniforms.time.value += 0.01
      try {
        refs.renderer.render(refs.scene, refs.camera)
      } catch (err) {
        console.error('Error rendering WebGL scene:', err)
        return
      }
      refs.animationId = requestAnimationFrame(animate)
    }

    // Only initialize if WebGL is supported
    let initialized = false
    try {
      initScene()
      if (refs.renderer && refs.scene && refs.camera) {
        initialized = true
        animate()
        window.addEventListener("resize", handleResize)
      }
    } catch (initErr) {
      console.error('Failed to initialize WebGL shader:', initErr)
    }

    return () => {
      if (refs.animationId) {
        cancelAnimationFrame(refs.animationId)
        refs.animationId = null
      }
      window.removeEventListener("resize", handleResize)
      if (refs.mesh) {
        refs.scene?.remove(refs.mesh)
        refs.mesh.geometry.dispose()
        if (refs.mesh.material instanceof THREE.Material) {
          refs.mesh.material.dispose()
        }
        refs.mesh = null
      }
      if (refs.renderer) {
        refs.renderer.dispose()
        refs.renderer = null
      }
      refs.scene = null
      refs.camera = null
      refs.uniforms = null
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block z-0 bg-black"
    />
  )
}

