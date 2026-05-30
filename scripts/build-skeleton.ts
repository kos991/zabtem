import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outDir = join(process.cwd(), 'dist', 'desktop');
mkdirSync(outDir, { recursive: true });

const targets = [
  {
    file: 'mib2zabbix-desktop-windows-x86_64-skeleton.txt',
    platform: 'Windows x86_64'
  },
  {
    file: 'mib2zabbix-desktop-linux-x86_64-skeleton.txt',
    platform: 'Linux x86_64'
  }
];

for (const target of targets) {
  writeFileSync(
    join(outDir, target.file),
    [
      'MIB2Zabbix Desktop skeleton artifact',
      `Target: ${target.platform}`,
      'Status: early project skeleton; real Electron packaging is not implemented yet.',
      'This file exists so the GitHub Actions build goal produces explicit, non-release artifacts.'
    ].join('\n')
  );
}

console.log(`Wrote ${targets.length} skeleton desktop artifacts to ${outDir}`);
