import React, { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Database, Loader2, Play, Square, AlertCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const DEFAULT_PORT = 3307;
const DEFAULT_HOST = '127.0.0.1';

export default function LocalServerButton() {
  const { addConnection, setActiveConnection, setCurrentPage, connections } = useAppStore();
  const [status, setStatus] = useState<string>('unknown');
  const [busy, setBusy] = useState(false);
  const [bundlePresent, setBundlePresent] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [platformSupported, setPlatformSupported] = useState<boolean | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await invoke('mariadb_status');
      setStatus(String(s));
    } catch (e) {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    invoke('mariadb_platform_supported')
      .then((res) => {
        setPlatformSupported(Boolean(res));
        if (res) {
          refreshStatus();
          invoke('mariadb_bundle_exists')
            .then((res) => setBundlePresent(Boolean(res)))
            .catch(() => setBundlePresent(false));
        }
      })
      .catch(() => setPlatformSupported(false));
    
    // Poll status every 5 seconds
    const interval = setInterval(refreshStatus, 5000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  // LocalServerButton is intentionally lightweight; logs are displayed in the MariaDB manager page.

  function ensureLocalConnection() {
    const existing = connections.find(
      (c) => c.dbType === 'mariadb' && (c.host ?? '') === DEFAULT_HOST && (c.port ?? '') === String(DEFAULT_PORT)
    );
    if (existing) return existing.id;

    const name = 'Local MariaDB (offline)';
    addConnection({
      name,
      dbType: 'mariadb',
      connectionMode: 'params',
      host: DEFAULT_HOST,
      port: String(DEFAULT_PORT),
      database: '',
      user: 'root',
      password: '',
      style: 'chen',
      theme: 'default',
      curve: 'basis',
    });
    
    const latest = useAppStore.getState().connections.find(
      (c) => c.dbType === 'mariadb' && (c.host ?? '') === DEFAULT_HOST && (c.port ?? '') === String(DEFAULT_PORT)
    );
    return latest?.id;
  }

  async function handleToggle() {
    setBusy(true);
    setError(null);
    // logs are shown in the Local MariaDB Manager page
    try {
      if (status === 'running') {
        await invoke('mariadb_stop');
      } else {
        if (!bundlePresent) {
           await invoke('mariadb_install');
           setBundlePresent(true);
        }
        await invoke('mariadb_start', { port: DEFAULT_PORT });
        const id = ensureLocalConnection();
        if (id) {
          const conn = useAppStore.getState().connections.find((c) => c.id === id);
          if (conn) {
            setActiveConnection(conn);
          }
        }
      }
      await refreshStatus();
    } catch (e) {
      console.error(e);
      setError(String(e));
      // Logs are available in the Local MariaDB Manager page for details
      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    } finally {
      setBusy(false);
    }
  }

  if (platformSupported === null || bundlePresent === null) return null; // Loading initial state
  if (platformSupported === false) return null; // Platform not supported

  const isRunning = status === 'running';
  
  return (
    <div className="relative group">
      <button
        onClick={handleToggle}
        disabled={busy}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all shadow-lg
          ${isRunning 
            ? 'bg-green-600/10 text-green-400 hover:bg-green-600/20 border border-green-600/20' 
            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
          }
          ${busy ? 'opacity-75 cursor-wait' : ''}
          ${error ? 'border-red-500/50 text-red-400' : ''}
        `}
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : error ? (
          <AlertCircle className="w-4 h-4" />
        ) : isRunning ? (
          <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
        ) : (
          <Database className="w-4 h-4" />
        )}
        
        <span>
          {busy ? (isRunning ? 'Stopping...' : 'Starting...') : 
           error ? 'Error' :
           isRunning ? 'Local DB Running' : 'Start Local DB'}
        </span>
      </button>

      {/* logs shown in the MariaDB manager page */}

      {/* Tooltip / Error Message */}
      {error && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-red-900/90 text-white text-xs rounded shadow-xl backdrop-blur-sm border border-red-700 z-50 text-center">
          {error}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-red-900/90" />
        </div>
      )}
    </div>
  );
}
