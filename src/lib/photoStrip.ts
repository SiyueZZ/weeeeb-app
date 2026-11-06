import { FilmFilterConfig } from "./filters";
import { renderFilteredImage } from "./webglPipeline";

export interface AnalogPhotoStripOptions {
  rawPhotos: string[]; // 4 unfiltered source photos
  filter: FilmFilterConfig;
  paperColor?: "white" | "cream";
  timestamp?: Date;
  customTitle?: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Synthesizes a high-resolution vertical film / photobooth strip with the chosen filter and paper style
 */
export async function renderAnalogPhotoStrip(
  options: AnalogPhotoStripOptions
): Promise<HTMLCanvasElement> {
  const {
    rawPhotos,
    filter,
    paperColor = "white",
    timestamp = new Date(),
    customTitle,
  } = options;

  // High-resolution strip canvas dimensions
  const stripWidth = 900;
  const paddingX = 48;
  const paddingTop = 52;
  const gapY = 32;
  const paddingBottom = 190;

  const photoWidth = stripWidth - paddingX * 2; // 804px
  const photoHeight = Math.round(photoWidth * (3 / 4)); // 603px (classic 4:3)

  const count = Math.min(rawPhotos.length, 4);
  const stripHeight =
    paddingTop +
    photoHeight * count +
    gapY * Math.max(0, count - 1) +
    paddingBottom;

  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = stripWidth;
  finalCanvas.height = stripHeight;
  const ctx = finalCanvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas 2D context");

  // 1. Paper Background (White or Vintage Warm Cream)
  const bgColor = paperColor === "cream" ? "#faf6ed" : "#ffffff";
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, stripWidth, stripHeight);

  // Subtle paper grain & delicate inner border rule
  ctx.strokeStyle = paperColor === "cream" ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.05)";
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, stripWidth - 20, stripHeight - 20);

  // 2. Load and filter all raw photos through the WebGL pipeline
  const loadedRawImages = await Promise.all(rawPhotos.map(loadImage));

  for (let i = 0; i < loadedRawImages.length; i++) {
    const rawImg = loadedRawImages[i];
    const y = paddingTop + i * (photoHeight + gapY);

    // Apply the active film filter at full photo frame resolution
    const filteredCanvas = await renderFilteredImage(
      rawImg,
      filter,
      photoWidth,
      photoHeight,
      false
    );

    // Draw the filtered photo frame
    ctx.drawImage(filteredCanvas, paddingX, y, photoWidth, photoHeight);

    // Subtle analog darkroom edge border around each frame
    ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(paddingX, y, photoWidth, photoHeight);
  }

  // 3. Typewriter-Style Vintage Strip Footer
  const footerCenterY = stripHeight - paddingBottom / 2 + 10;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const textColor = paperColor === "cream" ? "#292524" : "#18181b";
  const subTextColor = paperColor === "cream" ? "#78716c" : "#71717a";

  // Filter Name & Brand in Typewriter Font
  const displayTitle = customTitle || `${filter.brand} ${filter.name.toUpperCase()}`;
  ctx.fillStyle = textColor;
  ctx.font = 'bold 24px "Courier New", Courier, monospace';
  ctx.letterSpacing = "4px";
  ctx.fillText(`* ${displayTitle} *`, stripWidth / 2, footerCenterY - 32);

  // Formatted Date & Time
  const dateFormatted = timestamp.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).toUpperCase();

  const timeFormatted = timestamp.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).toUpperCase();

  ctx.fillStyle = subTextColor;
  ctx.font = '500 16px "Courier New", Courier, monospace';
  ctx.letterSpacing = "2px";
  ctx.fillText(`${dateFormatted}  //  ${timeFormatted}`, stripWidth / 2, footerCenterY + 8);

  // Tiny Vintage Exposure / Film Mark
  ctx.fillStyle = paperColor === "cream" ? "#a8a29e" : "#a1a1aa";
  ctx.font = '600 12px "Courier New", Courier, monospace';
  ctx.letterSpacing = "3px";
  ctx.fillText(`EXP 04 / 35MM ANALOG PROCESS • ${filter.tagline.toUpperCase()}`, stripWidth / 2, footerCenterY + 42);

  return finalCanvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/png", 0.95);
  });
}
