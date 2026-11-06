// Web Audio API synthesizer for native camera sounds without external assets

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    console.warn("AudioContext init error:", e);
    return null;
  }
}

/**
 * Play a clean countdown beep.
 * @param pitch frequency in Hz (e.g. 520Hz for 3 & 2, 780Hz for 1)
 */
export function playCountdownBeep(pitch: number = 520, duration: number = 0.09): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(pitch, ctx.currentTime);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Autoplay policy or sound disabled
  }
}

/**
 * Play an authentic camera shutter click sound.
 */
export function playShutterSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // First click: shutter opening
    playMechanicalClick(ctx, now, 1200, 0.04);
    // Second click: shutter closing (slightly delayed)
    playMechanicalClick(ctx, now + 0.07, 900, 0.05);

    // Subtle haptic feedback if supported
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(35);
    }
  } catch {
    // Sound disabled
  }
}

function playMechanicalClick(
  ctx: AudioContext,
  startTime: number,
  freq: number,
  duration: number
) {
  // White noise burst
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.setValueAtTime(freq, startTime);
  bandpass.Q.setValueAtTime(3.0, startTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.35, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  noise.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(ctx.destination);

  noise.start(startTime);
}
