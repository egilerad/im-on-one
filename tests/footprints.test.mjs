import test from 'node:test';
import assert from 'node:assert/strict';
import {footprintOpacity} from '../marks.mjs';
test('footprints expire completely within six seconds, including repeat visits',()=>{
 const step={type:'step',time:10};
 assert.ok(footprintOpacity(step,10)>0);
 assert.ok(footprintOpacity(step,12)<footprintOpacity(step,10));
 assert.equal(footprintOpacity(step,16),0);
 assert.equal(footprintOpacity(step,1000),0);
 assert.equal(footprintOpacity(step,9),0);
 assert.ok(footprintOpacity({...step,type:'person'},10)<footprintOpacity(step,10));
});
