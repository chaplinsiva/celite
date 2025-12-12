'use client';

import { useState, useRef, useEffect } from 'react';
import { PlayCircle } from 'lucide-react';

interface VideoThumbnailPlayerProps {
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  title?: string;
  className?: string;
}

export default function VideoThumbnailPlayer({ 
  videoUrl, 
  thumbnailUrl, 
  title, 
  className = '' 
}: VideoThumbnailPlayerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoRef.current && videoUrl) {
      if (isHovered) {
        videoRef.current.play().catch((e) => {
          console.error('Error playing video:', e);
        });
      } else {
        videoRef.current.pause();
        // Reset to start when not hovered
        if (videoRef.current.currentTime > 0) {
          videoRef.current.currentTime = 0;
        }
      }
    }
  }, [isHovered, videoUrl]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleVideoEnded = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch((e) => {
        console.error('Error replaying video:', e);
      });
    }
  };

  const displayThumbnail = thumbnailUrl || '/PNG1.png';

  if (!videoUrl) {
    return (
      <img
        src={displayThumbnail}
        alt={title || 'Thumbnail'}
        className={`w-full h-full object-cover ${className}`}
      />
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Thumbnail - shown when not hovered */}
      <img
        src={displayThumbnail}
        alt={title || 'Video thumbnail'}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          isHovered ? 'opacity-0' : 'opacity-100'
        }`}
      />
      
      {/* Video - shown when hovered */}
      <video
        ref={videoRef}
        src={videoUrl}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
        muted
        loop
        playsInline
        onEnded={handleVideoEnded}
        onLoadedData={() => {
          if (videoRef.current && isHovered) {
            videoRef.current.play().catch((e) => {
              console.error('Error playing video on load:', e);
            });
          }
        }}
      />
      
      {/* Play icon overlay - shown on thumbnail when not hovered */}
      {!isHovered && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-blue-600 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all">
            <PlayCircle className="w-6 h-6 fill-current" />
          </div>
        </div>
      )}
    </div>
  );
}

