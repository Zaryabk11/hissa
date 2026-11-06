import { Buffer } from 'node:buffer';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const desktop = [[1920, 1080], [1440, 900], [1280, 720]];
const stops = [0, 40, 75, 100, 130, 170, 230, 290, 300, 340, 400, 480, 530, 560, 640, 760, 830, 860, 900, 980, 1060, 1100, 1160, 1250, 1340, 1400, 1480, 1520, 1700, 1760, 1850];

const root = join(dirname(fileURLToPath(import.meta.url)), '../public/landing-site');
let server;
let origin;

async function serve() {
  if (origin) return origin;
  server = createServer(async (req, res) => {
    if (req.url === '/host') {
      res.setHeader('Content-Type', 'text/html');
      res.end('<link rel="icon" href="data:,"><script>window.__msgs=[];addEventListener("message",e=>__msgs.push(e.data))</script><iframe title="Hissa" src="/index.html" style="width:100%;height:100vh;border:0"></iframe>');
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
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
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

async function stageState(page) {
  return page.evaluate(() => {
    const box = id => document.querySelector(id).getBoundingClientRect();
    const b = box('#bd'), c = box('#hw'), f = box('#fx'), d = box('#dr');
    const pf = Math.max(0, Math.min(1, -f.top / innerHeight / 2.5));
    const u = -d.top / innerHeight * 100;
    const onScreen = id => { const r = box(id); return r.top < innerHeight && r.bottom > 0; };
    const expected = [
      [b.top > 1, '#hs-stage'],
      [b.top <= 1 && c.top > 1, '#bd-stage'],
      [c.top <= 1 && (f.top > 1 || pf < .2), '#hw-stage'],
      [f.top <= 1 && u < 100, '#fx-stage'],
      [d.top <= 1, '#dr-stage'],
      [true, '#fc-stage'],
    ].filter(([show, id]) => show && onScreen(id)).map(([, id]) => id.slice(1));
    const actual = [...document.querySelectorAll('#hs .hs-stage, #bd .stage, #hw .stage, #fx .stage, #dr .stage, #fc .fc-stage')]
      .filter(el => { const r = el.getBoundingClientRect(); return getComputedStyle(el).visibility === 'visible' && r.top < innerHeight && r.bottom > 0; }).map(el => el.id);
    return { expected, actual };
  });
}

async function capture(page, path) {
  await page.screenshot({ path, animations: 'disabled' });
}

async function tour(browser, out, prefix = 'tour') {
  for (const [w, h] of [...desktop, [390, 844]]) {
    const page = await open(browser, { w, h, rm: w === 390 });
    try {
      await page.waitForTimeout(5000); // intro sweep
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      const positions = w === 390 ? Array.from({ length: Math.ceil(max / 700) + 1 }, (_, i) => Math.min(i * 700, max)) : [...stops.map(v => v * h / 100), max];
      for (let i = 0; i < positions.length; i++) {
        await scroll(page, positions[i]);
        if (w !== 390) {
          const { expected, actual } = await stageState(page);
          if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${w}x${h} at ${positions[i]}px: stages ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
        }
        if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) throw new Error(`${w}x${h} at ${positions[i]}px: horizontal overflow`);
        await capture(page, join(out, `${prefix}-${w}x${h}-${String(i).padStart(2, '0')}.png`));
      }
      if (page.pageErrors.length) throw new Error(page.pageErrors.join('\n'));
    } finally { await page.context().close(); }
  }
}

// Changed-pixel ratio between the frames either side of a hand-off, excluding animated regions: any pixel that already
// differs between two frames of the same scene 2 px of scroll apart (scroll-linked or idle motion), grown by 3 px so
// moving anti-aliased edges are covered. What is left is a pop or jump that scene motion cannot explain.
async function diff(page, before, after, beforeControl, afterControl, popRects = []) {
  return page.evaluate(async ([frames, popRects]) => {
    const image = src => new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = `data:image/png;base64,${src}`; });
    const decoded = await Promise.all(frames.map(image));
    const { width, height } = decoded[0];
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const [x, y, cx, cy] = decoded.map(img => { ctx.clearRect(0, 0, width, height); ctx.drawImage(img, 0, 0); return ctx.getImageData(0, 0, width, height).data; });
    const differs = (p, q, i) => Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]) > 30;
    const motion = new Uint8Array(width * height);
    for (let i = 0; i < motion.length; i++) motion[i] = differs(x, cx, i * 4) || differs(y, cy, i * 4) ? 1 : 0;
    const R = 3, grown = new Uint8Array(width * height), tmp = new Uint8Array(width * height);
    for (let r = 0; r < height; r++) for (let c = 0; c < width; c++) if (motion[r * width + c]) for (let k = Math.max(0, c - R); k <= Math.min(width - 1, c + R); k++) tmp[r * width + k] = 1;
    for (let r = 0; r < height; r++) for (let c = 0; c < width; c++) if (tmp[r * width + c]) for (let k = Math.max(0, r - R); k <= Math.min(height - 1, r + R); k++) grown[k * width + c] = 1;
    // Sticker pops (.pop gaining or losing .in across the hand-off) are CSS-transition entrances: animated elements too.
    for (const [left, top, right, bottom] of popRects) for (let r = Math.max(0, Math.floor(top) - 6); r < Math.min(height, Math.ceil(bottom) + 6); r++) for (let c = Math.max(0, Math.floor(left) - 6); c < Math.min(width, Math.ceil(right) + 6); c++) grown[r * width + c] = 1;
    let changed = 0, masked = 0;
    const view = ctx.createImageData(width, height);
    for (let i = 0; i < grown.length; i++) {
      const hit = !grown[i] && differs(x, y, i * 4);
      if (grown[i]) masked++; else if (hit) changed++;
      view.data.set(hit ? [255, 0, 0, 255] : grown[i] ? [60, 60, 200, 255] : [x[i * 4] >> 1, x[i * 4 + 1] >> 1, x[i * 4 + 2] >> 1, 255], i * 4);
    }
    ctx.putImageData(view, 0, 0);
    return { changed: changed / grown.length, masked: masked / grown.length, png: canvas.toDataURL('image/png').split(',')[1] };
  }, [[before, after, beforeControl, afterControl].map(buffer => buffer.toString('base64')), popRects]);
}

