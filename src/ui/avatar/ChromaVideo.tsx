"use client";
/**
 * Green-screen removal for the avatar feed.
 *
 * LiveAvatar delivers some avatars over a green backdrop, meant to be keyed
 * out. On a holographic panel that matters twice over: black is what the panel
 * reads as "nothing", so keying the green to black is the difference between a
 * floating presenter and a glowing green box.
 *
 * The key runs on the GPU — a per-pixel pass in JS would not hold 30fps on a
 * panel-class Android device.
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ChromaSettings } from "@/heygen/protocol";

const VERTEX_SHADER = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  // Flip V: WebGL's origin is bottom-left, the video's is top-left.
  v_uv = vec2((a_pos.x + 1.0) * 0.5, 1.0 - (a_pos.y + 1.0) * 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

/**
 * Keying happens in chroma (Cb/Cr) space rather than RGB: it separates hue from
 * brightness, so shadows on the backdrop and highlights on the subject key the
 * same way, and skin tones stay put. The distance is normalised against the key
 * colour's own chroma magnitude — see the comment in main().
 */
const FRAGMENT_SHADER = `
precision mediump float;
uniform sampler2D u_tex;
uniform vec3 u_key;
uniform float u_similarity;
uniform float u_smoothness;
uniform float u_spill;
varying vec2 v_uv;

vec2 chroma(vec3 c) {
  return vec2(
    c.r * -0.169 + c.g * -0.331 + c.b *  0.500,
    c.r *  0.500 + c.g * -0.419 + c.b * -0.081
  );
}

void main() {
  vec4 px = texture2D(u_tex, v_uv);
  vec2 keyChroma = chroma(u_key);

  /**
   * Normalised distance: 0 at the key colour, 1 at neutral grey.
   *
   * Raw Cb/Cr distance is a trap. Every desaturated pixel — black hair, a dark
   * suit, a white shirt — sits at exactly |keyChroma| from the key (0.33 for
   * standard green), so a raw threshold above that erases all of them and
   * leaves only saturated skin. Dividing by the key's own magnitude puts
   * neutral at a fixed 1.0, so any threshold below 1 keeps them, whatever key
   * colour is chosen.
   */
  float d = distance(chroma(px.rgb), keyChroma) / max(length(keyChroma), 1e-4);
  float alpha = smoothstep(u_similarity, u_similarity + u_smoothness, d);

  /**
   * Spill suppression, applied to every pixel — not just the soft edge.
   *
   * The backdrop bounces light onto hair and shoulders, so pixels that are
   * fully kept can still carry green. Blending toward luma only where alpha is
   * partial therefore leaves a hard green line exactly on the silhouette.
   *
   * The fix is the standard despill: green is never allowed to exceed its own
   * neighbours. A pixel whose key channel dominates gets pulled down to the
   * average of the other two, which erases the fringe and leaves genuinely
   * green-free pixels untouched.
   */
  vec3 rgb = px.rgb;
  float keyDominance = max(u_key.g - max(u_key.r, u_key.b), 0.0);
  if (keyDominance > 0.0) {
    float neighbours = (rgb.r + rgb.b) * 0.5;
    rgb.g = mix(rgb.g, min(rgb.g, neighbours), u_spill);
  } else {
    // A non-green key (blue screen, say): fall back to desaturating the edge.
    float luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
    rgb = mix(rgb, mix(rgb, vec3(luma), u_spill), 1.0 - alpha);
  }

  /**
   * Sharpen the alpha ramp. Video is chroma-subsampled, so an edge pixel's
   * colour is averaged with the backdrop beside it and lands half-keyed however
   * well the key is tuned. An S-curve pushes those toward fully keyed or fully
   * kept, which narrows the band where a rim can show. It does not shrink the
   * matte — the despill above is what removes the colour of the rim itself.
   */
  alpha = smoothstep(0.0, 1.0, alpha);

  gl_FragColor = vec4(rgb, alpha);
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace(/^#/, "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const n = Number.parseInt(full.slice(0, 6), 16);
  if (!Number.isFinite(n)) return [0, 1, 0];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** How saturated a sampled corner must be to count as a chroma backdrop. */
const MIN_BACKDROP_CHROMA = 0.06;

function chromaMagnitude([r, g, b]: [number, number, number]) {
  const cb = r * -0.169 + g * -0.331 + b * 0.5;
  const cr = r * 0.5 + g * -0.419 + b * -0.081;
  return Math.hypot(cb, cr);
}

/**
 * Read the backdrop colour off the feed itself.
 *
 * Hard-coding a green is a trap: broadcast green, pure green and everything
 * between are far enough apart in chroma that a key tuned for one leaves the
 * others on screen. The top corners of a centred presenter are backdrop, so
 * sample those and key whatever is actually there.
 *
 * Returns null when the corners aren't saturated enough to be a chroma
 * backdrop — an avatar delivered on black needs no keying at all.
 */
function detectKeyColor(video: HTMLVideoElement): [number, number, number] | null {
  const size = 64;
  const probe = document.createElement("canvas");
  probe.width = size;
  probe.height = size;
  const ctx = probe.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  try {
    ctx.drawImage(video, 0, 0, size, size);
    const band = Math.max(2, Math.round(size * 0.12));
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    // Top-left and top-right only: shoulders can reach the bottom corners.
    for (const x0 of [0, size - band]) {
      const { data } = ctx.getImageData(x0, 0, band, band);
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        n += 1;
      }
    }
    if (n === 0) return null;
    const rgb: [number, number, number] = [r / n / 255, g / n / 255, b / n / 255];
    return chromaMagnitude(rgb) < MIN_BACKDROP_CHROMA ? null : rgb;
  } catch {
    // A tainted canvas would throw; fall back to the configured colour.
    return null;
  }
}

type Props = {
  video: HTMLVideoElement | null;
  settings: ChromaSettings;
  objectFit: "cover" | "contain";
  className?: string;
  style?: React.CSSProperties;
  /** Told when the GPU path can't run, so the caller can show the raw video. */
  onUnsupported?: () => void;
};

export function ChromaVideo({
  video,
  settings,
  objectFit,
  className,
  style,
  onUnsupported,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  /**
   * Kept in a ref, never a dependency: this effect's cleanup deliberately loses
   * the GL context, so re-running it on a changed callback identity would kill
   * the canvas and every later attempt to use it.
   */
  const onUnsupportedRef = useRef(onUnsupported);
  onUnsupportedRef.current = onUnsupported;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !video) return;

    // Straight (un-premultiplied) alpha keeps the shader's output simple: the
    // page background behind the canvas is what shows through a keyed pixel.
    const fail = () => {
      setFailed(true);
      onUnsupportedRef.current?.();
    };

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      depth: false,
    });
    if (!gl) {
      fail();
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = vs && fs ? gl.createProgram() : null;
    if (!vs || !fs || !program) {
      fail();
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      fail();
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const posLocation = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(posLocation);
    gl.vertexAttribPointer(posLocation, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const uKey = gl.getUniformLocation(program, "u_key");
    const uSimilarity = gl.getUniformLocation(program, "u_similarity");
    const uSmoothness = gl.getUniformLocation(program, "u_smoothness");
    const uSpill = gl.getUniformLocation(program, "u_spill");

    let running = true;
    let rafId = 0;
    let frameHandle = 0;
    /** Sampled once per stream; null until the first usable frame arrives. */
    let detected: [number, number, number] | null = null;
    let detectionAttempts = 0;

    const draw = () => {
      if (!running) return;
      const current = settingsRef.current;
      const auto = current.keyColor === "auto";

      if (video.readyState >= 2 && video.videoWidth > 0) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          gl.viewport(0, 0, canvas.width, canvas.height);
          // New stream dimensions mean a new session: sample again.
          detected = null;
          detectionAttempts = 0;
        }

        if (auto && !detected && detectionAttempts < 30) {
          detectionAttempts += 1;
          detected = detectKeyColor(video);
          // Corners aren't a chroma backdrop — nothing to key, show the video.
          if (!detected && detectionAttempts >= 30) {
            fail();
            return;
          }
        }

        gl.uniform3fv(uKey, auto ? (detected ?? [0, 0.694, 0.251]) : hexToRgb(current.keyColor));
        gl.uniform1f(uSimilarity, current.similarity);
        gl.uniform1f(uSmoothness, current.smoothness);
        gl.uniform1f(uSpill, current.spill);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      schedule();
    };

    /**
     * requestVideoFrameCallback fires once per decoded frame — no redundant
     * work between frames, which matters on a panel running all day.
     */
    type FrameVideo = HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number;
      cancelVideoFrameCallback?: (handle: number) => void;
    };
    const frameVideo = video as FrameVideo;

    function schedule() {
      if (!running) return;
      if (frameVideo.requestVideoFrameCallback) {
        frameHandle = frameVideo.requestVideoFrameCallback(draw);
      } else {
        rafId = requestAnimationFrame(draw);
      }
    }

    schedule();

    return () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      if (frameHandle && frameVideo.cancelVideoFrameCallback) {
        frameVideo.cancelVideoFrameCallback(frameHandle);
      }
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [video]);

  if (failed) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("h-full w-full", className)}
      style={{ objectFit, ...style }}
    />
  );
}
