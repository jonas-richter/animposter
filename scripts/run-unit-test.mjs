// Bundles scripts/unit-test.ts and runs it. No server needed.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outfile = path.join(root, '.unit-test.cjs');

await build({
  entryPoints: [path.join(root, 'scripts', 'unit-test.ts')],
  bundle: true,
  outfile,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  alias: { '@': path.join(root, 'src') },
  logLevel: 'warning',
});

const child = spawn(process.execPath, [outfile], { stdio: 'inherit', env: process.env });
child.on('exit', (c) => process.exit(c ?? 1));
