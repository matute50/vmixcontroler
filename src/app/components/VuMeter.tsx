"use client";

import { useEffect, useRef, useCallback, useState } from "react";

// ─── Escala logarítmica no lineal tipo vMix ───────────────────────────────────
function dbToPercent(db: number): number {
  if (db <= -60) return 0;
  if (db >= 0)   return 100;
  if (db < -36)  return ((db + 60) / 24) * 25;
  if (db < -18)  return 25 + ((db + 36) / 18) * 25;
  if (db < -6)   return 50 + ((db + 18) / 12) * 25;
  if (db < -1)   return 75 + ((db + 6)  / 5)  * 15;
  return 90 + (db + 1) * 10;
}

function linearToDb(v: number): number {
  return v <= 0 ? -Infinity : 20 * Math.log10(v);
}

// Marcas de escala dB
const DB_MARKS = [
  { db: 0,   label: "0"  },
  { db: -1,  label: "1"  },
  { db: -6,  label: "6"  },
  { db: -18, label: "18" },
  { db: -36, label: "36" },
  { db: -60, label: "60" },
];

// ─── Dibujado vertical estilo vMix ────────────────────────────────────────────
function drawBar(
  canvas: HTMLCanvasElement | null,
  value: number,
  peak: number,
  muted: boolean
) {
  if (!canvas || canvas.width === 0 || canvas.height === 0) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const W = canvas.width  / dpr;
  const H = canvas.height / dpr;

  ctx.clearRect(0, 0, W, H);

  // Fondo negro
  ctx.fillStyle = "#0d0d0d";
  ctx.fillRect(0, 0, W, H);

  const pct  = dbToPercent(linearToDb(value)) / 100; // 0–1
  const barH = pct * H;

  if (barH > 0.5) {
    if (muted) {
      ctx.fillStyle = "#00c8ff";
      ctx.fillRect(0, H - barH, W, barH);
    } else {
      // Gradiente 5 bandas estilo vMix (de abajo → arriba)
      const g = ctx.createLinearGradient(0, H, 0, 0);
      g.addColorStop(0,    "#0d5200"); // verde muy oscuro
      g.addColorStop(0.25, "#0d5200");
      g.addColorStop(0.26, "#00bb00"); // verde brillante
      g.addColorStop(0.50, "#00bb00");
      g.addColorStop(0.51, "#c8c800"); // amarillo
      g.addColorStop(0.75, "#c8c800");
      g.addColorStop(0.76, "#ff6600"); // naranja
      g.addColorStop(0.90, "#ff6600");
      g.addColorStop(0.91, "#ff0000"); // rojo
      g.addColorStop(1.0,  "#ff1100");
      ctx.fillStyle = g;
      ctx.fillRect(0, H - barH, W, barH);
    }
  }

  // Líneas divisoras de zona (aspecto LED)
  ctx.fillStyle = "#0d0d0d";
  [0.25, 0.50, 0.75, 0.90].forEach(f => {
    ctx.fillRect(0, Math.floor(H - f * H), W, 1);
  });

  // Segmentos LED (líneas semitransparentes finas)
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  for (let i = 1; i < 48; i++) {
    ctx.fillRect(0, Math.floor((i / 48) * H), W, 1);
  }

  // Peak hold
  const peakPct = dbToPercent(linearToDb(peak)) / 100;
  if (peakPct > 0.01 && peak > 0) {
    const py = Math.max(0, Math.floor(H - peakPct * H));
    ctx.fillStyle = muted ? "#00c8ff" : peakPct > 0.91 ? "#ff0000" : "#ffffff";
    ctx.fillRect(0, py, W, 2);
  }

  // Clip indicator
  if (pct >= 0.998 && !muted) {
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, W, 3);
  }
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function VuMeter() {
  const rootRef     = useRef<HTMLDivElement>(null);
  const canvasLRef  = useRef<HTMLCanvasElement>(null);
  const canvasRRef  = useRef<HTMLCanvasElement>(null);

  const dispL     = useRef(0);
  const dispR     = useRef(0);
  const peakL     = useRef(0);
  const peakR     = useRef(0);
  const peakTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMuted   = useRef(false);

  // State visible para rerender de labels
  const [muted, setMuted] = useState(false);

  const setupCanvas = useCallback((el: HTMLCanvasElement | null) => {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const dpr = window.devicePixelRatio || 1;
    // Solo redibujar si el tamaño cambió
    if (el.width !== Math.round(rect.width * dpr) ||
        el.height !== Math.round(rect.height * dpr)) {
      el.width  = Math.round(rect.width  * dpr);
      el.height = Math.round(rect.height * dpr);
      const ctx = el.getContext("2d");
      if (ctx) {
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
      }
    }
  }, []);

  const redraw = useCallback(() => {
    drawBar(canvasLRef.current, dispL.current, peakL.current, isMuted.current);
    drawBar(canvasRRef.current, dispR.current, peakR.current, isMuted.current);
  }, []);

  const setupAndRedraw = useCallback(() => {
    setupCanvas(canvasLRef.current);
    setupCanvas(canvasRRef.current);
    redraw();
  }, [setupCanvas, redraw]);

  // ResizeObserver sobre el div raíz del componente
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    // Primera pasada con delay para esperar layout
    const t1 = setTimeout(setupAndRedraw, 50);
    const t2 = setTimeout(setupAndRedraw, 300);

    const observer = new ResizeObserver(() => setupAndRedraw());
    observer.observe(el);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      observer.disconnect();
    };
  }, [setupAndRedraw]);

  // Polling de audio al master de vMix
  const fetchAudio = useCallback(async () => {
    try {
      const res  = await fetch("/api/vmix-audio", { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();

      const rawL: number = data.master?.meterF1 ?? 0;
      const rawR: number = data.master?.meterF2 ?? 0;
      const mut: boolean = data.master?.muted   ?? false;

      isMuted.current = mut;
      setMuted(mut);

      // Suavizado: ataque rápido, decaimiento gradual
      dispL.current = rawL > dispL.current
        ? rawL * 0.85 + dispL.current * 0.15
        : dispL.current * 0.87;
      dispR.current = rawR > dispR.current
        ? rawR * 0.85 + dispR.current * 0.15
        : dispR.current * 0.87;

      // Peak hold 2.5 s
      if (rawL > peakL.current) peakL.current = rawL;
      if (rawR > peakR.current) peakR.current = rawR;
      if (peakTimer.current) clearTimeout(peakTimer.current);
      peakTimer.current = setTimeout(() => {
        peakL.current = 0;
        peakR.current = 0;
      }, 2500);

      // Asegurar que el canvas tiene dimensiones antes de dibujar
      setupCanvas(canvasLRef.current);
      setupCanvas(canvasRRef.current);
      redraw();
    } catch {
      dispL.current *= 0.8;
      dispR.current *= 0.8;
      redraw();
    }
  }, [setupCanvas, redraw]);

  useEffect(() => {
    fetchAudio();
    const id = setInterval(fetchAudio, 80); // ~12 fps
    return () => {
      clearInterval(id);
      if (peakTimer.current) clearTimeout(peakTimer.current);
    };
  }, [fetchAudio]);

  const accentColor = muted ? "#00c8ff" : "#2a2a2a";

  return (
    <div
      ref={rootRef}
      className="flex flex-col bg-[#0d0d0d] border-l border-neutral-800 shrink-0 select-none"
      style={{ width: "38px" }}
    >
      {/* ── Label MASTER ── */}
      <div className="flex items-center justify-center py-1.5 border-b border-neutral-800">
        <span
          className="text-[7px] font-black tracking-[0.18em] uppercase"
          style={{
            color: muted ? "#00c8ff" : "#444",
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
          }}
        >
          {muted ? "MUTE" : "MASTER"}
        </span>
      </div>

      {/* ── Área de barras + escala ── */}
      <div className="flex flex-row flex-1 min-h-0">

        {/* Escala dB (columna numérica) */}
        <div className="relative shrink-0" style={{ width: "11px" }}>
          {DB_MARKS.map(({ db, label }) => (
            <span
              key={db}
              className="absolute right-0.5 text-[6px] font-mono text-neutral-700 leading-none"
              style={{ bottom: `${dbToPercent(db)}%`, transform: "translateY(50%)" }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Barras L y R */}
        <div className="flex flex-row flex-1 gap-0.5 py-1 pr-0.5 min-h-0">
          {/* Canal L */}
          <div className="flex flex-col flex-1 min-h-0 gap-0.5">
            <span className="text-[6px] font-bold font-mono text-center shrink-0" style={{ color: accentColor }}>L</span>
            <div className="flex-1 overflow-hidden rounded-[1px] border border-neutral-800/80 min-h-0">
              <canvas ref={canvasLRef} style={{ width: "100%", height: "100%", display: "block" }} />
            </div>
          </div>

          {/* Canal R */}
          <div className="flex flex-col flex-1 min-h-0 gap-0.5">
            <span className="text-[6px] font-bold font-mono text-center shrink-0" style={{ color: accentColor }}>R</span>
            <div className="flex-1 overflow-hidden rounded-[1px] border border-neutral-800/80 min-h-0">
              <canvas ref={canvasRRef} style={{ width: "100%", height: "100%", display: "block" }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer dBFS ── */}
      <div className="flex items-center justify-center py-1 border-t border-neutral-800">
        <span className="text-[6px] font-mono text-neutral-700">dB</span>
      </div>
    </div>
  );
}
