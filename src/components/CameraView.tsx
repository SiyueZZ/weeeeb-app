"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { SwitchCamera, Volume2, VolumeX, Sparkles } from "lucide-react";
import { playCountdownBeep, playShutterSound } from "@/lib/audio";

interface CameraViewProps {
  onCaptureComplete: (photos: string[]) => void;
  onError: (error: string) => void;
}

export default function CameraView({
  onCaptureComplete,
  onError,
}: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentShotIndex, setCurrentShotIndex] = useState<number>(0);
  const [isFlashing, setIsFlashing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Clean up any existing media stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Initialize camera stream
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
        await videoRef.current.play().catch(() => {
          // Autoplay handled via playsInline & muted
        });
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

  // Grab single photo snapshot from the active video feed
  const grabPhotoFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // If using front camera ('user'), mirror horizontally so photo matches preview
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.95);
  }, [facingMode]);

  // Main shutter click handler: shoots 4 photos in sequence
  const handleShutterClick = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    const photos: string[] = [];
    const totalShots = 4;

    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    for (let shot = 0; shot < totalShots; shot++) {
      setCurrentShotIndex(shot + 1);

      // Prompt pose hint
      if (shot === 0) setStatusMessage("Get ready!");
      else if (shot === 1) setStatusMessage("Change your pose!");
      else if (shot === 2) setStatusMessage("Give us a smile!");
      else setStatusMessage("Last one, make it count!");

      // 3-2-1 Countdown
      for (let count = 3; count >= 1; count--) {
        setCountdown(count);
        if (soundEnabled) {
          playCountdownBeep(count === 1 ? 750 : 520);
        }
        await sleep(950);
      }

      setCountdown(null);
      setStatusMessage("");

      // White flash & shutter sound
      setIsFlashing(true);
      if (soundEnabled) {
        playShutterSound();
      }

      // Capture frame right as flash triggers
      const photo = grabPhotoFrame();
      if (photo) {
        photos.push(photo);
      }

      // Flash hold & fade
      await sleep(180);
      setIsFlashing(false);

      // Breather between shots before the next countdown
      if (shot < totalShots - 1) {
        await sleep(1200);
      }
    }

    // Finished sequence
    setStatusMessage("Creating your strip...");
    await sleep(400);

    // Stop camera before showing results
    stopStream();
    onCaptureComplete(photos);
  };

  const toggleCameraFacing = () => {
    if (isCapturing) return;
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  return (
    <div className="relative h-full w-full bg-black overflow-hidden flex flex-col justify-between select-none">
      {/* Live Video Preview */}
      <div className="absolute inset-0 z-0 bg-black overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover transition-transform duration-300 ${
            facingMode === "user" ? "-scale-x-100" : "scale-x-100"
          }`}
        />
        {/* Subtle camera view frame guide lines */}
        <div className="absolute inset-4 pointer-events-none border border-white/10 rounded-3xl" />
      </div>

      {/* Screen White Flash */}
      {isFlashing && (
        <div className="fixed inset-0 bg-white z-50 pointer-events-none animate-flash" />
      )}

      {/* Top Bar - Safe area aware */}
      <div className="relative z-20 w-full pt-safe px-5 flex items-center justify-between text-white drop-shadow-md">
        {/* Sound toggle button */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          type="button"
          aria-label={soundEnabled ? "Mute sounds" : "Enable sounds"}
          className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
        >
          {soundEnabled ? (
            <Volume2 className="w-5 h-5 text-white" />
          ) : (
            <VolumeX className="w-5 h-5 text-zinc-400" />
          )}
        </button>

        {/* Shot indicator badge */}
        <div className="px-3.5 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center gap-2">
          {isCapturing ? (
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i < currentShotIndex
                      ? "bg-emerald-400 ring-2 ring-emerald-400/30"
                      : i === currentShotIndex
                      ? "bg-white scale-125 ring-2 ring-white/50 animate-pulse"
                      : "bg-white/30"
                  }`}
                />
              ))}
              <span className="ml-1 text-xs font-semibold tracking-wider text-white">
                {currentShotIndex}/4
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-xs font-bold tracking-widest uppercase text-white/90">
                4 Shots
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
          className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
        >
          <SwitchCamera className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Center Countdown / Status Messaging */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center pointer-events-none">
        {countdown !== null && (
          <div
            key={countdown}
            className="animate-countdown font-black text-8xl md:text-9xl text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]"
            style={{
              textShadow: "0 0 35px rgba(255,255,255,0.7), 0 4px 20px rgba(0,0,0,0.8)",
            }}
          >
            {countdown}
          </div>
        )}

        {statusMessage && countdown === null && (
          <div className="px-5 py-2.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white font-medium text-base tracking-wide drop-shadow-lg animate-pulse">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Bottom Controls Bar - Respects iPhone Safe Area */}
      <div className="relative z-20 w-full pb-safe pt-2 px-6 flex flex-col items-center">
        {/* Shutter Button */}
        <div className="relative flex items-center justify-center mb-3">
          <button
            onClick={handleShutterClick}
            disabled={isCapturing}
            type="button"
            aria-label="Take 4 photos"
            className="group relative w-20 h-20 rounded-full flex items-center justify-center active:scale-95 disabled:opacity-50 transition-all duration-150 cursor-pointer focus:outline-none"
          >
            {/* Outer Ring */}
            <span className="absolute inset-0 rounded-full border-4 border-white shadow-2xl transition-transform duration-200 group-hover:scale-105" />

            {/* Inner Shutter Circle */}
            <span
              className={`w-[62px] h-[62px] rounded-full transition-all duration-150 ${
                isCapturing
                  ? "bg-rose-500 scale-75 rounded-lg"
                  : "bg-white group-active:scale-90"
              }`}
            />
          </button>
        </div>

        {/* Bottom Helper Hint */}
        <p className="text-[11px] text-zinc-400 font-medium tracking-wider uppercase text-center pb-1">
          {isCapturing ? "Hold still for the shots!" : "Tap shutter for 4-shot strip"}
        </p>
      </div>
    </div>
  );
}
