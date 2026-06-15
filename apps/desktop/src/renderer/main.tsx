import React from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Layout, Space, Tag } from 'tdesign-react';
import { DesktopIcon, ServerIcon } from 'tdesign-icons-react';
import './styles.css';

const { Header, Content } = Layout;

function App() {
  return (
    <Layout className="app-shell">
      <Header className="app-header">
        <Space align="center" size={12}>
          <DesktopIcon size="24px" />
          <strong>Zabtem</strong>
          <Tag theme="primary" variant="light">Tauri + Rust</Tag>
        </Space>
      </Header>
      <Content className="app-content">
        <section className="workspace-panel">
          <div>
            <p className="eyebrow">New architecture baseline</p>
            <h1>Zabbix template workflow, rebuilt for the Rust service stack.</h1>
            <p className="summary">
              The legacy Electron runtime has been removed. This web surface now targets the
              Tauri shell and the Rust API server on <code>127.0.0.1:18080</code>.
            </p>
          </div>
          <Button theme="primary" icon={<ServerIcon />}>
            API health ready
          </Button>
        </section>
      </Content>
    </Layout>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
