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
});
