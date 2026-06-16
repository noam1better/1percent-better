const { Telegraf } = require('telegraf');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) { console.error('BOT_TOKEN required'); process.exit(1); }

const bot = new Telegraf(BOT_TOKEN);
bot.start((ctx) => ctx.reply('Hello Noam, your agent is ready!'));

const FIREBASE_URL = 'https://better-de9aa.firebaseapp.com/';

// ── secure cleanup ────────────────────────────────────────────────────────────
// Overwrite file contents with zeros before unlinking — prevents recovery of
// sensitive screenshot data from disk (important for financial/regulated use).
function secureDelete(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const size = fs.statSync(filePath).size;
    const fd = fs.openSync(filePath, 'r+');
    fs.writeSync(fd, Buffer.alloc(size), 0, size, 0);
    fs.closeSync(fd);
    fs.unlinkSync(filePath);
  } catch {
    try { fs.unlinkSync(filePath); } catch {}
  }
}

function secureDeleteDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) secureDelete(path.join(dir, f));
  fs.rmdirSync(dir);
}

// ── logging ───────────────────────────────────────────────────────────────────
function log(step, status, detail = '') {
  const icon = status === 'OK' ? '✅' : status === 'FAIL' ? '❌' : 'ℹ️';
  console.log(`${icon} [${step}] ${status}${detail ? ' — ' + detail : ''}`);
}

// ── click by text (JS, no puppeteer visibility checks) ────────────────────────
async function jsClick(page, texts, timeout = 3000) {
  const list = [].concat(texts);
  return Promise.race([
    page.evaluate((labels) => {
      const all = Array.from(document.querySelectorAll('*'));
      for (const label of labels) {
        const lc = label.toLowerCase();
        const el =
          all.find((e) => (e.textContent || '').trim().toLowerCase() === lc && e.children.length === 0) ||
          all.find((e) => (e.textContent || '').trim().toLowerCase().includes(lc) && e.children.length === 0);
        if (el) { el.click(); return label; }
      }
      return null;
    }, list),
    new Promise((_, r) => setTimeout(() => r(new Error('jsClick timeout')), timeout)),
  ]);
}

// ── frame helpers ─────────────────────────────────────────────────────────────
async function snap(page, dir, index, label) {
  const p = path.join(dir, `frame_${String(index).padStart(2, '0')}_${label}.png`);
  await page.screenshot({ path: p });
  console.log(`📸 Frame ${index}: ${label}`);
  return p;
}

// ── message handler ───────────────────────────────────────────────────────────
bot.on('message', async (ctx) => {
  const text = (ctx.message.text || '').trim();

  if (text.toLowerCase() === 'generate video') {
    console.log('Video trigger detected!');
    return runFlow(ctx, FIREBASE_URL);
  }
  if (/^https?:\/\//i.test(text)) {
    return runFlow(ctx, text);
  }
});

