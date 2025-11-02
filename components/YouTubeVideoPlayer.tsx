'use client';

import { useState, useRef, useEffect } from 'react';
import { getYouTubeEmbedUrl, getYouTubeVideoId } from '../lib/utils';

interface YouTubeVideoPlayerProps {
  videoUrl: string | null | undefined;
  title?: string;
  className?: string;
  showFullscreen?: boolean;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function YouTubeVideoPlayer({ videoUrl, title, className = '', showFullscreen = false }: YouTubeVideoPlayerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const videoId = getYouTubeVideoId(videoUrl);
  const embedUrl = getYouTubeEmbedUrl(videoUrl);

  const initializePlayer = () => {
    if (!videoId || !containerRef.current || playerRef.current) return;

    try {
      const playerId = `youtube-player-${videoId}-${Date.now()}`;
      containerRef.current.id = playerId;
      
      playerRef.current = new window.YT.Player(playerId, {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          showinfo: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          iv_load_policy: 3,
          disablekb: 1,
          fs: 0,
        },
        events: {
          onReady: (event: any) => {
            setDuration(event.target.getDuration());
            startProgressTracking();
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
              }
            }
          },
        },
      });
    } catch (e) {
      console.error('Failed to initialize YouTube player:', e);
    }
  };

  const startProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current) {
        try {
          const current = playerRef.current.getCurrentTime();
          const dur = playerRef.current.getDuration();
          if (dur && dur > 0) {
            setCurrentTime(current);
            setDuration(dur);
            setProgress((current / dur) * 100);
          }
        } catch (e) {
          // Player not ready
        }
      }
    }, 100);
  };

  useEffect(() => {
    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      
      // Set up the callback for when API is ready
      window.onYouTubeIframeAPIReady = () => {
        if (isHovered && videoId && containerRef.current && !playerRef.current) {
          initializePlayer();
        }
      };
    }

    // Initialize player when hovered
    if (isHovered && videoId && containerRef.current && !playerRef.current) {
      if (window.YT && window.YT.Player) {
        initializePlayer();
      } else {
        // Wait for API to be ready
        const checkYT = setInterval(() => {
          if (window.YT && window.YT.Player && containerRef.current && !playerRef.current) {
            clearInterval(checkYT);
            initializePlayer();
          }
        }, 100);

        return () => {
          clearInterval(checkYT);
        };
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (playerRef.current && !isHovered) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // Player already destroyed
        }
        playerRef.current = null;
      }
    };
  }, [isHovered, videoId]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (playerRef.current) {
      try {
        playerRef.current.pauseVideo();
      } catch (e) {
        // Player not ready
      }
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playerRef.current) {
      try {
        if (isMuted) {
          playerRef.current.unMute();
        } else {
          playerRef.current.mute();
        }
        setIsMuted(!isMuted);
      } catch (e) {
        // Player not ready
      }
    }
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playerRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newTime = percentage * duration;
      try {
        playerRef.current.seekTo(newTime, true);
        setProgress(percentage * 100);
        setCurrentTime(newTime);
      } catch (e) {
        // Player not ready
      }
    }
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playerContainerRef.current) return;

    try {
      if (!isFullscreen) {
        // Enter fullscreen
        if (playerContainerRef.current.requestFullscreen) {
          playerContainerRef.current.requestFullscreen();
        } else if ((playerContainerRef.current as any).webkitRequestFullscreen) {
          (playerContainerRef.current as any).webkitRequestFullscreen();
        } else if ((playerContainerRef.current as any).mozRequestFullScreen) {
          (playerContainerRef.current as any).mozRequestFullScreen();
        } else if ((playerContainerRef.current as any).msRequestFullscreen) {
          (playerContainerRef.current as any).msRequestFullscreen();
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        }
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  useEffect(() => {
    if (!showFullscreen) return;

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [showFullscreen]);

  if (!videoId || !embedUrl) {
    return null;
  }

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  return (
    <div 
      className={`relative w-full h-full rounded-xl overflow-hidden bg-zinc-950 group ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isHovered ? (
        // Show video when hovered with custom controls
        <div ref={playerContainerRef} className="relative w-full h-full">
          <div ref={containerRef} className="w-full h-full"></div>
          {/* Overlay to hide YouTube title and channel logo (top area) */}
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10"></div>
          {/* Custom Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 sm:p-4 pointer-events-none z-10">
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Timeline/Progress Bar */}
              <div 
                className="flex-1 relative h-1.5 bg-white/20 rounded-full cursor-pointer group/timeline pointer-events-auto"
                onClick={handleTimelineClick}
              >
                <div 
                  className="absolute left-0 top-0 h-full bg-white rounded-full transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/timeline:opacity-100 transition-opacity"
                  style={{ left: `calc(${progress}% - 6px)` }}
                />
              </div>
              {/* Audio/Mute Button */}
              <button
                onClick={toggleMute}
                className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white hover:text-zinc-100 transition-all duration-200 pointer-events-auto"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.79L4.766 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.766l3.617-3.79a1 1 0 011.617.79zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                    <path d="M5.293 5.293a1 1 0 011.414 0L15.707 14.707a1 1 0 01-1.414 1.414L5.293 6.707a1 1 0 010-1.414z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
              {/* Fullscreen Button (only if showFullscreen is true) */}
              {showFullscreen && (
                <button
                  onClick={toggleFullscreen}
                  className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white hover:text-zinc-100 transition-all duration-200 pointer-events-auto"
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isFullscreen ? (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12M9 3H7a2 2 0 00-2 2v2m0 0h2m-2 0V7m0 10h2m-2 0v-2m0 0h-2m8-8h2a2 2 0 012 2v2m0 0h-2m2 0V7m0 10h-2m2 0v-2m0 0h2" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Show thumbnail when not hovered
        <img 
          src={thumbnailUrl}
          alt={title || 'Video thumbnail'}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to hqdefault if maxresdefault fails
            const target = e.target as HTMLImageElement;
            target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          }}
        />
      )}
    </div>
  );
}

