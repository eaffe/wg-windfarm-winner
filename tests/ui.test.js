import test from 'node:test';
import assert from 'node:assert/strict';

function setupBrowser(){
  const store=new Map();const handlers={};
  const root={innerHTML:'',addEventListener(type,fn){handlers[type]=fn},querySelector(selector){if(selector.startsWith('#bid-'))return {value:'aggressive'};return null;}};
  const win={addEventListener(){},_boardOptIn:false};
  Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});
  Object.assign(globalThis,{window:win,document:{querySelector:()=>root},
    localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
    CSS:{escape:s=>s},confirm:()=>true,prompt:()=>null});
  return {root,handlers,store};
}

test('entire English game boots offline, navigates and raises capital',async()=>{
  const {root,handlers}=setupBrowser();
  await import('../src/main.js?smoke-test');
  const click=async(dataset)=>handlers.click({target:{closest:()=>({dataset,disabled:false})}});
  assert.match(root.innerHTML,/Build the assets/);
  assert.match(root.innerHTML,/WG/);
  assert.match(root.innerHTML,/Projected LP/i);
  await click({tab:'deals'});
  assert.match(root.innerHTML,/Competitive M&amp;A|Direct Acquisition/);
  assert.match(root.innerHTML,/Greenfield/);
  assert.match(root.innerHTML,/Repowering/);
  assert.match(root.innerHTML,/Hybrid/);
  await click({tab:'investors'});
  assert.match(root.innerHTML,/Secure commitments/);
  await click({action:'raise',id:'family'});
  assert.match(root.innerHTML,/45\.0m/);
  await click({tab:'portfolio'});
  assert.match(root.innerHTML,/No active investments/);
  await click({tab:'dashboard'});
  assert.match(root.innerHTML,/Value creation over time/);
  await click({action:'advance'});
  assert.match(root.innerHTML,/Y1 · Q2/);
  await click({tab:'leaderboard'});
  assert.match(root.innerHTML,/Sign in to compete/);
  assert.match(root.innerHTML,/Create account/);
  assert.match(root.innerHTML,/Email confirmation may be required/);
  assert.ok(!root.innerHTML.includes('undefined'));
});