async function seams(browser, out) {
  const page = await open(browser, { w: 1280, h: 720, rm: false });
  try {
    await page.waitForTimeout(5000);
    // Master frame(): Buddy/How switch at wrapper top; How stays through the
    // first .2 of Features; Features stays until the dish iris reaches 100vh.
    const points = [
      ['idea-buddy', '#bd', 0, true],
      ['buddy-how', '#hw', 0, true],
      ['how-features', '#fx', .5, true],
      ['features-dishes', '#dr', 1, true],
      ['dishes-faq-iris', '#dr', 3, true],
      // Footer enters by ordinary document scroll; no stage swaps at this boundary.
      ['final-footer-scroll', '#ft', 0, false],
    ];
    const report = [];
    for (const [name, selector, vh, limit] of points) {
      const at = await page.locator(selector).evaluate((el, vh) => el.getBoundingClientRect().top + scrollY + vh * innerHeight, vh);
      const shot = async y => { await scroll(page, Math.max(0, y)); return page.screenshot({ animations: 'disabled' }); };
      const pops = () => page.evaluate(() => [...document.querySelectorAll('.pop')].map(el => ({ on: el.classList.contains('in'), r: el.getBoundingClientRect().toJSON() })));
      const a = await shot(at - 1);
      const popsBefore = await pops();
      const beforeControl = await shot(at - 3);
      await writeFile(join(out, `seam-${name}-before.png`), a);
      const b = await shot(at + 1);
      const popsAfter = await pops();
      const popRects = popsAfter.flatMap((p, i) => (p.on !== popsBefore[i].on ? [p, popsBefore[i]] : [])).filter(p => p.r.width && p.r.height).map(p => [p.r.left, p.r.top, p.r.right, p.r.bottom]);
      const afterControl = await shot(at + 3);
      await writeFile(join(out, `seam-${name}-after.png`), b);
      const { changed, masked, png } = await diff(page, a, b, beforeControl, afterControl, popRects);
      await writeFile(join(out, `seam-${name}-diff.png`), Buffer.from(png, 'base64')); // red = changed, blue = excluded as animated
      report.push({
        name, at, changedPercent: +(changed * 100).toFixed(3), excludedAnimatedPercent: +(masked * 100).toFixed(1), thresholdPercent: limit ? .5 : null,
        ...(limit ? {} : { ruling: 'No matched-frame hand-off: final stage has already scrolled away when the footer crosses the viewport. This is a normal scroll boundary; inspect both screenshots.' }),
      });
    }
    await writeFile(join(out, 'seam-report.json'), JSON.stringify(report, null, 2));
    process.stdout.write(`INFO final-footer-scroll: ${report.at(-1).changedPercent}% changed; no matched-frame hand-off, review screenshots (see seam-report.json)\n`);
    const failures = report.filter(row => row.thresholdPercent !== null && (row.changedPercent >= row.thresholdPercent || row.excludedAnimatedPercent > 35));
    if (failures.length) throw new Error(failures.map(row => `${row.name}: ${row.changedPercent}% changed, ${row.excludedAnimatedPercent}% excluded as animated (limit 35%)`).join(', '));
    if (page.pageErrors.length) throw new Error(page.pageErrors.join('\n'));
  } finally { await page.context().close(); }
}

