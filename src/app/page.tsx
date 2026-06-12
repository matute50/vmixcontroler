"use client";

import { useState, useEffect, useCallback } from 'react';

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
  
  // Load selected inputs from localStorage on mount
  useEffect(() => {
    const storedInputs = localStorage.getItem('vmixSelectedInputs');
    if (storedInputs) {
      try {
        setSelectedInputIds(JSON.parse(storedInputs));
      } catch (e) {
        console.error('Failed to parse stored inputs', e);
      }
    }
  }, []);

  // Save selected inputs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('vmixSelectedInputs', JSON.stringify(selectedInputIds));
  }, [selectedInputIds]);

  const fetchVmixState = useCallback(async () => {
    try {
      const res = await fetch('/api/vmix');
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      if (data.inputs) setInputs(data.inputs);
      if (data.activeId !== undefined) {
        // Enforce string conversion for safe comparison
        setActiveInputId(String(data.activeId));
      }
      setIsConnected(true);
    } catch (error) {
      console.error(error);
      setIsConnected(false);
    }
  }, []);

  // Initial fetch and polling for states
  useEffect(() => {
    fetchVmixState();
    const interval = setInterval(fetchVmixState, 500);
    return () => clearInterval(interval);
  }, [fetchVmixState]);

  const handleInputClick = async (inputId: string) => {
    try {
      await fetch('/api/vmix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputId, function: 'Fade' }),
      });
      fetchVmixState();
    } catch (error) {
      console.error('Failed to change input', error);
    }
  };

  const toggleInputSelection = (inputId: string) => {
    setSelectedInputIds((prev) =>
      prev.includes(inputId)
        ? prev.filter((id) => id !== inputId)
        : [...prev, inputId]
    );
  };

  const selectedInputs = inputs.filter((input) => selectedInputIds.includes(input.id));
  
  // Find the active input title for the Live Header
  const activeInput = inputs.find(
    (input) => String(input.id) === activeInputId
  );
  const liveTitle = activeInput ? activeInput.title : '---';

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col font-sans select-none overflow-hidden">
      {/* Header Superior */}
      <header className="flex items-center justify-between p-4 bg-neutral-900 border-b border-neutral-800 shadow-md shrink-0">
        <h1 className="text-xl font-bold tracking-wider text-neutral-100 flex items-center gap-2">
          {isSettingsView ? 'Ajustes' : 'vMix Control'}
        </h1>
        <button
          onClick={() => setIsSettingsView(!isSettingsView)}
          className={`p-2.5 rounded-full transition-all active:scale-90 ${isSettingsView ? 'bg-blue-600/20 text-blue-500' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'}`}
          aria-label="Toggle Settings"
        >
          {isSettingsView ? (
            // Back/Close Icon
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          ) : (
            // Gear Icon
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col pb-safe overflow-hidden">
        {isSettingsView ? (
          <div className="p-4 md:p-6 max-w-2xl mx-auto w-full space-y-6 overflow-y-auto h-full pb-10">
            {/* Inputs Selection */}
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-white mb-1">Entradas Visibles</h2>
                <p className="text-sm text-neutral-400">
                  Selecciona cuáles canales quieres tener a mano en tu botonera.
                </p>
              </div>
              
              {inputs.length === 0 && isConnected && (
                <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 text-center">
                  <p className="text-neutral-400">Cargando entradas desde vMix...</p>
                </div>
              )}

              <div className="grid gap-2.5">
                {inputs.map((input) => {
                  const isSelected = selectedInputIds.includes(input.id);
                  return (
                    <label
                      key={input.id}
                      className={`
                        flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all active:scale-[0.98]
                        ${isSelected 
                          ? 'bg-blue-600/10 border-blue-500/30' 
                          : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800 hover:border-neutral-700'
                        }
                      `}
                    >
                      <div className="relative flex items-center justify-center shrink-0">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={isSelected}
                          onChange={() => toggleInputSelection(input.id)}
                        />
                        <div className="w-6 h-6 rounded-md border-2 border-neutral-600 bg-neutral-800 peer-checked:bg-blue-500 peer-checked:border-blue-500 transition-colors flex items-center justify-center">
                          <svg className={`w-4 h-4 text-white transition-transform ${isSelected ? 'scale-100' : 'scale-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-semibold text-neutral-200 truncate">{input.title}</span>
                        <span className="text-xs font-mono text-neutral-500">ID: {input.id} &bull; Canal: {input.number}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            
            <button
              onClick={() => setIsSettingsView(false)}
              className="w-full py-4 bg-white hover:bg-neutral-200 text-black rounded-xl font-bold text-lg shadow-lg transition-all active:scale-95 sticky bottom-4 z-10"
            >
              Listo
            </button>
          </div>
        ) : (
          <div className="h-full flex flex-col w-full overflow-hidden">
            
            {/* Monitor de Texto de Alta Visibilidad (Live Header) */}
            <div className="bg-black border-b border-neutral-800 py-6 px-4 flex items-center justify-center shrink-0 shadow-lg z-10">
              {!isConnected ? (
                <h2 className="text-xl sm:text-2xl font-black tracking-widest text-red-500 uppercase animate-pulse">
                  VMIX DESCONECTADO
                </h2>
              ) : (
                <h2 className="text-2xl sm:text-3xl font-black tracking-wider text-white uppercase truncate flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${activeInput ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse' : 'bg-neutral-700'}`}></div>
                  <span className="text-red-500 mr-1">LIVE:</span> {liveTitle}
                </h2>
              )}
            </div>

            {/* Grid Botonera Optimizada */}
            <div className="flex-1 overflow-y-auto p-4 w-full max-w-4xl mx-auto flex flex-col">
              {selectedInputs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-5">
                  <div className="w-24 h-24 bg-neutral-900 rounded-3xl flex items-center justify-center border border-neutral-800">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500">
                      <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                      <line x1="3" x2="21" y1="9" y2="9"/>
                      <line x1="9" x2="9" y1="21" y2="9"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Botonera vacía</h3>
                    <p className="text-neutral-400 text-base max-w-[280px] mx-auto">
                      Ve a los ajustes para seleccionar los canales que quieres controlar.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsSettingsView(true)}
                    className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-lg transition-all active:scale-95 shadow-lg shadow-blue-900/20 mt-4"
                  >
                    Configurar Botones
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 h-full pb-8">
                  {selectedInputs.map((input) => {
                    const isActive = String(input.id) === activeInputId;
                    
                    return (
                      <button
                        key={input.id}
                        onClick={() => handleInputClick(input.id)}
                        className={`
                          relative flex flex-col items-center justify-center p-6 rounded-3xl transition-all duration-[50ms] active:scale-[0.96] border-2 outline-none select-none
                          ${isActive 
                            ? 'bg-red-600 border-red-500 text-white shadow-[0_0_30px_rgba(220,38,38,0.4)]' 
                            : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:border-neutral-700 shadow-md'
                          }
                        `}
                      >
                        <span className={`text-center font-black text-xl sm:text-2xl leading-tight line-clamp-3 px-2 ${isActive ? 'drop-shadow-lg' : ''}`}>
                          {input.title}
                        </span>
                        
                        {!isActive && (
                          <div className="absolute top-4 right-4 text-xs font-bold font-mono text-neutral-600 bg-neutral-950/60 px-3 py-1.5 rounded-full">
                            CH {input.number}
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
      
      {/* Global CSS for safe area padding on mobile */}
      <style dangerouslySetInnerHTML={{__html: `
        .pb-safe { padding-bottom: env(safe-area-bottom); }
      `}} />
    </div>
  );
}
