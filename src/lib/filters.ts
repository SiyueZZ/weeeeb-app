export interface FilmFilterConfig {
  id: string;
  name: string;
  shortLabel: string;
  brand: string;
  tagline: string;
  year?: string;
  badgeColor: string; // Hex color for UI badge / film tag

  // Shader color parameters
  contrast: number; // 1.0 = normal
  saturation: number; // 1.0 = normal, 0 = B&W
  lift: [number, number, number]; // [r, g, b] lifted milky blacks (0.0 - 0.15)
  shadowColor: [number, number, number]; // [r, g, b] tint for shadow tones
  highlightColor: [number, number, number]; // [r, g, b] tint for highlight tones

  // Effects
  vignetteAmount: number; // 0.0 - 1.0
  vignetteRadius: number; // 0.5 - 1.2
  grainAmount: number; // 0.0 - 0.4
  lightLeak: number; // 0.0 - 1.0 (warm edge light bleed)
  halation: number; // 0.0 - 1.0 (red glow around bright highlights)
  overexposure: number; // 0.0 - 1.0 (direct flash blown center)
  blur: number; // 0.0 - 1.0 (dreamy soft focus)
  isMono: boolean; // True for pure monochrome
  dateStamp: boolean; // True for 7-segment digital date stamp
}

export const FILM_FILTERS: FilmFilterConfig[] = [
  {
    id: "portra-400",
    name: "Portra 400",
    shortLabel: "PORTRA",
    brand: "KODAK",
    tagline: "Warm, soft pastel skin tones & lifted blacks",
    year: "1998",
    badgeColor: "#fbbf24", // Golden yellow
    contrast: 0.96,
    saturation: 0.94,
    lift: [0.06, 0.05, 0.045],
    shadowColor: [1.02, 0.98, 0.93],
    highlightColor: [1.06, 1.02, 0.96],
    vignetteAmount: 0.22,
    vignetteRadius: 0.92,
    grainAmount: 0.08,
    lightLeak: 0.0,
    halation: 0.0,
    overexposure: 0.0,
    blur: 0.0,
    isMono: false,
    dateStamp: false,
  },
  {
    id: "gold-200",
    name: "Gold 200",
    shortLabel: "GOLD 200",
    brand: "KODAK",
    tagline: "Golden yellow warmth & rich sunlit saturation",
    year: "1988",
    badgeColor: "#f59e0b", // Amber
    contrast: 1.14,
    saturation: 1.26,
    lift: [0.03, 0.02, 0.0],
    shadowColor: [1.04, 0.97, 0.86],
    highlightColor: [1.16, 1.06, 0.84],
    vignetteAmount: 0.35,
    vignetteRadius: 0.85,
    grainAmount: 0.15,
    lightLeak: 0.0,
    halation: 0.0,
    overexposure: 0.0,
    blur: 0.0,
    isMono: false,
    dateStamp: false,
  },
  {
    id: "superia-400",
    name: "Superia 400",
    shortLabel: "SUPERIA",
    brand: "FUJIFILM",
    tagline: "Cyan-green shadows & punchy magenta tones",
    year: "1998",
    badgeColor: "#10b981", // Emerald Fuji green
    contrast: 1.16,
    saturation: 1.18,
    lift: [0.015, 0.038, 0.035],
    shadowColor: [0.91, 1.05, 1.03],
    highlightColor: [1.08, 0.96, 1.02],
    vignetteAmount: 0.3,
    vignetteRadius: 0.88,
    grainAmount: 0.14,
    lightLeak: 0.0,
    halation: 0.0,
    overexposure: 0.0,
    blur: 0.0,
    isMono: false,
    dateStamp: false,
  },
  {
    id: "cinestill-800t",
    name: "CineStill 800T",
    shortLabel: "800T",
    brand: "CINESTILL",
    tagline: "Teal shadows, tungsten warmth & red halation",
    year: "2012",
    badgeColor: "#06b6d4", // Cyan
    contrast: 1.22,
    saturation: 1.12,
    lift: [0.02, 0.04, 0.06],
    shadowColor: [0.84, 1.02, 1.15],
    highlightColor: [1.15, 1.03, 0.86],
    vignetteAmount: 0.42,
    vignetteRadius: 0.82,
    grainAmount: 0.18,
    lightLeak: 0.0,
    halation: 0.65,
    overexposure: 0.0,
    blur: 0.0,
    isMono: false,
    dateStamp: false,
  },
  {
    id: "hp5",
    name: "HP5 Plus",
    shortLabel: "HP5 400",
    brand: "ILFORD",
    tagline: "High-contrast monochrome with gritty grain",
    year: "1976",
    badgeColor: "#e4e4e7", // Zinc white
    contrast: 1.38,
    saturation: 0.0,
    lift: [0.02, 0.02, 0.02],
    shadowColor: [1.0, 1.0, 1.0],
    highlightColor: [1.0, 1.0, 1.0],
    vignetteAmount: 0.4,
    vignetteRadius: 0.8,
    grainAmount: 0.28,
    lightLeak: 0.0,
    halation: 0.0,
    overexposure: 0.0,
    blur: 0.0,
    isMono: true,
    dateStamp: false,
  },
  {
    id: "polaroid",
    name: "Polaroid 600",
    shortLabel: "POLAROID",
    brand: "POLAROID",
    tagline: "Faded creamy colors, dreamy blur & circular vignette",
    year: "1981",
    badgeColor: "#ec4899", // Retro pink
    contrast: 0.88,
    saturation: 0.82,
    lift: [0.08, 0.09, 0.13],
    shadowColor: [0.94, 0.98, 1.08],
    highlightColor: [1.06, 1.04, 0.94],
    vignetteAmount: 0.52,
    vignetteRadius: 0.72,
    grainAmount: 0.12,
    lightLeak: 0.0,
    halation: 0.0,
    overexposure: 0.0,
    blur: 0.4,
    isMono: false,
    dateStamp: false,
  },
  {
    id: "expired",
    name: "Expired 2004",
    shortLabel: "EXPIRED",
    brand: "AGFA",
    tagline: "Washed-out color shift, coarse grain & warm light leaks",
    year: "2004",
    badgeColor: "#ef4444", // Red flare
    contrast: 0.92,
    saturation: 0.76,
    lift: [0.09, 0.045, 0.07],
    shadowColor: [1.08, 0.9, 1.06],
    highlightColor: [1.04, 0.95, 0.9],
    vignetteAmount: 0.45,
    vignetteRadius: 0.8,
    grainAmount: 0.32,
    lightLeak: 0.7,
    halation: 0.0,
    overexposure: 0.0,
    blur: 0.0,
    isMono: false,
    dateStamp: false,
  },
  {
    id: "lomo",
    name: "Lomo LC-A",
    shortLabel: "LOMO",
    brand: "LOMOGRAPHY",
    tagline: "Oversaturated cross-processed punch & heavy vignette",
    year: "1984",
    badgeColor: "#8b5cf6", // Purple cross-process
    contrast: 1.42,
    saturation: 1.58,
    lift: [0.0, 0.0, 0.0],
    shadowColor: [0.82, 0.88, 0.76],
    highlightColor: [1.12, 1.14, 0.88],
    vignetteAmount: 0.86,
    vignetteRadius: 0.64,
    grainAmount: 0.22,
    lightLeak: 0.0,
    halation: 0.0,
    overexposure: 0.0,
    blur: 0.0,
    isMono: false,
    dateStamp: false,
  },
  {
    id: "disposable",
    name: "Disposable '98",
    shortLabel: "DISPOSABLE",
    brand: "QUICKSNAP",
    tagline: "Harsh on-camera flash blast & vintage LED date stamp",
    year: "1998",
    badgeColor: "#ea580c", // Electric orange LED
    contrast: 1.28,
    saturation: 1.22,
    lift: [0.02, 0.02, 0.02],
    shadowColor: [1.0, 0.98, 0.94],
    highlightColor: [1.1, 1.06, 0.98],
    vignetteAmount: 0.58,
    vignetteRadius: 0.78,
    grainAmount: 0.18,
    lightLeak: 0.0,
    halation: 0.0,
    overexposure: 0.48,
    blur: 0.0,
    isMono: false,
    dateStamp: true,
  },
];

export const DEFAULT_FILTER_ID = "portra-400";

export function getFilterById(id: string): FilmFilterConfig {
  const found = FILM_FILTERS.find((f) => f.id === id);
  return found || FILM_FILTERS[0];
}