async function modes(browser, out) {
  for (const [w, h, rm] of [[390, 844, true], [1280, 720, true], [1024, 768, false], [1180, 820, false]]) {
    const page = await open(browser, { w, h, rm });
    try {
      const state = await page.evaluate(() => ({ stacked: document.documentElement.classList.contains('fb'), lenis: !!window.HX?.lenis, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth }));
      if (state.stacked !== rm || state.lenis === rm || state.overflow) throw new Error(`${w}x${h}: ${JSON.stringify(state)}`);
      if (rm) {
        const running = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').map(a => a.animationName || a.id || a.constructor.name));
        if (running.length) throw new Error(`${w}x${h}: running animations under reduced motion: ${running.join(', ')}`);
      }
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
      } else if (!rm) {
        for (const section of ['#bd', '#hw']) {
          const top = await page.locator(section).evaluate(el => el.getBoundingClientRect().top + scrollY);
          for (const offset of [0, .5 * h, h, 1.5 * h, 2 * h, 2.5 * h]) {
            await scroll(page, top + offset);
            const overlap = await page.locator(`${section} h2, ${section} p, ${section} .cta`).evaluateAll(els => {
              // Scene text fades through per-word spans, so a box only counts as text while its opacity (own, ancestors and its spans) is above .5.
              const effective = el => { const spans = [...el.querySelectorAll('span')].map(span => parseFloat(getComputedStyle(span).opacity)); let own = spans.length ? Math.max(...spans) : 1; for (let node = el; node && node !== document.body; node = node.parentElement) own *= parseFloat(getComputedStyle(node).opacity); return own; };
              const boxes = els.filter(el => getComputedStyle(el).visibility === 'visible' && effective(el) > .5).map(el => ({ label: el.id || el.textContent.trim().slice(0, 20), r: el.getBoundingClientRect() })).filter(x => x.r.width && x.r.height && x.r.top < innerHeight && x.r.bottom > 0);
              return boxes.flatMap((a, i) => boxes.slice(i + 1).filter(b => a.r.left < b.r.right && a.r.right > b.r.left && a.r.top < b.r.bottom && a.r.bottom > b.r.top).map(b => `${a.label}/${b.label}`));
            });
            if (overlap.length) throw new Error(`${w} ${section} text overlap: ${overlap.join(', ')}`);
            if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) throw new Error(`${w} ${section} horizontal overflow`);
          }
        }
      }
      await capture(page, join(out, `mode-${w}x${h}${rm ? '-reduced' : ''}.png`));
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

  // Reverse crossing: stacked back to pinned must also reload and reach hand-off.
  const back = await open(browser, { w: 700, h: 768, rm: false });
  try {
    const started = Date.now();
    await back.setViewportSize({ width: 1000, height: 768 });
    await back.locator('html:not(.fb):not(.ld)').waitFor({ timeout: 6000 });
    if (Date.now() - started > 6000) throw new Error('reverse resize loader exceeded 6 s');
    if (!await back.evaluate(() => !!window.HX?.lenis)) throw new Error('reverse resize: Lenis missing after reload');
    if (back.pageErrors.length) throw new Error(back.pageErrors.join('\n'));
    await capture(back, join(out, 'mode-resize-1000.png'));
  } finally { await back.context().close(); }
}

