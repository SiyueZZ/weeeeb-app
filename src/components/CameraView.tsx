"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { SwitchCamera, Volume2, VolumeX, Film, Image as ImageIcon } from "lucide-react";
import { FilmFilterConfig, FILM_FILTERS } from "@/lib/filters";
import { WebGLFilmPipeline } from "@/lib/webglPipeline";
import { playCountdownBeep, playShutterSound } from "@/lib/audio";

interface CameraViewProps {
  selectedFilter: FilmFilterConfig;
  onCaptureComplete: (rawPhotos: string[]) => void;
  onError: (error: string) => void;
}

export default function CameraView({
  selectedFilter,
  onCaptureComplete,
  onError,
}: CameraViewProps) {
  const activeFilter = selectedFilter || FILM_FILTERS[0];

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sampleImgRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pipelineRef = useRef<WebGLFilmPipeline | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [useSamplePhoto, setUseSamplePhoto] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentShotIndex, setCurrentShotIndex] = useState<number>(0);
  const [isFlashing, setIsFlashing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [showFilterBanner, setShowFilterBanner] = useState(false);
  const bannerTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Preload sample image for instant live testing & fallback
  useEffect(() => {
    const img = new Image();
    img.src = "/sample-portrait.jpg";
    img.crossOrigin = "anonymous";
    img.onload = () => {
      sampleImgRef.current = img;
    };
    sampleImgRef.current = img;
  }, []);

  // Flash filter banner when filter changes
  useEffect(() => {
    if (!activeFilter) return;
    setShowFilterBanner(true);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => {
      setShowFilterBanner(false);
    }, 2000);
  }, [activeFilter.id]);

  // Stop camera tracks cleanly
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Initialize camera with forgiving constraints for laptops and mobile
  const startCamera = useCallback(async () => {
    stopStream();
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode ? { ideal: facingMode } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        setCameraActive(true);
      }
    } catch (err: unknown) {
      console.warn("Camera access fallback to sample mode:", err);
      // If camera is unavailable or not granted, activate sample mode instead of blocking
      setCameraActive(false);
      setUseSamplePhoto(true);
    }
  }, [facingMode, stopStream]);

  useEffect(() => {
    if (!useSamplePhoto) {
      startCamera();
    }
    return () => {
      stopStream();
    };
  }, [startCamera, stopStream, useSamplePhoto]);

  // Real-time WebGL render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || 640;
      const h = canvas.clientHeight || 480;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    try {
      pipelineRef.current = new WebGLFilmPipeline(canvas);
    } catch (err) {
      console.error("WebGL Pipeline error:", err);
    }

    const renderLoop = () => {
      const pipeline = pipelineRef.current;

      if (pipeline) {
        const video = videoRef.current;
        const isVideoReady = cameraActive && video && video.readyState >= 2 && video.videoWidth > 0;

        if (isVideoReady && !useSamplePhoto) {
          pipeline.render(video, activeFilter, facingMode === "user");
        } else if (sampleImgRef.current && sampleImgRef.current.complete) {
          pipeline.render(sampleImgRef.current, activeFilter, false);
        }
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
  }, [activeFilter, facingMode, useSamplePhoto, cameraActive]);

  // Grab raw uncompressed frame
  const grabRawFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const isVideoReady = cameraActive && video && video.readyState >= 2 && video.videoWidth > 0;

    if (isVideoReady && !useSamplePhoto) {
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
    }

    // Otherwise grab sample photo
    if (sampleImgRef.current) {
      const img = sampleImgRef.current;
      const c = document.createElement("canvas");
      c.width = img.naturalWidth || 1024;
      c.height = img.naturalHeight || 682;
      const ctx = c.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0);
      return c.toDataURL("image/jpeg", 0.95);
    }

    return null;
  }, [facingMode, useSamplePhoto, cameraActive]);

  // Shutter click sequence: 4 photos
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
    onCaptureComplete(rawPhotos);
  };

  const toggleCameraFacing = () => {
    if (isCapturing) return;
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  return (
    <div className="relative h-full w-full flex flex-col justify-between overflow-hidden bg-black select-none">
      {/* Hidden native video source */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
      />

      {/* Main "PHOTO HERE" WebGL Viewfinder */}
      <div className="absolute inset-0 z-0 bg-black flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          className="h-full w-full object-cover block"
        />

        {/* Viewfinder Frame Accent */}
        <div className="absolute inset-2 sm:inset-4 pointer-events-none border border-white/10 rounded-xl" />

        {/* Disposable Camera Date Stamp */}
        {activeFilter.dateStamp && (
          <div className="absolute bottom-24 right-5 pointer-events-none font-mono text-sm sm:text-base font-bold text-[#ffaa00] drop-shadow-[0_0_8px_rgba(255,106,0,0.8)] tracking-widest z-10">
            {`'${(new Date().getFullYear() % 100).toString().padStart(2, "0")}  ${(new Date().getMonth() + 1).toString().padStart(2, "0")}  ${new Date().getDate().toString().padStart(2, "0")}`}
          </div>
        )}
      </div>

      {/* Screen White Flash */}
      {isFlashing && (
        <div className="fixed inset-0 bg-white z-50 pointer-events-none animate-flash" />
      )}

      {/* Top Header Controls Bar */}
      <div className="relative z-20 w-full pt-safe px-4 pb-2 flex items-center justify-between text-white drop-shadow-md">
        {/* Sound Toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          type="button"
          aria-label={soundEnabled ? "Mute sounds" : "Enable sounds"}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4 text-white" />
          ) : (
            <VolumeX className="w-4 h-4 text-zinc-400" />
          )}
        </button>

        {/* Shot progress / Active Filter indicator */}
        <div className="px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 flex items-center gap-2">
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
                {activeFilter.shortLabel}
              </span>
            </div>
          )}
        </div>

        {/* Right Controls: Sample Photo Toggle + Camera Flip */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setUseSamplePhoto(!useSamplePhoto)}
            type="button"
            aria-label="Toggle sample portrait"
            title="Toggle between live camera and reference sample"
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full backdrop-blur-md border flex items-center justify-center active:scale-95 transition-all cursor-pointer ${
              useSamplePhoto || !cameraActive
                ? "bg-amber-500/80 border-amber-400 text-black shadow-lg"
                : "bg-black/60 border-white/15 text-white"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <button
            onClick={toggleCameraFacing}
            disabled={isCapturing || useSamplePhoto}
            type="button"
            aria-label="Flip camera"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
          >
            <SwitchCamera className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Filter Notification Banner */}
      <div className="relative z-20 w-full flex justify-center pointer-events-none px-4 min-h-[30px]">
        {showFilterBanner && (
          <div className="px-4 py-1.5 rounded-full bg-black/80 backdrop-blur-lg border border-amber-400/40 text-amber-400 text-xs font-mono tracking-wider font-bold shadow-xl animate-in fade-in zoom-in-95 duration-200">
            🎞️ {activeFilter.brand} {activeFilter.name.toUpperCase()}
          </div>
        )}
      </div>

      {/* Center Countdown Display */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center pointer-events-none">
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

      {/* Bottom Shutter Area */}
      <div className="relative z-20 w-full pb-safe pt-2 px-6 flex flex-col items-center">
        {/* Big Round Retro Shutter Button */}
        <div className="relative flex items-center justify-center mb-2">
          <button
            onClick={handleShutterClick}
            disabled={isCapturing}
            type="button"
            aria-label="Take 4 photos"
            className="group relative w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center active:scale-95 disabled:opacity-50 transition-all duration-150 cursor-pointer focus:outline-none"
          >
            {/* Outer White / Amber Ring */}
            <span className="absolute inset-0 rounded-full border-4 border-white/90 shadow-2xl transition-transform duration-200 group-hover:scale-105 group-active:scale-95" />

            {/* Inner Shutter Circle */}
            <span
              className={`w-[54px] h-[54px] sm:w-[62px] sm:h-[62px] rounded-full transition-all duration-150 ${
                isCapturing
                  ? "bg-amber-500 scale-75 rounded-lg"
                  : "bg-white group-active:scale-90"
              }`}
            />
          </button>
        </div>

        {/* Shutter instruction hint */}
        <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono tracking-wider uppercase text-center pb-1">
          {isCapturing ? "HOLD STILL FOR 4 FRAMES" : "TAP SHUTTER FOR 4-SHOT FILM STRIP"}
        </p>
      </div>
    </div>
  );
}
