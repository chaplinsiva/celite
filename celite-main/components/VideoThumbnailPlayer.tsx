'use client';

import { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
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
  const [isMuted, setIsMuted] = useState(true);
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
        // Reset to muted when not hovering
        setIsMuted(true);
        if (videoRef.current) {
          videoRef.current.muted = true;
        }
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

  const toggleMute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (videoRef.current) {
      videoRef.current.muted = newMuted;
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
        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${isHovered ? 'opacity-0' : 'opacity-100'
          }`}
      />

      {/* Video - shown when hovered */}
      <video
        ref={videoRef}
        src={convertedVideoUrl}
        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        muted={isMuted}
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

      {/* Speaker Icon Toggle - shown when hovered */}
      {isHovered && (
        <button
          onClick={toggleMute}
          className="absolute bottom-3 right-3 z-20 p-2 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-all duration-200 shadow-lg"
          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  );
}

