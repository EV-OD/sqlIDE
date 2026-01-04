import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../../store/useAppStore';
import { ArrowLeft, Database, Download, Play, Square, RefreshCw, Terminal } from 'lucide-react';
import { InstallModal } from '../ui/InstallModal';

const DEFAULT_PORT = 3307;
const DEFAULT_HOST = '127.0.0.1';

export default function MariaDbManagementPage() {
  const { setCurrentPage, addConnection, setActiveConnection, connections } = useAppStore();
  const [status, setStatus] = useState<string>('unknown');
  const [busy, setBusy] = useState(false);
  const [bundlePresent, setBundlePresent] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'success' | 'error'>('idle');
  const [installError, setInstallError] = useState<string | undefined>(undefined);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);


  async function refreshStatus() {
    try {
      const s = await invoke('mariadb_status');
      setStatus(String(s));
    } catch (e) {
      setStatus('error');
    }
  }

  useEffect(() => {
    (async () => {
      await refreshStatus();
      try {
        const present = await invoke('mariadb_bundle_exists');
        setBundlePresent(Boolean(present));
      } catch (e) {
        setBundlePresent(false);
      }
    })();
  }, []);

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

  async function install() {
    setInstallModalOpen(true);
    setInstallStatus('installing');
    setInstallError(undefined);
    addLog('Starting installation...');
    
    try {
      const res = await invoke<string>('mariadb_install');
      setMessage(res);
      addLog(res);
      ensureLocalConnection();
      await refreshStatus();
      setInstallStatus('success');
    } catch (e) {
      console.error(e);
      const errStr = String(e);
      setMessage(`Error: ${errStr}`);
      addLog(`Error: ${errStr}`);
      setInstallError(errStr);
      setInstallStatus('error');
    }
  }

  async function start() {
    setBusy(true);
    setMessage('Starting server...');
    addLog('Starting server...');
    try {
      const res = await invoke<string>('mariadb_start', { port: DEFAULT_PORT });
      setMessage(res);
      addLog(res);
      const id = ensureLocalConnection();
      if (id) {
        const conn = useAppStore.getState().connections.find((c) => c.id === id);
        if (conn) {
          setActiveConnection(conn);
        }
      }
      await refreshStatus();
    } catch (e) {
      console.error(e);
      setMessage(`Error: ${e}`);
      addLog(`Error: ${e}`);
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    setMessage('Stopping server...');
    addLog('Stopping server...');
    try {
      const res = await invoke<string>('mariadb_stop');
      setMessage(res);
      addLog(res);
      await refreshStatus();
    } catch (e) {
      console.error(e);
      setMessage(`Error: ${e}`);
      addLog(`Error: ${e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <InstallModal 
        isOpen={installModalOpen} 
        onClose={() => setInstallModalOpen(false)} 
        status={installStatus} 
        error={installError} 
      />
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage("welcome")}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>
          <h1 className="text-lg font-semibold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            Local MariaDB Manager
          </h1>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full p-8">
        <div className="grid gap-8">
          {/* Status Card */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Server Status</h2>
              <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${
                status === 'running' ? 'bg-green-500/10 text-green-400' : 
                status === 'stopped' ? 'bg-red-500/10 text-red-400' : 
                'bg-zinc-700/50 text-zinc-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  status === 'running' ? 'bg-green-400' : 
                  status === 'stopped' ? 'bg-red-400' : 
                  'bg-zinc-400'
                }`} />
                {status.toUpperCase()}
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              {/* Always show Install button if not running, to allow re-install/repair */}
              {status !== 'running' && (
                <button
                  onClick={install}
                  disabled={busy || bundlePresent === false}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {bundlePresent === false ? 'Bundle Missing' : 'Install / Reinstall Bundle'}
                </button>
              )}

              {/* Only show Start if we think it's installed (or at least bundle is present to try) */}
              {bundlePresent && status !== 'running' && (
                <button
                  onClick={start}
                  disabled={busy}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Start Server
                </button>
              )}

              {status === 'running' && (
                <button
                  onClick={stop}
                  disabled={busy}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Square className="w-4 h-4" />
                  Stop Server
                </button>
              )}

              <button
                onClick={refreshStatus}
                disabled={busy}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {message && (
              <div className="mt-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50 text-zinc-300 text-sm">
                {message}
              </div>
            )}
          </div>

          {/* Logs Console */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 flex flex-col h-96">
            <div className="flex items-center gap-2 mb-4 text-zinc-400">
              <Terminal className="w-5 h-5" />
              <h3 className="font-medium">Activity Log</h3>
            </div>
            <div className="flex-1 bg-black/50 rounded-lg p-4 overflow-y-auto font-mono text-sm space-y-1">
              {logs.length === 0 ? (
                <span className="text-zinc-600 italic">No activity yet...</span>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="text-zinc-300 border-b border-zinc-800/50 pb-1 last:border-0">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
