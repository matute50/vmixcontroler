"use client";

type OutputMonitorProps = {
  monitorSrc: string | null;
  monitorError: boolean;
  activeTitle: string | null;
  isConnected: boolean;
  fps: number;
  isVisible: boolean;
  onToggleVisible: () => void;
};

export default function OutputMonitor({
  monitorSrc,
  monitorError,
  activeTitle,
  isConnected,
  fps,
  isVisible,
  onToggleVisible,
}: OutputMonitorProps) {
  const isLive = !!activeTitle && isConnected;

  return (
    <div className="shrink-0 bg-black border-b border-neutral-800">

      {/* ── Barra de título ── */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            !isConnected
              ? "bg-neutral-600"
              : isLive
              ? "bg-red-500 shadow-[0_0_7px_rgba(239,68,68,0.9)] animate-pulse"
              : "bg-yellow-500 animate-pulse"
          }`} />
          <span className="text-[11px] font-bold tracking-widest text-neutral-400 uppercase truncate">
            {!isConnected
              ? "Sin conexión"
              : isLive
              ? `LIVE: ${activeTitle}`
              : "En espera..."}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isVisible && fps > 0 && !monitorError && (
            <span className="text-[10px] font-mono text-neutral-700">{fps} fps</span>
          )}
          <button
            onClick={onToggleVisible}
            className="text-[11px] text-neutral-500 hover:text-white px-2 py-0.5 rounded hover:bg-neutral-800 active:scale-95 transition-colors"
          >
            {isVisible ? "Ocultar" : "Ver"}
          </button>
        </div>
      </div>

      {/* ── Preview de video ── */}
      {isVisible && (
        <div className="relative w-full bg-black" style={{ aspectRatio: "16/9" }}>
          {monitorError || !monitorSrc ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0a0a0a]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28" height="28"
                viewBox="0 0 24 24"
                fill="none" stroke="currentColor"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                className="text-neutral-700"
              >
                <rect width="20" height="15" x="2" y="4.5" rx="2" />
                <path d="M8 20h8M12 15.5V20" />
              </svg>
              <p className="text-neutral-600 text-[11px] text-center px-4">
                {monitorError
                  ? "No se puede obtener imagen de vMix"
                  : "Conectando con vMix..."}
              </p>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={monitorSrc}
              alt="vMix Live Output"
              className="w-full h-full object-contain block"
            />
          )}

        </div>
      )}

      {/* ── Fallback cuando está oculto: banner de título ── */}
      {!isVisible && isLive && (
        <div className="px-3 pb-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          <span className="text-sm font-black text-white uppercase truncate">
            {activeTitle}
          </span>
        </div>
      )}
    </div>
  );
}
