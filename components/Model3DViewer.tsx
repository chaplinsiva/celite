'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface Model3DViewerProps {
  modelUrl: string;
  className?: string;
  autoRotate?: boolean;
}

export default function Model3DViewer({ modelUrl, className = '', autoRotate = true }: Model3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !modelUrl) return;

    let scene: any = null;
    let camera: any = null;
    let renderer: any = null;
    let model: any = null;
    let animationId: number | null = null;

    const initThree = async () => {
      try {
        // Dynamically import Three.js
        const threeModule = await import('three');
        const THREE = threeModule as any;
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');

        const container = containerRef.current!;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f5f5);

        // Camera
        camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(0, 0, 5);

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

        // Load model
        const loader = new GLTFLoader();
        loader.load(
          modelUrl,
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
          
          if (autoRotate && model) {
            model.rotation.y += 0.01;
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
          if (renderer && container) {
            container.removeChild(renderer.domElement);
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
      if (containerRef.current && renderer) {
        const canvas = containerRef.current.querySelector('canvas');
        if (canvas) containerRef.current.removeChild(canvas);
        renderer?.dispose();
      }
    };
  }, [modelUrl, autoRotate]);

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
    </div>
  );
}

