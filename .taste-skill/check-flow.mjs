import { Browser, sleep } from 'file:///C:/Users/ASUS/.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import assert from 'node:assert/strict';
const origin = process.env.KOSH_CHECK_ORIGIN || 'http://localhost:3000';
const browser = await Browser.launch();
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(origin);
  const landing = await page.eval(() => ({ title: document.querySelector('h1')?.textContent, size: getComputedStyle(document.querySelector('h1')).fontSize, nav: !!document.querySelector('nav[aria-label="Main"]'), overflow: document.documentElement.scrollWidth > innerWidth }));
  assert.equal(landing.nav, false); assert.equal(landing.overflow, false); assert.ok(parseFloat(landing.size) > 50);
  await page.eval(() => { const input = document.querySelector('input[type="range"]'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, '15000'); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); });
  await sleep(200);
  assert.ok(await page.eval(() => document.body.innerText.includes('12 months')));
  await page.goto(origin + '/planner');
  assert.ok(await page.eval(() => location.pathname === '/login' && new URLSearchParams(location.search).get('next') === '/planner'));
  await page.goto(origin + '/login');
  const config = await page.eval(async () => (await fetch('/api/auth/session')).json());
  if (config.required) {
    const invalid = await page.eval(async () => (await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode: 'invalid-test-value' }) })).status);
    assert.equal(invalid, 401);
    if (process.env.KOSH_TEST_PASSCODE) {
      await page.eval(passcode => { const input = document.querySelector('input[name="passcode"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, passcode); input.dispatchEvent(new Event('input', { bubbles: true })); }, process.env.KOSH_TEST_PASSCODE);
      await sleep(100);
      await page.eval(() => document.querySelector('form').requestSubmit());
      await sleep(1600);
      assert.equal(await page.eval(() => location.pathname), '/dashboard');
      await page.eval(async () => fetch('/api/auth/logout', { method: 'POST' }));
      await page.goto(origin + '/planner');
      assert.equal(await page.eval(() => location.pathname), '/login');
    }
    console.log('Passcode gate, invalid login, valid login and post-logout protection verified.');
  } else {
    await page.eval(() => document.querySelector('form').requestSubmit());
    await sleep(2200);
    assert.equal(await page.eval(() => location.pathname), '/dashboard');
    assert.ok(await page.eval(() => !!document.querySelector('nav[aria-label="Main"]')));
    assert.equal(await page.eval(async () => (await (await fetch('/api/auth/session')).json()).authenticated), true);
    await page.eval(() => [...document.querySelectorAll('button')].find(button => button.textContent === 'Sign out').click());
    await sleep(1300);
    assert.equal(await page.eval(() => location.pathname), '/');
    await page.goto(origin + '/dashboard');
    assert.equal(await page.eval(() => location.pathname), '/login');
    await page.goto(origin + '/login?next=https://example.com');
    await page.eval(() => document.querySelector('form').requestSubmit());
    await sleep(1600);
    assert.equal(await page.eval(() => location.pathname), '/dashboard');
    console.log('Demo entry, dashboard, session, logout, protected redirect and external-redirect rejection passed.');
  }
  await page.goto(origin);
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await sleep(300);
  assert.equal(await page.eval(() => getComputedStyle(document.querySelector('[data-layer]').parentElement).transform), 'none');
  await page.setViewport({ width: 390, height: 844, mobile: true });
  await page.goto(origin);
  assert.equal(await page.eval(() => document.documentElement.scrollWidth > innerWidth), false);
  console.log('Landing styling, slider calculation, mobile overflow and reduced motion passed.');
  console.log('Runtime errors:', JSON.stringify(page.consoleErrors));
} finally { await browser.close(); }
