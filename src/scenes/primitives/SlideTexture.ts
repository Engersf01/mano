import * as THREE from "three";
import type { Slide } from "@/store/deck";
import { accentToHex } from "@/lib/utils";

const W = 1024;
const H = 576;

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (ctx.measureText(trial).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = trial;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function makeSlideTexture(slide: Slide): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const accent = accentToHex(slide.accent);

  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#07091a");
  grad.addColorStop(1, "#03040c");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Vignette / accent glow
  const glow = ctx.createRadialGradient(W * 0.2, H * 0.1, 0, W * 0.2, H * 0.1, W * 0.7);
  glow.addColorStop(0, `${accent}33`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#f5f7fb";

  if (slide.kind === "title") {
    ctx.fillStyle = accent;
    ctx.fillRect(W / 2 - 60, H / 2 - 160, 120, 3);
    ctx.fillStyle = "#f5f7fb";
    ctx.font = "600 96px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    const lines = wrapLines(ctx, slide.title ?? "", W - 200);
    lines.forEach((line, i) =>
      ctx.fillText(line, W / 2, H / 2 - 20 + i * 110, W - 160),
    );
    if (slide.subtitle) {
      ctx.font = "400 32px Inter, system-ui, sans-serif";
      ctx.fillStyle = "#c9cfe0";
      ctx.fillText(slide.subtitle, W / 2, H / 2 + 110, W - 160);
    }
  } else if (slide.kind === "quote") {
    ctx.font = "italic 600 64px Inter, system-ui, sans-serif";
    ctx.textAlign = "left";
    const lines = wrapLines(ctx, `${slide.quote ?? ""}`, W - 220);
    const startY = H / 2 - (lines.length * 36);
    lines.forEach((line, i) =>
      ctx.fillText(line, 110, startY + i * 78),
    );
    if (slide.attribution) {
      ctx.font = "400 24px Inter, system-ui, sans-serif";
      ctx.fillStyle = "#9aa3bd";
      ctx.fillText(slide.attribution, 110, startY + lines.length * 78 + 40);
    }
    ctx.fillStyle = accent;
    ctx.font = "italic 600 64px Inter, system-ui, sans-serif";
    ctx.fillText("“", 60, startY);
  } else if (slide.kind === "stat") {
    ctx.font = "600 220px Inter, system-ui, sans-serif";
    ctx.fillStyle = accent;
    ctx.textAlign = "center";
    ctx.shadowColor = accent;
    ctx.shadowBlur = 60;
    ctx.fillText(slide.stat?.value ?? "", W / 2, H / 2 + 40);
    ctx.shadowBlur = 0;
    ctx.font = "400 22px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#c9cfe0";
    ctx.fillText((slide.stat?.label ?? "").toUpperCase(), W / 2, H / 2 + 110);
  } else if (slide.kind === "content") {
    ctx.font = "600 60px Inter, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#f5f7fb";
    ctx.fillText(slide.title ?? "", 110, 130, W - 220);
    let y = 230;
    ctx.font = "400 30px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#e7eaf3";
    for (const b of slide.bullets ?? []) {
      ctx.fillStyle = accent;
      ctx.fillRect(110, y - 16, 36, 3);
      ctx.fillStyle = "#e7eaf3";
      const lines = wrapLines(ctx, b, W - 280);
      lines.forEach((line, i) => ctx.fillText(line, 170, y + i * 42));
      y += lines.length * 42 + 18;
    }
  } else if (slide.kind === "split") {
    ctx.font = "600 56px Inter, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = accent;
    ctx.fillText(slide.title ?? "", 80, 140, W / 2 - 100);
    ctx.font = "400 26px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#c9cfe0";
    const lines = wrapLines(ctx, slide.body ?? "", W / 2 - 120);
    lines.forEach((line, i) => ctx.fillText(line, 80, 220 + i * 38));
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      const x = W / 2 + 40 + i * 22;
      ctx.beginPath();
      ctx.moveTo(x, 80);
      ctx.lineTo(x, H - 80);
      ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const y = 80 + i * 33;
      ctx.beginPath();
      ctx.moveTo(W / 2 + 40, y);
      ctx.lineTo(W - 60, y);
      ctx.stroke();
    }
  } else {
    ctx.font = "500 40px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(slide.title ?? slide.id, W / 2, H / 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
