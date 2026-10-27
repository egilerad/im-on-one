import test from 'node:test';
import assert from 'node:assert/strict';
import {compile,evaluateAt} from '../language.mjs';
test('object, action, rhythm and space are independent numeric lines',()=>{
const {values:v,errors}=evaluateAt(compile('metal 1\nsize 2\nplace .3\nstrike .4\nevery 3\ndecay 4\necho .6\nreach 8'),{t:20,depth:.5});
assert.deepEqual(errors,[]); for(const [k,n] of Object.entries({metal:1,size:2,place:.3,strike:.4,every:3,decay:4,echo:.6,reach:8}))assert.equal(v[k],n);
assert.equal(v.a,null);assert.equal(v.walk,0);
});
test('material limits reject unsafe densities and invalid geometry',()=>{
for(const s of ['size 0','size 5','place -1','strike 2','every -1','every .01','decay 30','echo 2','reach 0'])assert.throws(()=>compile(s),/line 1:/,s);
assert.equal(evaluateAt(compile('every 0'),{}).values.every,0);
});
