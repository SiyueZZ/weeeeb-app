"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  RotateCcw,
  Share2,
  Download,
  Check,
  Sparkles,
  Film,
  Layers,
} from "lucide-react";
import { FilmFilterConfig } from "@/lib/filters";
import {
  renderAnalogPhotoStrip,
  canvasToBlob,
} from "@/lib/photoStrip";

interface ResultsViewProps {
  rawPhotos: string[];
  activeFilter: FilmFilterConfig;
  onRetake: () => void;
}

export default function ResultsView({
  rawPhotos,
  activeFilter,
  onRetake,
}: ResultsViewProps) {
  const [paperColor, setPaperColor] = useState<"white" | "cream">("white");
  const [stripImageUrl, setStripImageUrl] = useState<string | null>(null);
  const [isDeveloping, setIsDeveloping] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [canWebShare, setCanWebShare] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Detect file-sharing support
  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        const dummyFile = new File([""], "test.png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [dummyFile] })) {
          setCanWebShare(true);
        }
      } catch {
        setCanWebShare(false);
      }
    }
  }, []);

  // Generate strip whenever rawPhotos, activeFilter, or paperColor changes
  const generateStrip = useCallback(async () => {
    setIsGenerating(true);
    try {
      const canvas = await renderAnalogPhotoStrip({
        rawPhotos,
        filter: activeFilter,
        paperColor,
        timestamp: new Date(),
      });
      canvasRef.current = canvas;
      const dataUrl = canvas.toDataURL("image/png");
      setStripImageUrl(dataUrl);
    } catch (err) {
      console.error("Error developing photo strip:", err);
    } finally {
      setIsGenerating(false);
    }
  }, [rawPhotos, activeFilter, paperColor]);

  useEffect(() => {
    generateStrip();
  }, [generateStrip]);

  // Darkroom developing animation on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDeveloping(false);
    }, 1400);
    return () => clearTimeout(timer);
  }, []);

  // Save / Share handler
  const handleSave = async () => {
    if (!canvasRef.current || isSaving) return;
    setIsSaving(true);

    try {
      const blob = await canvasToBlob(canvasRef.current);
      if (!blob) throw new Error("Could not create image blob");

      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `${activeFilter.id}-strip-${dateStr}-${Date.now().toString().slice(-4)}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      if (canWebShare && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `35mm ${activeFilter.name} Photo Strip`,
            text: "My vintage analog photo strip!",
          });
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 2500);
          return;
        } catch (shareErr: unknown) {
          if (shareErr instanceof Error && shareErr.name === "AbortError") {
            return;
          }
          console.warn("Share sheet closed or failed, fallback to download:", shareErr);
        }
      }

      // Fallback: Direct image download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative h-full w-full bg-[#121214] text-white flex flex-col justify-between overflow-hidden select-none">
      {/* Top Header - Safe Area */}
      <div className="relative z-20 w-full pt-safe px-4 pb-2.5 flex items-center justify-between bg-[#121214]/90 backdrop-blur-md border-b border-white/10">
        <button
          onClick={onRetake}
          type="button"
          className="flex items-center gap-1.5 text-xs font-mono font-semibold text-zinc-300 hover:text-white px-3 py-1.5 rounded-full bg-white/10 active:scale-95 transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retake</span>
        </button>

        <div className="flex items-center gap-1.5 text-amber-400 font-mono">
          <Film className="w-4 h-4" />
          <span className="text-xs font-black uppercase tracking-widest text-zinc-200 truncate max-w-[140px] sm:max-w-none">
            {activeFilter.name}
          </span>
        </div>

        {/* Paper style toggle (White / Cream) */}
        <button
          onClick={() => setPaperColor(paperColor === "white" ? "cream" : "white")}
          type="button"
          aria-label="Toggle paper color"
          className="flex items-center gap-1 text-[11px] font-mono font-semibold px-2.5 py-1.5 rounded-full bg-zinc-800 border border-white/10 text-zinc-300 active:scale-95 transition-all cursor-pointer"
        >
          <Layers className="w-3 h-3 text-amber-400" />
          <span>{paperColor === "white" ? "White" : "Cream"}</span>
        </button>
      </div>

      {/* Main Preview Area: Scrollable photo strip with darkroom development effect */}
      <div className="relative flex-1 w-full overflow-y-auto overscroll-contain px-3 sm:px-4 py-4 flex flex-col items-center justify-start scrollbar-none">
        {isGenerating ? (
          <div className="my-auto flex flex-col items-center gap-3 text-amber-400 font-mono">
            <div className="w-8 h-8 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
            <span className="text-xs tracking-widest uppercase font-bold">
              Developing on {activeFilter.shortLabel}...
            </span>
          </div>
        ) : stripImageUrl ? (
          <div className="flex flex-col items-center max-w-xs sm:max-w-sm w-full my-auto transition-all duration-700 ease-out">
            {/* The Vertical Analog Strip with developing transition */}
            <div
              className={`relative rounded-md overflow-hidden shadow-[0_22px_60px_rgba(0,0,0,0.95)] border border-white/20 transition-all duration-1000 ${
                isDeveloping
                  ? "brightness-40 contrast-125 sepia blur-[1.5px]"
                  : "brightness-100 contrast-100 sepia-0 blur-0"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={stripImageUrl}
                alt="Your 35mm Analog Photo Booth Strip"
                className="w-full h-auto block"
              />
            </div>

            {/* Development badge */}
            <div className="mt-3 flex items-center gap-2 text-[10.5px] text-amber-400 font-mono tracking-wider uppercase">
              <Sparkles className="w-3 h-3" />
              <span>
                {isDeveloping ? "Developing in progress..." : "35mm Analog Print"}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Bottom Action Buttons - Respects Safe Area */}
      <div className="relative z-20 w-full bg-[#18181b]/95 backdrop-blur-xl border-t border-white/10 px-4 pt-2.5 pb-safe flex items-center gap-3">
        {/* Retake Button */}
        <button
          onClick={onRetake}
          type="button"
          className="flex-1 py-3.5 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/10 active:scale-98 transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-zinc-400" />
          <span>Retake</span>
        </button>

        {/* Save / Share Button */}
        <button
          onClick={handleSave}
          disabled={isGenerating || isSaving}
          type="button"
          className="flex-[2] py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-mono font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl active:scale-98 disabled:opacity-50 transition-all cursor-pointer"
        >
          {saveSuccess ? (
            <>
              <Check className="w-4 h-4 text-black" />
              <span>Saved to Photos!</span>
            </>
          ) : canWebShare ? (
            <>
              <Share2 className="w-4 h-4" />
              <span>Save to Photos</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Download Strip</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
