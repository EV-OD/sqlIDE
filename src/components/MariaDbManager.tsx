import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store/useAppStore';
import { InstallModal } from './ui/InstallModal';

const DEFAULT_PORT = 3307;
const DEFAULT_HOST = '127.0.0.1';

export default function MariaDbManager() {
  // Select only the store fields we need to avoid re-renders on unrelated changes
  const connections = useAppStore((s) => s.connections);
  const addConnection = useAppStore((s) => s.addConnection);
  const setActiveConnection = useAppStore((s) => s.setActiveConnection);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const [status, setStatus] = useState<string>('unknown');
  const [busy, setBusy] = useState(false);
  const [bundlePresent, setBundlePresent] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'success' | 'error'>('idle');
  const [installError, setInstallError] = useState<string | undefined>(undefined);

  const existingLocal = useMemo(
    () =>
      connections.find(
        (c) => c.dbType === 'mariadb' && (c.host ?? '') === DEFAULT_HOST && (c.port ?? '') === String(DEFAULT_PORT)
      ),
    [connections]
  );

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
    if (existingLocal) {
      return existingLocal.id;
    }
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
    // retrieve last added
    const latest = useAppStore.getState().connections.find(
      (c) => c.dbType === 'mariadb' && (c.host ?? '') === DEFAULT_HOST && (c.port ?? '') === String(DEFAULT_PORT)
    );
    return latest?.id;
  }

  async function install() {
    setInstallModalOpen(true);
    setInstallStatus('installing');
    setInstallError(undefined);
    
    try {
      const res = await invoke<string>('mariadb_install');
      setMessage(res);
      const id = ensureLocalConnection();
      if (id) {
        setMessage((prev) => prev ?? '');
      }
      await refreshStatus();
      setInstallStatus('success');
    } catch (e) {
      console.error(e);
      setInstallError(String(e));
      setInstallStatus('error');
    }
  }

  async function start() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await invoke<string>('mariadb_start', { port: DEFAULT_PORT });
      setMessage(res);
      const id = ensureLocalConnection();
      if (id) {
        const conn = useAppStore.getState().connections.find((c) => c.id === id);
        if (conn) {
          setActiveConnection(conn);
          setCurrentPage('editor');
        }
      }
      await refreshStatus();
    } catch (e) {
      console.error(e);
      alert(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await invoke<string>('mariadb_stop');
      setMessage(res);
      await refreshStatus();
    } catch (e) {
      console.error(e);
      alert(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-5 w-full">
      <InstallModal 
        isOpen={installModalOpen} 
        onClose={() => setInstallModalOpen(false)} 
        status={installStatus} 
        error={installError} 
      />
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-white font-semibold">Local MariaDB (offline bundle)</h3>
          <p className="text-sm text-zinc-400">Install/start the bundled MariaDB server for lab/offline use.</p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-700/70 text-zinc-200">
          Status: {status}
        </span>
      </div>

      {bundlePresent === false && (
        <div className="mb-3 text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded p-3">
          Bundled MariaDB for this platform is missing. Place binaries at <code>src-tauri/bundled/mariadb/&lt;os-arch&gt;</code> and rebuild.
        </div>
      )}

      {message && <div className="mb-3 text-sm text-green-300 bg-green-500/10 border border-green-500/30 rounded p-3">{message}</div>}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={install}
          disabled={busy || bundlePresent === false}
          className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 text-white text-sm"
        >
          Install bundle
        </button>
        <button
          onClick={start}
          disabled={busy}
          className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-600 text-white text-sm"
        >
          Start & open
        </button>
        <button
          onClick={stop}
          disabled={busy}
          className="px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-600 text-white text-sm"
        >
          Stop
        </button>
        <button
          onClick={refreshStatus}
          disabled={busy}
          className="px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-600 text-white text-sm"
        >
          Refresh
        </button>
      </div>

      <div className="mt-3 text-xs text-zinc-400 space-y-1">
        <div>Connection added automatically: host {DEFAULT_HOST}, port {DEFAULT_PORT}, user root (no password, insecure).</div>
        {existingLocal && <div className="text-green-300">Saved connection: {existingLocal.name}</div>}
      </div>
    </div>
  );
}
