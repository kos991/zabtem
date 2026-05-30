import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { parseWalkText, type WalkEntry } from './walk-parser';

export interface GenerateTemplateOptions {
  snmpwalkDir: string;
  mibPath: string;
}

interface TemplateItem {
  name: string;
  type: 'SNMP_AGENT';
  snmp_oid: string;
  key: string;
  value_type: 'TEXT' | 'UNSIGNED';
}

const itemDefinitions: Record<string, Omit<TemplateItem, 'snmp_oid'>> = {
  '1.3.6.1.2.1.1.1': {
    name: 'System description',
    type: 'SNMP_AGENT',
    key: 'snmp.system.description',
    value_type: 'TEXT'
  },
  '1.3.6.1.2.1.1.5': {
    name: 'System name',
    type: 'SNMP_AGENT',
    key: 'snmp.system.name',
    value_type: 'TEXT'
  },
  '1.3.6.1.2.1.2.2.1.8': {
    name: 'Interface oper status',
    type: 'SNMP_AGENT',
    key: 'snmp.interface.oper_status',
    value_type: 'UNSIGNED'
  },
  '1.3.6.1.2.1.2.2.1.13': {
    name: 'Interface inbound discards',
    type: 'SNMP_AGENT',
    key: 'snmp.interface.in_discards',
    value_type: 'UNSIGNED'
  },
  '1.3.6.1.2.1.2.2.1.14': {
    name: 'Interface inbound errors',
    type: 'SNMP_AGENT',
    key: 'snmp.interface.in_errors',
    value_type: 'UNSIGNED'
  },
  '1.3.6.1.2.1.2.2.1.19': {
    name: 'Interface outbound discards',
    type: 'SNMP_AGENT',
    key: 'snmp.interface.out_discards',
    value_type: 'UNSIGNED'
  },
  '1.3.6.1.2.1.2.2.1.20': {
    name: 'Interface outbound errors',
    type: 'SNMP_AGENT',
    key: 'snmp.interface.out_errors',
    value_type: 'UNSIGNED'
  }
};

export function generateTemplateYamlFromFixtures(options: GenerateTemplateOptions): string {
  assertSelfMadeMibReadable(options.mibPath);

  const entries = readdirSync(options.snmpwalkDir)
    .filter((fileName) => fileName.endsWith('.walk'))
    .flatMap((fileName) => parseWalkText(readFileSync(join(options.snmpwalkDir, fileName), 'utf8')).entries);

  const items = buildItems(entries);
  return stringify(
    {
      zabbix_export: {
        version: '7.0',
        template_groups: [{ name: 'Templates/Network devices' }],
        templates: [
          {
            template: 'Template SNMP Fixture Switch Physical CN',
            name: 'Template SNMP Fixture Switch Physical CN',
            groups: [{ name: 'Templates/Network devices' }],
            items
          }
        ]
      }
    },
    { defaultKeyType: 'PLAIN', defaultStringType: 'QUOTE_SINGLE' }
  );
}

function buildItems(entries: WalkEntry[]): TemplateItem[] {
  const byKey = new Map<string, TemplateItem>();

  for (const entry of entries) {
    const definition = itemDefinitions[entry.baseOid];
    if (!definition) {
      continue;
    }

    const isScalar = entry.index === '0';
    const key = isScalar ? definition.key : `${definition.key}.${entry.index}`;
    if (byKey.has(key)) {
      continue;
    }

    byKey.set(key, {
      ...definition,
      name: isScalar ? definition.name : `${definition.name} ${entry.index}`,
      snmp_oid: entry.oid,
      key
    });
  }

  return Array.from(byKey.values()).sort((left, right) => left.key.localeCompare(right.key));
}

function assertSelfMadeMibReadable(path: string): void {
  const mib = readFileSync(path, 'utf8');
  if (!mib.includes('TEST-SWITCH-MINIMAL-MIB')) {
    throw new Error(`Fixture MIB is not the expected self-made test MIB: ${path}`);
  }
}
