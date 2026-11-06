"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { SwitchCamera, Volume2, VolumeX, Sparkles, Film } from "lucide-react";
import { FilmFilterConfig, FILM_FILTERS } from "@/lib/filters";
import { WebGLFilmPipeline, drawDisposableDateStamp } from "@/lib/webglPipeline";
import FilmStripSelector from "./FilmStripSelector";
import { playCountdownBeep, playShutterSound } from "@/lib/audio";

interface CameraViewProps {
  initialFilter: FilmFilterConfig;
  onCaptureComplete: (rawPhotos: string[], selectedFilter: FilmFilterConfig) => void;
  onError: (error: string) => void;
}

export default function CameraView({
  initialFilter,
  onCaptureComplete,
  onError,
}: CameraViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pipelineRef = useRef<WebGLFilmPipeline | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [selectedFilter, setSelectedFilter] = useState<FilmFilterConfig>(initialFilter);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentShotIndex, setCurrentShotIndex] = useState<number>(0);
  const [isFlashing, setIsFlashing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [showFilterBanner, setShowFilterBanner] = useState(false);
  const bannerTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Stop camera tracks cleanly
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Initialize camera
  const startCamera = useCallback(async () => {
    stopStream();
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: unknown) {
      console.error("Camera access error:", err);
      const message =
        err instanceof Error ? err.message : "Failed to access camera";
      onError(message);
    }
  }, [facingMode, stopStream, onError]);

  useEffect(() => {
    startCamera();
    return () => {
      stopStream();
    };
  }, [startCamera, stopStream]);

  // Initialize and run real-time WebGL render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    try {
      pipelineRef.current = new WebGLFilmPipeline(canvas);
    } catch (err) {
      console.error("WebGL Pipeline error:", err);
    }

    const renderLoop = () => {
      const video = videoRef.current;
      const pipeline = pipelineRef.current;

      if (pipeline && video && video.readyState >= 2) {
        pipeline.render(video, selectedFilter, facingMode === "user");
      }
      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (pipelineRef.current) {
        pipelineRef.current.destroy();
        pipelineRef.current = null;
      }
    };
  }, [selectedFilter, facingMode]);

  // When user changes filter, show animated top banner
  const handleSelectFilter = (filter: FilmFilterConfig) => {
    setSelectedFilter(filter);
    setShowFilterBanner(true);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => {
      setShowFilterBanner(false);
    }, 2200);
  };

  // Grab raw uncompressed frame from video stream
  const grabRawFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return null;

    const c = document.createElement("canvas");
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return null;

    if (facingMode === "user") {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    return c.toDataURL("image/jpeg", 0.95);
  }, [facingMode]);

  // Sequence shutter click: shoots 4 photos in sequence
  const handleShutterClick = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    const rawPhotos: string[] = [];
    const totalShots = 4;
    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

    for (let shot = 0; shot < totalShots; shot++) {
      setCurrentShotIndex(shot + 1);

      if (shot === 0) setStatusMessage("Frame 1: Ready!");
      else if (shot === 1) setStatusMessage("Frame 2: New pose!");
      else if (shot === 2) setStatusMessage("Frame 3: Smile!");
      else setStatusMessage("Frame 4: Final shot!");

      // 3-2-1 Countdown
      for (let count = 3; count >= 1; count--) {
        setCountdown(count);
        if (soundEnabled) {
          playCountdownBeep(count === 1 ? 780 : 520);
        }
        await sleep(950);
      }

      setCountdown(null);
      setStatusMessage("");

      // Shutter snap + Flash
      setIsFlashing(true);
      if (soundEnabled) {
        playShutterSound();
      }

      // Grab raw photo at exact flash instant
      const rawPhoto = grabRawFrame();
      if (rawPhoto) {
        rawPhotos.push(rawPhoto);
      }

      await sleep(180);
      setIsFlashing(false);

      if (shot < totalShots - 1) {
        await sleep(1100);
      }
    }

    setStatusMessage("Developing strip...");
    await sleep(400);

    stopStream();
    onCaptureComplete(rawPhotos, selectedFilter);
  };

  const toggleCameraFacing = () => {
    if (isCapturing) return;
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  return (
    <div className="relative h-full w-full bg-[#121214] overflow-hidden flex flex-col justify-between select-none">
      {/* Hidden native video source */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
      />

      {/* Full-Screen WebGL Live Shader Viewfinder */}
      <div className="absolute inset-0 z-0 bg-black flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          className="h-full w-full object-cover block"
        />

        {/* Viewfinder Frame Overlay */}
        <div className="absolute inset-2 sm:inset-4 pointer-events-none border border-white/10 rounded-2xl" />

        {/* Disposable Camera Live Date Stamp in bottom-right */}
        {selectedFilter.dateStamp && (
          <div className="absolute bottom-28 right-5 pointer-events-none font-mono text-sm sm:text-base font-bold text-[#ffaa00] drop-shadow-[0_0_8px_rgba(255,106,0,0.8)] tracking-widest z-10">
            {`'${(new Date().getFullYear() % 100).toString().padStart(2, "0")}  ${(new Date().getMonth() + 1).toString().padStart(2, "0")}  ${new Date().getDate().toString().padStart(2, "0")}`}
          </div>
        )}
      </div>

      {/* Screen White Flash */}
      {isFlashing && (
        <div className="fixed inset-0 bg-white z-50 pointer-events-none animate-flash" />
      )}

      {/* Top Bar - Safe area aware */}
      <div className="relative z-20 w-full pt-safe px-4 flex items-center justify-between text-white drop-shadow-md">
        {/* Sound toggle button */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          type="button"
          aria-label={soundEnabled ? "Mute sounds" : "Enable sounds"}
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4 text-white" />
          ) : (
            <VolumeX className="w-4 h-4 text-zinc-400" />
          )}
        </button>

        {/* Shot progress / Active Filter indicator */}
        <div className="px-3 py-1.5 rounded-full bg-black/65 backdrop-blur-md border border-white/20 flex items-center gap-2">
          {isCapturing ? (
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i < currentShotIndex
                      ? "bg-amber-400 ring-2 ring-amber-400/30"
                      : i === currentShotIndex
                      ? "bg-white scale-125 ring-2 ring-white/50 animate-pulse"
                      : "bg-white/25"
                  }`}
                />
              ))}
              <span className="ml-1 text-xs font-semibold tracking-wider text-amber-400">
                {currentShotIndex}/4
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-black tracking-widest uppercase text-white/90">
                {selectedFilter.shortLabel}
              </span>
            </div>
          )}
        </div>

        {/* Flip camera button */}
        <button
          onClick={toggleCameraFacing}
          disabled={isCapturing}
          type="button"
          aria-label="Flip camera"
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
        >
          <SwitchCamera className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Filter Name Fade-In Notification Banner near top */}
      <div className="relative z-20 w-full flex justify-center pointer-events-none mt-2 px-4 min-h-[32px]">
        {showFilterBanner && (
          <div className="px-4 py-1.5 rounded-full bg-black/80 backdrop-blur-lg border border-amber-400/40 text-amber-400 text-xs font-mono tracking-wider font-bold shadow-xl animate-in fade-in zoom-in-95 duration-200">
            🎞️ {selectedFilter.brand} {selectedFilter.name.toUpperCase()} • {selectedFilter.year || "35MM"}
          </div>
        )}
      </div>

      {/* Middle Center: 35mm Film Strip Selector on the LEFT, Countdown in CENTER */}
      <div className="relative z-20 flex-1 flex items-center justify-between px-3 w-full">
        {/* Left Edge: 35mm Film Strip Selector */}
        <div className="flex-shrink-0">
          <FilmStripSelector
            selectedFilter={selectedFilter}
            onSelectFilter={handleSelectFilter}
            disabled={isCapturing}
          />
        </div>

        {/* Center Countdown & Pose Hints */}
        <div className="flex-1 flex flex-col items-center justify-center pointer-events-none">
          {countdown !== null && (
            <div
              key={countdown}
              className="animate-countdown font-black text-8xl md:text-9xl text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]"
              style={{
                textShadow: "0 0 30px rgba(251,146,60,0.8), 0 4px 20px rgba(0,0,0,0.9)",
              }}
            >
              {countdown}
            </div>
          )}

          {statusMessage && countdown === null && (
            <div className="px-5 py-2.5 rounded-full bg-black/80 backdrop-blur-md border border-amber-400/40 text-white font-medium text-sm tracking-wide drop-shadow-xl animate-pulse">
              {statusMessage}
            </div>
          )}
        </div>

        {/* Right spacing balance */}
        <div className="w-[82px] sm:w-[88px] flex-shrink-0 pointer-events-none" />
      </div>

      {/* Bottom Controls Bar - Respects Safe Area */}
      <div className="relative z-20 w-full pb-safe pt-2 px-6 flex flex-col items-center">
        {/* Big Round Retro Shutter Button */}
        <div className="relative flex items-center justify-center mb-2">
          <button
            onClick={handleShutterClick}
            disabled={isCapturing}
            type="button"
            aria-label="Take 4 photos"
            className="group relative w-20 h-20 rounded-full flex items-center justify-center active:scale-95 disabled:opacity-50 transition-all duration-150 cursor-pointer focus:outline-none"
          >
            {/* Outer White / Amber Ring */}
            <span className="absolute inset-0 rounded-full border-4 border-white/90 shadow-2xl transition-transform duration-200 group-hover:scale-105 group-active:scale-95" />

            {/* Inner Shutter Circle with subtle warm film center */}
            <span
              className={`w-[62px] h-[62px] rounded-full transition-all duration-150 ${
                isCapturing
                  ? "bg-amber-500 scale-75 rounded-lg"
                  : "bg-white group-active:scale-90"
              }`}
            />
          </button>
        </div>

        {/* Shutter instruction hint */}
        <p className="text-[10.5px] text-zinc-400 font-mono tracking-wider uppercase text-center pb-1">
          {isCapturing ? "HOLD STILL FOR 4 FRAMES" : "TAP SHUTTER FOR 4-SHOT FILM STRIP"}
        </p>
      </div>
    </div>
  );
}
