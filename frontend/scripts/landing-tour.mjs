import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const desktop = [[1920, 1080], [1440, 900], [1280, 720]];
const stops = [0, 40, 75, 100, 130, 170, 230, 290, 300, 340, 400, 480, 530, 560, 640, 760, 830, 860, 900, 980, 1060, 1100, 1160, 1250, 1340, 1400, 1480, 1520, 1700, 1760, 1850];
const stages = '#hs .hs-stage, #bd .stage, #hw .stage, #fx .stage, #dr .stage, #fc .fc-stage';

const root = join(dirname(fileURLToPath(import.meta.url)), '../public/landing-site');
let server;
let origin;

async function serve() {
  if (origin) return origin;
  server = createServer(async (req, res) => {
    if (req.url === '/host') {
      res.setHeader('Content-Type', 'text/html');
      res.end('<script>window.__msgs=[];addEventListener("message",e=>__msgs.push(e.data))</script><iframe title="Hissa" src="/index.html" style="width:100%;height:100vh;border:0"></iframe>');
      return;
    }
    const path = join(root, decodeURIComponent(req.url?.split('?')[0] || '/index.html'));
    if (!path.startsWith(root) || path === root) { res.writeHead(404).end(); return; }
    try {
      const data = await readFile(path);
      res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.webp': 'image/webp' }[extname(path)] || 'application/octet-stream');
      res.end(data);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  return origin;
}

export async function open(browser, { w = 1280, h = 800, rm = true, js = true, embed = false } = {}) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: rm ? 'reduce' : 'no-preference', javaScriptEnabled: js });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${await serve()}/${embed ? 'host' : 'index.html'}`, { waitUntil: 'domcontentloaded' });
  if (js) {
    const document = embed ? page.frameLocator('iframe') : page;
    await document.locator('html:not(.ld)').waitFor({ timeout: 12500 });
    if (errors.length) throw new Error(errors.join('\n'));
  }
  page.pageErrors = errors;
  return page;
}

async function scroll(page, y) {
  await page.evaluate(y => {
    if (window.HX?.lenis) window.HX.lenis.scrollTo(y, { immediate: true });
    else window.scrollTo(0, y);
  }, y);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function visibleStages(page) {
  return page.locator(stages).evaluateAll(els => els.filter(el => getComputedStyle(el).visibility === 'visible' && el.getBoundingClientRect().top < innerHeight && el.getBoundingClientRect().bottom > 0).map(el => el.id));
}

async function capture(page, path) {
  await page.screenshot({ path, animations: 'disabled', mask: [page.locator('canvas'), page.locator('.up')] });
}

async function tour(browser, out) {
  for (const [w, h] of [...desktop, [390, 844]]) {
    const page = await open(browser, { w, h, rm: w === 390 });
    try {
      await page.waitForTimeout(5000); // intro sweep
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      const positions = w === 390 ? Array.from({ length: Math.ceil(max / 700) + 1 }, (_, i) => Math.min(i * 700, max)) : [...stops.map(v => v * h / 100), max];
      for (let i = 0; i < positions.length; i++) {
        await scroll(page, positions[i]);
        if (w !== 390) {
          const visible = await visibleStages(page);
          if (visible.length !== 1) throw new Error(`${w}x${h} at ${positions[i]}px: visible stages ${JSON.stringify(visible)}`);
        }
        await capture(page, join(out, `tour-${w}x${h}-${String(i).padStart(2, '0')}.png`));
      }
      if (page.pageErrors.length) throw new Error(page.pageErrors.join('\n'));
    } finally { await page.context().close(); }
  }
}

async function diff(page, before, after) {
  return page.evaluate(async ([a, b]) => {
    const image = src => new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = `data:image/png;base64,${src}`; });
    const [left, right] = await Promise.all([image(a), image(b)]);
    const canvas = document.createElement('canvas'); canvas.width = left.width; canvas.height = left.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(left, 0, 0); const x = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(right, 0, 0);
    const y = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let changed = 0;
    for (let i = 0; i < x.length; i += 4) if (Math.abs(x[i] - y[i]) + Math.abs(x[i + 1] - y[i + 1]) + Math.abs(x[i + 2] - y[i + 2]) > 30) changed++;
    return changed / (x.length / 4);
  }, [before.toString('base64'), after.toString('base64')]);
}

async function seams(browser, out) {
  const page = await open(browser, { w: 1280, h: 720, rm: false });
  try {
    await page.waitForTimeout(5000);
    const points = [
      ['idea-buddy', '#bd'], ['buddy-how', '#hw'], ['how-features', '#fx'],
      ['features-dishes', '#dr'], ['dishes-faq', '#dr'], ['final-footer', '#ft'],
    ];
    for (const [name, selector] of points) {
      const at = await page.locator(selector).evaluate((el, name) => el.getBoundingClientRect().top + scrollY + (name === 'dishes-faq' ? 300 * innerHeight / 100 : 0), name);
      const beforeAt = Math.max(0, at - 2);
      await scroll(page, beforeAt);
      const a = await page.screenshot({ animations: 'disabled', mask: [page.locator('canvas'), page.locator('.up')] });
      await writeFile(join(out, `seam-${name}-before.png`), a);
      await scroll(page, at + 2);
      const b = await page.screenshot({ animations: 'disabled', mask: [page.locator('canvas'), page.locator('.up')] });
      await writeFile(join(out, `seam-${name}-after.png`), b);
      const ratio = await diff(page, a, b);
      if (ratio >= .005) throw new Error(`${name}: ${(ratio * 100).toFixed(2)}% pixels changed (limit 0.5%)`);
    }
    if (page.pageErrors.length) throw new Error(page.pageErrors.join('\n'));
  } finally { await page.context().close(); }
}

async function modes(browser, out) {
  for (const [w, h, rm] of [[390, 844, true], [1024, 768, false], [1180, 820, false]]) {
    const page = await open(browser, { w, h, rm });
    try {
      const state = await page.evaluate(() => ({ stacked: document.documentElement.classList.contains('fb'), lenis: !!window.HX?.lenis, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth }));
      if (state.stacked !== rm || state.lenis === rm || state.overflow) throw new Error(`${w}x${h}: ${JSON.stringify(state)}`);
      if (w === 390) {
        await page.locator('#fq-q1').focus();
        await page.keyboard.press('Enter');
        if (await page.locator('#fq-q1').getAttribute('aria-expanded') !== 'true') throw new Error('FAQ did not open from keyboard');
        const small = await page.locator('button, a.cta').evaluateAll(els => els.filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44); }).map(el => el.id || el.textContent.trim()));
        if (small.length) throw new Error(`small targets: ${small.join(', ')}`);
        const body = await page.locator('body').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
        if (body < 16) throw new Error(`body font ${body}px`);
        const snap = await page.locator('#dr-rail').evaluate(el => getComputedStyle(el).scrollSnapType);
        if (!snap.includes('x')) throw new Error(`dish rail snap: ${snap}`);
      } else {
        for (const section of ['#bd', '#hw']) {
          const top = await page.locator(section).evaluate(el => el.getBoundingClientRect().top + scrollY);
          for (const offset of [0, h, 2 * h]) {
            await scroll(page, top + offset);
            const overlap = await page.locator(`${section} h2, ${section} .cta`).evaluateAll(els => {
              const boxes = els.filter(el => getComputedStyle(el).visibility === 'visible' && parseFloat(getComputedStyle(el).opacity) > .5).map(el => ({ label: el.id || el.textContent.trim().slice(0, 20), r: el.getBoundingClientRect() })).filter(x => x.r.width && x.r.height && x.r.top < innerHeight && x.r.bottom > 0);
              return boxes.flatMap((a, i) => boxes.slice(i + 1).filter(b => a.r.left < b.r.right && a.r.right > b.r.left && a.r.top < b.r.bottom && a.r.bottom > b.r.top).map(b => `${a.label}/${b.label}`));
            });
            if (overlap.length) throw new Error(`${w} ${section} text overlap: ${overlap.join(', ')}`);
            if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) throw new Error(`${w} ${section} horizontal overflow`);
          }
        }
      }
      await capture(page, join(out, `mode-${w}x${h}.png`));
      if (page.pageErrors.length) throw new Error(page.pageErrors.join('\n'));
    } finally { await page.context().close(); }
  }

  const resize = await open(browser, { w: 1000, h: 768, rm: false });
  try {
    const started = Date.now();
    await resize.setViewportSize({ width: 700, height: 768 });
    await resize.locator('html.fb:not(.ld)').waitFor({ timeout: 6000 });
    if (Date.now() - started > 6000) throw new Error('resize loader exceeded 6 s');
    if (resize.pageErrors.length) throw new Error(resize.pageErrors.join('\n'));
    await capture(resize, join(out, 'mode-resize-700.png'));
  } finally { await resize.context().close(); }

  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) { return kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl' ? null : get.call(this, kind, ...args); };
  });
  const gl = await context.newPage();
  const errors = [];
  gl.on('pageerror', error => errors.push(error.message));
  try {
    await gl.goto(`${await serve()}/index.html`);
    await gl.locator('html:not(.ld)').waitFor({ timeout: 12500 });
    if (errors.length) throw new Error(errors.join('\n'));
    const wordmark = await gl.locator('#hs-wmc').evaluate(canvas => {
      const copy = document.createElement('canvas'); copy.width = canvas.width; copy.height = canvas.height;
      const ctx = copy.getContext('2d'); ctx.drawImage(canvas, 0, 0);
      const pixels = ctx.getImageData(0, 0, copy.width, copy.height).data;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) return true;
      return false;
    });
    if (!wordmark) throw new Error('WebGL-disabled wordmark is blank');
    await capture(gl, join(out, 'mode-no-webgl.png'));
  } finally { await context.close(); }

  const missing = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await missing.route('**/assets/*nihari*', route => route.fulfill({ status: 404, body: '' }));
  const page = await missing.newPage();
  const missingErrors = [];
  page.on('pageerror', error => missingErrors.push(error.message));
  try {
    await page.goto(`${await serve()}/index.html`);
    await page.evaluate(() => document.querySelector('#dr').scrollIntoView());
    await page.locator('html:not(.ld)').waitFor({ timeout: 12500 });
    if (missingErrors.length) throw new Error(missingErrors.join('\n'));
    await capture(page, join(out, 'mode-dish-404.png'));
  } finally { await missing.close(); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const require = createRequire(import.meta.url);
  const { chromium } = require('playwright');
  const out = process.argv[2];
  const only = process.argv[3] === '--only' ? process.argv[4] : undefined;
  if (!out || (only && !['tour', 'seams', 'modes'].includes(only))) throw new Error('usage: node frontend/scripts/landing-tour.mjs <outDir> [--only seams|tour|modes]');
  await mkdir(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'chromium' });
  const results = [];
  async function check(name, fn) {
    try { await fn(); results.push([name, 'PASS', '']); }
    catch (error) { results.push([name, 'FAIL', error.message]); }
  }
  try {
    if (!only || only === 'tour') await check('tour', () => tour(browser, out));
    if (!only || only === 'seams') await check('seams', () => seams(browser, out));
    if (!only || only === 'modes') await check('modes', () => modes(browser, out));
    await check('iframe CTAs and no-JS copy', async () => {
    const page = await open(browser, { embed: true });
    const frame = page.frameLocator('iframe');
    const links = ['#nav-cta', '.hs-copy .cta', '#get'];
    for (const selector of links) {
      await page.evaluate(() => { window.__msgs.length = 0; });
      await frame.locator(selector).evaluate(link => link.click());
      const messages = await page.evaluate(() => window.__msgs);
      if (messages.length !== 1 || messages[0] !== 'hissa:explore') throw new Error(`${selector}: ${JSON.stringify(messages)}`);
    }
    for (const selector of ['.pill a', '.ft-links a[href]', '.ft-links a[aria-disabled]']) {
      await page.evaluate(() => { window.__msgs.length = 0; });
      await frame.locator(selector).first().evaluate(link => link.click());
      if (await page.evaluate(() => window.__msgs.length)) throw new Error(`${selector} posted a host message`);
    }
    if (page.pageErrors.length) throw new Error(page.pageErrors.join('\n'));
    await page.context().close();
    const noJs = await open(browser, { js: false });
    const text = await noJs.locator('body').innerText();
    if (!text.includes('One more roti is fine.') || !text.includes('Fair questions')) throw new Error('No-JS copy is hidden');
    await noJs.context().close();
    });
  } finally {
    await browser.close();
    server?.close();
  }
  for (const [name, status, detail] of results) process.stdout.write(`${status.padEnd(4)} ${name}${detail ? `: ${detail}` : ''}\n`);
  if (results.some(([, status]) => status === 'FAIL')) process.exitCode = 1;
}
