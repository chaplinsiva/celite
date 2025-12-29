"use client";

import { useState } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';
import { Volume2, Loader2, CheckCircle, XCircle, Wand2 } from 'lucide-react';

type SoundPreset = {
  name: string;
  soundType: string;
  subcategoryName: string;
  subcategorySlug: string;
  description: string;
};

const SOUND_PRESETS: SoundPreset[] = [
  // Camera Sounds
  {
    name: 'Camera Shutter',
    soundType: 'camera-shutter',
    subcategoryName: 'Camera Shutter',
    subcategorySlug: 'camera-shutter',
    description: 'DSLR and mirrorless camera shutter clicks',
  },
  {
    name: 'Camera Sounds',
    soundType: 'camera-sounds',
    subcategoryName: 'Camera Sounds',
    subcategorySlug: 'camera-sounds',
    description: 'Lens focus, zoom, and camera equipment',
  },
  // Short Film SFX
  {
    name: 'Footsteps',
    soundType: 'footsteps',
    subcategoryName: 'Footsteps',
    subcategorySlug: 'footsteps',
    description: 'Walking, running, and movement foley',
  },
  {
    name: 'Door Sounds',
    soundType: 'door-sounds',
    subcategoryName: 'Door Sounds',
    subcategorySlug: 'door-sounds',
    description: 'Creaks, slams, knocks, and locks',
  },
  {
    name: 'Ambient',
    soundType: 'ambient',
    subcategoryName: 'Ambient',
    subcategorySlug: 'ambient',
    description: 'Background atmosphere and room tones',
  },
  {
    name: 'Impact',
    soundType: 'impact',
    subcategoryName: 'Impact',
    subcategorySlug: 'impact',
    description: 'Hits, punches, crashes, and collisions',
  },
  {
    name: 'Suspense',
    soundType: 'suspense',
    subcategoryName: 'Suspense',
    subcategorySlug: 'suspense',
    description: 'Tension and thriller atmosphere',
  },
  {
    name: 'Nature',
    soundType: 'nature',
    subcategoryName: 'Nature',
    subcategorySlug: 'nature',
    description: 'Weather, outdoor, and environmental',
  },
  {
    name: 'Technology',
    soundType: 'technology',
    subcategoryName: 'Technology',
    subcategorySlug: 'technology',
    description: 'Digital, UI, and electronic sounds',
  },
  {
    name: 'Transitions',
    soundType: 'transitions',
    subcategoryName: 'Transitions',
    subcategorySlug: 'transitions',
    description: 'Swooshes and scene change effects',
  },
  {
    name: 'Vehicles',
    soundType: 'vehicles',
    subcategoryName: 'Vehicles',
    subcategorySlug: 'vehicles',
    description: 'Cars, motorcycles, and transportation',
  },
  {
    name: 'Horror',
    soundType: 'horror',
    subcategoryName: 'Horror',
    subcategorySlug: 'horror',
    description: 'Scary, creepy, and monster sounds',
  },
  {
    name: 'Whoosh',
    soundType: 'whoosh',
    subcategoryName: 'Whoosh',
    subcategorySlug: 'whoosh',
    description: 'Air movement and transition sounds',
  },
  // UI & Creative SFX
  {
    name: 'Glitch',
    soundType: 'glitch',
    subcategoryName: 'Glitch',
    subcategorySlug: 'glitch',
    description: 'Digital distortion and static effects',
  },
  {
    name: 'Keyboard',
    soundType: 'keyboard',
    subcategoryName: 'Keyboard',
    subcategorySlug: 'keyboard',
    description: 'Mechanical and membrane key sounds',
  },
  {
    name: 'Typing',
    soundType: 'typing',
    subcategoryName: 'Typing',
    subcategorySlug: 'typing',
    description: 'Computer typing and office sounds',
  },
  {
    name: 'Pop',
    soundType: 'pop',
    subcategoryName: 'Pop',
    subcategorySlug: 'pop',
    description: 'Bubble pops and cartoon effects',
  },
  {
    name: 'Paper',
    soundType: 'paper',
    subcategoryName: 'Paper',
    subcategorySlug: 'paper',
    description: 'Paper rustling, tearing, and folding',
  },
  {
    name: 'Highlighter',
    soundType: 'highlighter',
    subcategoryName: 'Highlighter',
    subcategorySlug: 'highlighter',
    description: 'Marker and pen on paper sounds',
  },
  {
    name: 'Notification',
    soundType: 'notification',
    subcategoryName: 'Notification',
    subcategorySlug: 'notification',
    description: 'Alerts, dings, and app notifications',
  },
  {
    name: 'UI Click',
    soundType: 'ui-click',
    subcategoryName: 'UI Click',
    subcategorySlug: 'ui-click',
    description: 'Button clicks and interface sounds',
  },
  {
    name: 'Writing',
    soundType: 'writing',
    subcategoryName: 'Writing',
    subcategorySlug: 'writing',
    description: 'Pen, pencil, and chalk sounds',
  },
  {
    name: 'Coins',
    soundType: 'coins',
    subcategoryName: 'Coins',
    subcategorySlug: 'coins',
    description: 'Money clinks and game rewards',
  },
  {
    name: 'Swoosh',
    soundType: 'swoosh',
    subcategoryName: 'Swoosh',
    subcategorySlug: 'swoosh',
    description: 'Fast movement and action sounds',
  },
  // Realistic SFX
  {
    name: 'Gun Shots',
    soundType: 'gun-shots',
    subcategoryName: 'Gun Shots',
    subcategorySlug: 'gun-shots',
    description: 'Firearms and weapon sounds',
  },
  {
    name: 'Human Sounds',
    soundType: 'human-sounds',
    subcategoryName: 'Human Sounds',
    subcategorySlug: 'human-sounds',
    description: 'Vocal and body sounds',
  },
  {
    name: 'Glass Breaking',
    soundType: 'glass-breaking',
    subcategoryName: 'Glass Breaking',
    subcategorySlug: 'glass-breaking',
    description: 'Shattering and breaking sounds',
  },
  {
    name: 'Fire',
    soundType: 'fire',
    subcategoryName: 'Fire',
    subcategorySlug: 'fire',
    description: 'Flame and burning sounds',
  },
  {
    name: 'Thunder',
    soundType: 'thunder',
    subcategoryName: 'Thunder',
    subcategorySlug: 'thunder',
    description: 'Storm and weather sounds',
  },
  {
    name: 'Train',
    soundType: 'train',
    subcategoryName: 'Train',
    subcategorySlug: 'train',
    description: 'Railway and transportation sounds',
  },
  {
    name: 'Beats',
    soundType: 'beats',
    subcategoryName: 'Beats',
    subcategorySlug: 'beats',
    description: 'Rhythmic beats and percussion',
  },
  {
    name: 'Impacts',
    soundType: 'impacts',
    subcategoryName: 'Impacts',
    subcategorySlug: 'impacts',
    description: 'Crash and hit sounds',
  },
  {
    name: 'Home Things',
    soundType: 'home-things',
    subcategoryName: 'Home Things',
    subcategorySlug: 'home-things',
    description: 'Household and everyday sounds',
  },
  {
    name: 'Mouse Clicks',
    soundType: 'mouse-clicks',
    subcategoryName: 'Mouse Clicks',
    subcategorySlug: 'mouse-clicks',
    description: 'Computer mouse and interface sounds',
  },
  {
    name: 'Water Sounds',
    soundType: 'water-sounds',
    subcategoryName: 'Water Sounds',
    subcategorySlug: 'water-sounds',
    description: 'Water and liquid sounds',
  },
];

