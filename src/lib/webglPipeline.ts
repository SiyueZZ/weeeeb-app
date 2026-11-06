import { FilmFilterConfig } from "./filters";

const VS_SOURCE = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

const FS_SOURCE = `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_image;
uniform float u_time;
uniform float u_contrast;
uniform float u_saturation;
uniform vec3 u_lift;
uniform vec3 u_shadowColor;
uniform vec3 u_highlightColor;
uniform float u_vignetteAmount;
uniform float u_vignetteRadius;
uniform float u_grainAmount;
uniform float u_lightLeak;
uniform float u_halation;
uniform float u_overexposure;
uniform float u_blur;
uniform float u_isMono;

// Fast pseudorandom hash
float rand(vec2 p) {
  return fract(sin(dot(p + fract(u_time * 0.17), vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = v_texCoord;

  // 1. Soft lens blur (for Polaroid dreamy feel)
  vec4 color;
  if (u_blur > 0.01) {
    float b = u_blur * 0.003;
    vec4 c1 = texture2D(u_image, uv + vec2(-b, -b));
    vec4 c2 = texture2D(u_image, uv + vec2( b, -b));
    vec4 c3 = texture2D(u_image, uv + vec2(-b,  b));
    vec4 c4 = texture2D(u_image, uv + vec2( b,  b));
    vec4 center = texture2D(u_image, uv);
    color = (c1 + c2 + c3 + c4 + center * 2.0) / 6.0;
  } else {
    color = texture2D(u_image, uv);
  }

  // 2. CineStill 800T Halation: Red bloom around intense highlights
  if (u_halation > 0.01) {
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    if (lum > 0.65) {
      float glow = (lum - 0.65) / 0.35 * u_halation;
      color.r += glow * 0.45;
      color.g += glow * 0.12;
    }
  }

  // 3. Disposable camera direct flash overexposure in center
  if (u_overexposure > 0.01) {
    float dist = distance(uv, vec2(0.5, 0.5));
    float flash = max(0.0, 1.0 - dist * 1.7) * u_overexposure;
    color.rgb += vec3(flash);
  }

  // 4. Lifted milky blacks
  color.rgb = color.rgb * (1.0 - u_lift) + u_lift;

  // 5. Split-toning: tint shadows vs highlights
  float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  vec3 shadows = color.rgb * u_shadowColor;
  vec3 highlights = color.rgb * u_highlightColor;
  color.rgb = mix(shadows, highlights, smoothstep(0.18, 0.82, lum));

  // 6. Contrast curve
  color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;

  // 7. Saturation or B&W
  if (u_isMono > 0.5) {
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb = vec3(gray);
  } else {
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb = mix(vec3(gray), color.rgb, u_saturation);
  }

  // 8. Expired Film Light Leak (warm orange-red bleed on the edge)
  if (u_lightLeak > 0.01) {
    float leakDist = uv.x;
    float leak = smoothstep(0.42, 0.0, leakDist) * u_lightLeak;
    vec3 leakColor = vec3(1.0, 0.38 + 0.08 * sin(u_time * 1.5), 0.06);
    color.rgb = mix(color.rgb, color.rgb + leakColor * leak, leak * 0.8);
  }

  // 9. Vignette light falloff
  if (u_vignetteAmount > 0.01) {
    vec2 coord = (uv - 0.5) * vec2(1.0, 1.0);
    float d = length(coord);
    float vig = smoothstep(u_vignetteRadius, u_vignetteRadius * 0.35, d);
    color.rgb *= mix(1.0 - u_vignetteAmount, 1.0, vig);
  }

  // 10. Film grain
  if (u_grainAmount > 0.01) {
    float noise = (rand(uv * 4.0) - 0.5) * u_grainAmount;
    color.rgb += vec3(noise);
  }

  color.rgb = clamp(color.rgb, 0.0, 1.0);
  gl_FragColor = color;
}
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export class WebGLFilmPipeline {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;

  private uImageLoc: WebGLUniformLocation | null = null;
  private uTimeLoc: WebGLUniformLocation | null = null;
  private uContrastLoc: WebGLUniformLocation | null = null;
  private uSaturationLoc: WebGLUniformLocation | null = null;
  private uLiftLoc: WebGLUniformLocation | null = null;
  private uShadowColorLoc: WebGLUniformLocation | null = null;
  private uHighlightColorLoc: WebGLUniformLocation | null = null;
  private uVignetteAmountLoc: WebGLUniformLocation | null = null;
  private uVignetteRadiusLoc: WebGLUniformLocation | null = null;
  private uGrainAmountLoc: WebGLUniformLocation | null = null;
  private uLightLeakLoc: WebGLUniformLocation | null = null;
  private uHalationLoc: WebGLUniformLocation | null = null;
  private uOverexposureLoc: WebGLUniformLocation | null = null;
  private uBlurLoc: WebGLUniformLocation | null = null;
  private uIsMonoLoc: WebGLUniformLocation | null = null;

  private startTime: number = Date.now();

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl", {
      preserveDrawingBuffer: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    if (!gl) {
      throw new Error("WebGL not supported");
    }
    this.gl = gl;
    this.init();
  }

  private init() {
    const gl = this.gl;
    const vs = createShader(gl, gl.VERTEX_SHADER, VS_SOURCE);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, FS_SOURCE);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }
    this.program = program;

    this.uImageLoc = gl.getUniformLocation(program, "u_image");
    this.uTimeLoc = gl.getUniformLocation(program, "u_time");
    this.uContrastLoc = gl.getUniformLocation(program, "u_contrast");
    this.uSaturationLoc = gl.getUniformLocation(program, "u_saturation");
    this.uLiftLoc = gl.getUniformLocation(program, "u_lift");
    this.uShadowColorLoc = gl.getUniformLocation(program, "u_shadowColor");
    this.uHighlightColorLoc = gl.getUniformLocation(program, "u_highlightColor");
    this.uVignetteAmountLoc = gl.getUniformLocation(program, "u_vignetteAmount");
    this.uVignetteRadiusLoc = gl.getUniformLocation(program, "u_vignetteRadius");
    this.uGrainAmountLoc = gl.getUniformLocation(program, "u_grainAmount");
    this.uLightLeakLoc = gl.getUniformLocation(program, "u_lightLeak");
    this.uHalationLoc = gl.getUniformLocation(program, "u_halation");
    this.uOverexposureLoc = gl.getUniformLocation(program, "u_overexposure");
    this.uBlurLoc = gl.getUniformLocation(program, "u_blur");
    this.uIsMonoLoc = gl.getUniformLocation(program, "u_isMono");

    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0,
      ]),
      gl.STATIC_DRAW
    );

    this.texCoordBuffer = gl.createBuffer();

    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  public render(
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    filter: FilmFilterConfig,
    isMirrored: boolean = false
  ) {
    const gl = this.gl;
    if (!this.program || !this.texture) return;

    const canvasWidth = gl.canvas.width;
    const canvasHeight = gl.canvas.height;
    if (canvasWidth <= 0 || canvasHeight <= 0) return;

    gl.viewport(0, 0, canvasWidth, canvasHeight);
    gl.useProgram(this.program);

    // Safely update texture from source
    try {
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    } catch {
      // Source might not be ready yet
      return;
    }

    const sourceWidth = (source as HTMLVideoElement).videoWidth || source.width || 1;
    const sourceHeight = (source as HTMLVideoElement).videoHeight || source.height || 1;

    let u0 = 0.0;
    let u1 = 1.0;
    let v0 = 0.0;
    let v1 = 1.0;

    if (sourceWidth > 0 && sourceHeight > 0) {
      const sourceAspect = sourceWidth / sourceHeight;
      const targetAspect = canvasWidth / canvasHeight;

      if (sourceAspect > targetAspect) {
        const visibleWidth = targetAspect / sourceAspect;
        const cropX = (1.0 - visibleWidth) / 2.0;
        u0 = cropX;
        u1 = 1.0 - cropX;
      } else {
        const visibleHeight = sourceAspect / targetAspect;
        const cropY = (1.0 - visibleHeight) / 2.0;
        v0 = cropY;
        v1 = 1.0 - cropY;
      }
    }

    let leftU = u0;
    let rightU = u1;
    if (isMirrored) {
      leftU = u1;
      rightU = u0;
    }

    const texCoords = new Float32Array([
      leftU,  v1,
      rightU, v1,
      leftU,  v0,
      leftU,  v0,
      rightU, v1,
      rightU, v0,
    ]);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.DYNAMIC_DRAW);

    const posLoc = gl.getAttribLocation(this.program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const texLoc = gl.getAttribLocation(this.program, "a_texCoord");
    gl.enableVertexAttribArray(texLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

    const time = (Date.now() - this.startTime) / 1000.0;
    gl.uniform1f(this.uTimeLoc, time);
    gl.uniform1f(this.uContrastLoc, filter.contrast);
    gl.uniform1f(this.uSaturationLoc, filter.saturation);
    gl.uniform3fv(this.uLiftLoc, filter.lift);
    gl.uniform3fv(this.uShadowColorLoc, filter.shadowColor);
    gl.uniform3fv(this.uHighlightColorLoc, filter.highlightColor);
    gl.uniform1f(this.uVignetteAmountLoc, filter.vignetteAmount);
    gl.uniform1f(this.uVignetteRadiusLoc, filter.vignetteRadius);
    gl.uniform1f(this.uGrainAmountLoc, filter.grainAmount);
    gl.uniform1f(this.uLightLeakLoc, filter.lightLeak);
    gl.uniform1f(this.uHalationLoc, filter.halation);
    gl.uniform1f(this.uOverexposureLoc, filter.overexposure);
    gl.uniform1f(this.uBlurLoc, filter.blur);
    gl.uniform1f(this.uIsMonoLoc, filter.isMono ? 1.0 : 0.0);

    gl.uniform1i(this.uImageLoc, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  public destroy() {
    const gl = this.gl;
    if (this.program) gl.deleteProgram(this.program);
    if (this.texture) gl.deleteTexture(this.texture);
    if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
    if (this.texCoordBuffer) gl.deleteBuffer(this.texCoordBuffer);
  }
}

// Single shared offscreen canvas and pipeline to prevent WebGL context exhaustion
let sharedOffscreenCanvas: HTMLCanvasElement | null = null;
let sharedOffscreenPipeline: WebGLFilmPipeline | null = null;

function getSharedOffscreenPipeline(): {
  canvas: HTMLCanvasElement;
  pipeline: WebGLFilmPipeline;
} | null {
  if (typeof document === "undefined") return null;
  if (!sharedOffscreenCanvas) {
    sharedOffscreenCanvas = document.createElement("canvas");
    try {
      sharedOffscreenPipeline = new WebGLFilmPipeline(sharedOffscreenCanvas);
    } catch (e) {
      console.warn("Could not create shared offscreen WebGL pipeline:", e);
      return null;
    }
  }
  if (!sharedOffscreenPipeline) return null;
  return { canvas: sharedOffscreenCanvas, pipeline: sharedOffscreenPipeline };
}

/**
 * Applies a film filter to an image source using the shared pipeline, avoiding context creation limits
 */
export async function renderFilteredImage(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  filter: FilmFilterConfig,
  targetWidth: number,
  targetHeight: number,
  isMirrored: boolean = false
): Promise<HTMLCanvasElement> {
  const shared = getSharedOffscreenPipeline();
  const outCanvas = document.createElement("canvas");
  outCanvas.width = targetWidth;
  outCanvas.height = targetHeight;
  const ctx = outCanvas.getContext("2d");
  if (!ctx) return outCanvas;

  if (shared) {
    shared.canvas.width = targetWidth;
    shared.canvas.height = targetHeight;
    shared.pipeline.render(source, filter, isMirrored);
    ctx.drawImage(shared.canvas, 0, 0);
  } else {
    // Fallback if WebGL unavailable
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  }

  if (filter.dateStamp) {
    drawDisposableDateStamp(ctx, targetWidth, targetHeight);
  }

  return outCanvas;
}

/**
 * Draws the classic retro orange 7-segment digital date stamp in the bottom-right corner
 */
export function drawDisposableDateStamp(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  customDate?: Date
) {
  const date = customDate || new Date();
  const yearStr = (date.getFullYear() % 100).toString().padStart(2, "0");
  const monthStr = (date.getMonth() + 1).toString().padStart(2, "0");
  const dayStr = date.getDate().toString().padStart(2, "0");

  const stampText = `'${yearStr}  ${monthStr}  ${dayStr}`;

  ctx.save();
  const fontSize = Math.max(16, Math.round(width * 0.045));
  ctx.font = `bold ${fontSize}px "Courier New", "SF Mono", monospace`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";

  const x = width - Math.round(width * 0.04);
  const y = height - Math.round(height * 0.04);

  ctx.shadowColor = "#ff4500";
  ctx.shadowBlur = fontSize * 0.6;
  ctx.fillStyle = "#ff6a00";
  ctx.fillText(stampText, x, y);

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffaa00";
  ctx.fillText(stampText, x, y);

  ctx.restore();
}
