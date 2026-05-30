import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateTemplateYamlFromFixtures } from '../src/template-generator';
import { validateTemplateYaml } from '../src/template-validator';

const repoRoot = join(__dirname, '..', '..', '..');

describe('template generation from fixtures', () => {
  it('generates offline-valid Zabbix YAML from sample walks and self-made MIB', () => {
    const yaml = generateTemplateYamlFromFixtures({
      snmpwalkDir: join(repoRoot, 'fixtures', 'snmpwalk'),
      mibPath: join(repoRoot, 'fixtures', 'mib', 'test-switch-minimal.mib')
    });

    const validation = validateTemplateYaml(yaml);

    expect(validation.valid).toBe(true);
    expect(yaml).toContain("version: '7.0'");
    expect(yaml).toContain('Template SNMP Fixture Switch Physical CN');
    expect(yaml).toContain('snmp.interface.oper_status.1');
    expect(yaml).toContain('snmp.interface.in_errors.1');
  });

  it('keeps the expected sample template offline-valid', () => {
    const yaml = readFileSync(join(repoRoot, 'fixtures', 'expected', 'sample-template.yaml'), 'utf8');

    expect(validateTemplateYaml(yaml)).toEqual({ valid: true, errors: [] });
  });
});
