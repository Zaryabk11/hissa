/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const html = readFileSync(fileURLToPath(new URL('../../../public/landing-site/index.html', import.meta.url)), 'utf8');

describe('landing site copy', () => {
  it('uses catalog dish names and matching portions', () => {
    expect(html).toContain('Beef karahi');
    expect(html).toContain('Daal, palak, chawal, roti');
    expect(html).toContain('on one plate');
    expect(html).not.toContain('Chicken handi');
    expect(html).not.toContain('Home thali');
    expect(html).toMatch(/Maash daal[\s\S]{0,300}1 katori[\s\S]{0,60}2 roti/);
  });

  it('has five FAQ questions and the approved cost answer', () => {
    expect(html.match(/class="q"/g)).toHaveLength(5);
    expect(html).toContain('The five things people ask first.');
    expect(html).toContain('Hissa is free while it is in early access. We will tell you before that changes.');
    expect(html).not.toContain('Do you keep my photos?');
    expect(html).not.toContain('TODO user');
    for (let n = 1; n <= 5; n++) {
      expect(html).toContain(`id="fq-q${n}" aria-expanded="false" aria-controls="fq-a${n}"`);
      expect(html).toContain(`id="fq-a${n}" role="region" aria-labelledby="fq-q${n}"`);
    }
    expect(html).not.toContain('id="fq-q6"');
  });

  it('shows Bilal with a seven-day streak throughout', () => {
    expect(html).toContain('aria-label="7 day streak"');
    expect(html).toContain('streak 7 days');
    expect(html).not.toContain('streak 4 days');
  });

  it('uses neutral privacy wording', () => {
    expect(html.match(/Cheer streaks, nudge gently\./g)).toHaveLength(2);
    expect(html).toContain('Your username, your display name, whether you logged today, your streak, nudge status, and a goal if you choose to share it.');
    expect(html).not.toMatch(/never what you ate|Never your meals|Very little/i);
  });

  it('labels kcal values as estimates', () => {
    for (const match of html.matchAll(/kcal/gi)) {
      const index = match.index;
      expect(html.slice(Math.max(0, index - 120), index + 124)).toMatch(/estimate/i);
    }
  });

  it('has no banned health claims in static copy', () => {
    const copy = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ');
    expect(copy).not.toMatch(/\b(cure|treat|diagnos\w*|healthy|unhealthy|detox|burn|good food|bad food)\b/i);
  });

  it('loads only self-hosted relative assets', () => {
    expect(html).not.toMatch(/googleapis|gstatic|cdn\.|src="\/|href="\/|url\(\/|'\/files\//i);
  });
});

describe('landing site access', () => {
  it('has descriptive metadata and a local saffron favicon', () => {
    expect(html).toContain('<title>Hissa · One more roti is fine</title>');
    expect(html).toContain('<meta name="description" content="Snap your plate. Hissa tells you your portion in roti and katori, like a friend at the dastarkhwan, not a diet app.">');
    expect(html).toContain('<meta name="theme-color" content="#F4B41A">');
    expect(html).toContain('<link rel="icon" href="assets/favicon.svg"');
  });

  it('lets keyboard and no-script visitors reach the content', () => {
    expect(html).toMatch(/<body[^>]*>\s*<a[^>]*href="#main"/);
    expect(html).toContain('<main id="main">');
    expect(html).toMatch(/<noscript>[\s\S]*?#ld\s*\{\s*display:none/);
    expect(html).toMatch(/<noscript>[\s\S]*?main section[^{]*\{[^}]*visibility:visible/);
    expect(html).not.toMatch(/outline:[^;}]*var\(--pk\)/);
  });

  it('hides duplicated stage content from assistive technology', () => {
    expect(html).toMatch(/id="hw-bcopy"[^>]*>/);
    expect(html).toMatch(/id="hw-bcopy"[^>]*>[\s\S]*?<a class="cta g" href="#get">Get Hissa<\/a>/);
    expect(html.match(/id="hw-bcopy"[^>]*>/)?.[0]).not.toMatch(/aria-hidden|inert/);
    expect(html).toMatch(/id="hw-bcopy"[^>]*>[\s\S]*?<div[^>]*aria-hidden="true"[^>]*inert>[\s\S]*?Cheer streaks, nudge gently\./);
    expect(html).toMatch(/id="hw-bs"[^>]*aria-hidden="true"[^>]*inert/);
    expect(html).toMatch(/id="bd"[\s\S]*?class="card c1"[^>]*aria-hidden="true"[^>]*inert/);
    expect(html).toMatch(/id="bd"[\s\S]*?class="card c2"[^>]*aria-hidden="true"[^>]*inert/);
    expect(html).toMatch(/id="bd"[\s\S]*?class="card c3"[^>]*aria-hidden="true"[^>]*inert/);
  });

  it('serves precomputed dish paintings without runtime keying', () => {
    for (const name of ['karahi', 'biryani', 'daal', 'nihari', 'aloogosht', 'haleem', 'palak']) {
      expect(existsSync(fileURLToPath(new URL(`../../../public/landing-site/assets/dishes/${name}.webp`, import.meta.url)))).toBe(true);
    }
    expect(html).toContain("HX.img=function(name){return 'assets/dishes/'+name+'.webp'}");
    expect(html).toContain('loading="lazy"');
    expect(html).not.toMatch(/OffscreenCanvas|nokeyworker|keyLib|HX\.key|HX\.karahi/);
    expect(html).toContain("img.src='assets/karahi-1024.jpg'");
    expect(html).toContain('assets/thali-1024.jpg');
  });
});
