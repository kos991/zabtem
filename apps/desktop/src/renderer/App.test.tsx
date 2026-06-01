// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const snmpCollectionLabel = 'SNMP \u91c7\u96c6';
const project = {
  id: 'project-1',
  name: 'Access Switch',
  deviceType: 'switch' as const,
  vendor: 'H3C',
  model: 'S5130',
  role: 'access' as const,
  zabbixVersion: '7.0 LTS' as const,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z'
};
const profile = {
  id: 'profile-1',
  projectId: 'project-1',
  name: 'Default profile',
  host: '192.0.2.10',
  port: 161,
  version: 'v2c' as const,
  community: 'public',
  v3User: '',
  v3SecurityLevel: 'noAuthNoPriv' as const,
  v3AuthProtocol: 'SHA' as const,
  v3AuthPassword: '',
  v3PrivProtocol: 'AES' as const,
  v3PrivPassword: '',
  timeoutMs: 3000,
  retries: 1,
  bulkSize: 10,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z'
};

beforeEach(() => {
  window.zabtem = {
    app: {
      getVersion: vi.fn().mockResolvedValue('0.0.0')
    },
    projects: {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn()
    },
    snmpProfiles: {
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      remove: vi.fn()
    },
    snmpCollection: {
      testConnection: vi.fn().mockResolvedValue({
        ok: true,
        profileId: 'profile-1',
        target: '192.0.2.10:161',
        sysDescr: 'H3C Comware Software',
        checkedAt: '2026-06-01T00:00:00.000Z'
      })
    }
  };
});

afterEach(() => {
  cleanup();
});

describe('App shell', () => {
  it('renders the recent-project home and allows switching to another workflow step', async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByRole('heading', { level: 1, name: 'Recent projects' });
    const stepButton = screen.getByRole('button', { name: snmpCollectionLabel });
    await user.click(stepButton);

    expect(stepButton.className.includes('active')).toBe(true);
    expect(screen.getByText('This workflow step is not wired yet.')).not.toBeNull();
  });

  it('runs a connection test from the SNMP collection step', async () => {
    const user = userEvent.setup();

    vi.mocked(window.zabtem.projects.list).mockResolvedValue([project]);
    vi.mocked(window.zabtem.snmpProfiles.list).mockResolvedValue([profile]);

    render(<App />);

    await user.click(await screen.findByRole('button', { name: /Access Switch/ }));
    await user.click(screen.getByRole('button', { name: snmpCollectionLabel }));
    await user.click(screen.getByRole('button', { name: 'Test connection' }));

    expect(window.zabtem.snmpCollection.testConnection).toHaveBeenCalledWith({
      profileId: 'profile-1'
    });
    expect(await screen.findByText('H3C Comware Software')).not.toBeNull();
  });
});
