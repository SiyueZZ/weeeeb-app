"use client";

import React from "react";
import { CameraOff, RotateCcw, AlertCircle, Film } from "lucide-react";

interface CameraDeniedViewProps {
  onRetry: () => void;
  errorMessage?: string;
}

export default function CameraDeniedView({
  onRetry,
  errorMessage,
}: CameraDeniedViewProps) {
  return (
    <div className="relative flex flex-col items-center justify-between min-h-full w-full max-w-md mx-auto px-6 pt-safe pb-safe bg-[#121214] text-white select-none">
      {/* Top Header */}
      <div className="w-full pt-4 flex items-center justify-between text-zinc-400">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-amber-500" />
          <span className="text-xs uppercase tracking-widest font-mono font-bold text-amber-500">
            35mm Analog Booth
          </span>
        </div>
      </div>

      {/* Center Card */}
      <div className="w-full flex flex-col items-center text-center my-auto py-8">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full bg-zinc-900 border border-amber-500/30 flex items-center justify-center shadow-xl">
            <CameraOff className="w-10 h-10 text-amber-400" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
        </div>

        <h1 className="text-2xl font-mono font-bold tracking-tight text-white mb-2">
          Camera Access Required
        </h1>
        <p className="text-sm text-zinc-400 max-w-xs mb-8 font-mono">
          To capture your 4-shot analog film strip, Photo Booth needs permission to use your front camera.
        </p>

        {/* Instructions card */}
        <div className="w-full bg-zinc-900/90 border border-white/10 rounded-2xl p-5 text-left text-xs space-y-3.5 backdrop-blur-md shadow-2xl">
          <div className="font-mono font-bold text-amber-400 text-sm flex items-center gap-2">
            <span>How to enable on iPhone:</span>
          </div>

          <div className="flex items-start gap-3 text-zinc-300">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-800 text-amber-400 font-mono flex items-center justify-center font-bold text-[11px]">
              1
            </span>
            <p>
              Tap the <strong className="text-white">“aA”</strong> or{" "}
              <strong className="text-white">settings</strong> icon on the left of Safari’s address bar.
            </p>
          </div>

          <div className="flex items-start gap-3 text-zinc-300">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-800 text-amber-400 font-mono flex items-center justify-center font-bold text-[11px]">
              2
            </span>
            <p>
              Select <strong className="text-white">Website Settings</strong> and switch <strong className="text-white">Camera</strong> to <strong className="text-emerald-400">Allow</strong>.
            </p>
          </div>

          <div className="flex items-start gap-3 text-zinc-300">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-800 text-amber-400 font-mono flex items-center justify-center font-bold text-[11px]">
              3
            </span>
            <p>
              Or open iPhone <strong className="text-white">Settings → Safari → Camera</strong> and select Allow.
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
          className="w-full py-4 px-6 rounded-full bg-amber-400 hover:bg-amber-300 text-black font-mono font-black text-base flex items-center justify-center gap-2.5 shadow-lg active:scale-98 transition-all duration-150 cursor-pointer"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Try Again</span>
        </button>
      </div>
    </div>
  );
}
