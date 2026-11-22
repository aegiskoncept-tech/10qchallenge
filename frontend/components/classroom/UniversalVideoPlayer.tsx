'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Player from '@vimeo/player';
import { Play, AlertCircle, Loader2, RefreshCw, ShieldCheck, Video as VideoIcon } from 'lucide-react';

export const APPROVED_CUSTOM_EMBED_DOMAINS = [
  'cloudflarestream.com',
  'videodelivery.net',
  'fast.wistia.net',
  'wistia.com',
  'loom.com',
  'www.loom.com',
  'player.vimeo.com',
  'vimeo.com',
  'youtube.com',
  'www.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'youtu.be',
  '10qchallenge.in',
  'cdn.10qchallenge.in',
  'media.10qchallenge.in',
  'stream.10qchallenge.in',
];

export interface UniversalVideoPlayerProps {
  provider?: 'VIMEO' | 'YOUTUBE' | 'CUSTOM' | 'HLS' | string;
  videoId?: string;
  videoUrl?: string;
  title?: string;
  autoPlay?: boolean;
  initialTime?: number;
  onProgress?: (progressPercent: number, currentTime: number) => void;
  onEnded?: () => void;
  className?: string;
}

export const UniversalVideoPlayer: React.FC<UniversalVideoPlayerProps> = ({
  provider = 'VIMEO',
  videoId = '',
  videoUrl = '',
  title = 'Video Lecture',
  autoPlay = false,
  initialTime = 0,
  onProgress,
  onEnded,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const vimeoPlayerRef = useRef<Player | null>(null);
  const html5VideoRef = useRef<HTMLVideoElement | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const normalizedProvider = (provider || 'VIMEO').toUpperCase();

  // Clean IDs and URL resolution
  const cleanVimeoId = videoId.replace(/[^0-9]/g, '');
  const cleanYouTubeId = (() => {
    const raw = (videoId || '').trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
    const match = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : raw;
  })();

  const cleanStreamUrl = (videoUrl || '').trim();

  // Validate custom domain
  const isCustomDomainApproved = useCallback((urlStr: string): boolean => {
    try {
      const parsed = new URL(urlStr);
      if (parsed.protocol !== 'https:') return false;
      const host = parsed.hostname.toLowerCase();
      return APPROVED_CUSTOM_EMBED_DOMAINS.some(
        (domain) => host === domain || host.endsWith('.' + domain)
      );
    } catch {
      return false;
    }
  }, []);

  // Cleanup effect
  const cleanupPlayers = useCallback(() => {
    if (vimeoPlayerRef.current) {
      try {
        vimeoPlayerRef.current.destroy().catch(() => {});
      } catch {}
      vimeoPlayerRef.current = null;
    }
    if (html5VideoRef.current) {
      try {
        html5VideoRef.current.pause();
        html5VideoRef.current.removeAttribute('src');
        html5VideoRef.current.load();
      } catch {}
      html5VideoRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupPlayers();
    };
  }, [cleanupPlayers]);

  // Provider: VIMEO initialization
  useEffect(() => {
    if (normalizedProvider !== 'VIMEO') return;
    if (!containerRef.current) return;

    setIsLoading(true);
    setError(null);

    if (!cleanVimeoId) {
      setError('Invalid or missing numeric Vimeo Video ID.');
      setIsLoading(false);
      return;
    }

    try {
      containerRef.current.innerHTML = '';
      const player = new Player(containerRef.current, {
        id: parseInt(cleanVimeoId, 10),
        responsive: true,
        autoplay: autoPlay,
        title: false,
        byline: false,
        portrait: false,
        color: '3F328A',
        speed: true,
        dnt: true,
      });

      vimeoPlayerRef.current = player;

      player.on('loaded', () => {
        if (initialTime && initialTime > 0) {
          player.setCurrentTime(initialTime).catch(() => {});
        }
        setIsLoading(false);
      });

      player.on('timeupdate', (data: { percent: number; seconds: number }) => {
        if (onProgress) {
          onProgress(Math.round(data.percent * 100), data.seconds);
        }
      });

      player.on('ended', () => {
        if (onEnded) onEnded();
      });

      player.on('error', (err: any) => {
        console.error('[UniversalPlayer Vimeo error]', err);
        setError('Unable to load Vimeo lecture. The video might be private, processing, or domain-restricted.');
        setIsLoading(false);
      });
    } catch (err: any) {
      console.error('[UniversalPlayer Vimeo Init Exception]', err);
      setError('Failed to initialize Vimeo player instance.');
      setIsLoading(false);
    }

    return () => {
      cleanupPlayers();
    };
  }, [normalizedProvider, cleanVimeoId, autoPlay, onProgress, onEnded, retryNonce, cleanupPlayers]);

  // Provider: YOUTUBE initialization
  useEffect(() => {
    if (normalizedProvider !== 'YOUTUBE') return;
    setIsLoading(true);
    setError(null);

    if (!cleanYouTubeId || !/^[a-zA-Z0-9_-]{11}$/.test(cleanYouTubeId)) {
      setError(`Invalid YouTube Video ID "${cleanYouTubeId}". Must be an 11-character video identifier.`);
      setIsLoading(false);
    }
  }, [normalizedProvider, cleanYouTubeId, retryNonce]);

  // Provider: HLS initialization
  useEffect(() => {
    if (normalizedProvider !== 'HLS') return;
    setIsLoading(true);
    setError(null);

    if (!cleanStreamUrl) {
      setError('HLS stream manifest URL (.m3u8) is required.');
      setIsLoading(false);
      return;
    }

    try {
      const parsed = new URL(cleanStreamUrl);
      if (parsed.protocol !== 'https:') {
        setError('HLS stream must strictly use HTTPS protocol.');
        setIsLoading(false);
        return;
      }
    } catch {
      setError('Malformed HLS stream URL format.');
      setIsLoading(false);
    }
  }, [normalizedProvider, cleanStreamUrl, retryNonce]);

  // Provider: CUSTOM Embed initialization
  useEffect(() => {
    if (normalizedProvider !== 'CUSTOM') return;
    setIsLoading(true);
    setError(null);

    if (!cleanStreamUrl) {
      setError('Custom embed URL is required.');
      setIsLoading(false);
      return;
    }

    if (!isCustomDomainApproved(cleanStreamUrl)) {
      setError(
        'Custom embed blocked: Target domain is not in the approved provider whitelist (Cloudflare Stream, Wistia, Loom, Vimeo, YouTube, 10Q CDN).'
      );
      setIsLoading(false);
    }
  }, [normalizedProvider, cleanStreamUrl, isCustomDomainApproved, retryNonce]);

  const handleRetry = () => {
    cleanupPlayers();
    setError(null);
    setIsLoading(true);
    setRetryNonce((prev) => prev + 1);
  };

  const handleHtml5TimeUpdate = () => {
    if (html5VideoRef.current && onProgress) {
      const current = html5VideoRef.current.currentTime;
      const duration = html5VideoRef.current.duration;
      if (duration && duration > 0) {
        onProgress(Math.round((current / duration) * 100), current);
      }
    }
  };

  return (
    <div
      className={`relative w-full aspect-[16/9] bg-[#110E23] rounded-2xl overflow-hidden shadow-xl border border-[#2D246B] ${className}`}
    >
      {/* Loading Overlay */}
      {isLoading && !error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#17152A]/90 text-white gap-3 transition-opacity">
          <Loader2 size={36} className="animate-spin text-[#FF3F68]" />
          <p className="text-xs font-medium text-white/80 tracking-wide">
            Authorizing stream ({normalizedProvider}) & loading player...
          </p>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#17152A] text-white p-6 text-center space-y-3">
          <div className="p-3 bg-rose-500/10 text-[#FF3F68] rounded-2xl border border-rose-500/20">
            <AlertCircle size={32} />
          </div>
          <h4 className="font-bold text-sm sm:text-base text-white">Playback Error</h4>
          <p className="text-xs text-white/70 max-w-md leading-relaxed">{error}</p>
          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={handleRetry}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition shadow-md"
            >
              <RefreshCw size={14} />
              <span>Retry Playback</span>
            </button>
          </div>
        </div>
      )}

      {/* Provider A: VIMEO Embed Container */}
      {normalizedProvider === 'VIMEO' && (
        <div ref={containerRef} className="w-full h-full flex items-center justify-center" />
      )}

      {/* Provider B: YOUTUBE Privacy-Enhanced Embed */}
      {normalizedProvider === 'YOUTUBE' && cleanYouTubeId && !error && (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${cleanYouTubeId}?autoplay=${
            autoPlay ? 1 : 0
          }&rel=0&modestbranding=1&enablejsapi=1${initialTime && initialTime > 0 ? `&start=${Math.floor(initialTime)}` : ''}`}
          title={title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onLoad={() => setIsLoading(false)}
        />
      )}

      {/* Provider C: HLS Stream Player */}
      {normalizedProvider === 'HLS' && cleanStreamUrl && !error && (
        <video
          ref={html5VideoRef}
          src={cleanStreamUrl}
          controls
          playsInline
          autoPlay={autoPlay}
          className="w-full h-full object-contain bg-black"
          onLoadedMetadata={(e) => {
            if (initialTime && initialTime > 0) {
              e.currentTarget.currentTime = initialTime;
            }
            setIsLoading(false);
          }}
          onTimeUpdate={handleHtml5TimeUpdate}
          onEnded={onEnded}
          onError={() => {
            setError('Unable to load HLS media stream. The manifest or network segment may be unavailable.');
            setIsLoading(false);
          }}
        >
          <p className="text-white text-xs p-4">Your browser does not support HTML5 video playback.</p>
        </video>
      )}

      {/* Provider D: CUSTOM Sandboxed Embed */}
      {normalizedProvider === 'CUSTOM' && cleanStreamUrl && !error && isCustomDomainApproved(cleanStreamUrl) && (
        <div className="relative w-full h-full">
          <iframe
            src={cleanStreamUrl}
            title={title}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={() => setIsLoading(false)}
          />
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] text-white/70 flex items-center space-x-1 pointer-events-none">
            <ShieldCheck size={12} className="text-emerald-400" />
            <span>Verified Stream</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversalVideoPlayer;
