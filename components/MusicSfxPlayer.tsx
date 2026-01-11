'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Volume2, VolumeX, SkipBack, SkipForward, Music2 } from 'lucide-react';
import { cn, convertR2UrlToCdn } from '../lib/utils';

interface MusicSfxPlayerProps {
  audioUrl: string;
  title: string;
  subtitle?: string | null;
  thumbnailUrl?: string;
  onDownload?: () => void;
  className?: string;
}

export default function MusicSfxPlayer({ audioUrl, title, subtitle, thumbnailUrl, onDownload, className = '' }: MusicSfxPlayerProps) {
  // Convert R2 URLs to CDN
  const convertedAudioUrl = convertR2UrlToCdn(audioUrl) || audioUrl;
  const convertedThumbnailUrl = convertR2UrlToCdn(thumbnailUrl);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    const handleEnded = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLoadStart = () => setIsLoading(true);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('loadstart', handleLoadStart);

    // Set initial volume
    audio.volume = volume;

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('loadstart', handleLoadStart);
    };
  }, [volume]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(err => {
        console.error('Error playing audio:', err);
        setIsPlaying(false);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    audio.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) {
      audio.volume = volume || 0.7;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const skipBackward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime - 10);
  };

  const skipForward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(duration, audio.currentTime + 10);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={cn("relative w-full h-full bg-gradient-to-br from-zinc-50 via-white to-zinc-50 flex flex-col rounded-xl overflow-hidden shadow-xl", className)}>
      <audio
        ref={audioRef}
        src={convertedAudioUrl}
        preload="metadata"
        onLoadedData={() => setIsLoading(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, #3b82f6 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        {/* Thumbnail/Artwork */}
        <div className="relative z-10 w-full max-w-md">
          {convertedThumbnailUrl ? (
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
              <img
                src={convertedThumbnailUrl}
                alt={title}
                className="relative w-full aspect-square object-cover rounded-2xl shadow-2xl ring-4 ring-white/50"
              />
              {isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-blue-600/20 backdrop-blur-sm flex items-center justify-center animate-pulse">
                    <Music2 className="w-10 h-10 text-blue-600" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
              <div className="relative w-full aspect-square flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 rounded-2xl shadow-2xl ring-4 ring-white/50">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                    <Music2 className="w-12 h-12 text-white" />
                  </div>
                  {isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-pulse">
                        <Music2 className="w-10 h-10 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Title and Subtitle */}
        <div className="relative z-10 mt-6 text-center max-w-md">
          <h3 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-2">{title}</h3>
          {subtitle && (
            <p className="text-sm md:text-base text-zinc-600">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Player Controls Panel */}
      <div className="bg-white border-t border-zinc-200 p-6 shadow-lg">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="relative">
            <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-150"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-500 mt-2">
            <span className="font-medium">{formatTime(currentTime)}</span>
            <span className="font-medium">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main Controls */}
        <div className="flex items-center justify-between gap-4 mb-6">
          {/* Volume Control */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={toggleMute}
              className="w-10 h-10 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-colors flex-shrink-0"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full h-1.5 bg-zinc-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(isMuted ? 0 : volume) * 100}%, #e4e4e7 ${(isMuted ? 0 : volume) * 100}%, #e4e4e7 100%)`
                }}
              />
            </div>
            <span className="text-xs text-zinc-500 w-10 text-right font-medium flex-shrink-0">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={skipBackward}
              className="w-10 h-10 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-colors rounded-lg hover:bg-zinc-100"
              title="Skip back 10s"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              onClick={togglePlay}
              disabled={isLoading}
              className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-7 h-7 fill-current" />
              ) : (
                <Play className="w-7 h-7 fill-current ml-0.5" />
              )}
            </button>
            <button
              onClick={skipForward}
              className="w-10 h-10 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-colors rounded-lg hover:bg-zinc-100"
              title="Skip forward 10s"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Download Button */}
          {onDownload && (
            <button
              onClick={onDownload}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 flex-shrink-0"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
          )}
        </div>

        {/* Info Text */}
        <p className="text-xs text-center text-zinc-400">
          Preview audio track • {duration > 0 ? `${Math.round(duration)}s` : 'Loading...'}
        </p>
      </div>
    </div>
  );
}
