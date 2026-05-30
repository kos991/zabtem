import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateTemplateYamlFromFixtures } from '../packages/core/src/template-generator';

const repoRoot = process.cwd();
const outputDir = join(repoRoot, 'dist', 'templates');
const outputPath = join(outputDir, 'sample-template.yaml');

mkdirSync(outputDir, { recursive: true });

const yaml = generateTemplateYamlFromFixtures({
  snmpwalkDir: join(repoRoot, 'fixtures', 'snmpwalk'),
  mibPath: join(repoRoot, 'fixtures', 'mib', 'test-switch-minimal.mib')
});

writeFileSync(outputPath, yaml);
console.log(`Generated ${outputPath}`);
