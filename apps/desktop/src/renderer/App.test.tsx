// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { App } from './App';

describe('App workbench', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok', service: 'zabtem-server' })
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('renders the workflow shell and API health state', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /Zabbix 模板工作台/i })).toBeTruthy();
    expect(screen.getByText('项目配置')).toBeTruthy();
    expect(screen.getByText('SNMP Profile')).toBeTruthy();
    expect(screen.getByText('模板导出')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'SNMP 连接测试' })).toBeTruthy();
    expect(screen.getByText('任务队列')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('zabtem-server')).toBeTruthy();
      expect(screen.getAllByText('API 在线').length).toBeGreaterThan(0);
    });
  });
});
