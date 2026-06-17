import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Layout,
  Space,
  Tag
} from 'tdesign-react';
import {
  CloudDownloadIcon,
  FileExportIcon,
  LinkIcon,
  ServerIcon,
  TerminalIcon
} from 'tdesign-icons-react';
import {
  classifyWalkItems,
  getHealth,
  previewTemplate,
  scanMibFile,
  testSnmpProfile,
  walkSnmpProfile,
  type ClassifyPayload,
  type HealthPayload,
  type MibScanPayload,
  type SnmpProfileRequest,
  type SnmpTestPayload,
  type SnmpWalkPayload,
  type TemplatePreviewPayload
} from './api';

type HealthState =
  | { status: 'checking'; service: string; message: string }
  | { status: 'online'; service: string; message: string }
  | { status: 'offline'; service: string; message: string };

type SnmpTestState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'success'; payload: SnmpTestPayload }
  | { status: 'error'; message: string };

type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'success'; payload: T }
  | { status: 'error'; message: string };

type RunHistoryItem = {
  id: string;
  templateName: string;
  target: string;
  createdAt: string;
  itemCount: number;
};

const { Header, Content } = Layout;

const simulatedProfile = {
  target: 'zabtem-sim-core-01',
  version: 'v2c',
  community: 'public',
  securityName: '',
  authProtocol: 'SHA',
  authPassword: '',
  privProtocol: 'AES',
  privPassword: ''
};

