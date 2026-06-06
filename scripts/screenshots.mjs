#!/usr/bin/env node
/* Скриншоты лендинга через предустановленный Playwright Chromium (/opt/pw-browsers).
   Запуск: node scripts/screenshots.mjs [путь_к_html]
   Окружение: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers, NODE_PATH=глобальные модули. */
// Браузер берётся из предустановленного кэша; CDN Playwright недоступен в окружении.
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/pw-browsers';
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, resolve } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const htmlPath = resolve(root, process.argv[2] || 'index.html');
const outDir = resolve(root, 'screenshots');
mkdirSync(outDir, { recursive: true });

const url = pathToFileURL(htmlPath).href;
const widths = [320, 375, 1280];

const shot = async (page, name) => {
  await page.screenshot({ path: resolve(outDir, name), fullPage: true });
  console.log('  →', name);
};

(async () => {
  const browser = await chromium.launch({ headless: true });

  // 1) Полностраничные на трёх ширинах
  for (const w of widths) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await page.evaluate(() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('in')));
    await page.waitForTimeout(300);
    await shot(page, `full-${w}.png`);
    await page.close();
  }

  // Хелпер: страница нужной ширины с раскрытыми reveal
  const open = async (w) => {
    const page = await browser.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('in')));
    await page.waitForTimeout(300);
    return page;
  };

  // 2) Hero (375) — ждём, пока эффект печати выведет фразу целиком
  let page = await open(375);
  await page.waitForFunction(() => {
    const t = (document.getElementById('type')?.textContent || '').trim();
    return ['где теряются деньги', 'где проседает касса', 'где скрыта прибыль'].includes(t);
  }, { timeout: 8000 });
  await page.locator('#s0').screenshot({ path: resolve(outDir, 'hero-375.png') });
  console.log('  → hero-375.png');
  await page.close();

  // 3) Мини-аудит с выводом (1280): отметить зоны + ответить на вопросы → вывод
  page = await open(1280);
  await page.locator('.leak[data-zone="cashgap"]').click();
  await page.locator('.leak[data-zone="receivables"]').click();
  for (const q of ['q1', 'q2', 'q3']) {
    const blocks = page.locator('.q-block');
    // выбрать «худший» (последний) вариант в каждом вопросе
    const idx = ['q1', 'q2', 'q3'].indexOf(q);
    await blocks.nth(idx).locator('.q-opt').last().click();
  }
  await page.waitForTimeout(500);
  await page.locator('#core').screenshot({ path: resolve(outDir, 'audit-verdict-1280.png') });
  console.log('  → audit-verdict-1280.png');
  // тот же аудит на телефоне
  await page.close();
  page = await open(375);
  await page.locator('.leak[data-zone="cashgap"]').click();
  await page.locator('.q-block').first().locator('.q-opt').last().click();
  await page.waitForTimeout(500);
  await page.locator('#verdict').scrollIntoViewIfNeeded();
  await page.locator('#verdict').screenshot({ path: resolve(outDir, 'audit-verdict-375.png') });
  console.log('  → audit-verdict-375.png');
  await page.close();

  // 4) Секция «в кармане» с мокапом телефона (1280 и 375)
  for (const w of [1280, 375]) {
    page = await open(w);
    await page.locator('#pocket').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.locator('#pocket').screenshot({ path: resolve(outDir, `pocket-${w}.png`) });
    console.log(`  → pocket-${w}.png`);
    await page.close();
  }

  // 4b) Секции по отдельности (375): объединённый блок, тарифы, сценарии, AI, CTA
  for (const [sel, name] of [['#tools', 'get-375'], ['#tariffs', 'tariffs-375'], ['#cases', 'scenarios-375'], ['#ai', 'ai-375'], ['#final', 'cta-375']]) {
    page = await open(375);
    await page.locator(sel).scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.locator(sel).screenshot({ path: resolve(outDir, `${name}.png`) });
    console.log(`  → ${name}.png`);
    await page.close();
  }

  // 5) Активный бот-гид (1280): разбудить искрой, дать дойти и показать бабл
  page = await open(1280);
  await page.locator('#waker').click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: resolve(outDir, 'bot-guide-1280.png') });
  console.log('  → bot-guide-1280.png');
  await page.close();

  // 5b) Бот-гид в НИЖНЕЙ полосе на мобиле (375) — гуляет, не загораживает контент
  page = await open(375);
  await page.locator('#waker').click();
  await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById('tools').scrollIntoView());
  await page.waitForTimeout(1500); // бот доходит и показывает реплику
  await page.screenshot({ path: resolve(outDir, 'bot-mobile-375.png') }); // только вьюпорт
  console.log('  → bot-mobile-375.png');
  await page.close();

  await browser.close();
  console.log('Готово. Скриншоты в', outDir);
})().catch(e => { console.error('Ошибка скриншотов:', e); process.exit(1); });
