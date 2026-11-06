"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { FILM_FILTERS, FilmFilterConfig } from "@/lib/filters";
import { renderFilteredImage } from "@/lib/webglPipeline";

interface FilmStripSelectorProps {
  selectedFilter: FilmFilterConfig;
  onSelectFilter: (filter: FilmFilterConfig) => void;
  disabled?: boolean;
}

export default function FilmStripSelector({
  selectedFilter,
  onSelectFilter,
  disabled = false,
}: FilmStripSelectorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize thumbnails (using high-res references when available or generating via WebGL)
  useEffect(() => {
    let isCancelled = false;

    // First assign direct sample references
    const initialThumbs: Record<string, string> = {};
    FILM_FILTERS.forEach((f) => {
      if (f.sampleRefImage) {
        initialThumbs[f.id] = f.sampleRefImage;
      }
    });
    setThumbnails(initialThumbs);

    // Load base sample image to render remaining procedural filters
    const img = new Image();
    img.src = "/sample-portrait.jpg";
    img.crossOrigin = "anonymous";

    img.onload = async () => {
      if (isCancelled) return;
      const generated: Record<string, string> = { ...initialThumbs };

      for (const filter of FILM_FILTERS) {
        if (!generated[filter.id]) {
          try {
            const canvas = await renderFilteredImage(img, filter, 120, 90, false);
            generated[filter.id] = canvas.toDataURL("image/jpeg", 0.85);
          } catch (err) {
            console.warn("Could not generate thumb for", filter.id, err);
          }
        }
      }

      if (!isCancelled) {
        setThumbnails(generated);
      }
    };

    return () => {
      isCancelled = true;
    };
  }, []);

  // Handle scroll snap detection to select whichever frame is closest to center
  const handleScroll = useCallback(() => {
    if (disabled || !containerRef.current) return;
    isUserScrollingRef.current = true;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const centerY = containerRect.top + containerRect.height / 2;

      let closestFilter = selectedFilter;
      let closestDistance = Infinity;

      frameRefs.current.forEach((el, id) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const itemCenterY = rect.top + rect.height / 2;
        const dist = Math.abs(centerY - itemCenterY);
        if (dist < closestDistance) {
          closestDistance = dist;
          const found = FILM_FILTERS.find((f) => f.id === id);
          if (found) closestFilter = found;
        }
      });

      if (closestFilter.id !== selectedFilter.id) {
        onSelectFilter(closestFilter);
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(12);
        }
      }
    }, 90);
  }, [disabled, selectedFilter, onSelectFilter]);

  // Click on a frame to smoothly scroll it to center
  const scrollToFilter = (filter: FilmFilterConfig) => {
    if (disabled) return;
    const el = frameRefs.current.get(filter.id);
    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      onSelectFilter(filter);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(15);
      }
    }
  };

  // Center the selected filter on initial load
  useEffect(() => {
    if (!isUserScrollingRef.current) {
      const el = frameRefs.current.get(selectedFilter.id);
      if (el) {
        el.scrollIntoView({
          behavior: "instant",
          block: "center",
        });
      }
    }
  }, [selectedFilter.id]);

  return (
    <div className="relative z-30 h-full flex flex-col justify-center pointer-events-auto select-none">
      {/* 35mm Film Strip Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-[82px] sm:w-[88px] h-[72vh] max-h-[580px] overflow-y-auto scrollbar-none overscroll-contain flex flex-col items-center snap-y snap-mandatory bg-black/85 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl py-[calc(36vh-45px)]"
        style={{
          scrollSnapType: "y mandatory",
        }}
      >
        {FILM_FILTERS.map((filter, index) => {
          const isSelected = filter.id === selectedFilter.id;
          const frameNum = `${index + 12}`;
          const frameNumA = `${index + 12}A`;

          return (
            <div
              key={filter.id}
              ref={(el) => {
                if (el) frameRefs.current.set(filter.id, el);
                else frameRefs.current.delete(filter.id);
              }}
              onClick={() => scrollToFilter(filter)}
              className="w-full flex-shrink-0 snap-center flex flex-col items-center py-2 cursor-pointer transition-all duration-200"
              style={{
                scrollSnapAlign: "center",
              }}
            >
              {/* Authentic 35mm Film Negative Frame */}
              <div
                className={`relative w-[74px] sm:w-[78px] rounded-sm transition-all duration-200 ${
                  isSelected
                    ? "scale-105 ring-2 ring-amber-400 shadow-[0_0_16px_rgba(251,146,60,0.6)] z-10"
                    : "opacity-65 hover:opacity-90"
                }`}
                style={{
                  backgroundColor: "#0d0d0f",
                  border: isSelected ? "1.5px solid #fb923c" : "1px solid #27272a",
                }}
              >
                {/* Left & Right 35mm Sprocket Holes */}
                <div className="absolute left-0 top-0 bottom-0 w-[8px] flex flex-col justify-around items-center py-1 bg-black pointer-events-none">
                  {[0, 1, 2].map((s) => (
                    <span
                      key={s}
                      className="w-[5px] h-[7px] bg-zinc-800/90 rounded-[1.5px] border border-white/15"
                    />
                  ))}
                </div>

                <div className="absolute right-0 top-0 bottom-0 w-[8px] flex flex-col justify-around items-center py-1 bg-black pointer-events-none">
                  {[0, 1, 2].map((s) => (
                    <span
                      key={s}
                      className="w-[5px] h-[7px] bg-zinc-800/90 rounded-[1.5px] border border-white/15"
                    />
                  ))}
                </div>

                {/* Top Film Edge Markings */}
                <div className="w-full px-2.5 pt-0.5 pb-0.5 flex items-center justify-between text-[7px] font-mono tracking-tighter text-amber-500/80 bg-black">
                  <span>▶ {frameNum}</span>
                  <span className="text-[6px] truncate max-w-[32px]">{filter.brand}</span>
                </div>

                {/* Filter Thumbnail */}
                <div className="mx-[8px] h-[48px] sm:h-[52px] bg-zinc-900 overflow-hidden relative border border-white/10">
                  {thumbnails[filter.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbnails[filter.id]}
                      alt={filter.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                      <span className="text-[8px] text-zinc-400 font-mono">FILM</span>
                    </div>
                  )}

                  {/* Active highlight corner marker */}
                  {isSelected && (
                    <div className="absolute top-0 right-0 w-2 h-2 bg-amber-400 clip-triangle" />
                  )}
                </div>

                {/* Bottom Frame Label & Sub-sprocket code */}
                <div className="w-full px-2 py-0.5 flex flex-col items-center bg-black">
                  <span
                    className={`text-[8.5px] font-bold tracking-tight uppercase truncate max-w-[62px] ${
                      isSelected ? "text-amber-400 font-black" : "text-zinc-300"
                    }`}
                  >
                    {filter.shortLabel}
                  </span>
                  <span className="text-[6px] font-mono text-zinc-600 tracking-tighter">
                    {frameNumA} • SAFETY
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* "WIND FILM" indicator */}
      <div className="text-[8px] text-amber-500/70 font-mono uppercase tracking-widest text-center mt-1 rotate-0">
        ▲ WIND FILM ▼
      </div>
    </div>
  );
}
