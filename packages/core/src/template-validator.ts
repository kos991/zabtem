import { parse } from 'yaml';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateTemplateYaml(yamlText: string): ValidationResult {
  const errors: string[] = [];
  let document: unknown;

  try {
    document = parse(yamlText);
  } catch (error) {
    return { valid: false, errors: [`YAML parse failed: ${String(error)}`] };
  }

  if (!isRecord(document) || !isRecord(document.zabbix_export)) {
    return { valid: false, errors: ['Missing zabbix_export root object.'] };
  }

  const exportRoot = document.zabbix_export;
  if (exportRoot.version !== '7.0') {
    errors.push('zabbix_export.version must be 7.0.');
  }

  if (!Array.isArray(exportRoot.template_groups) || exportRoot.template_groups.length === 0) {
    errors.push('At least one template group is required.');
  }

  if (!Array.isArray(exportRoot.templates) || exportRoot.templates.length === 0) {
    errors.push('At least one template is required.');
  } else {
    for (const template of exportRoot.templates) {
      validateTemplate(template, errors);
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateTemplate(template: unknown, errors: string[]): void {
  if (!isRecord(template)) {
    errors.push('Template entries must be objects.');
    return;
  }

  if (typeof template.template !== 'string' || template.template.length === 0) {
    errors.push('Template must have a template identifier.');
  }

  if (!Array.isArray(template.groups) || template.groups.length === 0) {
    errors.push(`Template ${String(template.template)} must reference at least one group.`);
  }

  if (!Array.isArray(template.items) || template.items.length === 0) {
    errors.push(`Template ${String(template.template)} must contain at least one item.`);
    return;
  }

  const keys = new Set<string>();
  for (const item of template.items) {
    if (!isRecord(item)) {
      errors.push('Item entries must be objects.');
      continue;
    }

    if (typeof item.key !== 'string' || item.key.length === 0) {
      errors.push('Every item must have a key.');
    } else if (keys.has(item.key)) {
      errors.push(`Duplicate item key: ${item.key}`);
    } else {
      keys.add(item.key);
    }

    if (item.type !== 'SNMP_AGENT') {
      errors.push(`Item ${String(item.key)} must use SNMP_AGENT type.`);
    }

    if (typeof item.snmp_oid !== 'string' || !/^\d+(?:\.\d+)*$/.test(item.snmp_oid)) {
      errors.push(`Item ${String(item.key)} must have a numeric snmp_oid.`);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
