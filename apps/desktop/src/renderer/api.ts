export type HealthPayload = {
  status?: string;
  service?: string;
};

export type SnmpProfileRequest = {
  target: string;
  version: string;
  community?: string;
  securityName?: string;
  authProtocol?: string;
  authPassword?: string;
  privProtocol?: string;
  privPassword?: string;
};

export type SnmpTestPayload = {
  reachable: boolean;
  target: string;
  version: string;
  latencyMs: number;
  message: string;
};

export type SnmpWalkItem = {
  oid: string;
  name: string;
  value: string;
  valueType: string;
};

export type SnmpWalkPayload = {
  target: string;
  version: string;
  deviceName?: string;
  items: SnmpWalkItem[];
};

export type ClassifiedItem = {
  oid: string;
  name: string;
  group: string;
  zabbixType: string;
  valueType: string;
};

export type ClassifyPayload = {
  items: ClassifiedItem[];
};

export type TemplatePreviewPayload = {
  yaml: string;
};

export type MibEntry = {
  name: string;
  oid: string;
  syntax: string;
  access: string;
  description: string;
};

export type MibScanPayload = {
  fileName: string;
  moduleName: string;
  entries: MibEntry[];
};

export async function getHealth(): Promise<HealthPayload> {
  return getJson('/api/health');
}

export async function testSnmpProfile(profile: SnmpProfileRequest): Promise<SnmpTestPayload> {
  return postJson('/api/snmp/test', profile);
}

export async function walkSnmpProfile(profile: SnmpProfileRequest): Promise<SnmpWalkPayload> {
  return postJson('/api/snmp/walk', profile);
}

export async function classifyWalkItems(items: SnmpWalkItem[]): Promise<ClassifyPayload> {
  return postJson('/api/template/classify', { items });
}

export async function scanMibFile(fileName: string, content: string): Promise<MibScanPayload> {
  return postJson('/api/mib/scan', { fileName, content });
}

export async function previewTemplate(items: ClassifiedItem[]): Promise<TemplatePreviewPayload> {
  return postJson('/api/template/preview', {
    templateName: 'Template Zabtem Simulated SNMP',
    items
  });
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}
