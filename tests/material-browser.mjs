import {chromium} from './tools.mjs';
import assert from 'node:assert/strict';
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
try{
 const p=await b.newPage({viewport:{width:1440,height:900}});const errors=[];p.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
 await p.goto(process.env.BASE_URL||'http://127.0.0.1:8782/');await p.waitForFunction(()=>window.imOnOne);
 await p.locator('#code').fill('sine 110\nmetal 1\nsize 2\nplace .03\necho .6');await p.locator('#play').click();
 await p.waitForFunction(()=>window.imOnOne.time>2);
 assert.equal(await p.evaluate(()=>window.imOnOne.state.events.filter(e=>e.type==='aura').length),0);
 const generation=await p.evaluate(()=>window.imOnOne.generation);
 await p.locator('#code').fill('sine 110\nmetal 1\nsize 2\nplace .03\necho .6\nstrike .4');await p.locator('#code').press('Control+Enter');
 await p.waitForFunction(()=>window.imOnOne.state.events.filter(e=>e.type==='aura').length===1);
 await p.waitForTimeout(800);assert.equal(await p.evaluate(()=>window.imOnOne.state.events.filter(e=>e.type==='aura').length),1);
 await p.locator('#code').press('Control+Enter');await p.waitForFunction(()=>window.imOnOne.state.events.filter(e=>e.type==='aura').length===2);
 await p.locator('#code').fill('sine 110\nmetal 1\nsize 1\nplace .03\necho .6\nstrike .3\nevery 1\npeople 2\nreach 8');await p.locator('#code').press('Control+Enter');
 await p.waitForFunction(()=>window.imOnOne.state.events.filter(e=>e.type==='aura').length>=4,null,{timeout:8000});
 await p.waitForFunction(()=>window.imOnOne.state.events.some(e=>e.type==='contact'),null,{timeout:20000});
 assert.equal(await p.evaluate(()=>window.imOnOne.generation),generation);
 assert.equal(await p.evaluate(()=>window.imOnOne.state.object.size),1);
 await p.screenshot({path:'tests/material-desktop.png'});
 await p.keyboard.press('Escape');assert.deepEqual(errors,[]);
 console.log('pass: silent object placement, one-shot only on apply, reapply strike, repeating strikes, visitor wall contact, persistent graph');
}finally{await b.close();}
