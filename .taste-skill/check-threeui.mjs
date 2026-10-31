import { Browser, sleep } from 'file:///C:/Users/ASUS/.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import assert from 'node:assert/strict';
const browser = await Browser.launch();
try {
 const page=await browser.newPage({width:1440,height:900});
 await page.goto('http://localhost:3000'); await sleep(2500);
 assert.equal(await page.eval(()=>document.querySelectorAll('.kosh3d-canvas canvas').length),2);
 assert.equal(await page.eval(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'.taste-skill/threeui-desktop.jpg'});
 await page.eval(()=>window.scrollTo(0,document.querySelector('#story').offsetTop+600));await sleep(500);
 await page.screenshot({path:'.taste-skill/threeui-network.jpg'});
 await page.setViewport({width:390,height:844,mobile:true});await page.eval(()=>window.scrollTo(0,0));await sleep(500);
 assert.equal(await page.eval(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'.taste-skill/threeui-mobile.jpg'});
 await page.eval(()=>window.scrollTo(0,document.querySelector('#story').offsetTop+300));await sleep(500);
 await page.screenshot({path:'.taste-skill/threeui-mobile-network.jpg'});
 await page.eval(()=>{const input=document.querySelector('input[type="range"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'15000');input.dispatchEvent(new Event('input',{bubbles:true}));});await sleep(300);
 assert.ok(await page.eval(()=>document.body.innerText.includes('12 months')));
 await page.eval(()=>window.scrollTo(0,document.querySelector('#decisions').offsetTop));await sleep(300);
 await page.screenshot({path:'.taste-skill/threeui-slider.jpg'});
 console.log('Two WebGL scenes mounted; desktop/mobile overflow and interactive calculator passed. Errors:',page.consoleErrors);
}finally{await browser.close();}
