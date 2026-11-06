export type StripFilter = "original" | "bw" | "warm" | "cool";

export interface PhotoStripOptions {
  photos: string[]; // 4 data URLs or image URLs
  filter?: StripFilter;
  timestamp?: Date;
  customText?: string;
}

/**
 * Creates an HTMLImageElement from a src URL
 */
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
 * Renders the 4 photos into a classic vertical photo strip with a white border onto an HTMLCanvasElement
 */
export async function renderPhotoStrip(
  options: PhotoStripOptions
): Promise<HTMLCanvasElement> {
  const {
    photos,
    filter = "original",
    timestamp = new Date(),
    customText = "PHOTO BOOTH",
  } = options;

  // Strip layout dimensions (crisp high-DPI)
  const stripWidth = 800;
  const paddingX = 42;
  const paddingTop = 46;
  const gapY = 32;
  const paddingBottom = 160;

  const photoWidth = stripWidth - paddingX * 2; // 716px
  const photoHeight = Math.round(photoWidth * (3 / 4)); // 537px (classic 4:3 photo)

  const totalPhotos = Math.min(photos.length, 4);
  const stripHeight =
    paddingTop +
    photoHeight * totalPhotos +
    gapY * Math.max(0, totalPhotos - 1) +
    paddingBottom;

  const canvas = document.createElement("canvas");
  canvas.width = stripWidth;
  canvas.height = stripHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not get 2D canvas context");

  // Fill classic white border background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, stripWidth, stripHeight);

  // Subtle inner border line for authentic print paper look
  ctx.strokeStyle = "#f1f1f4";
  ctx.lineWidth = 1;
  ctx.strokeRect(8, 8, stripWidth - 16, stripHeight - 16);

  // Load all images in parallel
  const loadedImages = await Promise.all(photos.map(loadImage));

  // Render each photo
  for (let i = 0; i < loadedImages.length; i++) {
    const img = loadedImages[i];
    const y = paddingTop + i * (photoHeight + gapY);

    // Compute center-crop for 4:3 aspect ratio
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const targetAspect = photoWidth / photoHeight;

    let sx = 0;
    let sy = 0;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;

    if (imgAspect > targetAspect) {
      // Source is wider than 4:3 -> crop left and right
      sw = img.naturalHeight * targetAspect;
      sx = (img.naturalWidth - sw) / 2;
    } else {
      // Source is taller than 4:3 -> crop top and bottom
      sh = img.naturalWidth / targetAspect;
      sy = (img.naturalHeight - sh) / 2;
    }

    // Save state for filtering
    ctx.save();

    // Clip to rounded rectangle or sharp clean photo frame
    ctx.beginPath();
    ctx.rect(paddingX, y, photoWidth, photoHeight);
    ctx.clip();

    // Apply CSS filter on context if supported
    if (filter === "bw") {
      ctx.filter = "grayscale(100%) contrast(115%) brightness(102%)";
    } else if (filter === "warm") {
      ctx.filter = "sepia(25%) saturate(120%) contrast(105%) brightness(102%)";
    } else if (filter === "cool") {
      ctx.filter = "hue-rotate(190deg) saturate(90%) contrast(108%)";
    } else {
      ctx.filter = "contrast(103%) brightness(101%)";
    }

    ctx.drawImage(img, sx, sy, sw, sh, paddingX, y, photoWidth, photoHeight);

    // Subtle inner vignette / border on the photo itself
    ctx.filter = "none";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(paddingX, y, photoWidth, photoHeight);

    ctx.restore();
  }

  // --- Footer Typography & Styling ---
  const footerCenterY = stripHeight - paddingBottom / 2 + 6;

  // Star icons & main title
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "#18181b";
  ctx.font = "bold 26px -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif";
  ctx.letterSpacing = "6px";
  ctx.fillText(`✦  ${customText}  ✦`, stripWidth / 2, footerCenterY - 26);

  // Date and Time
  const dateFormatted = timestamp.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).toUpperCase();

  const timeFormatted = timestamp.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).toUpperCase();

  ctx.fillStyle = "#71717a";
  ctx.font = "500 16px -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";
  ctx.letterSpacing = "3px";
  ctx.fillText(`${dateFormatted} • ${timeFormatted}`, stripWidth / 2, footerCenterY + 12);

  // Tiny serial / booth footer mark
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "600 11px -apple-system, BlinkMacSystemFont, monospace";
  ctx.letterSpacing = "2px";
  ctx.fillText("4-SHOT STRIP • MEMORIES TO KEEP", stripWidth / 2, footerCenterY + 38);

  return canvas;
}

/**
 * Converts canvas to Blob
 */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/png", 0.95);
  });
}
