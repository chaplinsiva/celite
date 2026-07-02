'use client';

import { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause, Volume1 } from 'lucide-react';
import { convertR2UrlToCdn } from '../lib/utils';

interface SimpleMusicPlayerProps {
  audioUrl: string;
  title: string;
  subtitle?: string | null;
  thumbnailUrl?: string;
  className?: string;
}

export default function SimpleMusicPlayer({
  audioUrl,
  title,
  subtitle,
  thumbnailUrl,
  className = ''
}: SimpleMusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const convertedAudioUrl = convertR2UrlToCdn(audioUrl) || audioUrl;
  const convertedThumbnailUrl = convertR2UrlToCdn(thumbnailUrl);

  // Fade controls when playing and idle
  useEffect(() => {
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

    showControlsTemporarily();

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, isDragging]);

  // Keep controls visible when paused
  useEffect(() => {
    if (!isPlaying) {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    }
  }, [isPlaying]);

  // Sync HTML5 audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime);
      }
    };
    const handleDurationChange = () => {
      setDuration(audio.duration || 0);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);

    // Sync initial state
    setIsPlaying(!audio.paused);
    setCurrentTime(audio.currentTime);
    setDuration(audio.duration || 0);
    setIsMuted(audio.muted);
    audio.volume = volume;

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
    };
  }, [convertedAudioUrl]);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      // On play, enable sound by default
      if (isMuted) {
        setIsMuted(false);
        audio.muted = false;
        if (volume === 0) {
          setVolume(0.8);
          audio.volume = 0.8;
        }
      }
      audio.play().catch(err => {
        console.error('Error playing audio:', err);
        setIsPlaying(false);
      });
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    const newMuted = !isMuted;
    setIsMuted(newMuted);
    audio.muted = newMuted;

    if (!newMuted && volume === 0) {
      setVolume(0.8);
      audio.volume = 0.8;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);

    const audio = audioRef.current;
    if (audio) {
      audio.volume = newVol;
      if (newVol > 0) {
        audio.muted = false;
        setIsMuted(false);
      } else {
        audio.muted = true;
        setIsMuted(true);
      }
    }
  };

  // Draggable seek bar handler
  const handleSeek = (clientX: number) => {
    const audio = audioRef.current;
    const bar = progressBarRef.current;
    if (!audio || !bar || duration === 0) return;

    const rect = bar.getBoundingClientRect();
    const position = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = position * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
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
    if (isNaN(timeInSeconds) || !isFinite(timeInSeconds)) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const displayThumbnail = convertedThumbnailUrl || '/PNG1.png';
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const currentVolumePercent = isMuted ? 0 : volume * 100;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[300px] overflow-hidden select-none bg-zinc-950 group flex items-center justify-center rounded-xl cursor-pointer ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        if (isPlaying) setControlsVisible(false);
      }}
      onClick={() => togglePlay()}
    >
      <audio
        ref={audioRef}
        src={convertedAudioUrl}
        preload="metadata"
      />

      {/* Blurred glow ambient background cover */}
      <img
        src={displayThumbnail}
        alt=""
        className="absolute inset-0 w-full h-full object-cover filter blur-3xl opacity-35 scale-110 pointer-events-none select-none z-0"
      />

      {/* Dark tint overlay */}
      <div className="absolute inset-0 bg-black/40 z-0" />

      {/* Centered Cover Art */}
      <div className="relative z-10 flex flex-col items-center justify-center p-4">
        <div className="relative w-36 h-36 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 group-hover:scale-[1.03] bg-zinc-900 border border-white/10 flex items-center justify-center">
          <img
            src={displayThumbnail}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
        <h3 className="mt-4 font-semibold text-white text-base sm:text-lg text-center max-w-[250px] truncate select-none shadow-sm">{title}</h3>
        {subtitle && (
          <p className="text-zinc-400 text-xs sm:text-sm text-center max-w-[200px] truncate select-none">{subtitle}</p>
        )}
      </div>

      {/* White Line Scrubber at the Bottom */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 p-4 sm:p-6 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex items-center gap-4 transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()} // Prevent playing when controls panel is clicked
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
            className="relative w-full h-1.5 bg-white/25 rounded-full cursor-pointer flex items-center group/scrub"
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

            {/* Sound Icon & Adjustable Volume Slider */}
            <div className="flex items-center gap-1.5 sm:gap-2 group/volume">
              <button
                onClick={toggleMute}
                className="p-1 hover:text-white transition-colors"
                aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
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
          </div>
        </div>
      </div>
    </div>
  );
}
