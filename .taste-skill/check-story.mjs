import {Browser,sleep} from 'file:///C:/Users/ASUS/.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import assert from 'node:assert/strict';
const browser=await Browser.launch();
try{
const page=await browser.newPage({width:1440,height:900});await page.goto('http://localhost:3000');await sleep(1500);
assert.equal(await page.eval(()=>document.querySelectorAll('.kosh3d-canvas canvas').length),2);
await page.screenshot({path:'.taste-skill/story-wallet.jpg'});
for(const p of [.05,.5,.95]){await page.eval(p=>{const s=document.querySelector('#story');scrollTo(0,s.offsetTop+p*(s.offsetHeight-innerHeight));},p);await sleep(800);await page.screenshot({path:`.taste-skill/story-${p}.jpg`});}
assert.equal(await page.eval(()=>document.querySelector('.koshLanding_steps button[aria-pressed=true]').textContent.includes('See what comes next')),true);
await page.eval(()=>document.querySelector('.koshLanding_steps button').click());await sleep(1500);
assert.equal(await page.eval(()=>document.querySelector('.koshLanding_steps button').getAttribute('aria-pressed')),'true');
await page.setViewport({width:390,height:844,mobile:true});await page.eval(()=>{const s=document.querySelector('#story');scrollTo(0,s.offsetTop+.95*(s.offsetHeight-innerHeight))});await sleep(800);
assert.equal(await page.eval(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'.taste-skill/story-mobile.jpg'});
await page.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await sleep(300);
assert.equal(await page.eval(()=>getComputedStyle(document.querySelector('.koshLanding_stage')).position),'relative');
console.log('WebGL scenes, all story stages, chapter navigation, mobile overflow and reduced motion passed. Errors:',page.consoleErrors);
}finally{await browser.close()}
