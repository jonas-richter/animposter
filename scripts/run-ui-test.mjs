// Bundles scripts/ui-test.tsx (with a stub for next/navigation and the @/ alias)
// and runs it in Node. Needs the dev dependencies jsdom + esbuild.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const navStub = `
// Next's real useRouter returns a stable object; the stub must do the same,
// otherwise effects that depend on it would re-run on every render.
const router = {
  push: (u) => console.log('   [router.push]', u),
  replace: (u) => console.log('   [router.replace]', u),
  back: () => {},
  refresh: () => {},
  prefetch: () => {},
};
export function useRouter() { return router; }
export function useParams() { return {}; }
export function useSearchParams() { return new URLSearchParams(); }
export function usePathname() { return '/'; }
`;

const stubPlugin = {
  name: 'stub-next-navigation',
  setup(b) {
    b.onResolve({ filter: /^next\/navigation$/ }, () => ({
      path: 'next-navigation-stub',
      namespace: 'stub',
    }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
      contents: navStub,
      loader: 'js',
    }));
  },
};

const outfile = path.join(root, '.ui-test.cjs');

await build({
  entryPoints: [path.join(root, 'scripts', 'ui-test.tsx')],
  bundle: true,
  outfile,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  jsx: 'automatic',
  external: ['react', 'react-dom', 'jsdom', 'scheduler'],
  alias: { '@': path.join(root, 'src') },
  plugins: [stubPlugin],
  logLevel: 'warning',
});

const child = spawn(process.execPath, [outfile], { stdio: 'inherit', env: process.env });
child.on('exit', (c) => process.exit(c ?? 1));
