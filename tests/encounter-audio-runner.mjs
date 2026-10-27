import {chromium} from '/Users/egilerad/Projects/interval-field/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage(), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${(process.env.BASE_URL ?? 'http://localhost:8782').replace(/\/$/,'')}/tests/encounter-audio.html`);
  await page.waitForFunction(()=>window.encounterAudioResults,{},{timeout:180000});
  const result=await page.evaluate(()=>window.encounterAudioResults);
  console.log(JSON.stringify({...result,pageErrors:errors},null,2));
  if(!result.pass || errors.length) process.exitCode=1;
} finally {await browser.close();}
