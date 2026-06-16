// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { App } from './App';

describe('App workbench', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/health') {
        return {
          ok: true,
          json: async () => ({ status: 'ok', service: 'zabtem-server' })
        };
      }

      if (String(input) === '/api/snmp/test') {
        return {
          ok: true,
          json: async () => ({
            reachable: true,
            target: '192.168.1.10',
            version: 'v2c',
            latencyMs: 18,
            message: 'SNMP profile accepted by simulated collector'
          })
        };
      }

      if (String(input) === '/api/snmp/walk') {
        return {
          ok: true,
          json: async () => ({
            target: '192.168.1.10',
            version: 'v2c',
            items: [
              { oid: '1.3.6.1.2.1.1.1.0', name: 'sysDescr', value: 'Linux', valueType: 'text' },
              { oid: '1.3.6.1.2.1.1.3.0', name: 'sysUpTime', value: '8640000', valueType: 'timeticks' },
              { oid: '1.3.6.1.2.1.2.2.1.10.1', name: 'ifInOctets', value: '42', valueType: 'counter' },
              { oid: '1.3.6.1.2.1.25.2.3.1.6.1', name: 'hrStorageUsed', value: '100', valueType: 'gauge' }
            ]
          })
        };
      }

      if (String(input) === '/api/template/classify') {
        return {
          ok: true,
          json: async () => ({
            items: [
              { oid: '1.3.6.1.2.1.1.1.0', name: 'sysDescr', group: 'system', zabbixType: 'SNMP_AGENT', valueType: 'text' },
              { oid: '1.3.6.1.2.1.2.2.1.10.1', name: 'ifInOctets', group: 'interfaces', zabbixType: 'SNMP_AGENT', valueType: 'counter' },
              { oid: '1.3.6.1.2.1.25.2.3.1.6.1', name: 'hrStorageUsed', group: 'storage', zabbixType: 'SNMP_AGENT', valueType: 'gauge' }
            ]
          })
        };
      }

      if (String(input) === '/api/template/preview') {
        return {
          ok: true,
          json: async () => ({
            yaml: 'zabbix_export:\n  version: "7.0"\n  templates:\n    - template: Template Zabtem Simulated SNMP\n'
          })
        };
      }

      throw new Error(`Unexpected fetch: ${String(input)}`);
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('renders the workflow shell and API health state', async () => {
    render(<App />);

    expect(screen.getByTestId('workbench-title')).toBeTruthy();
    expect(screen.getByTestId('workflow-project')).toBeTruthy();
    expect(screen.getByTestId('workflow-snmp-profile')).toBeTruthy();
    expect(screen.getByTestId('workflow-template-export')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('zabtem-server')).toBeTruthy();
      expect(screen.getByTestId('api-status').textContent).toContain('API');
    });
  });

  test('runs the simulated SNMP connection test from the workbench', async () => {
    render(<App />);

    await userEvent.click(screen.getByTestId('run-snmp-test'));

    await waitFor(() => {
      expect(screen.getByTestId('snmp-test-result').textContent).toContain('18 ms');
      expect(screen.getByTestId('snmp-test-result').textContent).toContain('192.168.1.10 / v2c');
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/snmp/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: '192.168.1.10',
        version: 'v2c',
        community: 'public'
      })
    });
  });

  test('uses the editable SNMP profile when running the connection test', async () => {
    render(<App />);

    await userEvent.clear(screen.getByTestId('profile-target'));
    await userEvent.type(screen.getByTestId('profile-target'), '10.0.0.15');
    await userEvent.clear(screen.getByTestId('profile-community'));
    await userEvent.type(screen.getByTestId('profile-community'), 'private');

    await userEvent.click(screen.getByTestId('run-snmp-test'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/snmp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: '10.0.0.15',
          version: 'v2c',
          community: 'private'
        })
      });
    });
  });

  test('runs walk, classification, and yaml preview after the connection test', async () => {
    render(<App />);

    await userEvent.click(screen.getByTestId('run-snmp-test'));
    await userEvent.click(await screen.findByTestId('run-snmp-walk'));

    await waitFor(() => {
      expect(screen.getByTestId('snmp-walk-result').textContent).toContain('4 OIDs');
    });

    await userEvent.click(screen.getByTestId('run-oid-classify'));

    await waitFor(() => {
      expect(screen.getByTestId('oid-classify-result').textContent).toContain('interfaces');
      expect(screen.getByTestId('oid-classify-result').textContent).toContain('storage');
    });

    await userEvent.click(screen.getByTestId('run-template-preview'));

    await waitFor(() => {
      expect(screen.getByTestId('template-preview').textContent).toContain('zabbix_export');
      expect(screen.getByTestId('template-preview').textContent).toContain('Template Zabtem Simulated SNMP');
    });
  });
});
