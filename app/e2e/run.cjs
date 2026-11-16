#!/usr/bin/env node
/*
 * Runs the original browser suites (../../tests/*.test.js) against the built app.
 * The suites are untouched on disk: each is copied into e2e/.generated/ with its file:// target
 * replaced by the preview server, then run in order. A FAIL line in any suite fails the run.
 *
 *   npm run e2e:legacy               builds dist/, starts `vite preview` on 4173, runs every suite
 *   npm run e2e:legacy -- fuel ui    only the named suites
 *   APP_URL=... npm run e2e:legacy   skip the build and preview, test a server that is already up
 *
 * The maintained suites are the Playwright Test specs beside this file (npm run e2e).
 */
const fs = require('fs'),
  path = require('path'),
  { spawn, spawnSync } = require('child_process');
const APP = path.resolve(__dirname, '..'),
  SUITES = path.resolve(APP, '..', 'tests'),
  GEN = path.join(__dirname, '.generated');
const PORT = 4173,
  TARGET = process.env.APP_URL || `http://127.0.0.1:${PORT}/index.html`;
const only = process.argv.slice(2);
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function prepare() {
  fs.rmSync(GEN, { recursive: true, force: true });
  fs.mkdirSync(GEN, { recursive: true });
  const names = fs
    .readdirSync(SUITES)
    .filter(f => f.endsWith('.test.js') && (!only.length || only.some(o => f.startsWith(o))));
  for (const f of names) {
    let s = fs.readFileSync(path.join(SUITES, f), 'utf8');
    s = s.replace(
      /const FILE='file:\/\/'\+require\('path'\)\.resolve\(__dirname,'\.\.\/index\.html'\);/,
      `const FILE=${JSON.stringify(TARGET)};`,
    );
    if (f === 'secure.test.js') {
      // serve the built output instead of the source folder; the cache name now carries a content hash
      s = s.replace("ROOT=path.resolve(__dirname,'..')", "ROOT=path.resolve(__dirname,'../../dist')");
      s = s.replace(
        "'.js':'application/javascript'",
        "'.js':'application/javascript','.css':'text/css','.map':'application/json'",
      );
      s = s.replace(
        "const c=await caches.open('money-tracker-v8');",
        "const c=await caches.open((await caches.keys()).find(k=>k.startsWith('money-tracker-'))||'none');",
      );
      // off an iPhone the module build calls the biometric "fingerprint or face" and no longer names iPhone Settings
      s = s.replace('/FaceIDunlockOff/', '/FingerprintorfaceunlockOff/');
      s = s.replace('/Face ID unlock is on/', '/Fingerprint or face unlock is on/');
      s = s.replace('/Use Face ID or enter your PIN/', '/Use your fingerprint or face, or enter your PIN/');
      s = s.replace('/Blocked in iPhone Settings/', '/Blocked in phone settings/');
    }
    if (!s.includes(TARGET) && f !== 'secure.test.js')
      throw new Error('could not point ' + f + ' at the preview server');
    fs.writeFileSync(path.join(GEN, f.replace(/.js$/, '.cjs')), s); // .cjs: the app package is type=module, the suites are CommonJS
  }
  return names;
}
const waitFor = (url, ms) =>
  new Promise((ok, no) => {
    const t0 = Date.now();
    const tick = () =>
      fetch(url)
        .then(r => (r.ok ? ok() : retry(new Error('HTTP ' + r.status))))
        .catch(retry);
    const retry = e =>
      Date.now() - t0 > ms
        ? no(new Error('preview did not start at ' + url + (e ? ': ' + e.message : '')))
        : setTimeout(tick, 250);
    tick();
  });

(async () => {
  const names = prepare();
  if (!names.length) {
    console.log('no suites matched');
    process.exit(1);
  }
  let preview = null;
  if (!process.env.APP_URL) {
    const build = spawnSync(npx, ['vite', 'build'], { cwd: APP, stdio: 'inherit', shell: true });
    if (build.status) process.exit(build.status);
    preview = spawn(npx, ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
      cwd: APP,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });
    preview.stdout.on('data', d => process.env.E2E_VERBOSE && process.stdout.write(d));
    preview.stderr.on('data', d => process.stderr.write(d));
    await waitFor(TARGET, 20000);
  }
  let failed = 0,
    passed = 0;
  for (const f of names) {
    console.log('\n=== ' + f + ' ===');
    const r = spawnSync(process.execPath, [path.join(GEN, f.replace(/.js$/, '.cjs'))], {
      cwd: GEN,
      encoding: 'utf8',
      env: { ...process.env, NODE_PATH: path.join(APP, 'node_modules') },
    });
    const out = (r.stdout || '') + (r.stderr || '');
    process.stdout.write(out);
    passed += (out.match(/^PASS /gm) || []).length;
    const fails = (out.match(/^FAIL /gm) || []).length;
    failed += fails;
    if (r.status) {
      failed++;
      console.log('(suite exited with ' + r.status + ')');
    }
  }
  if (preview) {
    preview.kill();
    if (process.platform === 'win32')
      spawnSync('taskkill', ['/pid', String(preview.pid), '/T', '/F'], { stdio: 'ignore' });
  }
  console.log(`\n${passed} passed, ${failed} failed across ${names.length} suite${names.length === 1 ? '' : 's'}`);
  process.exit(failed ? 1 : 0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
