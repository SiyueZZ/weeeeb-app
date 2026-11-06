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

    const initialThumbs: Record<string, string> = {};
    FILM_FILTERS.forEach((f) => {
      if (f.sampleRefImage) {
        initialThumbs[f.id] = f.sampleRefImage;
      }
    });
    setThumbnails(initialThumbs);

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
          navigator.vibrate(10);
        }
      }
    }, 70);
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
        navigator.vibrate(12);
      }
    }
  };

  // Center selected filter on mount
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
    <div className="relative h-full w-full bg-black select-none flex flex-col justify-between overflow-hidden">
      {/* Center notch / alignment indicator arrow on the right edge */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center">
        <div className="w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-amber-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.8)]" />
      </div>

      {/* Top subtle branding */}
      <div className="w-full pt-2 pb-1 text-center bg-black/90 border-b border-zinc-900 z-10 flex-shrink-0">
        <span className="text-[8px] sm:text-[9px] font-mono tracking-widest text-amber-500/80 font-bold uppercase">
          35MM FILM
        </span>
      </div>

      {/* 35mm Continuous Film Strip with Real Sprocket Holes */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 w-full overflow-y-auto scrollbar-none overscroll-contain snap-y snap-mandatory py-[calc(50vh-50px)]"
        style={{
          scrollSnapType: "y mandatory",
        }}
      >
        {FILM_FILTERS.map((filter, index) => {
          const isSelected = filter.id === selectedFilter.id;
          const frameNum = `${index + 16}`;
          const frameNumA = `${index + 16}A`;

          return (
            <div
              key={filter.id}
              ref={(el) => {
                if (el) frameRefs.current.set(filter.id, el);
                else frameRefs.current.delete(filter.id);
              }}
              onClick={() => scrollToFilter(filter)}
              className="w-full snap-center flex flex-col items-center cursor-pointer py-1 px-1.5 transition-transform duration-150"
              style={{
                scrollSnapAlign: "center",
              }}
            >
              {/* Authentic 35mm Film Negative Frame */}
              <div
                className={`relative w-full rounded-sm overflow-hidden transition-all duration-200 ${
                  isSelected
                    ? "scale-[1.03] ring-2 ring-amber-400 shadow-[0_0_18px_rgba(251,146,60,0.7)] z-10"
                    : "opacity-65 hover:opacity-90"
                }`}
                style={{
                  backgroundColor: "#000000",
                  border: isSelected ? "1.5px solid #fb923c" : "1px solid #18181b",
                }}
              >
                {/* Left 35mm Sprocket Holes Column */}
                <div className="absolute left-0 top-0 bottom-0 w-[12px] sm:w-[15px] flex flex-col justify-around items-center py-1 bg-black z-10 pointer-events-none">
                  {[0, 1, 2, 3].map((s) => (
                    <span
                      key={s}
                      className="w-[6px] sm:w-[8px] h-[7px] sm:h-[9px] bg-white rounded-[1.5px] shadow-inner"
                      style={{
                        boxShadow: "inset 0 0 2px rgba(0,0,0,0.8)",
                      }}
                    />
                  ))}
                </div>

                {/* Right 35mm Sprocket Holes Column */}
                <div className="absolute right-0 top-0 bottom-0 w-[12px] sm:w-[15px] flex flex-col justify-around items-center py-1 bg-black z-10 pointer-events-none">
                  {[0, 1, 2, 3].map((s) => (
                    <span
                      key={s}
                      className="w-[6px] sm:w-[8px] h-[7px] sm:h-[9px] bg-white rounded-[1.5px] shadow-inner"
                      style={{
                        boxShadow: "inset 0 0 2px rgba(0,0,0,0.8)",
                      }}
                    />
                  ))}
                </div>

                {/* Top Film Frame Divider with Markings */}
                <div className="w-full pl-4 pr-4 pt-0.5 pb-0.5 flex items-center justify-between text-[7px] sm:text-[8px] font-mono tracking-tight text-amber-500/90 bg-black">
                  <span>{frameNum}</span>
                  <span className="truncate max-w-[42px] text-[6.5px]">{filter.brand}</span>
                </div>

                {/* Center Photo Thumbnail */}
                <div className="mx-[13px] sm:mx-[16px] h-[52px] sm:h-[64px] bg-zinc-950 overflow-hidden relative border border-zinc-800">
                  {thumbnails[filter.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbnails[filter.id]}
                      alt={filter.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                      <span className="text-[7.5px] text-zinc-500 font-mono">35MM</span>
                    </div>
                  )}

                  {/* Filter label overlay badge */}
                  <div className="absolute bottom-0 inset-x-0 bg-black/75 backdrop-blur-xs py-0.5 px-1 text-center">
                    <span
                      className={`text-[8px] sm:text-[9px] font-bold tracking-tight uppercase truncate block ${
                        isSelected ? "text-amber-400 font-black" : "text-zinc-200"
                      }`}
                    >
                      {filter.shortLabel}
                    </span>
                  </div>
                </div>

                {/* Bottom Film Frame Divider */}
                <div className="w-full pl-4 pr-4 pt-0.5 pb-0.5 flex items-center justify-between text-[6.5px] sm:text-[7.5px] font-mono tracking-tight text-zinc-500 bg-black">
                  <span>▶ {frameNumA}</span>
                  <span>SAFETY</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom subtle indicator */}
      <div className="w-full py-1 text-center bg-black/90 border-t border-zinc-900 z-10 flex-shrink-0">
        <span className="text-[7.5px] font-mono tracking-widest text-zinc-600">
          ▲ WIND ▼
        </span>
      </div>
    </div>
  );
}
