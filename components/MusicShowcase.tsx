'use client';

import Link from 'next/link';
import { Play, Music2, ArrowRight } from 'lucide-react';
import { useState } from 'react';

// Mock music data with album covers
const musicTracks = [
  {
    id: 1,
    title: 'Cinematic Adventure',
    artist: 'Celite Music',
    genre: 'Cinematic',
    cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80',
    href: '/stock-musics?genre=Cinematic'
  },
  {
    id: 2,
    title: 'Electronic Pulse',
    artist: 'Celite Music',
    genre: 'Electronic',
    cover: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&q=80',
    href: '/stock-musics?genre=Electronic'
  },
  {
    id: 3,
    title: 'Ambient Dreams',
    artist: 'Celite Music',
    genre: 'Ambient',
    cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&q=80',
    href: '/stock-musics?genre=Ambient'
  },
  {
    id: 4,
    title: 'Corporate Energy',
    artist: 'Celite Music',
    genre: 'Corporate',
    cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&q=80',
    href: '/stock-musics?genre=Corporate'
  },
  {
    id: 5,
    title: 'Hip Hop Vibes',
    artist: 'Celite Music',
    genre: 'Hip Hop',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80',
    href: '/stock-musics?genre=Hip Hop'
  },
  {
    id: 6,
    title: 'Jazz Lounge',
    artist: 'Celite Music',
    genre: 'Jazz',
    cover: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&q=80',
    href: '/stock-musics?genre=Jazz'
  },
  {
    id: 7,
    title: 'Rock Anthem',
    artist: 'Celite Music',
    genre: 'Rock',
    cover: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf29a9e?w=400&q=80',
    href: '/stock-musics?genre=Rock'
  },
  {
    id: 8,
    title: 'Chill Beats',
    artist: 'Celite Music',
    genre: 'Chill',
    cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&q=80',
    href: '/stock-musics?genre=Chill'
  }
];

export default function MusicShowcase() {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  return (
    <section className="relative w-full py-12 md:py-16 px-4 sm:px-6 bg-gradient-to-b from-background to-zinc-50">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
                <Music2 className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-black tracking-tight">
                Featured Music
              </h2>
            </div>
            <p className="text-zinc-600 text-sm md:text-base ml-13">
              Discover premium royalty-free music for your projects
            </p>
          </div>
          <Link
            href="/stock-musics"
            className="hidden sm:flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors group"
          >
            Browse All
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Music Grid - Modern Album Cover Design */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 md:gap-6">
          {musicTracks.map((track) => (
            <Link
              key={track.id}
              href={track.href}
              className="group relative"
              onMouseEnter={() => setHoveredId(track.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-900 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
                {/* Album Cover Image */}
                <div className="absolute inset-0">
                  <img
                    src={track.cover}
                    alt={track.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 opacity-80 group-hover:opacity-90 transition-opacity duration-500" />
                </div>

                {/* Play Button Overlay */}
                <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                  hoveredId === track.id 
                    ? 'opacity-100 scale-100' 
                    : 'opacity-0 scale-90'
                }`}>
                  <div className="w-16 h-16 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 text-blue-600 fill-blue-600 ml-1" />
                  </div>
                </div>

                {/* Bottom Info */}
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                  <h3 className="text-white font-bold text-sm md:text-base mb-1 line-clamp-1 drop-shadow-lg">
                    {track.title}
                  </h3>
                  <p className="text-zinc-300 text-xs md:text-sm mb-2 line-clamp-1">
                    {track.artist}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full border border-white/30">
                      {track.genre}
                    </span>
                  </div>
                </div>

                {/* Shine Effect on Hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </div>
            </Link>
          ))}
        </div>

        {/* Mobile View All Link */}
        <div className="sm:hidden mt-6 text-center">
          <Link
            href="/stock-musics"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            Browse All Music
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

