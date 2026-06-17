// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { App } from './App';

describe('App workbench', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    window.localStorage.clear();
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

      if (String(input) === '/api/mib/scan') {
        return {
          ok: true,
          json: async () => ({
            fileName: 'ACME-SWITCH-MIB.mib',
            moduleName: 'ACME-SWITCH-MIB',
            entries: [
              {
                name: 'acmeCpuLoad',
                oid: 'enterprises.4242.1',
                syntax: 'Integer32',
                access: 'read-only',
                description: 'CPU load percentage'
              },
              {
                name: 'acmeFanState',
                oid: 'enterprises.4242.2',
                syntax: 'INTEGER { ok(1), fail(2) }',
                access: 'read-only',
                description: 'Fan state'
              }
            ]
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
    expect(screen.getByTestId('profile-panel')).toBeTruthy();
    expect(screen.getByTestId('mib-panel')).toBeTruthy();
    expect(screen.getByTestId('collector-panel')).toBeTruthy();
    expect(screen.getByTestId('flow-nav').textContent).toContain('连接配置');
    expect(screen.getByTestId('flow-nav').textContent).toContain('采集与MIB');
    expect(screen.getByTestId('flow-nav').textContent).toContain('监控项审核');
    expect(screen.getByTestId('flow-nav').textContent).toContain('YAML与历史');
    expect(screen.queryByText('任务队列')).toBeNull();
    expect(screen.queryByText('里程碑')).toBeNull();
    expect(screen.queryByText('当前范围')).toBeNull();
    expect(screen.getByTestId('collector-panel').contains(screen.getByTestId('mib-panel'))).toBe(true);

    await waitFor(() => {
      expect(screen.getByTestId('api-status').textContent).toContain('API');
    });
  });

  test('scans an uploaded mib file and shows object candidates', async () => {
    render(<App />);

    const file = new File(
      ['ACME-SWITCH-MIB DEFINITIONS ::= BEGIN\nacmeCpuLoad OBJECT-TYPE\n    ::= { enterprises 4242 1 }\nEND'],
      'ACME-SWITCH-MIB.mib',
      { type: 'text/plain' }
    );

    await userEvent.upload(screen.getByTestId('mib-file-input'), file);
    await userEvent.click(screen.getByTestId('run-mib-scan'));

    await waitFor(() => {
      expect(screen.getByTestId('mib-scan-result').textContent).toContain('ACME-SWITCH-MIB');
      expect(screen.getByTestId('mib-scan-result').textContent).toContain('acmeCpuLoad');
      expect(screen.getByTestId('mib-scan-result').textContent).toContain('enterprises.4242.1');
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/mib/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'ACME-SWITCH-MIB.mib',
        content: 'ACME-SWITCH-MIB DEFINITIONS ::= BEGIN\nacmeCpuLoad OBJECT-TYPE\n    ::= { enterprises 4242 1 }\nEND'
      })
    });
  });

  test('filters mib scan results through a tree and shows oid details before review selection', async () => {
    render(<App />);

    const file = new File(
      ['ACME-SWITCH-MIB DEFINITIONS ::= BEGIN\nacmeCpuLoad OBJECT-TYPE\n    ::= { enterprises 4242 1 }\nEND'],
      'ACME-SWITCH-MIB.mib',
      { type: 'text/plain' }
    );

    await userEvent.upload(screen.getByTestId('mib-file-input'), file);
    await userEvent.click(screen.getByTestId('run-mib-scan'));

    await waitFor(() => {
      expect(screen.getByTestId('mib-tree-view').textContent).toContain('ACME-SWITCH-MIB');
      expect(screen.getByTestId('mib-tree-node-acmeCpuLoad').textContent).toContain('acmeCpuLoad');
    });

    await userEvent.clear(screen.getByTestId('mib-tree-search'));
    await userEvent.type(screen.getByTestId('mib-tree-search'), 'fan');

    expect(screen.getByTestId('mib-tree-view').textContent).not.toContain('acmeCpuLoad');
    expect(screen.getByTestId('mib-tree-view').textContent).toContain('acmeFanState');

    await userEvent.click(screen.getByTestId('mib-tree-node-acmeFanState'));

    expect(screen.getByTestId('oid-details-panel').textContent).toContain('acmeFanState');
    expect(screen.getByTestId('oid-details-panel').textContent).toContain('INTEGER { ok(1), fail(2) }');
    expect(screen.getByTestId('oid-details-panel').textContent).toContain('Fan state');
    expect(screen.getByTestId('oid-details-panel').textContent).toContain('三步测试');

    await userEvent.click(screen.getByTestId('mib-tree-checkbox-acmeFanState'));

    expect(screen.getByTestId('oid-classify-result').textContent).not.toContain('acmeFanState');
    expect(screen.getByTestId('oid-classify-result').textContent).toContain('acmeCpuLoad');
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

  test('uses SNMPv3 security fields when running the connection test', async () => {
    render(<App />);

    await userEvent.selectOptions(screen.getByTestId('profile-version'), 'v3');
    await userEvent.type(screen.getByTestId('profile-username'), 'zabbix-user');
    await userEvent.selectOptions(screen.getByTestId('profile-auth-protocol'), 'SHA');
    await userEvent.type(screen.getByTestId('profile-auth-password'), 'auth-pass');
    await userEvent.selectOptions(screen.getByTestId('profile-priv-protocol'), 'AES');
    await userEvent.type(screen.getByTestId('profile-priv-password'), 'priv-pass');

    await userEvent.click(screen.getByTestId('run-snmp-test'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/snmp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: '192.168.1.10',
          version: 'v3',
          securityName: 'zabbix-user',
          authProtocol: 'SHA',
          authPassword: 'auth-pass',
          privProtocol: 'AES',
          privPassword: 'priv-pass'
        })
      });
    });
  });

  test('loads a simulated device profile for local collection demos', async () => {
    render(<App />);

    await userEvent.clear(screen.getByTestId('profile-target'));
    await userEvent.type(screen.getByTestId('profile-target'), '10.10.10.10');
    await userEvent.click(screen.getByTestId('use-simulated-device'));
    await userEvent.click(screen.getByTestId('run-snmp-test'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/snmp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'zabtem-sim-core-01',
          version: 'v2c',
          community: 'public'
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

  test('previews yaml with only selected classified items', async () => {
    render(<App />);

    await userEvent.click(screen.getByTestId('run-snmp-test'));
    await userEvent.click(await screen.findByTestId('run-snmp-walk'));
    await userEvent.click(await screen.findByTestId('run-oid-classify'));

    await userEvent.click(await screen.findByTestId('template-item-ifInOctets'));
    await userEvent.click(screen.getByTestId('run-template-preview'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/template/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName: 'Template Zabtem Simulated SNMP',
          items: [
            { oid: '1.3.6.1.2.1.1.1.0', name: 'sysDescr', group: 'system', zabbixType: 'SNMP_AGENT', valueType: 'text' },
            { oid: '1.3.6.1.2.1.25.2.3.1.6.1', name: 'hrStorageUsed', group: 'storage', zabbixType: 'SNMP_AGENT', valueType: 'gauge' }
          ]
        })
      });
    });
  });

  test('copies generated yaml to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<App />);

    await userEvent.click(screen.getByTestId('run-snmp-test'));
    await userEvent.click(await screen.findByTestId('run-snmp-walk'));
    await userEvent.click(await screen.findByTestId('run-oid-classify'));
    await userEvent.click(await screen.findByTestId('run-template-preview'));
    await userEvent.click(await screen.findByTestId('copy-template-yaml'));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('zabbix_export'));
  });

  test('stores successful template previews in run history', async () => {
    render(<App />);

    await userEvent.click(screen.getByTestId('run-snmp-test'));
    await userEvent.click(await screen.findByTestId('run-snmp-walk'));
    await userEvent.click(await screen.findByTestId('run-oid-classify'));
    await userEvent.click(await screen.findByTestId('run-template-preview'));

    await waitFor(() => {
      expect(screen.getByTestId('run-history').textContent).toContain('Template Zabtem Simulated SNMP');
      expect(window.localStorage.getItem('zabtem.runHistory')).toContain('Template Zabtem Simulated SNMP');
    });
  });

  test('classifies pasted walk samples without running snmp walk', async () => {
    render(<App />);

    await userEvent.type(
      screen.getByTestId('walk-sample-input'),
      '1.3.6.1.2.1.2.2.1.10.1 ifInOctets 42 counter'
    );
    await userEvent.click(screen.getByTestId('import-walk-sample'));
    await userEvent.click(screen.getByTestId('run-oid-classify'));

    await waitFor(() => {
      expect(screen.getByTestId('oid-classify-result').textContent).toContain('interfaces');
    });
  });

  test('moves through the workbench by navigation steps', async () => {
    render(<App />);

    await userEvent.click(screen.getByTestId('nav-step-collect'));
    expect(screen.getByTestId('active-flow-panel').textContent).toContain('采集与MIB');
    expect(screen.getByTestId('active-flow-panel').textContent).toContain('导入 walk 样本');

    await userEvent.type(
      screen.getByTestId('walk-sample-input'),
      '1.3.6.1.2.1.2.2.1.10.1 ifInOctets 42 counter'
    );
    await userEvent.click(screen.getByTestId('import-walk-sample'));
    await userEvent.click(screen.getByTestId('run-oid-classify'));

    await userEvent.click(screen.getByTestId('nav-step-review'));
    expect(screen.getByTestId('active-flow-panel').textContent).toContain('监控项审核');
    expect(screen.getByTestId('oid-classify-result').textContent).toContain('ifInOctets');

    await userEvent.click(screen.getByTestId('nav-step-export'));
    expect(screen.getByTestId('active-flow-panel').textContent).toContain('YAML与历史');
    await userEvent.click(screen.getByTestId('run-template-preview'));

    await waitFor(() => {
      expect(screen.getByTestId('template-preview').textContent).toContain('zabbix_export');
    });
  });

  test('adds edits and deletes template items with Chinese names before yaml preview', async () => {
    render(<App />);

    await userEvent.type(
      screen.getByTestId('walk-sample-input'),
      '1.3.6.1.2.1.2.2.1.10.1 ifInOctets 42 counter'
    );
    await userEvent.click(screen.getByTestId('import-walk-sample'));
    await userEvent.click(screen.getByTestId('run-oid-classify'));

    await userEvent.click(await screen.findByTestId('add-template-item'));
    await userEvent.clear(screen.getByTestId('template-item-name-input'));
    await userEvent.type(screen.getByTestId('template-item-name-input'), '中文CPU负载');
    await userEvent.clear(screen.getByTestId('template-item-oid-input'));
    await userEvent.type(screen.getByTestId('template-item-oid-input'), '1.3.6.1.4.1.4242.9');
    await userEvent.clear(screen.getByTestId('template-item-group-input'));
    await userEvent.type(screen.getByTestId('template-item-group-input'), '系统资源');
    await userEvent.selectOptions(screen.getByTestId('template-item-value-type-select'), 'gauge');
    await userEvent.click(screen.getByTestId('save-template-item'));

    expect(screen.getByTestId('oid-classify-result').textContent).toContain('系统资源');
    expect(screen.getByTestId('oid-classify-result').textContent).toContain('中文CPU负载');

    await userEvent.click(screen.getByTestId('edit-template-item-中文CPU负载'));
    expect(screen.getByTestId('template-item-editor').textContent).toContain('原始名称');
    expect(screen.getByTestId('template-item-editor').textContent).toContain('中文翻译');
    await userEvent.clear(screen.getByTestId('template-item-translation-input'));
    await userEvent.type(screen.getByTestId('template-item-translation-input'), '中文CPU使用率');
    await userEvent.click(screen.getByTestId('save-template-item'));

    expect(screen.getByTestId('oid-classify-result').textContent).toContain('中文CPU使用率');
    expect(screen.getByTestId('oid-classify-result').textContent).toContain('原始名：中文CPU负载');

    await userEvent.click(screen.getByTestId('delete-template-item-ifInOctets'));
    expect(screen.getByTestId('oid-classify-result').textContent).not.toContain('ifInOctets');

    await userEvent.click(screen.getByTestId('run-template-preview'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/template/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName: 'Template Zabtem Simulated SNMP',
          items: [
            { oid: '1.3.6.1.2.1.1.1.0', name: 'sysDescr', group: 'system', zabbixType: 'SNMP_AGENT', valueType: 'text' },
            { oid: '1.3.6.1.2.1.25.2.3.1.6.1', name: 'hrStorageUsed', group: 'storage', zabbixType: 'SNMP_AGENT', valueType: 'gauge' },
            {
              oid: '1.3.6.1.4.1.4242.9',
              name: '中文CPU使用率',
              group: '系统资源',
              zabbixType: 'SNMP_AGENT',
              valueType: 'gauge'
            }
          ]
        })
      });
    });
  });

  test('translates mib scanned item names to Chinese while keeping original mib names visible', async () => {
    render(<App />);

    const file = new File(
      ['ACME-SWITCH-MIB DEFINITIONS ::= BEGIN\nacmeCpuLoad OBJECT-TYPE\n    ::= { enterprises 4242 1 }\nEND'],
      'ACME-SWITCH-MIB.mib',
      { type: 'text/plain' }
    );

    await userEvent.upload(screen.getByTestId('mib-file-input'), file);
    await userEvent.click(screen.getByTestId('run-mib-scan'));

    await userEvent.click(await screen.findByTestId('edit-template-item-acmeCpuLoad'));
    expect(screen.getByTestId('template-original-name').textContent).toContain('acmeCpuLoad');
    await userEvent.clear(screen.getByTestId('template-item-translation-input'));
    await userEvent.type(screen.getByTestId('template-item-translation-input'), 'CPU 负载');
    await userEvent.click(screen.getByTestId('save-template-item'));

    expect(screen.getByTestId('oid-classify-result').textContent).toContain('acmeCpuLoad');
    expect(screen.getByTestId('oid-classify-result').textContent).toContain('CPU 负载');

    await userEvent.click(screen.getByTestId('run-template-preview'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/template/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName: 'Template Zabtem Simulated SNMP',
          items: [
            {
              oid: 'enterprises.4242.1',
              name: 'CPU 负载',
              group: 'ACME-SWITCH-MIB',
              zabbixType: 'SNMP_AGENT',
              valueType: 'gauge'
            },
            {
              oid: 'enterprises.4242.2',
              name: 'acmeFanState',
              group: 'ACME-SWITCH-MIB',
              zabbixType: 'SNMP_AGENT',
              valueType: 'gauge'
            }
          ]
        })
      });
    });
  });

  test('deletes individual run history entries and clears saved history', async () => {
    window.localStorage.setItem(
      'zabtem.runHistory',
      JSON.stringify([
        {
          id: 'history-1',
          templateName: 'Template Zabtem Simulated SNMP',
          target: '192.168.1.10',
          createdAt: '2026-06-17T01:00:00.000Z',
          itemCount: 4
        },
        {
          id: 'history-2',
          templateName: 'Template Zabtem Storage',
          target: '192.168.1.11',
          createdAt: '2026-06-17T02:00:00.000Z',
          itemCount: 2
        }
      ])
    );

    render(<App />);

    expect(screen.getByTestId('run-history').textContent).toContain('Template Zabtem Simulated SNMP');
    expect(screen.getByTestId('run-history').textContent).toContain('Template Zabtem Storage');

    await userEvent.click(screen.getByTestId('delete-history-history-1'));

    expect(screen.getByTestId('run-history').textContent).not.toContain('Template Zabtem Simulated SNMP');
    expect(window.localStorage.getItem('zabtem.runHistory')).not.toContain('history-1');

    await userEvent.click(screen.getByTestId('clear-run-history'));

    expect(screen.getByTestId('run-history').textContent).toContain('暂无运行历史');
    expect(window.localStorage.getItem('zabtem.runHistory')).toBe('[]');
  });
});