async function noWebGL(chromium, out) {
  const noGlBrowser = await chromium.launch({ headless: true, args: ['--disable-gpu', '--disable-webgl'] });
  const context = await noGlBrowser.newContext({ viewport: { width: 1280, height: 720 } });
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
    await gl.waitForFunction(() => [...document.querySelectorAll('#hs-wmc, #fc-wm')].every(canvas => {
      if (!canvas.width || !canvas.height) return false;
      const copy = document.createElement('canvas'); copy.width = canvas.width; copy.height = canvas.height;
      const ctx = copy.getContext('2d'); ctx.drawImage(canvas, 0, 0);
      const pixels = ctx.getImageData(0, 0, copy.width, copy.height).data;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) return true;
      return false;
    }), null, { timeout: 5000 }).catch(() => { throw new Error('WebGL-disabled hero or footer wordmark is blank'); });
    if (errors.length) throw new Error(errors.join('\n'));
    await capture(gl, join(out, 'mode-no-webgl.png'));
  } finally { await context.close(); await noGlBrowser.close(); }
}

async function dish404(browser, out) {
  // One painted dish fails: karahi (hero/loader gate) and nihari (lazy rail image). The loader must still hand off and the rail stay complete.
  for (const dish of ['karahi', 'nihari']) {
    const missing = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    let blocked = 0;
    await missing.route(`**/assets/dishes/${dish}.webp`, route => { blocked++; return route.fulfill({ status: 404, body: '' }); });
    const page = await missing.newPage();
    const missingErrors = [];
    page.on('pageerror', error => missingErrors.push(error.message));
    try {
      await page.goto(`${await serve()}/index.html`);
      await page.locator('html:not(.ld)').waitFor({ timeout: 12500 });
      await page.evaluate(() => document.querySelector('#dr').scrollIntoView());
      await page.waitForFunction(() => [...document.querySelectorAll('#dr-rail img[data-dish]')].every(img => img.src.includes('assets/dishes/')), null, { timeout: 12000 }); // rail images get their real src when the rail warms
      await page.evaluate(() => document.querySelectorAll('#dr-rail img').forEach(img => { img.loading = 'eager'; })); // lazy rail images off-screen would never settle
      await page.waitForFunction(() => [...document.querySelectorAll('#dr-rail img')].every(img => img.complete), null, { timeout: 12000 });
      if (!blocked) throw new Error(`${dish} 404 route was not exercised`);
      if (await page.locator('#dr-rail .it').count() < 8) throw new Error(`dish rail is incomplete after ${dish} 404`);
      const broken = await page.evaluate(() => [...document.querySelectorAll('#dr-rail img')].filter(img => !img.naturalWidth).map(img => img.dataset.dish));
      if (broken.join() !== dish) throw new Error(`unexpected broken rail images after ${dish} 404: ${broken.join(',')}`);
      if (missingErrors.length) throw new Error(missingErrors.join('\n'));
      await capture(page, join(out, `mode-dish-404-${dish}.png`));
    } finally { await missing.close(); }
  }
}

