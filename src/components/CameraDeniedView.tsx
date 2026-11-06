"use client";

import React from "react";
import { CameraOff, RotateCcw, AlertCircle, Sparkles } from "lucide-react";

interface CameraDeniedViewProps {
  onRetry: () => void;
  errorMessage?: string;
}

export default function CameraDeniedView({
  onRetry,
  errorMessage,
}: CameraDeniedViewProps) {
  return (
    <div className="relative flex flex-col items-center justify-between min-h-full w-full max-w-md mx-auto px-6 pt-safe pb-safe bg-black text-white select-none">
      {/* Top Header */}
      <div className="w-full pt-4 flex items-center justify-between text-zinc-400">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs uppercase tracking-widest font-semibold text-zinc-300">
            Photo Booth
          </span>
        </div>
      </div>

      {/* Center Card */}
      <div className="w-full flex flex-col items-center text-center my-auto py-8">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-xl">
            <CameraOff className="w-10 h-10 text-rose-400" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          Camera Access Required
        </h1>
        <p className="text-sm text-zinc-400 max-w-xs mb-8">
          To take your 4-shot photo strip, Photo Booth needs permission to use your camera.
        </p>

        {/* Friendly instructions card */}
        <div className="w-full bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-5 text-left text-xs space-y-3.5 backdrop-blur-md shadow-2xl">
          <div className="font-semibold text-zinc-200 text-sm flex items-center gap-2">
            <span>How to enable on iPhone:</span>
          </div>

          <div className="flex items-start gap-3 text-zinc-300">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-800 text-zinc-200 flex items-center justify-center font-bold text-[11px]">
              1
            </span>
            <p>
              Tap the <strong className="text-white">“aA”</strong> or{" "}
              <strong className="text-white">page settings</strong> icon on the left of Safari’s bottom address bar.
            </p>
          </div>

          <div className="flex items-start gap-3 text-zinc-300">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-800 text-zinc-200 flex items-center justify-center font-bold text-[11px]">
              2
            </span>
            <p>
              Select <strong className="text-white">Website Settings</strong> and switch <strong className="text-white">Camera</strong> to <strong className="text-emerald-400">Allow</strong>.
            </p>
          </div>

          <div className="flex items-start gap-3 text-zinc-300">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-800 text-zinc-200 flex items-center justify-center font-bold text-[11px]">
              3
            </span>
            <p>
              Alternatively, open iPhone <strong className="text-white">Settings → Safari → Camera</strong> and select Allow.
            </p>
          </div>

          {errorMessage && (
            <div className="mt-2 pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-500 font-mono break-all">
              Details: {errorMessage}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Button */}
      <div className="w-full pb-4">
        <button
          onClick={onRetry}
          type="button"
          className="w-full py-4 px-6 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold text-base flex items-center justify-center gap-2.5 shadow-lg active:scale-98 transition-all duration-150 cursor-pointer"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Try Again</span>
        </button>
      </div>
    </div>
  );
}
