# Photo Booth 📸

A native-feel photo booth web app built with Next.js, Tailwind CSS, and TypeScript. Designed mobile-first for iPhones to look and feel like an authentic iOS camera experience.

## ✨ Features

- **Fullscreen Live Viewfinder**: Uses the front-facing camera with natural selfie mirroring and optional rear-camera flip.
- **3-2-1 Countdown & Shutter Flash**: Smooth animated countdown, synthesized audio beeps, and realistic full-screen flash effect.
- **4-Shot Sequence**: Takes 4 consecutive snapshots with pose prompts and breake-in periods.
- **Classic Vertical Photo Strip**: Automatically combines the 4 photos onto a high-resolution vertical card with a white border, "✦ PHOTO BOOTH ✦" header, and formatted date stamp.
- **Filter Presets**: Quick-toggle between Classic, B&W Noir, Warm Film, and Cool Retro presets.
- **Native Save & Share**:
  - **iPhone / Mobile**: Opens the native iOS Share Sheet so you can tap **"Save Image"** directly into Apple Photos.
  - **Laptop / Desktop**: Directly downloads the high-res PNG photo strip.
- **iPhone Safe Areas**: Buttons and overlays are padded using `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` to respect the Dynamic Island, notch, and Home indicator bar.
- **PWA & Home Screen Ready**: Includes web app manifest, app icons, and Apple full-screen meta tags so it can be added to the iPhone Home Screen as a standalone app.
- **Friendly Permissions Screen**: Clear step-by-step instructions for Safari and Chrome on iOS if camera access is denied.

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the assigned port) on your browser or phone on the same local network.
