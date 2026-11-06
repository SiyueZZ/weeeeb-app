"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  RotateCcw,
  Share2,
  Download,
  Check,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import {
  renderPhotoStrip,
  canvasToBlob,
  StripFilter,
} from "@/lib/photoStrip";

interface ResultsViewProps {
  photos: string[];
  onRetake: () => void;
}

export default function ResultsView({ photos, onRetake }: ResultsViewProps) {
  const [filter, setFilter] = useState<StripFilter>("original");
  const [stripImageUrl, setStripImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [canWebShare, setCanWebShare] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Detect if device supports sharing files via navigator.share
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

  // Generate canvas & data URL whenever photos or filter changes
  const generateStrip = useCallback(async () => {
    setIsGenerating(true);
    try {
      const canvas = await renderPhotoStrip({
        photos,
        filter,
        timestamp: new Date(),
        customText: "PHOTO BOOTH",
      });
      canvasRef.current = canvas;
      const dataUrl = canvas.toDataURL("image/png");
      setStripImageUrl(dataUrl);
    } catch (err) {
      console.error("Failed to render strip:", err);
    } finally {
      setIsGenerating(false);
    }
  }, [photos, filter]);

  useEffect(() => {
    generateStrip();
  }, [generateStrip]);

  // Handle Save (opens native share sheet on mobile, downloads on laptop)
  const handleSave = async () => {
    if (!canvasRef.current || isSaving) return;
    setIsSaving(true);

    try {
      const blob = await canvasToBlob(canvasRef.current);
      if (!blob) throw new Error("Could not create image blob");

      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `photobooth-strip-${dateStr}-${Date.now().toString().slice(-4)}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      // On iPhone / mobile with file sharing support:
      if (canWebShare && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "Photo Booth Strip",
            text: "My photo booth strip!",
          });
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 2500);
          return;
        } catch (shareErr: unknown) {
          // If user simply closed/cancelled the share sheet, don't force a fallback download
          if (shareErr instanceof Error && shareErr.name === "AbortError") {
            return;
          }
          console.warn("Share failed, falling back to download:", shareErr);
        }
      }

      // Laptop or fallback: direct download
      triggerDownload(blob, fileName);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error("Error saving image:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const triggerDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filters: { id: StripFilter; label: string }[] = [
    { id: "original", label: "Classic" },
    { id: "bw", label: "B&W Noir" },
    { id: "warm", label: "Warm Film" },
    { id: "cool", label: "Cool Retro" },
  ];

  return (
    <div className="relative h-full w-full bg-zinc-950 text-white flex flex-col justify-between overflow-hidden select-none">
      {/* Top Header - Safe Area */}
      <div className="relative z-20 w-full pt-safe px-5 pb-3 flex items-center justify-between bg-zinc-950/80 backdrop-blur-md border-b border-white/10">
        <button
          onClick={onRetake}
          type="button"
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white px-3 py-1.5 rounded-full bg-white/10 active:scale-95 transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retake</span>
        </button>

        <div className="flex items-center gap-1.5 text-zinc-200">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-widest">
            Photo Strip
          </span>
        </div>

        <button
          onClick={handleSave}
          disabled={isGenerating || isSaving}
          type="button"
          className="flex items-center gap-1.5 text-xs font-semibold text-black bg-white hover:bg-zinc-200 px-3.5 py-1.5 rounded-full active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-md"
        >
          {saveSuccess ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Done!</span>
            </>
          ) : canWebShare ? (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>Save</span>
            </>
          )}
        </button>
      </div>

      {/* Main Preview Area: Scrollable photo strip */}
      <div className="relative flex-1 w-full overflow-y-auto overscroll-contain px-4 py-5 flex flex-col items-center justify-start scrollbar-none">
        {isGenerating ? (
          <div className="my-auto flex flex-col items-center gap-3 text-zinc-400">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <span className="text-xs tracking-wider uppercase font-medium">
              Developing your strip...
            </span>
          </div>
        ) : stripImageUrl ? (
          <div className="flex flex-col items-center max-w-xs sm:max-w-sm w-full transition-transform duration-300 animate-in fade-in zoom-in-95">
            {/* The Vertical Photo Strip with White Border */}
            <div className="relative rounded-lg overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-white/20 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={stripImageUrl}
                alt="Your 4-Shot Photo Booth Strip"
                className="w-full h-auto block"
              />
            </div>
            <p className="mt-3 text-[11px] text-zinc-500 tracking-wider uppercase font-mono">
              ✦ Tap Save below to add to Photos ✦
            </p>
          </div>
        ) : null}
      </div>

      {/* Filter Selector & Bottom Controls - Respects Safe Area */}
      <div className="relative z-20 w-full bg-zinc-950/90 backdrop-blur-xl border-t border-white/10 px-5 pt-3 pb-safe flex flex-col gap-3">
        {/* Filter Pills */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 scrollbar-none">
          <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500 mr-1 flex-shrink-0" />
          {filters.map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              type="button"
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filter === item.id
                  ? "bg-white text-black shadow-md scale-105"
                  : "bg-white/10 text-zinc-300 hover:bg-white/15"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Primary Bottom Actions */}
        <div className="flex items-center gap-3 pt-1">
          {/* Retake Button */}
          <button
            onClick={onRetake}
            type="button"
            className="flex-1 py-3.5 px-4 rounded-2xl bg-zinc-800/90 hover:bg-zinc-800 text-zinc-100 font-semibold text-sm flex items-center justify-center gap-2 border border-white/10 active:scale-98 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-zinc-400" />
            <span>Retake</span>
          </button>

          {/* Save / Share Button */}
          <button
            onClick={handleSave}
            disabled={isGenerating || isSaving}
            type="button"
            className="flex-[2] py-3.5 px-5 rounded-2xl bg-white hover:bg-zinc-100 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-xl active:scale-98 disabled:opacity-50 transition-all cursor-pointer"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
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
    </div>
  );
}
