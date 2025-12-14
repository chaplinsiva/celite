'use client';

import { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Download, Maximize2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, convertR2UrlToCdn } from '../lib/utils';

interface StockPhotoViewerProps {
  imageUrl: string;
  title: string;
  onDownload?: () => void;
  className?: string;
}

export default function StockPhotoViewer({ imageUrl, title, onDownload, className = '' }: StockPhotoViewerProps) {
  // Convert R2 URL to CDN
  const convertedImageUrl = convertR2UrlToCdn(imageUrl) || imageUrl;
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => {
      const newZoom = Math.max(prev - 0.25, 0.5);
      if (newZoom <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  };

  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => {
      const newZoom = Math.max(0.5, Math.min(3, prev + delta));
      if (newZoom <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-full bg-zinc-900 overflow-hidden", className)}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Image */}
      <div
        className="w-full h-full flex items-center justify-center"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
        }}
      >
        <img
          ref={imageRef}
          src={convertedImageUrl}
          alt={title}
          className="max-w-full max-h-full object-contain select-none"
          draggable={false}
        />
      </div>

      {/* Controls Overlay */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          disabled={zoom >= 3}
          className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg flex items-center justify-center hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5 text-zinc-700" />
        </button>
        <button
          onClick={handleZoomOut}
          disabled={zoom <= 0.5}
          className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg flex items-center justify-center hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5 text-zinc-700" />
        </button>
        <button
          onClick={handleReset}
          className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg flex items-center justify-center hover:bg-white transition-colors"
          title="Reset View"
        >
          <X className="w-5 h-5 text-zinc-700" />
        </button>
        <button
          onClick={toggleFullscreen}
          className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg flex items-center justify-center hover:bg-white transition-colors"
          title="Fullscreen"
        >
          <Maximize2 className="w-5 h-5 text-zinc-700" />
        </button>
        {onDownload && (
          <button
            onClick={onDownload}
            className="w-10 h-10 bg-blue-600 rounded-lg shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
            title="Download"
          >
            <Download className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      {/* Zoom Indicator */}
      {zoom !== 1 && (
        <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
          <p className="text-xs font-medium text-zinc-700">
            {Math.round(zoom * 100)}%
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 z-20 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg max-w-xs">
        <p className="text-xs text-zinc-600">
          <span className="font-semibold">Controls:</span> Scroll to zoom • Drag to pan • Click buttons for more options
        </p>
      </div>
    </div>
  );
}

