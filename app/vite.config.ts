import { defineConfig, type Plugin } from 'vitest/config';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import pkg from './package.json' with { type: 'json' };

/** Files under public/ that the service worker should precache, with a hash of their contents. */
function publicFiles(dir = 'public', base = 'public'): string[] {
  return readdirSync(dir)
    .flatMap(name => {
      const p = join(dir, name);
      return statSync(p).isDirectory() ? publicFiles(p, base) : [relative(base, p).replace(/\\/g, '/')];
    })
    .filter(f => !f.endsWith('.txt'));
}

/**
 * Emits sw.js from src/sw.js with the real list of built assets. The cache name carries the app
 * version plus a hash of every precached file, so installed copies drop the old cache whenever any
 * asset changes; nobody has to bump it by hand.
 */
function serviceWorker(): Plugin {
  return {
    name: 'money-tracker-sw',
    apply: 'build',
    generateBundle(_options, bundle) {
      const built = Object.keys(bundle).filter(f => f !== 'index.html' && f !== 'sw.js' && !f.endsWith('.map'));
      const pub = publicFiles();
      const assets = ['./', './index.html', ...built.map(f => './' + f), ...pub.map(f => './' + f)];
      const h = createHash('sha1').update(pkg.version);
      for (const f of built) {
        const c = bundle[f];
        h.update(f).update('code' in c ? c.code : (c.source as Uint8Array | string));
      }
      for (const f of pub) h.update(f).update(readFileSync(join('public', f)));
      const cache = 'money-tracker-' + pkg.version + '-' + h.digest('hex').slice(0, 8);
      const source = readFileSync('src/sw.js', 'utf8')
        .split('__CACHE__')
        .join(cache)
        .split('__ASSETS__')
        .join(JSON.stringify(assets));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_BUILD__: JSON.stringify((pkg as { buildDate?: string }).buildDate || new Date().toISOString().slice(0, 10)),
  },
  plugins: [serviceWorker()],
  build: { sourcemap: true },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    setupFiles: ['tests/unit/setup.ts'],
  },
});
