import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-first-run']
});
const page = await browser.newPage();
page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE-ERR:', m.text().slice(0, 300)));
page.on('pageerror', (e) => console.log('PAGE-ERR:', e.message.slice(0, 300)));
await page.goto('http://localhost:5173/login/brand', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 1500));
const html = await page.evaluate(() => document.body.innerText.slice(0, 500));
console.log('BODY TEXT:\n' + html);
console.log('inputs:', await page.$$eval('input', (els) => els.map((e) => e.type)));
await browser.close();
