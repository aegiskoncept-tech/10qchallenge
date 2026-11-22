'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Lock,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';

export interface SecurePdfViewerProps {
  documentId: number;
  title: string;
  category?: string;
  fileSizeBytes?: string;
  pageCount?: number;
  streamUrl: string;
  allowDownload?: boolean;
  studentName?: string;
  studentId?: string | number;
  courseTitle?: string;
  className?: string;
}

export function SecurePdfViewer({
  documentId,
  title,
  category,
  fileSizeBytes,
  pageCount,
  streamUrl,
  allowDownload = true,
  studentName = 'Enrolled Student',
  studentId,
  courseTitle = '10Q Challenge LMS',
  className = '',
}: SecurePdfViewerProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Formulate watermark text
  const timestamp = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const watermarkText = `${studentName} • ${studentId ? `ID: ${studentId} • ` : ''}${courseTitle} • ${timestamp}`;

  // Handle zoom
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));
  const handleZoomReset = () => setZoomLevel(100);

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Reset loading state when streamUrl changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
  }, [streamUrl]);

  const downloadUrl = `${streamUrl}${streamUrl.includes('?') ? '&' : '?'}download=true`;

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : className
      }`}
      style={{ minHeight: isFullscreen ? '100vh' : '650px' }}
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 text-white z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white truncate max-w-[280px] sm:max-w-md">
                {title}
              </h3>
              {category && (
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                  {category}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span>{fileSizeBytes || 'PDF Document'}</span>
              {pageCount ? (
                <>
                  <span>•</span>
                  <span>{pageCount} pages</span>
                </>
              ) : null}
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3 h-3" /> Protected
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center bg-slate-900 rounded-lg border border-slate-800 p-0.5">
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= 50}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono font-medium text-slate-300 min-w-[44px] text-center">
              {zoomLevel}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= 200}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            {zoomLevel !== 100 && (
              <button
                onClick={handleZoomReset}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Download Control */}
          {allowDownload ? (
            <a
              href={downloadUrl}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition-colors"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 text-slate-400 text-xs font-medium border border-slate-700/60 cursor-not-allowed"
              title="Downloading disabled by administrator"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">View Only</span>
            </span>
          )}
        </div>
      </div>

      {/* Main PDF Rendering Surface */}
      <div className="flex-1 relative overflow-auto bg-slate-950 flex items-center justify-center">
        {/* Loading Indicator */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-10 backdrop-blur-xs">
            <LoadingSpinner size="lg" className="text-indigo-500" />
            <p className="text-xs text-slate-400 mt-3 font-medium">
              Loading secure document stream...
            </p>
          </div>
        )}

        {/* Error Fallback */}
        {hasError && (
          <div className="p-8 text-center max-w-md mx-auto space-y-3 z-10">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">Document Stream Error</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {errorMessage || 'Unable to load PDF stream. Please verify your enrollment status or try refreshing.'}
            </p>
            {allowDownload && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open File Directly
              </a>
            )}
          </div>
        )}

        {/* Dynamic Translucent Watermark Deterrence Overlay */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-10 pointer-events-none select-none overflow-hidden opacity-10 flex flex-wrap content-around justify-around gap-12 p-8"
        >
          {Array.from({ length: 12 }).map((_, idx) => (
            <div
              key={idx}
              className="transform -rotate-25 text-xs font-black tracking-widest text-slate-400 whitespace-nowrap uppercase"
            >
              {watermarkText}
            </div>
          ))}
        </div>

        {/* Native PDF Object Embed with Dynamic Zoom Scale */}
        <div
          className="w-full h-full flex items-center justify-center transition-transform duration-150 origin-top"
          style={{
            transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
            width: zoomLevel > 100 ? `${zoomLevel}%` : '100%',
            height: isFullscreen ? '100%' : '650px',
          }}
        >
          <object
            data={`${streamUrl}#toolbar=0&navpanes=0`}
            type="application/pdf"
            className="w-full h-full rounded-b-xl border-none"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
              setErrorMessage('Failed to render PDF in browser viewport.');
            }}
          >
            {/* Fallback iframe */}
            <iframe
              src={`${streamUrl}#toolbar=0&navpanes=0`}
              className="w-full h-full border-none"
              title={title}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
            >
              <div className="p-8 text-center text-slate-400 text-xs">
                Your browser does not support inline PDF viewing.
                {allowDownload && (
                  <p className="mt-2">
                    <a href={downloadUrl} className="text-indigo-400 underline font-medium">
                      Click here to download the PDF.
                    </a>
                  </p>
                )}
              </div>
            </iframe>
          </object>
        </div>
      </div>
    </div>
  );
}
