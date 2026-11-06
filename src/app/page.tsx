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
      {/* LEFT COLUMN: Fixed width 35mm film strip */}
      <aside className="w-[84px] min-w-[84px] max-w-[84px] sm:w-[106px] sm:min-w-[106px] sm:max-w-[106px] h-full flex-shrink-0 bg-black z-30 overflow-hidden">
        <FilmStripSelector
          selectedFilter={selectedFilter}
          onSelectFilter={setSelectedFilter}
        />
      </aside>

      {/* RIGHT COLUMN: "PHOTO HERE" - Camera Viewfinder / Developed Results */}
      <main className="flex-1 min-w-0 h-full relative flex flex-col justify-between overflow-hidden bg-black">
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
