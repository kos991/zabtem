import { describe, expect, it } from 'vitest';
import { validateTemplateYaml } from '../src/template-validator';

describe('validateTemplateYaml', () => {
  it('rejects YAML without a zabbix_export root', () => {
    const result = validateTemplateYaml('not_zabbix: true\n');

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing zabbix_export root object.');
  });
});