async function runFlow(ctx, url) {
  await ctx.reply('📸 Capturing frames...');

  const runId  = Date.now();
  const dir    = path.join('/tmp', `frames_${runId}`);
  fs.mkdirSync(dir, { recursive: true });

  const frames = [];
  const qaLog  = [];
  const pass   = (s, d) => { log(s, 'OK', d);          qaLog.push(`✅ ${s}`); };
  const fail   = (s, e) => { log(s, 'FAIL', e.message); qaLog.push(`❌ ${s}: ${e.message.split('\n')[0]}`); };

  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });

    // 1 — Load
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      frames.push(await snap(page, dir, frames.length + 1, 'loaded'));
      pass('Load page');
    } catch (e) { fail('Load page', e); throw e; }

    if (url.includes('better-de9aa.firebaseapp.com')) {

      // 2 — Language
      try {
        await jsClick(page, 'English', 3000);
        await new Promise((r) => setTimeout(r, 600));
        frames.push(await snap(page, dir, frames.length + 1, 'language'));
        pass('Click English');
      } catch (e) { fail('Click English', e); }

      // 3 — Skip
      try {
        await jsClick(page, ['Skip', 'דלג'], 3000);
        await new Promise((r) => setTimeout(r, 600));
        frames.push(await snap(page, dir, frames.length + 1, 'skip'));
        pass('Click Skip');
      } catch (e) { fail('Click Skip', e); }

      // 4 — Guest login
      try {
        const hit = await jsClick(page, 'המשך כמתאמן אורח', 3000);
        if (!hit) throw new Error('Element not found');
        await new Promise((r) => setTimeout(r, 1000));
        frames.push(await snap(page, dir, frames.length + 1, 'guest_loading'));
        await new Promise((r) => setTimeout(r, 1000));
        frames.push(await snap(page, dir, frames.length + 1, 'dashboard'));
        pass('Guest login');
      } catch (e) { fail('Guest login', e); throw e; }

      // 5 — Verify dashboard
      try {
        const body = await page.evaluate(() => document.body.innerText);
        const hit = ['Tasks', 'Habits', 'Monk Mode'].find((kw) => body.includes(kw));
        if (!hit) throw new Error('No dashboard keywords');
        pass('Verify dashboard', hit);
      } catch (e) { fail('Verify dashboard', e); }

      // 6 — PATHS tab
      try {
        const hit = await jsClick(page, ['PATHS', 'Paths', 'paths'], 3000);
        if (!hit) throw new Error('PATHS not found');
        await new Promise((r) => setTimeout(r, 1000));
        frames.push(await snap(page, dir, frames.length + 1, 'paths_tab'));
        await new Promise((r) => setTimeout(r, 500));
        frames.push(await snap(page, dir, frames.length + 1, 'paths_loaded'));
        pass('Click PATHS tab');
      } catch (e) { fail('Click PATHS tab', e); }

      // 7 — Product track
      try {
        const hit = await jsClick(page, ['בניית מוצר דיגיטלי', 'מוצר דיגיטלי'], 3000);
        if (!hit) throw new Error('Track not found');
        await new Promise((r) => setTimeout(r, 1000));
        frames.push(await snap(page, dir, frames.length + 1, 'track_loading'));
        await new Promise((r) => setTimeout(r, 1000));
        frames.push(await snap(page, dir, frames.length + 1, 'track_loaded'));
        pass('Click product track', hit);
      } catch (e) { fail('Click product track', e); }

      // 8 — Verify track
      try {
        const body = await page.evaluate(() => document.body.innerText);
        const hit  = ['בניית מוצר דיגיטלי', 'מוצר דיגיטלי', 'שלב', 'Step', 'Digital'].find((kw) => body.includes(kw));
        const h1   = await page.evaluate(() => document.querySelector('h1,h2')?.textContent?.trim() || null);
        if (!hit && !h1) throw new Error('No track content detected');
        frames.push(await snap(page, dir, frames.length + 1, 'final'));
        pass('Verify product track', h1 || `keyword: ${hit}`);
      } catch (e) {
        frames.push(await snap(page, dir, frames.length + 1, 'final'));
        fail('Verify product track', e);
      }
    }

    // ── Send QA summary ───────────────────────────────────────────────────────
    const allPassed = qaLog.every((l) => l.startsWith('✅'));
    await ctx.reply([
      allPassed ? '✅ QA PASSED' : '⚠️ QA COMPLETED WITH ISSUES',
      ...qaLog,
    ].join('\n'));

    // ── Send frames as media group (max 10 per group) ─────────────────────────
    if (frames.length === 0) throw new Error('No frames captured');

    const chunks = [];
    for (let i = 0; i < frames.length; i += 10) chunks.push(frames.slice(i, i + 10));

    for (const [ci, chunk] of chunks.entries()) {
      const media = chunk.map((p, i) => ({
        type: 'photo',
        media: { source: p },
        ...(i === 0 && ci === 0 ? { caption: '🚀 1% Better — Digital Product Path walkthrough' } : {}),
      }));
      await ctx.replyWithMediaGroup(media);
    }

    log('Done', 'OK', `${frames.length} frames sent`);

  } catch (err) {
    log('Unhandled', 'FAIL', err.message);
    await ctx.reply(`❌ Unhandled error: ${err.message}`);
  } finally {
    if (browser) await browser.close();
    secureDeleteDir(dir);
  }
}

bot.launch();
console.log('Bot running...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
