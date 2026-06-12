"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export default function AudioReturn() {
  const audioRef  = useRef<HTMLAudioElement>(null);
  const [playing,  setPlaying]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [volume,   setVolume]   = useState(1.0);
  const wasPlayingRef = useRef(false);

  const startStream = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setLoading(true);
    setError(null);
    setPlaying(true);

    // Timestamp para evitar caché del browser
    audio.src = `/api/audio-stream?bus=master&t=${Date.now()}`;
    audio.volume = volume;

    const onCanPlay = () => {
      setLoading(false);
      audio.play().catch(() => {
        setError("Toca el botón para reproducir (política del navegador).");
        setPlaying(false);
      });
    };
    const onError = () => {
      setLoading(false);
      setPlaying(false);
      setError("No se pudo conectar con vMix. ¿Está vMix abierto?");
    };

    audio.addEventListener("canplay", onCanPlay, { once: true });
    audio.addEventListener("error",   onError,   { once: true });
    audio.load();
  }, [volume]);

  const stopStream = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.src = "";
    setPlaying(false);
    setLoading(false);
    setError(null);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (playing) {
          wasPlayingRef.current = true;
          stopStream();
        }
      } else {
        if (wasPlayingRef.current) {
          wasPlayingRef.current = false;
          startStream();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [playing, stopStream, startStream]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  return (
    <div className="shrink-0 bg-neutral-900/80 border-t border-neutral-800 px-3 py-2">
      <div className="flex items-center gap-3">

        {/* ── Botón principal Escuchar / Detener ── */}
        <button
          onClick={playing ? stopStream : startStream}
          disabled={loading}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-bold text-sm
            transition-all active:scale-95 shrink-0
            ${loading
              ? "border-neutral-700 bg-neutral-800 text-neutral-500 cursor-wait"
              : playing
              ? "border-red-500/60 bg-red-600/15 text-red-400"
              : "border-green-500/60 bg-green-600/15 text-green-400 hover:bg-green-600/25"
            }
          `}
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
              </svg>
              Conectando...
            </>
          ) : playing ? (
            <>
              {/* Stop */}
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="1.5"/>
              </svg>
              Detener
            </>
          ) : (
            <>
              {/* Headphones */}
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>
              </svg>
              Escuchar
            </>
          )}
        </button>

        {/* ── Info ── */}
        <div className="flex flex-col flex-1 min-w-0 gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Master vMix
            </span>
            {playing && !loading && (
              /* Ondas animadas indicando reproducción */
              <div className="flex items-end gap-[2px] h-3.5">
                {[0.7, 1.0, 0.55].map((h, i) => (
                  <div
                    key={i}
                    className="w-[3px] rounded-full bg-green-500 animate-pulse"
                    style={{
                      height: `${h * 14}px`,
                      animationDelay: `${i * 0.2}s`,
                      animationDuration: "0.7s",
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Volumen del celular */}
          <div className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-600 shrink-0">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
            <input
              type="range" min="0" max="1" step="0.05"
              value={volume}
              onChange={e => setVolume(parseFloat(e.target.value))}
              className="flex-1 h-1 accent-green-500 cursor-pointer"
              aria-label="Volumen de escucha en el celular"
            />
            <span className="text-[9px] font-mono text-neutral-600 w-6 text-right">
              {Math.round(volume * 100)}
            </span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="mt-1.5 text-[10px] text-red-400 bg-red-950/40 border border-red-900/40 rounded px-2 py-1">
          ⚠ {error}
        </p>
      )}

      <audio ref={audioRef} preload="none" playsInline />
    </div>
  );
}