export function App() {
  const [health, setHealth] = useState<HealthState>({
    status: 'checking',
    service: 'zabtem-server',
    message: '正在检查 API'
  });
  const [snmpTest, setSnmpTest] = useState<SnmpTestState>({ status: 'idle' });
  const [walk, setWalk] = useState<AsyncState<SnmpWalkPayload>>({ status: 'idle' });
  const [classification, setClassification] = useState<AsyncState<ClassifyPayload>>({ status: 'idle' });
  const [templatePreview, setTemplatePreview] = useState<AsyncState<TemplatePreviewPayload>>({ status: 'idle' });
  const [mibScan, setMibScan] = useState<AsyncState<MibScanPayload>>({ status: 'idle' });
  const [selectedTemplateItemOids, setSelectedTemplateItemOids] = useState<string[]>([]);
  const [selectedMibFile, setSelectedMibFile] = useState<File | null>(null);
  const [profile, setProfile] = useState({
    target: '192.168.1.10',
    version: 'v2c',
    community: 'public',
    securityName: '',
    authProtocol: 'SHA',
    authPassword: '',
    privProtocol: 'AES',
    privPassword: ''
  });
  const [walkSampleText, setWalkSampleText] = useState('');
  const [runHistory, setRunHistory] = useState<RunHistoryItem[]>(() => {
    const saved = window.localStorage.getItem('zabtem.runHistory');
    return saved ? (JSON.parse(saved) as RunHistoryItem[]) : [];
  });

  useEffect(() => {
    let alive = true;

    async function checkHealth() {
      try {
        const payload: HealthPayload = await getHealth();
        if (!alive) return;

        setHealth({
          status: payload.status === 'ok' ? 'online' : 'offline',
          service: payload.service ?? 'zabtem-server',
          message: payload.status === 'ok' ? 'API 在线' : 'API 状态异常'
        });
      } catch (error) {
        if (!alive) return;
        setHealth({
          status: 'offline',
          service: 'zabtem-server',
          message: error instanceof Error ? error.message : 'API 不可用'
        });
      }
    }

    void checkHealth();

    return () => {
      alive = false;
    };
  }, []);

  async function runSnmpTest() {
    setSnmpTest({ status: 'running' });
    setWalk({ status: 'idle' });
    setClassification({ status: 'idle' });
    setTemplatePreview({ status: 'idle' });
    setSelectedTemplateItemOids([]);

    try {
      const currentProfile = buildSnmpProfileRequest();
      const payload = await testSnmpProfile(currentProfile);
      setSnmpTest({ status: 'success', payload });
    } catch (error) {
      setSnmpTest({
        status: 'error',
        message: error instanceof Error ? error.message : 'SNMP 连接测试失败'
      });
    }
  }

  async function runSnmpWalk() {
    setWalk({ status: 'running' });
    setClassification({ status: 'idle' });
    setTemplatePreview({ status: 'idle' });
    setSelectedTemplateItemOids([]);

    try {
      const currentProfile = buildSnmpProfileRequest();
      const payload = await walkSnmpProfile(currentProfile);
      setWalk({ status: 'success', payload });
    } catch (error) {
      setWalk({
        status: 'error',
        message: error instanceof Error ? error.message : 'SNMP walk 失败'
      });
    }
  }

  function importWalkSample() {
    const items = walkSampleText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [oid, name, value, valueType = 'text'] = line.split(/\s+/);
        return { oid, name, value, valueType };
      })
      .filter((item) => item.oid && item.name && item.value);

    if (items.length === 0) return;

    setWalk({
      status: 'success',
      payload: {
        target: profile.target,
        version: profile.version,
        items
      }
    });
    setClassification({ status: 'idle' });
    setTemplatePreview({ status: 'idle' });
    setSelectedTemplateItemOids([]);
  }

  function buildSnmpProfileRequest(): SnmpProfileRequest {
    const baseProfile = {
      target: profile.target.trim(),
      version: profile.version
    };

    if (profile.version === 'v3') {
      return {
        ...baseProfile,
        securityName: profile.securityName.trim(),
        authProtocol: profile.authProtocol,
        authPassword: profile.authPassword,
        privProtocol: profile.privProtocol,
        privPassword: profile.privPassword
      };
    }

    return {
      ...baseProfile,
      community: profile.community.trim()
    };
  }

  function useSimulatedDevice() {
    setProfile(simulatedProfile);
    setSnmpTest({ status: 'idle' });
    setWalk({ status: 'idle' });
    setClassification({ status: 'idle' });
    setTemplatePreview({ status: 'idle' });
    setSelectedTemplateItemOids([]);
  }

  async function runOidClassify() {
    if (walk.status !== 'success') return;

    setClassification({ status: 'running' });
    setTemplatePreview({ status: 'idle' });
    setSelectedTemplateItemOids([]);

    try {
      const payload = await classifyWalkItems(walk.payload.items);
      setClassification({ status: 'success', payload });
      setSelectedTemplateItemOids(payload.items.map((item) => item.oid));
    } catch (error) {
      setClassification({
        status: 'error',
        message: error instanceof Error ? error.message : 'OID 归类失败'
      });
    }
  }

  function toggleTemplateItem(oid: string) {
    setSelectedTemplateItemOids((current) =>
      current.includes(oid)
        ? current.filter((itemOid) => itemOid !== oid)
        : [...current, oid]
    );
    setTemplatePreview({ status: 'idle' });
  }

  async function runMibScan() {
    if (!selectedMibFile) return;

    setMibScan({ status: 'running' });
    setTemplatePreview({ status: 'idle' });

    try {
      const content = await selectedMibFile.text();
      const payload = await scanMibFile(selectedMibFile.name, content);
      setMibScan({ status: 'success', payload });

      const items = payload.entries.map((entry) => ({
        oid: entry.oid,
        name: entry.name,
        group: payload.moduleName,
        zabbixType: 'SNMP_AGENT',
        valueType: mibSyntaxToValueType(entry.syntax)
      }));

      setClassification({ status: 'success', payload: { items } });
      setSelectedTemplateItemOids(items.map((item) => item.oid));
    } catch (error) {
      setMibScan({
        status: 'error',
        message: error instanceof Error ? error.message : 'MIB 扫描失败'
      });
    }
  }

  function mibSyntaxToValueType(syntax: string) {
    const normalized = syntax.toLowerCase();
    if (normalized.includes('counter')) return 'counter';
    if (normalized.includes('integer') || normalized.includes('gauge')) return 'gauge';
    return 'text';
  }

  async function runTemplatePreview() {
    if (classification.status !== 'success') return;

    const classifiedItems = classification.payload.items.filter((item) =>
      selectedTemplateItemOids.includes(item.oid)
    );

    if (classifiedItems.length === 0) return;

    setTemplatePreview({ status: 'running' });

    try {
      const payload = await previewTemplate(classifiedItems);
      setTemplatePreview({ status: 'success', payload });
      const entry: RunHistoryItem = {
        id: `${Date.now()}`,
        templateName: 'Template Zabtem Simulated SNMP',
        target: profile.target,
        createdAt: new Date().toISOString(),
        itemCount: classifiedItems.length
      };

      setRunHistory((current) => {
        const next = [entry, ...current].slice(0, 8);
        window.localStorage.setItem('zabtem.runHistory', JSON.stringify(next));
        return next;
      });
    } catch (error) {
      setTemplatePreview({
        status: 'error',
        message: error instanceof Error ? error.message : '模板预览失败'
      });
    }
  }

  async function copyTemplateYaml() {
    if (templatePreview.status !== 'success') return;

    await navigator.clipboard.writeText(templatePreview.payload.yaml);
  }

  function downloadTemplateYaml() {
    if (templatePreview.status !== 'success') return;

    const blob = new Blob([templatePreview.payload.yaml], { type: 'application/x-yaml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'zabtem-template.yaml';
    link.click();
    URL.revokeObjectURL(url);
  }

  const healthTagTheme = health.status === 'online' ? 'success' : health.status === 'checking' ? 'warning' : 'danger';
  const healthLabel = health.status === 'online' ? 'API 在线' : health.status === 'checking' ? '检查中' : 'API 离线';

  return (
    <Layout className="app-shell">
      <Layout>
        <Header className="app-header">
          <div className="brand-inline">
            <div className="brand-mark">Z</div>
            <div>
              <div className="breadcrumb-line">Zabtem / SNMP MIB Template Studio</div>
            <h1 data-testid="workbench-title">Zabbix 模板工作台</h1>
            </div>
          </div>
          <Space size={10} breakLine={false}>
            <Tag data-testid="api-status" theme={healthTagTheme} variant="light">{healthLabel}</Tag>
            <Tag theme="default" variant="light">Tauri</Tag>
            <Tag theme="default" variant="light">Rust API</Tag>
          </Space>
        </Header>

        <Content className="app-content">
          <main className="content-grid">
            <section className="primary-column" data-testid="profile-panel">
              <Card bordered className="operation-card">
                <div className="card-toolbar">
                  <div>
                    <div className="section-kicker">Profile</div>
                    <h2>SNMP 目标</h2>
                  </div>
                  <Tag theme={healthTagTheme} variant="light">{health.message}</Tag>
                </div>

                <div className="operation-grid">
                  <div className="profile-table" aria-label="当前 Profile">
                    <div className="simulation-strip">
                      <div>
                        <strong>模拟设备</strong>
                        <span>无真实设备时用内置核心交换机样本跑完整流程</span>
                      </div>
                      <Button data-testid="use-simulated-device" variant="outline" onClick={useSimulatedDevice}>
                        使用模拟设备
                      </Button>
                    </div>
                    <div className="profile-form">
                      <label>
                        <span>目标地址</span>
                        <input
                          data-testid="profile-target"
                          value={profile.target}
                          onChange={(event) => setProfile((current) => ({ ...current, target: event.target.value }))}
                        />
                      </label>
                      <label>
                        <span>SNMP 版本</span>
                        <select
                          data-testid="profile-version"
                          value={profile.version}
                          onChange={(event) => setProfile((current) => ({ ...current, version: event.target.value }))}
                        >
                          <option value="v2c">v2c</option>
                          <option value="v1">v1</option>
                          <option value="v3">v3</option>
                        </select>
                      </label>
                      {profile.version === 'v3' ? (
                        <div className="snmpv3-fields">
                          <label>
                            <span>安全用户名</span>
                            <input
                              data-testid="profile-username"
                              value={profile.securityName}
                              onChange={(event) => setProfile((current) => ({ ...current, securityName: event.target.value }))}
                            />
                          </label>
                          <label>
                            <span>认证协议</span>
                            <select
                              data-testid="profile-auth-protocol"
                              value={profile.authProtocol}
                              onChange={(event) => setProfile((current) => ({ ...current, authProtocol: event.target.value }))}
                            >
                              <option value="SHA">SHA</option>
                              <option value="MD5">MD5</option>
                              <option value="none">无</option>
                            </select>
                          </label>
                          <label>
                            <span>认证密码</span>
                            <input
                              data-testid="profile-auth-password"
                              type="password"
                              value={profile.authPassword}
                              onChange={(event) => setProfile((current) => ({ ...current, authPassword: event.target.value }))}
                            />
                          </label>
                          <label>
                            <span>加密协议</span>
                            <select
                              data-testid="profile-priv-protocol"
                              value={profile.privProtocol}
                              onChange={(event) => setProfile((current) => ({ ...current, privProtocol: event.target.value }))}
                            >
                              <option value="AES">AES</option>
                              <option value="DES">DES</option>
                              <option value="none">无</option>
                            </select>
                          </label>
                          <label>
                            <span>加密密码</span>
                            <input
                              data-testid="profile-priv-password"
                              type="password"
                              value={profile.privPassword}
                              onChange={(event) => setProfile((current) => ({ ...current, privPassword: event.target.value }))}
                            />
                          </label>
                        </div>
                      ) : (
                        <label>
                          <span>Community</span>
                          <input
                            data-testid="profile-community"
                            value={profile.community}
                            onChange={(event) => setProfile((current) => ({ ...current, community: event.target.value }))}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="run-panel" data-testid="collector-panel">
                    <div className="run-panel-icon"><ServerIcon /></div>
                    <div>
                      <h3>采集与模板生成</h3>
                    </div>
                    <Space size={10}>
                      <Button
                        data-testid="run-snmp-test"
                        theme="primary"
                        icon={<CloudDownloadIcon />}
                        loading={snmpTest.status === 'running'}
                        disabled={snmpTest.status === 'running'}
                        onClick={() => void runSnmpTest()}
                      >
                        {snmpTest.status === 'running' ? '测试中' : '开始连接测试'}
                      </Button>
                    </Space>
                    <textarea
                      className="walk-sample-input"
                      data-testid="walk-sample-input"
                      value={walkSampleText}
                      onChange={(event) => setWalkSampleText(event.target.value)}
                    />
                    <div className="sample-actions">
                      <Button data-testid="import-walk-sample" variant="outline" onClick={importWalkSample}>
                        导入 walk 样本
                      </Button>
                    </div>
                    {snmpTest.status === 'success' ? (
                      <div className="snmp-result snmp-result-success" data-testid="snmp-test-result">
                        <div>
                          <span>连接结果</span>
                          <strong>{snmpTest.payload.target} / {snmpTest.payload.version}</strong>
                        </div>
                        <div>
                          <span>模拟延迟</span>
                          <strong>{snmpTest.payload.latencyMs} ms</strong>
                        </div>
                        <Tag theme={snmpTest.payload.reachable ? 'success' : 'danger'} variant="light">
                          {snmpTest.payload.message}
                        </Tag>
                      </div>
                    ) : null}
                    <div className="pipeline-actions">
                      <Button
                        data-testid="run-snmp-walk"
                        variant="outline"
                        disabled={snmpTest.status !== 'success' || walk.status === 'running'}
                        loading={walk.status === 'running'}
                        onClick={() => void runSnmpWalk()}
                      >
                        采集 walk
                      </Button>
                      <Button
                        data-testid="run-oid-classify"
                        variant="outline"
                        disabled={walk.status !== 'success' || classification.status === 'running'}
                        loading={classification.status === 'running'}
                        onClick={() => void runOidClassify()}
                      >
                        OID 归类
                      </Button>
                      <Button
                        data-testid="run-template-preview"
                        theme="primary"
                        disabled={
                          classification.status !== 'success' ||
                          selectedTemplateItemOids.length === 0 ||
                          templatePreview.status === 'running'
                        }
                        loading={templatePreview.status === 'running'}
                        onClick={() => void runTemplatePreview()}
                      >
                        预览 YAML
                      </Button>
                    </div>
                    {walk.status === 'success' ? (
                      <div className="pipeline-result" data-testid="snmp-walk-result">
                        <strong>{walk.payload.items.length} OIDs</strong>
                        <span>
                          {walk.payload.deviceName ?? walk.payload.target} / {walk.payload.version}
                        </span>
                      </div>
                    ) : null}
                    {walk.status === 'error' ? (
                      <Alert className="pipeline-result" theme="error" title="SNMP walk 失败" message={walk.message} />
                    ) : null}
                    {classification.status === 'success' ? (
                      <div className="template-item-list" data-testid="oid-classify-result">
                        {classification.payload.items.map((item) => (
                          <label className="template-item-row" key={item.oid}>
                            <input
                              data-testid={`template-item-${item.name}`}
                              type="checkbox"
                              checked={selectedTemplateItemOids.includes(item.oid)}
                              onChange={() => toggleTemplateItem(item.oid)}
                            />
                            <span>{item.group}: {item.name}</span>
                            <code>{item.oid}</code>
                          </label>
                        ))}
                      </div>
                    ) : null}
                    {classification.status === 'error' ? (
                      <Alert
                        className="pipeline-result"
                        theme="error"
                        title="OID 归类失败"
                        message={classification.message}
                      />
                    ) : null}
                    {templatePreview.status === 'success' ? (
                      <>
                        <div className="template-toolbar">
                          <Button
                            data-testid="copy-template-yaml"
                            variant="outline"
                            onClick={() => void copyTemplateYaml()}
                          >
                            复制 YAML
                          </Button>
                          <Button data-testid="download-template-yaml" variant="outline" onClick={downloadTemplateYaml}>
                            下载 YAML
                          </Button>
                        </div>
                        <pre className="template-preview" data-testid="template-preview">
                          {templatePreview.payload.yaml}
                        </pre>
                      </>
                    ) : null}
                    {templatePreview.status === 'error' ? (
                      <Alert
                        className="pipeline-result"
                        theme="error"
                        title="模板预览失败"
                        message={templatePreview.message}
                      />
                    ) : null}
                    {snmpTest.status === 'error' ? (
                      <Alert
                        className="snmp-result"
                        data-testid="snmp-test-result"
                        theme="error"
                        title="SNMP 连接测试失败"
                        message={snmpTest.message}
                      />
                    ) : null}
                    <div className="run-history" data-testid="run-history">
                      {runHistory.map((item) => (
                        <div className="history-row" key={item.id}>
                          <strong>{item.templateName}</strong>
                          <span>{item.target} / {item.itemCount} items</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            <section className="mib-column" data-testid="mib-panel">
              <Card bordered className="operation-card">
                <div className="card-toolbar">
                  <div>
                    <div className="section-kicker">MIB</div>
                    <h2>文件上传扫描</h2>
                  </div>
                  <Tag theme={mibScan.status === 'success' ? 'success' : 'default'} variant="light">
                    {mibScan.status === 'success' ? `${mibScan.payload.entries.length} OIDs` : 'MIB'}
                  </Tag>
                </div>

                <div className="mib-upload-panel">
                  <input
                    data-testid="mib-file-input"
                    type="file"
                    accept=".mib,.my,.txt"
                    onChange={(event) => setSelectedMibFile(event.target.files?.[0] ?? null)}
                  />
                  <Button
                    data-testid="run-mib-scan"
                    theme="primary"
                    disabled={!selectedMibFile || mibScan.status === 'running'}
                    loading={mibScan.status === 'running'}
                    onClick={() => void runMibScan()}
                  >
                    扫描 MIB
                  </Button>
                </div>

                {mibScan.status === 'success' ? (
                  <div className="mib-result" data-testid="mib-scan-result">
                    <div className="mib-result-header">
                      <strong>{mibScan.payload.moduleName}</strong>
                      <span>{mibScan.payload.fileName}</span>
                    </div>
                    <div className="mib-entry-list">
                      {mibScan.payload.entries.map((entry) => (
                        <div className="mib-entry-row" key={`${entry.name}-${entry.oid}`}>
                          <strong>{entry.name}</strong>
                          <code>{entry.oid}</code>
                          <span>{entry.syntax}</span>
                          <span>{entry.access}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {mibScan.status === 'error' ? (
                  <Alert className="pipeline-result" theme="error" title="MIB 扫描失败" message={mibScan.message} />
                ) : null}
              </Card>
            </section>
          </main>
        </Content>
      </Layout>
    </Layout>
  );
}
