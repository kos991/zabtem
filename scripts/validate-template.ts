import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateTemplateYaml } from '../packages/core/src/template-validator';

const templatePath = join(process.cwd(), 'dist', 'templates', 'sample-template.yaml');

if (!existsSync(templatePath)) {
  throw new Error(`Template artifact not found. Run pnpm generate:template first: ${templatePath}`);
}

const result = validateTemplateYaml(readFileSync(templatePath, 'utf8'));
if (!result.valid) {
  throw new Error(`Template validation failed:\n${result.errors.join('\n')}`);
}

console.log(`Validated ${templatePath}`);
