// Run: node tests/ui.test.mjs [root folder, default = this repo]
// Browser tests in Safari's engine (Playwright WebKit, iPhone size) against a local server.
// Needs Playwright: uses the copy in ~/.claude/tools if this folder has none; skips otherwise.
// Never touches Firebase: cloud.js is served as an empty module.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(process.argv[2] || path.join(here, '..'));

let pw;
try { pw = await import('playwright'); }
catch {
  try { pw = createRequire(path.join(os.homedir(), '.claude', 'tools', 'package.json'))('playwright'); }
  catch { console.log('SKIP: Playwright not installed'); process.exit(0); }
}

const html = fs.readFileSync(path.join(ROOT, 'LifeCounter.html'), 'utf8');
const CUR = (html.match(/const BUILD = '([^']+)';/) || [])[1] || 'none';
const asBuild = b => html.replace(/const BUILD = '[^']+';/, `const BUILD = '${b}';`).replace(/\?v=[\w.-]+"/g, `?v=${b}"`);

// srv.version = what version.json says; srv.page(query) = which HTML to serve.
const srv = { version: CUR, page: () => html, docs: [], notFound: [] };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/LifeCounter.html') {
    srv.docs.push(u.search);
    res.writeHead(200, { 'content-type': 'text/html' }); return res.end(srv.page(u.searchParams));
  }
  if (u.pathname === '/version.json') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ build: srv.version })); }
  if (u.pathname === '/cloud.js') { res.writeHead(200, { 'content-type': 'text/javascript' }); return res.end('// no Firebase in tests'); }
  const f = path.join(ROOT, path.normalize(u.pathname));
  if (f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile()) {
    res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' }); return res.end(fs.readFileSync(f));
  }
  srv.notFound.push(u.pathname); res.writeHead(404); res.end();
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/LifeCounter.html`;

const browser = await pw.webkit.launch();
const PEOPLE = { people: [
  { id: 'a1', name: 'Alex', date: '2000-01-01', time: null, died: null, updated: 1 },
  { id: 'b2', name: 'Blair', date: '1995-06-15', time: null, died: null, updated: 1 },
], deleted: {} };

async function newPage(opts = {}) {
  const ctx = await browser.newContext({ ...pw.devices['iPhone 15'], ...opts });
  if (opts.seed !== false) await ctx.addInitScript(s => { if (!localStorage.getItem('lifecounter.v1')) localStorage.setItem('lifecounter.v1', s); }, JSON.stringify(PEOPLE));
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  return page;
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const reset = () => { srv.docs = []; srv.notFound = []; srv.version = CUR; srv.page = () => html; };

let passed = 0, failed = 0;
async function test(name, fn) {
  reset();
  try { await fn(); passed++; console.log('ok  ', name); }
  catch (e) { failed++; console.log('FAIL', name, '\n ', e.message); }
}
function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); }

await test('old page + newer version.json moves to the new build once', async () => {
  srv.page = q => q.get('v') === CUR ? html : asBuild('OLD');
  const page = await newPage();
  await page.goto(BASE);
  await page.waitForURL(/[?&]v=/, { timeout: 5000 });
  await page.waitForLoadState('load'); await wait(1500);
  eq(await page.evaluate(() => BUILD), CUR, 'build after update');
  eq(srv.docs, ['', '?v=' + CUR], 'page loads');
  eq(page.errors, [], 'page errors');
  await page.context().close();
});

await test('never loops when the new page is still stale', async () => {
  srv.page = () => asBuild('OLD');
  const page = await newPage();
  await page.goto(BASE);
  await wait(3000);
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await wait(1500);
  eq(srv.docs.length, 2, 'page loads (first + one retry)');
  await page.context().close();
});

await test('keeps the query string the app was opened with', async () => {
  srv.page = q => q.get('v') === CUR ? html : asBuild('OLD');
  const page = await newPage();
  await page.goto(BASE + '?from=hub#x');
  await page.waitForURL(/[?&]v=/, { timeout: 5000 });
  const u = new URL(page.url());
  eq([u.searchParams.get('from'), u.searchParams.get('v'), u.hash], ['hub', CUR, '#x'], 'url after update');
  await page.context().close();
});

await test('waits while a sheet is open, updates after it closes', async () => {
  srv.page = q => q.get('v') === 'NEW' ? asBuild('NEW') : html;
  const page = await newPage();
  await page.goto(BASE); await wait(800);
  await page.click('[data-account]');
  srv.version = 'NEW';
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await wait(1500);
  eq(srv.docs.length, 1, 'no reload while the account sheet is open');
  await page.click('#sheet [data-cancel]');
  await page.waitForURL(/[?&]v=NEW/, { timeout: 5000 });
  await page.waitForLoadState('load');
  eq(await page.evaluate(() => BUILD), 'NEW', 'build after closing the sheet');
  await page.context().close();
});

await test('account sheet shows the build stamp', async () => {
  const page = await newPage();
  await page.goto(BASE); await wait(500);
  await page.click('[data-account]');
  const t = await page.textContent('#sheet');
  if (!t.includes(CUR)) throw new Error('stamp missing: ' + t.trim().slice(0, 120));
  await page.context().close();
});

await test('edit saved even if a cloud update arrives while the form is open', async () => {
  const page = await newPage();
  await page.goto(BASE); await wait(500);
  await page.click('[data-people]');
  await page.click('#sheet [data-edit="a1"]');
  // Another device renamed Blair; the snapshot replaces state.people with new objects.
  await page.evaluate(() => { const d = LCApp.getDoc(); d.people[1].name = 'Blair2'; d.people[1].updated = 2; LCApp.applyDoc(d); });
  await page.fill('#sheet [name=name]', 'Alexis');
  await page.click('#sheet [data-save]');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('lifecounter.v1')).people.map(p => p.name));
  eq(saved, ['Alexis', 'Blair2'], 'saved names');
  await page.context().close();
});

await test('tomorrow\'s birthday is refused at 8 pm in Utah', async () => {
  const page = await newPage({ timezoneId: 'America/Denver', seed: false });
  await page.clock.setFixedTime(new Date('2026-10-18T02:00:00Z')); // Oct 17, 8 pm MDT
  await page.goto(BASE); await wait(300);
  await page.fill('.welcome [name=name]', 'Me');
  await page.fill('.welcome [name=date]', '2026-10-18');
  await page.click('.welcome [data-save]');
  await wait(200);
  eq(await page.evaluate(() => localStorage.getItem('lifecounter.v1')), null, 'nothing saved');
  await page.context().close();
});

await test('no 404s (favicon) and no page errors on load', async () => {
  const page = await newPage();
  await page.goto(BASE); await wait(800);
  eq(srv.notFound, [], '404s');
  eq(page.errors, [], 'page errors');
  await page.context().close();
});

await browser.close();
server.close();
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
