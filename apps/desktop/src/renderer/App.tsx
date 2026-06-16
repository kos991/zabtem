import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Layout,
  Space,
  Tag
} from 'tdesign-react';
import {
  CheckCircleIcon,
  CloudDownloadIcon,
  DashboardIcon,
  FileExportIcon,
  LayersIcon,
  LinkIcon,
  SearchIcon,
  ServerIcon,
  SettingIcon,
  TerminalIcon
} from 'tdesign-icons-react';
import {
  getHealth,
  testSnmpProfile,
  type HealthPayload,
  type SnmpTestPayload
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

const { Header, Content, Aside } = Layout;

const workflowSteps = [
  { id: 'project', title: '项目配置', description: '项目、厂商和模板目标', state: 'ready', icon: <DashboardIcon /> },
  { id: 'snmp-profile', title: 'SNMP Profile', description: '团体字、版本和连接参数', state: 'ready', icon: <SettingIcon /> },
  { id: 'collection', title: '设备采集', description: '连接测试和 walk 采集', state: 'next', icon: <CloudDownloadIcon /> },
  { id: 'mib-mapping', title: 'MIB 映射', description: 'OID 归类和监控项候选', state: 'planned', icon: <SearchIcon /> },
  { id: 'template-export', title: '模板导出', description: 'Zabbix 7.0 YAML 预览', state: 'planned', icon: <FileExportIcon /> }
] as const;

const taskQueue = [
  {
    title: '连接设备',
    description: '使用当前 SNMP Profile 做最小连接测试。',
    status: '下一步',
    icon: <LinkIcon />,
    meta: '目标：192.168.1.10 / v2c'
  },
  {
    title: '采集 walk',
    description: '保存原始 OID 样本，供 MIB 匹配使用。',
    status: '规划中',
    icon: <CloudDownloadIcon />,
    meta: '范围：system、interfaces、hrStorage'
  },
  {
    title: '生成 YAML',
    description: '把审核后的监控项导出为 Zabbix 7.0 模板。',
    status: '规划中',
    icon: <FileExportIcon />,
    meta: '格式：Zabbix 7.0 YAML'
  }
] as const;

const profileRows = [
  ['项目', '核心交换机模板'],
  ['厂商', '通用 SNMP'],
  ['SNMP 版本', 'v2c'],
  ['采集策略', '只读 walk / 低并发']
] as const;

function stateTheme(state: (typeof workflowSteps)[number]['state']) {
  if (state === 'ready') return 'success';
  if (state === 'next') return 'primary';
  return 'default';
}

export function App() {
  const [health, setHealth] = useState<HealthState>({
    status: 'checking',
    service: 'zabtem-server',
    message: '正在检查 API'
  });
  const [snmpTest, setSnmpTest] = useState<SnmpTestState>({ status: 'idle' });

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

    try {
      const payload = await testSnmpProfile({
        target: '192.168.1.10',
        version: 'v2c',
        community: 'public'
      });
      setSnmpTest({ status: 'success', payload });
    } catch (error) {
      setSnmpTest({
        status: 'error',
        message: error instanceof Error ? error.message : 'SNMP 连接测试失败'
      });
    }
  }

  const completedSteps = useMemo(() => {
    const ready = workflowSteps.filter((step) => step.state === 'ready').length;
    return `${ready}/${workflowSteps.length}`;
  }, []);

  const healthTagTheme = health.status === 'online' ? 'success' : health.status === 'checking' ? 'warning' : 'danger';
  const healthLabel = health.status === 'online' ? 'API 在线' : health.status === 'checking' ? '检查中' : 'API 离线';

  return (
    <Layout className="app-shell">
      <Aside className="app-sider" width="264px">
        <div className="brand-block">
          <div className="brand-mark">Z</div>
          <div>
            <div className="brand-name">Zabtem</div>
            <div className="brand-subtitle">Zabbix Template Studio</div>
          </div>
        </div>

        <div className="workflow-list" aria-label="模板生成流程">
          {workflowSteps.map((step, index) => (
            <div
              className={`workflow-item workflow-item-${step.state}`}
              data-testid={`workflow-${step.id}`}
              key={step.title}
            >
              <div className="workflow-index">{index + 1}</div>
              <div className="workflow-icon">{step.icon}</div>
              <div className="workflow-copy">
                <div className="workflow-title">{step.title}</div>
                <div className="workflow-description">{step.description}</div>
              </div>
              <Tag size="small" theme={stateTheme(step.state)} variant="light">
                {step.state === 'ready' ? '就绪' : step.state === 'next' ? '下一步' : '规划'}
              </Tag>
            </div>
          ))}
        </div>
      </Aside>

      <Layout>
        <Header className="app-header">
          <div>
            <div className="breadcrumb-line">工作台 / 模板生成</div>
            <h1 data-testid="workbench-title">Zabbix 模板工作台</h1>
          </div>
          <Space size={10} breakLine={false}>
            <Tag data-testid="api-status" theme={healthTagTheme} variant="light">{healthLabel}</Tag>
            <Tag theme="default" variant="light">Tauri</Tag>
            <Tag theme="default" variant="light">Rust API</Tag>
          </Space>
        </Header>

        <Content className="app-content">
          <main className="content-grid">
            <section className="primary-column">
              <section className="status-strip" aria-label="运行状态">
                <div className="status-cell">
                  <span>API 服务</span>
                  <strong>{health.service}</strong>
                  <Tag theme={healthTagTheme} variant="light">{health.message}</Tag>
                </div>
                <div className="status-cell">
                  <span>后端入口</span>
                  <strong>/api/health</strong>
                  <Tag theme="success" variant="light">已验证</Tag>
                </div>
                <div className="status-cell">
                  <span>流程进度</span>
                  <strong>{completedSteps}</strong>
                  <Tag theme="primary" variant="light">设备采集待接入</Tag>
                </div>
              </section>

              <Card bordered className="operation-card">
                <div className="card-toolbar">
                  <div>
                    <div className="section-kicker">当前任务</div>
                    <h2>SNMP 连接测试</h2>
                  </div>
                  <Tag theme="primary" variant="light">下一步</Tag>
                </div>

                <div className="operation-grid">
                  <div className="profile-table" aria-label="当前 Profile">
                    {profileRows.map(([label, value]) => (
                      <div className="profile-row" key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="run-panel">
                    <div className="run-panel-icon"><ServerIcon /></div>
                    <div>
                      <h3>等待采集服务接入</h3>
                      <p>当前界面已经固定项目、Profile、采集和导出的操作位置；后端 SNMP 能力接入后，这里执行真实连接测试。</p>
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
                      <Button variant="outline" icon={<TerminalIcon />}>查看运行日志</Button>
                    </Space>
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
                    {snmpTest.status === 'error' ? (
                      <Alert
                        className="snmp-result"
                        data-testid="snmp-test-result"
                        theme="error"
                        title="SNMP 连接测试失败"
                        message={snmpTest.message}
                      />
                    ) : null}
                  </div>
                </div>
              </Card>

              <Card bordered className="queue-card">
                <div className="card-toolbar">
                  <div>
                    <div className="section-kicker">任务队列</div>
                    <h2>建议的实现顺序</h2>
                  </div>
                </div>

                <div className="task-list">
                  {taskQueue.map((action, index) => (
                    <div className="task-row" key={action.title}>
                      <div className="task-index">{index + 1}</div>
                      <div className="task-icon">{action.icon}</div>
                      <div className="task-copy">
                        <h3>{action.title}</h3>
                        <p>{action.description}</p>
                        <span>{action.meta}</span>
                      </div>
                      <Tag theme={action.status === '下一步' ? 'primary' : 'default'} variant="light">
                        {action.status}
                      </Tag>
                    </div>
                  ))}
                </div>
              </Card>
            </section>

            <aside className="side-column">
              <Card bordered title="运行环境" className="side-card">
                <div className="env-row">
                  <span>前端</span>
                  <strong>Vite + React</strong>
                </div>
                <div className="env-row">
                  <span>API</span>
                  <strong>Axum / Rust</strong>
                </div>
                <div className="env-row">
                  <span>桌面</span>
                  <strong>Tauri 2</strong>
                </div>
                <div className="env-row">
                  <span>代理</span>
                  <strong>/api -&gt; 127.0.0.1:18080</strong>
                </div>
              </Card>

              <Card bordered title="里程碑" className="side-card">
                <div className="timeline-item done">
                  <CheckCircleIcon />
                  <span>Rust/Tauri baseline</span>
                </div>
                <div className="timeline-item active">
                  <ServerIcon />
                  <span>SNMP 连接测试</span>
                </div>
                <div className="timeline-item">
                  <LayersIcon />
                  <span>MIB/OID 归类</span>
                </div>
                <div className="timeline-item">
                  <FileExportIcon />
                  <span>模板预览与导出</span>
                </div>
              </Card>

              <Alert
                theme="info"
                title="当前范围"
                message="界面展示真实健康状态；业务按钮先作为流程入口展示，等后端采集能力接入后再启用。"
              />
            </aside>
          </main>
        </Content>
      </Layout>
    </Layout>
  );
}
