import { describe, expect, it } from 'vitest';
import { parseWalkText } from '../src/walk-parser';

describe('parseWalkText', () => {
  it('parses numeric OID and enum display values', () => {
    const result = parseWalkText('1.3.6.1.2.1.2.2.1.8.1 = INTEGER: up(1)');

    expect(result.entries).toEqual([
      {
        oid: '1.3.6.1.2.1.2.2.1.8.1',
        baseOid: '1.3.6.1.2.1.2.2.1.8',
        index: '1',
        type: 'INTEGER',
        value: '1',
        displayValue: 'up'
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('parses iso-prefixed and known IF-MIB symbolic lines', () => {
    const text = [
      'iso.3.6.1.2.1.1.5.0 = STRING: huawei-fixture',
      'IF-MIB::ifOperStatus.1 = INTEGER: down(2)'
    ].join('\n');

    const result = parseWalkText(text);

    expect(result.entries.map((entry) => entry.oid)).toEqual([
      '1.3.6.1.2.1.1.5.0',
      '1.3.6.1.2.1.2.2.1.8.1'
    ]);
    expect(result.entries[1]?.displayValue).toBe('down');
    expect(result.entries[1]?.value).toBe('2');
  });

  it('keeps parsing after invalid lines and records warnings', () => {
    const result = parseWalkText([
      'not a walk line',
      '.1.3.6.1.2.1.1.1.0 = STRING: Test Switch'
    ].join('\n'));

    expect(result.entries).toHaveLength(1);
    expect(result.warnings).toEqual(['Line 1 ignored: not a walk line']);
  });
});
