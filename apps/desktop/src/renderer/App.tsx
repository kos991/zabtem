import { useEffect, useState, type ReactElement } from 'react';

export function App(): ReactElement {
  const [version, setVersion] = useState<string>('Loading...');

  useEffect(() => {
    window.zabtem.app
      .getVersion()
      .then(setVersion)
      .catch(() => setVersion('Version unavailable'));
  }, []);

  return (
    <main className="shell">
      <section className="card">
        <p className="eyebrow">MIB2Zabbix Desktop</p>
        <h1>Zabbix 7.0 template generator skeleton</h1>
        <p className="description">
          Desktop shell is running with a secure Electron preload boundary.
        </p>
        <dl className="status-grid">
          <div>
            <dt>Application version</dt>
            <dd>{version}</dd>
          </div>
          <div>
            <dt>Renderer</dt>
            <dd>React + Vite</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
