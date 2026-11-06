"use client";

import React, { useState } from "react";
import CameraView from "@/components/CameraView";
import ResultsView from "@/components/ResultsView";
import CameraDeniedView from "@/components/CameraDeniedView";
import { FILM_FILTERS, FilmFilterConfig } from "@/lib/filters";

type AppStep = "camera" | "results" | "permission_denied";

export default function PhotoBoothPage() {
  const [step, setStep] = useState<AppStep>("camera");
  const [rawPhotos, setRawPhotos] = useState<string[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilmFilterConfig>(FILM_FILTERS[0]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleCaptureComplete = (capturedRawPhotos: string[], filter: FilmFilterConfig) => {
    setRawPhotos(capturedRawPhotos);
    setSelectedFilter(filter);
    setStep("results");
  };

  const handleCameraError = (err: string) => {
    setErrorMessage(err);
    setStep("permission_denied");
  };

  const handleRetake = (preservedFilter: FilmFilterConfig) => {
    setRawPhotos([]);
    setSelectedFilter(preservedFilter);
    setStep("camera");
  };

  const handleRetryPermission = () => {
    setErrorMessage("");
    setStep("camera");
  };

  return (
    <main className="relative h-full w-full bg-[#121214] overflow-hidden flex flex-col justify-center">
      {step === "camera" && (
        <CameraView
          initialFilter={selectedFilter}
          onCaptureComplete={handleCaptureComplete}
          onError={handleCameraError}
        />
      )}

      {step === "results" && (
        <ResultsView
          rawPhotos={rawPhotos}
          initialFilter={selectedFilter}
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
  );
}
