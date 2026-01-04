import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

export default function MariaDbManager() {
  const [status, setStatus] = useState<string>('unknown');
  const [busy, setBusy] = useState(false);
  const [bundlePresent, setBundlePresent] = useState<boolean | null>(null);

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

  async function install() {
    setBusy(true);
    try {
      const res = await invoke('mariadb_install');
      console.log(res);
      await refreshStatus();
    } catch (e) {
      console.error(e);
      alert(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    setBusy(true);
    try {
      const res = await invoke('mariadb_start', { port: 3307 });
      console.log(res);
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
    try {
      const res = await invoke('mariadb_stop');
      console.log(res);
      await refreshStatus();
    } catch (e) {
      console.error(e);
      alert(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 12, border: '1px solid #ccc', borderRadius: 6 }}>
      <h3>MariaDB (bundled) Manager</h3>
      <div>Status: <strong>{status}</strong></div>
      <div style={{ marginTop: 8 }}>
        {bundlePresent === false && (
          <div style={{ color: 'crimson', marginBottom: 8 }}>
            Bundled MariaDB for your platform is not present in the app resources. You can still copy a bundle to <code>src-tauri/bundled/mariadb/&lt;os-arch&gt;</code> and then click Install.
          </div>
        )}
        <button onClick={install} disabled={busy || bundlePresent === false}>Install bundled MariaDB</button>
        <button onClick={start} disabled={busy} style={{ marginLeft: 8 }}>Start</button>
        <button onClick={stop} disabled={busy} style={{ marginLeft: 8 }}>Stop</button>
        <button onClick={refreshStatus} disabled={busy} style={{ marginLeft: 8 }}>Refresh</button>
      </div>
      <div style={{ marginTop: 8, color: '#666' }}>Notes: offline installer must be bundled under the app resource path at <code>bundled/mariadb/&lt;os-arch&gt;</code>.</div>
    </div>
  );
}
