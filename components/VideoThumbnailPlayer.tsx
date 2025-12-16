'use client';

import { useState, useRef, useEffect } from 'react';
import { convertR2UrlToCdn } from '../lib/utils';

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
  // Convert R2 URLs to CDN
  const convertedVideoUrl = convertR2UrlToCdn(videoUrl);
  const convertedThumbnailUrl = convertR2UrlToCdn(thumbnailUrl);
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoRef.current && convertedVideoUrl) {
      if (isHovered) {
        // Play video on hover
        videoRef.current.play().catch((e) => {
          console.error('Error playing video:', e);
        });
      } else {
        // Pause and reset video when hover out
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isHovered, convertedVideoUrl]);

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

  const displayThumbnail = convertedThumbnailUrl || '/PNG1.png';

  if (!convertedVideoUrl) {
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
        src={convertedVideoUrl}
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
    </div>
  );
}