async function throttle(browser, out) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) if (!e.hadRecentInput && window.__handoffAt && e.startTime >= window.__handoffAt) window.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
    const percent = () => Number(document.querySelector('#ld-n')?.textContent ?? (window.LD?.done ? 100 : 0));
    setTimeout(() => { window.__at6 = percent(); }, 6000);
    // The loader forces completion at its 6 s cap and eases the last stretch in about 200 ms (40 ms time constant), so 100% is read 500 ms after the cap.
    setTimeout(() => { window.__at65 = percent(); }, 6500);
    const timer = setInterval(() => {
      if (window.LD?.done) { window.__handoffAt = performance.now(); clearInterval(timer); }
    }, 50);
  });
  try {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 50 * 1024, uploadThroughput: 20 * 1024 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.goto(`${await serve()}/index.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.__at65 !== undefined, null, { timeout: 15000 });
    await page.locator('html:not(.ld)').waitFor({ timeout: 15000 });
    await page.waitForFunction(() => window.__handoffAt !== undefined, null, { timeout: 1000 });
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(1000);
    const result = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      const navigation = performance.getEntriesByType('navigation')[0];
      const bytes = e => e.transferSize || e.encodedBodySize || 0;
      const htmlBytes = navigation ? bytes(navigation) : 0;
      return {
        percentAt6Seconds: window.__at6,
        percentAt6500ms: window.__at65,
        handoffMs: Math.round(window.__handoffAt),
        cls: +window.__cls.toFixed(4),
        gateBytes: htmlBytes + resources.filter(e => e.responseEnd <= window.__handoffAt).reduce((n, e) => n + bytes(e), 0),
        totalBytes: htmlBytes + resources.reduce((n, e) => n + bytes(e), 0),
      };
    });
    await writeFile(join(out, 'throttle-report.json'), JSON.stringify(result, null, 2));
    if (result.percentAt6500ms < 100 || result.handoffMs >= 10500 || result.cls >= .02 || result.gateBytes > 650000 || result.totalBytes > 1600000 || errors.length) {
      throw new Error(`${JSON.stringify(result)}${errors.length ? `; console/page errors: ${errors.join(' | ')}` : ''}`);
    }
  } finally {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {});
    await context.close();
  }
}

async function matrix(type, name, out) {
  const browser = await type.launch({ headless: true });
  try { await tour(browser, out, `matrix-${name}`); }
  finally { await browser.close(); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const require = createRequire(import.meta.url);
  const types = require('playwright');
  const { chromium } = types;
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
    if (!only || only === 'modes') {
      await check('modes', () => modes(browser, out));
      await check('WebGL unavailable', () => noWebGL(chromium, out));
      await check('dish 404', () => dish404(browser, out));
    }
    if (!only) await check('Slow 4G and 4x CPU', () => throttle(browser, out));
    if (!only) for (const name of ['firefox', 'webkit']) await check(name, () => matrix(types[name], name, out));
    await check('iframe CTAs and no-JS copy', async () => {
    const page = await open(browser, { embed: true });
    const frame = page.frameLocator('iframe');
    const links = ['#nav-cta', '.hs-copy .cta', '#get'];
    for (const selector of links) {
      await page.evaluate(() => { window.__msgs.length = 0; });
      await frame.locator(selector).evaluate(link => link.click());
      await page.waitForFunction(() => window.__msgs.length === 1, null, { timeout: 1000 });
      const messages = await page.evaluate(() => window.__msgs);
      if (messages.length !== 1 || messages[0] !== 'hissa:explore') throw new Error(`${selector}: ${JSON.stringify(messages)}`);
    }
    for (const selector of ['.pill a', '.ft-links a[href]', '.ft-links a[aria-disabled]']) {
      await page.evaluate(() => { window.__msgs.length = 0; });
      await frame.locator(selector).first().evaluate(link => link.click());
      await page.waitForTimeout(50);
      if (await page.evaluate(() => window.__msgs.length)) throw new Error(`${selector} posted a host message`);
    }
    if (page.pageErrors.length) throw new Error(page.pageErrors.join('\n'));
    await page.context().close();
    const noJs = await open(browser, { js: false });
    const text = await noJs.locator('body').innerText();
    if (!text.includes('One more roti is fine.') || !text.includes('Fair questions')) throw new Error('No-JS copy is hidden');
    await noJs.context().close();
    });
    await check('WebView CTA', async () => {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
      await context.addInitScript(() => { window.__nativeMessages = []; window.ReactNativeWebView = { postMessage: value => window.__nativeMessages.push(value) }; });
      try {
        const page = await context.newPage();
        await page.goto(`${await serve()}/index.html`);
        await page.locator('html:not(.ld)').waitFor({ timeout: 12500 });
        for (const selector of ['#nav-cta', '.hs-copy .cta', '#get']) {
          await page.evaluate(() => { window.__nativeMessages.length = 0; });
          await page.locator(selector).evaluate(link => link.click());
          const messages = await page.evaluate(() => window.__nativeMessages);
          if (messages.length !== 1 || messages[0] !== 'hissa:explore') throw new Error(`${selector}: ${JSON.stringify(messages)}`);
        }
      } finally { await context.close(); }
    });
    // One click posts exactly one message (re-counted after 300 ms to catch a delayed second post), from every
    // a[href="#get"] (owner answer 2026-11-06: all Get Hissa CTAs open sign-in) and from nothing else.
    await check('CTA posts once, only from #get links', async () => {
      for (const [w, h, rm] of [[1280, 720, false], [390, 844, true]]) {
        const page = await open(browser, { w, h, rm, embed: true });
        try {
          const frame = page.frameLocator('iframe');
          const total = await frame.locator('a[href="#get"]').count();
          if (total < 8) throw new Error(`${w}: expected at least 8 #get links, found ${total}`);
          for (let i = 0; i < total; i++) {
            await page.evaluate(() => { window.__msgs.length = 0; });
            await frame.locator('a[href="#get"]').nth(i).evaluate(link => link.click());
            await page.waitForTimeout(300);
            const messages = await page.evaluate(() => window.__msgs);
            if (messages.length !== 1 || messages[0] !== 'hissa:explore') throw new Error(`${w} link ${i}: ${JSON.stringify(messages)}`);
          }
          await page.evaluate(() => { window.__msgs.length = 0; });
          await frame.locator('#get').focus();
          await page.keyboard.press('Enter');
          await page.waitForTimeout(300);
          if ((await page.evaluate(() => window.__msgs)).length !== 1) throw new Error(`${w}: keyboard Enter on #get did not post exactly once`);
          const others = await frame.locator('a:not([href="#get"])').evaluateAll(els => els.map((el, i) => (el.closest('noscript') ? null : i)).filter(i => i !== null));
          for (const i of others) {
            await page.evaluate(() => { window.__msgs.length = 0; });
            await frame.locator('a:not([href="#get"])').nth(i).evaluate(link => link.click());
            await page.waitForTimeout(30);
            if (await page.evaluate(() => window.__msgs.length)) throw new Error(`${w}: non-#get link ${i} posted a host message`);
          }
          if (page.pageErrors.length) throw new Error(page.pageErrors.join('\n'));
        } finally { await page.context().close(); }
      }
    });
  } finally {
    await browser.close();
    server?.close();
  }
  for (const [name, status, detail] of results) process.stdout.write(`${status.padEnd(4)} ${name}${detail ? `: ${detail}` : ''}\n`);
  if (results.some(([, status]) => status === 'FAIL')) process.exitCode = 1;
}
