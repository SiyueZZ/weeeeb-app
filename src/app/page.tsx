"use client";

import React, { useState } from "react";
import CameraView from "@/components/CameraView";
import ResultsView from "@/components/ResultsView";
import CameraDeniedView from "@/components/CameraDeniedView";
import FilmStripSelector from "@/components/FilmStripSelector";
import { FILM_FILTERS, FilmFilterConfig } from "@/lib/filters";

type AppStep = "camera" | "results" | "permission_denied";

export default function PhotoBoothPage() {
  const [step, setStep] = useState<AppStep>("camera");
  const [rawPhotos, setRawPhotos] = useState<string[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilmFilterConfig>(FILM_FILTERS[0]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleCaptureComplete = (capturedRawPhotos: string[]) => {
    setRawPhotos(capturedRawPhotos);
    setStep("results");
  };

  const handleCameraError = (err: string) => {
    setErrorMessage(err);
    setStep("permission_denied");
  };

  const handleRetake = () => {
    setRawPhotos([]);
    setStep("camera");
  };

  const handleRetryPermission = () => {
    setErrorMessage("");
    setStep("camera");
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-black text-white">
      {/* LEFT COLUMN: Authentic 35mm Continuous Film Strip running from top to bottom */}
      <aside className="w-[84px] sm:w-[104px] md:w-[130px] h-full flex-shrink-0 bg-black border-r border-zinc-900 z-30">
        <FilmStripSelector
          selectedFilter={selectedFilter}
          onSelectFilter={setSelectedFilter}
        />
      </aside>

      {/* RIGHT COLUMN: "PHOTO HERE" - Main Viewfinder & Developing Area */}
      <main className="flex-1 h-full relative flex flex-col justify-between overflow-hidden bg-black">
        {step === "camera" && (
          <CameraView
            selectedFilter={selectedFilter}
            onCaptureComplete={handleCaptureComplete}
            onError={handleCameraError}
          />
        )}

        {step === "results" && (
          <ResultsView
            rawPhotos={rawPhotos}
            activeFilter={selectedFilter}
            onRetake={handleRetake}
          />
        )}

        {step === "permission_denied" && (
          <CameraDeniedView
            onRetry={handleRetryPermission}
            errorMessage={errorMessage}
          />
        )}
      </main>
    </div>
  );
}
