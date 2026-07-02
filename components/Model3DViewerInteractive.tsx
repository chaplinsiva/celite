'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { convertR2UrlToCdn } from '../lib/utils';

interface Model3DViewerInteractiveProps {
  modelUrl: string;
  className?: string;
}

export default function Model3DViewerInteractive({ modelUrl, className = '' }: Model3DViewerInteractiveProps) {
  // Convert R2 URL to CDN
  const convertedModelUrl = convertR2UrlToCdn(modelUrl) || modelUrl;
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !convertedModelUrl) return;

    let scene: any = null;
    let camera: any = null;
    let renderer: any = null;
    let model: any = null;
    let animationId: number | null = null;
    let controls: any = null;

    // Mouse interaction state
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let cameraDistance = 5;
    let cameraAngleX = 0;
    let cameraAngleY = 0;

    const initThree = async () => {
      try {
        // Dynamically import Three.js
        const threeModule = await import('three');
        const THREE = threeModule as any;
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');

        const container = containerRef.current!;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f5f5);

        // Camera
        camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(0, 0, 5);
        cameraDistance = 5;

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight1.position.set(1, 1, 1);
        scene.add(directionalLight1);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight2.position.set(-1, -1, -1);
        scene.add(directionalLight2);

        // OrbitControls for zoom and pan
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 1;
        controls.maxDistance = 10;
        controls.enablePan = true;
        controls.enableZoom = true;
        controls.enableRotate = true;
        
        // Store refs for button handlers
        controlsRef.current = controls;
        cameraRef.current = camera;
        sceneRef.current = scene;

        // Load model
        const loader = new GLTFLoader();
        loader.load(
          convertedModelUrl,
          (gltf) => {
            model = gltf.scene;
            
            // Center and scale model
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim;
            
            model.scale.multiplyScalar(scale);
            model.position.sub(center.multiplyScalar(scale));
            
            scene.add(model);
            
            // Update controls target to center of model
            controls.target.copy(model.position);
            controls.update();
            
            setLoading(false);
          },
          undefined,
          (err) => {
            console.error('Error loading 3D model:', err);
            setError('Failed to load 3D model');
            setLoading(false);
          }
        );

        // Animation loop
        const animate = () => {
          animationId = requestAnimationFrame(animate);
          
          if (controls) {
            controls.update();
          }
          
          renderer.render(scene, camera);
        };
        animate();

        // Handle resize
        const handleResize = () => {
          if (!container || !camera || !renderer) return;
          const newWidth = container.clientWidth;
          const newHeight = container.clientHeight;
          camera.aspect = newWidth / newHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(newWidth, newHeight);
        };
        window.addEventListener('resize', handleResize);

        // Cleanup function
        return () => {
          window.removeEventListener('resize', handleResize);
          if (animationId) cancelAnimationFrame(animationId);
          if (controls) controls.dispose();
          if (renderer && container) {
            const canvas = container.querySelector('canvas');
            if (canvas) container.removeChild(canvas);
            renderer.dispose();
          }
        };
      } catch (err) {
        console.error('Error initializing 3D viewer:', err);
        setError('Failed to initialize 3D viewer');
        setLoading(false);
      }
    };

    initThree();

    // Cleanup on unmount
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (controls) controls.dispose();
      if (containerRef.current) {
        const canvas = containerRef.current.querySelector('canvas');
        if (canvas) containerRef.current.removeChild(canvas);
        renderer?.dispose();
      }
    };
  }, [convertedModelUrl]);

  const handleZoomIn = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    const distance = cameraRef.current.position.distanceTo(controlsRef.current.target);
    const newDistance = Math.max(1, distance - 0.5);
    const direction = cameraRef.current.position.clone().sub(controlsRef.current.target).normalize();
    cameraRef.current.position.copy(controlsRef.current.target).add(direction.multiplyScalar(newDistance));
    controlsRef.current.update();
  };

  const handleZoomOut = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    const distance = cameraRef.current.position.distanceTo(controlsRef.current.target);
    const newDistance = Math.min(10, distance + 0.5);
    const direction = cameraRef.current.position.clone().sub(controlsRef.current.target).normalize();
    cameraRef.current.position.copy(controlsRef.current.target).add(direction.multiplyScalar(newDistance));
    controlsRef.current.update();
  };

  const handleReset = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(0, 0, 5);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-zinc-100 ${className}`}>
        <p className="text-sm text-zinc-500">{error}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 z-10">
          <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
        </div>
      )}
      
      {/* Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg flex items-center justify-center hover:bg-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5 text-zinc-700" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg flex items-center justify-center hover:bg-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5 text-zinc-700" />
        </button>
        <button
          onClick={handleReset}
          className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg flex items-center justify-center hover:bg-white transition-colors"
          title="Reset View"
        >
          <RotateCcw className="w-5 h-5 text-zinc-700" />
        </button>
      </div>
      
      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
        <p className="text-xs text-zinc-600">
          <span className="font-semibold">Controls:</span> Drag to rotate • Scroll to zoom • Right-click + drag to pan
        </p>
      </div>
    </div>
  );
}

