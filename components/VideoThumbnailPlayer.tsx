'use client';

import { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause, Volume1, Maximize, Minimize } from 'lucide-react';
import { convertR2UrlToCdn } from '../lib/utils';

interface VideoThumbnailPlayerProps {
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  title?: string;
  className?: string;
  isProductPage?: boolean;
}

export default function VideoThumbnailPlayer({
  videoUrl,
  thumbnailUrl,
  title,
  className = '',
  isProductPage = false
}: VideoThumbnailPlayerProps) {
  // Convert R2 URLs to CDN
  const convertedVideoUrl = convertR2UrlToCdn(videoUrl);
  const convertedThumbnailUrl = convertR2UrlToCdn(thumbnailUrl);

  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement && document.fullscreenElement === containerRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // For product page, fade controls out when mouse is idle and video is playing
  useEffect(() => {
    if (!isProductPage) return;

    const showControlsTemporarily = () => {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (isPlaying && !isDragging) {
        controlsTimeoutRef.current = setTimeout(() => {
          setControlsVisible(false);
        }, 2000);
      }
    };

    const handleMouseMove = () => {
      showControlsTemporarily();
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
    }

    // Initialize visibility
    showControlsTemporarily();

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isProductPage, isPlaying, isDragging]);

  // Sync controls visibility with playback state (always show when paused)
  useEffect(() => {
    if (isProductPage && !isPlaying) {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    }
  }, [isProductPage, isPlaying]);

  // Sync HTML5 video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(video.currentTime);
      }
    };
    const handleDurationChange = () => {
      setDuration(video.duration || 0);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);

    // Sync initial state
    setIsPlaying(!video.paused);
    setCurrentTime(video.currentTime);
    setDuration(video.duration || 0);
    setIsMuted(video.muted);
    if (video.volume !== undefined) {
      setVolume(video.volume);
    }

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
    };
  }, [convertedVideoUrl]);

  // Outside Hover Preview: Play on hover, stop & reset on leave (Does not apply to Product Page)
  useEffect(() => {
    if (isProductPage) return;

    const video = videoRef.current;
    if (!video || !convertedVideoUrl) return;

    if (isHovered) {
      video.muted = true;
      setIsMuted(true);
      video.play().catch((e) => {
        console.error('Error playing preview:', e);
      });
    } else {
      video.pause();
      video.currentTime = 0;
      setCurrentTime(0);
      setIsMuted(true);
      video.muted = true;
    }
  }, [isHovered, convertedVideoUrl, isProductPage]);

  // Initialize volume and mute state for product page video
  useEffect(() => {
    if (!isProductPage) return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
    video.volume = volume;
  }, [isProductPage, convertedVideoUrl]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (isProductPage && isPlaying) {
      setControlsVisible(false);
    }
  };

  const handleVideoEnded = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
      videoRef.current.play().catch((e) => {
        console.error('Error replaying video:', e);
      });
    }
  };

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      // On play, enable sound by default (not muted)
      if (isProductPage && isMuted) {
        setIsMuted(false);
        video.muted = false;
        if (volume === 0) {
          setVolume(0.8);
          video.volume = 0.8;
        }
      }
      video.play().catch((e) => console.error('Play failed:', e));
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    const newMuted = !isMuted;
    setIsMuted(newMuted);
    video.muted = newMuted;

    if (!newMuted && volume === 0) {
      setVolume(0.8);
      video.volume = 0.8;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);

    const video = videoRef.current;
    if (video) {
      video.volume = newVol;
      if (newVol > 0) {
        video.muted = false;
        setIsMuted(false);
      } else {
        video.muted = true;
        setIsMuted(true);
      }
    }
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Draggable seek bar handler
  const handleSeek = (clientX: number) => {
    const video = videoRef.current;
    const bar = progressBarRef.current;
    if (!video || !bar || duration === 0) return;

    const rect = bar.getBoundingClientRect();
    const position = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = position * duration;

    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only handle left click
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    handleSeek(e.clientX);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      handleSeek(moveEvent.clientX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDragging(true);
    handleSeek(e.touches[0].clientX);

    const handleTouchMove = (moveEvent: TouchEvent) => {
      handleSeek(moveEvent.touches[0].clientX);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const displayThumbnail = convertedThumbnailUrl || '/PNG1.png';
  const showVideo = isProductPage || isHovered;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const currentVolumePercent = isMuted ? 0 : volume * 100;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none bg-black group ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Thumbnail Image */}
      <img
        src={displayThumbnail}
        alt={title || 'Video thumbnail'}
        loading="lazy"
        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 z-10 ${
          showVideo && currentTime > 0.1 ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      />

      {/* Video Element */}
      <video
        ref={videoRef}
        src={convertedVideoUrl || undefined}
        preload={isProductPage ? 'metadata' : 'none'}
        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 z-0 cursor-pointer ${
          showVideo ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        muted={isMuted}
        playsInline
        loop
        onClick={() => togglePlay()}
        onEnded={handleVideoEnded}
        onLoadedData={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration || 0);
          }
        }}
      />

      {/* Mode 1: Product Page Interactive Overlay */}
      {isProductPage && (
        <>
          {/* Bottom Controls Bar */}
          <div
            className={`absolute bottom-0 left-0 right-0 z-30 p-4 sm:p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center gap-4 transition-all duration-300 ${
              controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
            }`}
          >
            {/* Play/Pause Button on Left Side before Timeline */}
            <button
              onClick={togglePlay}
              className="flex-shrink-0 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all duration-200 flex items-center justify-center active:scale-95 shadow-md"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-white text-white" />
              ) : (
                <Play className="w-5 h-5 fill-white text-white ml-0.5" />
              )}
            </button>

            {/* Timeline and Details Container */}
            <div className="flex-grow flex flex-col gap-2 min-w-0">
              {/* Scrubber Timeline (White Line) */}
              <div
                ref={progressBarRef}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                className="relative w-full h-1.5 bg-white/20 rounded-full cursor-pointer flex items-center group/scrub"
              >
                <div
                  className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-75"
                  style={{ width: `${progressPercent}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/scrub:opacity-100 transition-opacity duration-150"
                  style={{ left: `${progressPercent}%`, transform: 'translate(-50%, -50%)' }}
                />
              </div>

              {/* Control details below the timeline line */}
              <div className="flex justify-between items-center text-[10px] sm:text-xs text-zinc-300 font-mono mt-0.5 select-none">
                <span>{formatTime(currentTime)} / {formatTime(duration)}</span>

                <div className="flex items-center gap-3 sm:gap-4">
                  {/* Sound Icon & Adjustable Volume Slider */}
                  <div className="flex items-center gap-1.5 sm:gap-2 group/volume">
                    <button
                      onClick={toggleMute}
                      className="p-1 hover:text-white transition-colors"
                      aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                      ) : volume < 0.5 ? (
                        <Volume1 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-12 sm:w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white hover:bg-white/40 transition-all focus:outline-none"
                      style={{
                        background: `linear-gradient(to right, white ${currentVolumePercent}%, rgba(255, 255, 255, 0.2) ${currentVolumePercent}%)`
                      }}
                    />
                  </div>

                  {/* Fullscreen Button */}
                  <button
                    onClick={toggleFullscreen}
                    className="p-1 hover:text-white transition-colors flex items-center justify-center"
                    aria-label="Toggle Fullscreen"
                  >
                    {isFullscreen ? (
                      <Minimize className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    ) : (
                      <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Mode 2: Outside Hover Preview Timeline Progress (Not on product page) */}
      {!isProductPage && isHovered && (
        <>
          {/* Mute/Unmute Indicator */}
          <button
            onClick={toggleMute}
            className="absolute bottom-4 right-4 z-20 p-2 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 hover:scale-105 transition-all duration-200 shadow-lg"
            aria-label={isMuted ? 'Unmute video' : 'Mute video'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Simple Bottom Progress Line (White Line Timeline) */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}
