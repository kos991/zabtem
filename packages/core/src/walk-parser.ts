export interface WalkEntry {
  oid: string;
  baseOid: string;
  index: string;
  type: string;
  value: string;
  displayValue: string;
}

export interface ParseWalkResult {
  entries: WalkEntry[];
  warnings: string[];
}

const knownSymbolOids: Record<string, string> = {
  'IF-MIB::ifDescr': '1.3.6.1.2.1.2.2.1.2',
  'IF-MIB::ifAdminStatus': '1.3.6.1.2.1.2.2.1.7',
  'IF-MIB::ifOperStatus': '1.3.6.1.2.1.2.2.1.8',
  'IF-MIB::ifInDiscards': '1.3.6.1.2.1.2.2.1.13',
  'IF-MIB::ifInErrors': '1.3.6.1.2.1.2.2.1.14',
  'IF-MIB::ifOutDiscards': '1.3.6.1.2.1.2.2.1.19',
  'IF-MIB::ifOutErrors': '1.3.6.1.2.1.2.2.1.20'
};

export function parseWalkText(text: string): ParseWalkResult {
  const entries: WalkEntry[] = [];
  const warnings: string[] = [];

  text.split(/\r?\n/).forEach((rawLine, lineIndex) => {
    const line = rawLine.trim();
    if (!line) {
      return;
    }

    const parsed = parseWalkLine(line);
    if (!parsed) {
      warnings.push(`Line ${lineIndex + 1} ignored: ${line}`);
      return;
    }

    entries.push(parsed);
  });

  return { entries, warnings };
}

function parseWalkLine(line: string): WalkEntry | null {
  const match = /^(.*?)\s*=\s*([^:]+):\s*(.*)$/.exec(line);
  if (!match) {
    return null;
  }

  const oid = normalizeOid(match[1] ?? '');
  if (!oid) {
    return null;
  }

  const type = (match[2] ?? '').trim();
  const rawValue = (match[3] ?? '').trim();
  const valueMatch = /^(.+?)\((-?\d+)\)$/.exec(rawValue);
  const value = valueMatch ? valueMatch[2] ?? '' : stripQuotes(rawValue);
  const displayValue = valueMatch ? valueMatch[1]?.trim() ?? value : stripQuotes(rawValue);
  const lastDot = oid.lastIndexOf('.');

  return {
    oid,
    baseOid: lastDot > 0 ? oid.slice(0, lastDot) : oid,
    index: lastDot > 0 ? oid.slice(lastDot + 1) : '',
    type,
    value,
    displayValue
  };
}

function normalizeOid(rawOid: string): string | null {
  const oid = rawOid.trim().replace(/^\./, '');
  if (oid.startsWith('iso.')) {
    return `1.${oid.slice('iso.'.length)}`;
  }

  if (/^\d+(?:\.\d+)*$/.test(oid)) {
    return oid;
  }

  const symbolMatch = /^([A-Z0-9-]+::[A-Za-z][\w-]*)(?:\.(.+))?$/.exec(oid);
  if (!symbolMatch) {
    return null;
  }

  const base = knownSymbolOids[symbolMatch[1] ?? ''];
  if (!base) {
    return null;
  }

  const index = symbolMatch[2];
  return index ? `${base}.${index}` : base;
}

function stripQuotes(value: string): string {
  return value.replace(/^"|"$/g, '');
}
