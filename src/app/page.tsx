"use client";

import React, { useState } from "react";
import CameraView from "@/components/CameraView";
import ResultsView from "@/components/ResultsView";
import CameraDeniedView from "@/components/CameraDeniedView";

type AppStep = "camera" | "results" | "permission_denied";

export default function PhotoBoothPage() {
  const [step, setStep] = useState<AppStep>("camera");
  const [photos, setPhotos] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleCaptureComplete = (capturedPhotos: string[]) => {
    setPhotos(capturedPhotos);
    setStep("results");
  };

  const handleCameraError = (err: string) => {
    setErrorMessage(err);
    setStep("permission_denied");
  };

  const handleRetake = () => {
    setPhotos([]);
    setStep("camera");
  };

  const handleRetryPermission = () => {
    setErrorMessage("");
    setStep("camera");
  };

  return (
    <main className="relative h-full w-full bg-black overflow-hidden flex flex-col justify-center">
      {step === "camera" && (
        <CameraView
          onCaptureComplete={handleCaptureComplete}
          onError={handleCameraError}
        />
      )}

      {step === "results" && (
        <ResultsView photos={photos} onRetake={handleRetake} />
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
