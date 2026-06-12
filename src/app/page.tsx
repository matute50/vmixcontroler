"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import VuMeter from './components/VuMeter';
import OutputMonitor from './components/OutputMonitor';
import AudioReturn from './components/AudioReturn';
import VmixHub from './components/VmixHub';

type VmixInput = {
  id: string;
  number: string;
  title: string;
};

export default function VmixController() {
  const [inputs, setInputs] = useState<VmixInput[]>([]);
  const [activeInputId, setActiveInputId] = useState<string | null>(null);
  const [selectedInputIds, setSelectedInputIds] = useState<string[]>([]);
  const [isSettingsView, setIsSettingsView] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [isHubMode, setIsHubMode] = useState<boolean | null>(null);

  // --- Monitor de Video ---
  const [monitorSrc, setMonitorSrc] = useState<string | null>(null);
  const [monitorError, setMonitorError] = useState(false);
  const [isMonitorVisible, setIsMonitorVisible] = useState(true);
  const [fps, setFps] = useState(0);
  const monitorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFrameTimeRef = useRef<number>(Date.now());
  const frameCountRef = useRef<number>(0);

  useEffect(() => {
    const storedInputs = sessionStorage.getItem('vmixSelectedInputs');
    if (storedInputs) {
      try { setSelectedInputIds(JSON.parse(storedInputs)); }
      catch (e) { console.error('Failed to parse stored inputs', e); }
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem('vmixSelectedInputs', JSON.stringify(selectedInputIds));
  }, [selectedInputIds]);

  useEffect(() => {
    // Detectar si estamos en el Hub (Vercel) o en la PC local (ZeroTier IP / localhost)
    const host = window.location.hostname;
    const isIP = /^[0-9.]+$/.test(host);
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    
    // Si no es IP ni localhost, asumimos que es el dominio de Vercel/público
    if (!isIP && !isLocal) {
      setIsHubMode(true);
    } else {
      setIsHubMode(false);
    }
  }, []);

  const fetchVmixState = useCallback(async () => {
    try {
      const res = await fetch('/api/vmix');
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.inputs) setInputs(data.inputs);
      if (data.activeId !== undefined) setActiveInputId(String(data.activeId));
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchVmixState();
    const interval = setInterval(fetchVmixState, 500);
    return () => clearInterval(interval);
  }, [fetchVmixState]);

  const fetchFrame = useCallback(() => {
    const timestamp = Date.now();
    const url = `/api/vmix-snapshot?input=Output&t=${timestamp}`;
    const img = new Image();
    img.onload = () => {
      setMonitorSrc(url);
      setMonitorError(false);
      frameCountRef.current += 1;
      const now = Date.now();
      const elapsed = (now - lastFrameTimeRef.current) / 1000;
      if (elapsed >= 1) {
        setFps(Math.round(frameCountRef.current / elapsed));
        frameCountRef.current = 0;
        lastFrameTimeRef.current = now;
      }
    };
    img.onerror = () => { setMonitorError(true); };
    img.src = url;
  }, []);

  useEffect(() => {
    if (isMonitorVisible && !isSettingsView) {
      fetchFrame();
      monitorIntervalRef.current = setInterval(fetchFrame, 600);
    } else {
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
        monitorIntervalRef.current = null;
      }
    }
    return () => { if (monitorIntervalRef.current) clearInterval(monitorIntervalRef.current); };
  }, [isMonitorVisible, isSettingsView, fetchFrame]);

  const handleInputClick = async (inputId: string) => {
    try {
      await fetch('/api/vmix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputId, function: 'Fade' }),
      });
      fetchVmixState();
    } catch { /* ignore */ }
  };

  const toggleInputSelection = (inputId: string) => {
    setSelectedInputIds((prev) =>
      prev.includes(inputId) ? prev.filter((id) => id !== inputId) : [...prev, inputId]
    );
  };

  const selectedInputs = inputs.filter((input) => selectedInputIds.includes(input.id));
  const activeInput = inputs.find((input) => String(input.id) === activeInputId);
  const liveTitle = activeInput ? activeInput.title : '---';

  // Mientras decide en qué modo está, no renderizar nada para evitar flashes
  if (isHubMode === null) return null;

  // Si está en modo Hub (ej: corriendo en vercel.app), mostrar el selector de PCs
  if (isHubMode) {
    return <VmixHub />;
  }

  // De lo contrario, estamos en una IP/Localhost: Mostrar el controlador de vMix
  return (
    <div className="h-screen bg-neutral-950 text-white flex flex-col font-sans select-none overflow-hidden">

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-3 py-1.5 bg-neutral-900 border-b border-neutral-800 shadow-md shrink-0">
        <h1 className="text-base font-bold tracking-wider text-neutral-100">
          {isSettingsView ? 'Ajustes' : 'vMix Control'}
        </h1>
        <button
          onClick={() => setIsSettingsView(!isSettingsView)}
          className={`p-1.5 rounded-full transition-all active:scale-90 ${isSettingsView ? 'bg-blue-600/20 text-blue-500' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'}`}
          aria-label="Toggle Settings"
        >
          {isSettingsView ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          )}
        </button>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {isSettingsView ? (

          /* Vista Ajustes */
          <div className="p-4 space-y-6 overflow-y-auto h-full pb-10">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Entradas Visibles</h2>
              <p className="text-sm text-neutral-400 mb-4">
                Selecciona cuáles canales quieres tener a mano en tu botonera.
              </p>
              {inputs.length === 0 && isConnected && (
                <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 text-center">
                  <p className="text-neutral-400">Cargando entradas desde vMix...</p>
                </div>
              )}
              <div className="grid gap-2.5">
                {inputs.map((input) => {
                  const isSelected = selectedInputIds.includes(input.id);
                  return (
                    <label key={input.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all active:scale-[0.98]
                        ${isSelected ? 'bg-blue-600/10 border-blue-500/30' : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800 hover:border-neutral-700'}`}
                    >
                      <div className="relative flex items-center justify-center shrink-0">
                        <input type="checkbox" className="peer sr-only"
                          checked={isSelected} onChange={() => toggleInputSelection(input.id)} />
                        <div className="w-6 h-6 rounded-md border-2 border-neutral-600 bg-neutral-800 peer-checked:bg-blue-500 peer-checked:border-blue-500 transition-colors flex items-center justify-center">
                          <svg className={`w-4 h-4 text-white transition-transform ${isSelected ? 'scale-100' : 'scale-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                          </svg>
                        </div>
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-semibold text-neutral-200 truncate">{input.title}</span>
                        <span className="text-xs font-mono text-neutral-500">Canal: {input.number}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <button onClick={() => setIsSettingsView(false)}
              className="w-full py-4 bg-white hover:bg-neutral-200 text-black rounded-xl font-bold text-lg shadow-lg transition-all active:scale-95 sticky bottom-4 z-10">
              Listo
            </button>
          </div>

        ) : (

          /* Vista Principal */
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* ── Fila superior: Monitor de video + VU Meter MASTER ──
                Ambos están en el mismo flex-row → VuMeter tiene
                exactamente la misma altura que el monitor de video     */}
            <div className="flex flex-row shrink-0 border-b border-neutral-800">

              {/* Monitor de video (ocupa el espacio restante) */}
              <div className="flex-1 min-w-0">
                <OutputMonitor
                  monitorSrc={monitorSrc}
                  monitorError={monitorError}
                  activeTitle={!!activeInput ? liveTitle : null}
                  isConnected={isConnected}
                  fps={fps}
                  isVisible={isMonitorVisible}
                  onToggleVisible={() => setIsMonitorVisible(v => !v)}
                />
              </div>

              {/* VU Meter MASTER — mismo alto que el monitor */}
              <VuMeter />

            </div>

            {/* ── Retorno de audio Master ── */}
            <AudioReturn />

            {/* Botonera */}
            <div className="flex-1 overflow-y-auto p-3">
              {selectedInputs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center border border-neutral-800">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500">
                      <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                      <line x1="3" x2="21" y1="9" y2="9"/>
                      <line x1="9" x2="9" y1="21" y2="9"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white mb-1">Botonera vacía</h3>
                    <p className="text-neutral-500 text-sm max-w-[200px] mx-auto">
                      Ve a los ajustes para seleccionar canales.
                    </p>
                  </div>
                  <button onClick={() => setIsSettingsView(true)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all active:scale-95">
                    Configurar
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 pb-4">
                  {selectedInputs.map((input) => {
                    const isActive = String(input.id) === activeInputId;
                    return (
                      <button key={input.id} onClick={() => handleInputClick(input.id)}
                        className={`
                          relative flex flex-col items-center justify-center p-4 rounded-2xl
                          transition-all duration-[50ms] active:scale-[0.96] border-2 outline-none select-none min-h-[72px]
                          ${isActive
                            ? 'bg-red-600 border-red-500 text-white shadow-[0_0_24px_rgba(220,38,38,0.45)]'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:border-neutral-700 shadow-sm'}
                        `}
                      >
                        <span className={`text-center font-black text-base leading-tight line-clamp-3 ${isActive ? 'drop-shadow-lg' : ''}`}>
                          {input.title}
                        </span>
                        {!isActive && (
                          <div className="absolute top-2 right-2 text-[9px] font-bold font-mono text-neutral-700 bg-neutral-950/60 px-1.5 py-0.5 rounded-full">
                            {input.number}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* CSS safe area móvil */}
      <style dangerouslySetInnerHTML={{__html: `.pb-safe { padding-bottom: env(safe-area-inset-bottom); }`}} />
    </div>
  );
}
