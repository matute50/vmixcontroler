"use client";

import { useState, useEffect } from "react";

type PCProfile = {
  id: string;
  name: string;
  ip: string;
};

export default function VmixHub() {
  const [profiles, setProfiles] = useState<PCProfile[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIp, setNewIp] = useState("");
  const [statusMap, setStatusMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const stored = localStorage.getItem("vmixHubProfiles");
    if (stored) {
      try {
        setProfiles(JSON.parse(stored));
      } catch (e) {
        console.error("Error parsing profiles", e);
      }
    }
  }, []);

  useEffect(() => {
    const checkStatuses = async () => {
      const newStatusMap: Record<string, boolean> = {};
      await Promise.all(
        profiles.map(async (profile) => {
          try {
            const res = await fetch(`/api/check-status?ip=${profile.ip}`);
            if (res.ok) {
              const data = await res.json();
              newStatusMap[profile.id] = data.online;
            } else {
              newStatusMap[profile.id] = false;
            }
          } catch {
            newStatusMap[profile.id] = false;
          }
        })
      );
      setStatusMap((prev) => ({ ...prev, ...newStatusMap }));
    };

    if (profiles.length > 0) {
      checkStatuses();
      const interval = setInterval(checkStatuses, 5000);
      return () => clearInterval(interval);
    }
  }, [profiles]);

  const saveProfiles = (newProfiles: PCProfile[]) => {
    setProfiles(newProfiles);
    localStorage.setItem("vmixHubProfiles", JSON.stringify(newProfiles));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newIp.trim()) return;

    // Limpiar IP por si el usuario pone http:// o espacios
    let cleanIp = newIp.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    // Quitar puerto si lo puso
    cleanIp = cleanIp.split(':')[0];

    const newProfile: PCProfile = {
      id: Date.now().toString(),
      name: newName.trim(),
      ip: cleanIp,
    };

    saveProfiles([...profiles, newProfile]);
    setNewName("");
    setNewIp("");
    setIsAdding(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    saveProfiles(profiles.filter(p => p.id !== id));
  };

  const handleConnect = (ip: string) => {
    window.location.href = `http://${ip}:3000`;
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col font-sans">
      <header className="px-5 py-6 bg-neutral-900 border-b border-neutral-800 shrink-0 text-center shadow-lg">
        <h1 className="text-2xl font-black tracking-widest text-white">vMix HUB</h1>
        <p className="text-sm text-neutral-400 mt-1">Selecciona la PC a controlar</p>
      </header>

      <main className="flex-1 p-5 overflow-y-auto">
        <div className="max-w-md mx-auto space-y-4">
          
          {profiles.length === 0 && !isAdding && (
            <div className="text-center py-10 bg-neutral-900/50 rounded-2xl border border-neutral-800 border-dashed">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-neutral-600 mb-4">
                <rect width="20" height="14" x="2" y="3" rx="2" />
                <line x1="8" x2="16" y1="21" y2="21" />
                <line x1="12" x2="12" y1="17" y2="21" />
              </svg>
              <h3 className="text-lg font-bold text-neutral-300 mb-2">No hay PCs guardadas</h3>
              <p className="text-sm text-neutral-500 mb-6 px-4">
                Agrega la IP de ZeroTier de la computadora que tiene abierto vMix.
              </p>
              <button 
                onClick={() => setIsAdding(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all active:scale-95"
              >
                + Agregar PC
              </button>
            </div>
          )}

          {profiles.length > 0 && !isAdding && (
            <div className="space-y-3">
              {profiles.map(profile => (
                <button
                  key={profile.id}
                  onClick={() => handleConnect(profile.ip)}
                  className="w-full flex items-center justify-between p-4 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-2xl transition-all active:scale-[0.98] group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      statusMap[profile.id] 
                        ? "bg-green-600/20 text-green-500" 
                        : "bg-red-600/20 text-red-500"
                    }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="14" x="2" y="3" rx="2" />
                        <line x1="8" x2="16" y1="21" y2="21" />
                        <line x1="12" x2="12" y1="17" y2="21" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{profile.name}</h3>
                      <p className="text-sm font-mono text-neutral-400">{profile.ip}</p>
                    </div>
                  </div>
                  <div 
                    onClick={(e) => handleDelete(profile.id, e)}
                    className="p-3 text-neutral-600 hover:text-red-500 bg-neutral-950 rounded-xl"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    </svg>
                  </div>
                </button>
              ))}

              <button 
                onClick={() => setIsAdding(true)}
                className="w-full py-4 mt-4 border-2 border-dashed border-neutral-700 hover:border-neutral-500 hover:bg-neutral-900 text-neutral-400 font-bold rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>
                </svg>
                Agregar otra PC
              </button>
            </div>
          )}

          {isAdding && (
            <form onSubmit={handleAdd} className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-200">
              <h3 className="text-lg font-bold text-white mb-4">Nueva Conexión</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Nombre del lugar o PC
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Ej: Estudio Principal"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                    IP de ZeroTier
                  </label>
                  <input
                    type="text"
                    required
                    value={newIp}
                    onChange={e => setNewIp(e.target.value)}
                    placeholder="Ej: 10.147.20.55"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all"
                >
                  Guardar
                </button>
              </div>
            </form>
          )}

        </div>
      </main>
    </div>
  );
}