type GenerationResult = {
  success: boolean;
  name?: string;
  slug?: string;
  audioUrl?: string;
  error?: string;
  index?: number;
};

export default function BulkSfxPanel() {
  const [selectedPreset, setSelectedPreset] = useState<SoundPreset>(SOUND_PRESETS[0]);
  const [customSoundType, setCustomSoundType] = useState('');
  const [customSubcategoryName, setCustomSubcategoryName] = useState('');
  const [count, setCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [useCustom, setUseCustom] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setResults([]);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('You must be logged in to generate sound effects');
        setIsGenerating(false);
        return;
      }

      const soundType = useCustom ? customSoundType.toLowerCase().replace(/\s+/g, '-') : selectedPreset.soundType;
      const subcategoryName = useCustom ? customSubcategoryName : selectedPreset.subcategoryName;
      const subcategorySlug = useCustom ? customSoundType.toLowerCase().replace(/\s+/g, '-') : selectedPreset.subcategorySlug;

      const response = await fetch('/api/admin/bulk-upload-sfx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          count,
          soundType,
          subcategoryName,
          subcategorySlug,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to generate sound effects');
      } else if (data.ok) {
        setResults(data.results || []);
      } else {
        setError(data.error || 'Unknown error occurred');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to generate sound effects');
    } finally {
      setIsGenerating(false);
    }
  };

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-zinc-900 flex items-center gap-3">
          <Volume2 className="w-8 h-8 text-blue-600" />
          Bulk Sound Effects Generator
        </h1>
        <p className="text-zinc-500 mt-1">
          Generate AI-powered sound effects using ElevenLabs and upload them automatically.
        </p>
      </header>

      {/* Configuration Card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Configuration</h2>

        {/* Toggle between preset and custom */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setUseCustom(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !useCustom
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            Use Preset
          </button>
          <button
            onClick={() => setUseCustom(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              useCustom
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            Custom Sound Type
          </button>
        </div>

        {!useCustom ? (
          /* Preset Selection */
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Sound Type Preset
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {SOUND_PRESETS.map((preset) => (
                <button
                  key={preset.soundType}
                  onClick={() => setSelectedPreset(preset)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedPreset.soundType === preset.soundType
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <div className="font-medium text-zinc-900 text-sm">{preset.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Custom Sound Type */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Sound Type (e.g., "door-slam")
              </label>
              <input
                type="text"
                value={customSoundType}
                onChange={(e) => setCustomSoundType(e.target.value)}
                placeholder="door-slam"
                className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Subcategory Name (e.g., "Door Slam")
              </label>
              <input
                type="text"
                value={customSubcategoryName}
                onChange={(e) => setCustomSubcategoryName(e.target.value)}
                placeholder="Door Slam"
                className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        )}

        {/* Count Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Number of Sound Effects to Generate
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="50"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value))}
              className="flex-1 h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-2xl font-bold text-zinc-900 w-12 text-center">{count}</span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Each sound effect takes ~5 seconds to generate. Total estimated time: ~{count * 5} seconds
          </p>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || (useCustom && (!customSoundType || !customSubcategoryName))}
          className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white px-8 py-3 text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Generate {count} Sound Effects
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">Error:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Results Display */}
      {results.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Generation Results
          </h2>
          
          <div className="mb-4 flex gap-4">
            <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
              {successCount} Successful
            </div>
            {failCount > 0 && (
              <div className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
                {failCount} Failed
              </div>
            )}
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {results.map((result, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  result.success ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {result.success ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="font-medium text-zinc-900">
                    {result.name || `Sound Effect ${result.index}`}
                  </span>
                </div>
                {result.success && result.audioUrl && (
                  <audio controls className="h-8" src={result.audioUrl} />
                )}
                {!result.success && result.error && (
                  <span className="text-sm text-red-600">{result.error}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
