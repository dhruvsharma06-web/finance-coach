import {Browser,sleep} from 'file:///C:/Users/ASUS/.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
const browser=await Browser.launch();
try { for(const [name,url] of [['elites','https://elites-ivory.vercel.app/'],['agribot','https://agribot-tech.vercel.app/'],['idr','https://idr-tech.vercel.app/']]){
 const page=await browser.newPage({width:1440,height:900});
 try{await page.goto(url,{timeoutMs:15000,settleMs:2500});console.log(name,await page.eval(()=>({title:document.title,text:document.body.innerText.slice(0,1700),canvas:document.querySelectorAll('canvas').length,height:document.body.scrollHeight})));
 await page.screenshot({path:`.taste-skill/ref-${name}.jpg`});await page.wheel(1200);await sleep(700);await page.screenshot({path:`.taste-skill/ref-${name}-scroll.jpg`});}catch(e){console.log(name,e.message)}await page.close();
 }}finally{await browser.close()}
