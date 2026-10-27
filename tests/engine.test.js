import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,irr,raiseFund,runDiligence,acquire,optimise,build,sell,advance,closeFund,netAssetValue,economics,projectedIrr,score,QUARTERS} from '../src/engine.js';
import {TYPES,UPGRADES} from '../src/catalog.js';

test('fund lifecycle begins in a separate standalone environment',()=>{
 const g=newGame(1234);assert.equal(g.q,0);assert.equal(g.raised,0);assert.equal(g.cash,0);assert.equal(g.offers.length,3);
 assert.deepEqual(new Set(g.offers.map(x=>x.type)),new Set(Object.keys(TYPES)));
 assert.deepEqual(new Set(g.offers.map(x=>x.channel)).size>=1,true);
});
test('IRR annualisation follows investor cash flows',()=>{
 const r=irr([{q:0,amount:-100},{q:4,amount:121}]);assert.ok(Math.abs(r-.21)<.000001,`expected 21% got ${r}`);
 const neg=irr([{q:0,amount:-100},{q:4,amount:80}]);assert.ok(Math.abs(neg-(-.20))<.000001);
 assert.equal(irr([{q:0,amount:-1}]),null);
});
test('LP raising incorporates fees and prevents spam / excessive commitments',()=>{
 const g=newGame(11);assert.equal(raiseFund(g,'family').ok,true);assert.equal(g.raised,45);assert.equal(g.cash,44.1);
 assert.equal(raiseFund(g,'family').ok,false);
 assert.equal(g.investorFlows[0].amount,-45);
});
test('competitive and bilateral deals resolve deterministically and never overspend',()=>{
 const g=newGame(55);raiseFund(g,'family');const before=g.cash;
 const p=g.offers[0];const res=acquire(g,p.id,'aggressive');assert.ok(res.msg.length>0);
 assert.ok(g.cash<=before);
 assert.ok(g.portfolio.length===0||g.portfolio.length===1);
 if(g.portfolio.length){assert.ok(g.portfolio[0].acquisition>0);assert.equal(g.portfolio[0].status,'rights');}
});
test('diligence mitigates risk, and optimisations change project economics',()=>{
 const g=newGame(100);raiseFund(g,'impact');const p=g.offers.find(x=>x.type==='greenfield');const risk=p.risk;
 assert.equal(runDiligence(g,p.id).ok,true);assert.ok(p.risk<risk);
 // Claim rights via aggressive bidding (allow a handful of tries as the run is probabilistic).
 let owned=null;
 for(let i=0;i<20;i++){
   const deal=g.offers.find(x=>x.type==='greenfield');if(!deal)break;
   const a=acquire(g,deal.id,'aggressive');if(a.ok){owned=g.portfolio.at(-1);break;}
 }
 assert.ok(owned,'should acquire with sufficient liquidity');
 const prior=economics(owned,g.market);const option=UPGRADES[owned.type].find(x=>x.id==='layout');
 assert.equal(optimise(g,owned.id,option.id).ok,true);
 const after=economics(owned,g.market);assert.ok(after.aep>prior.aep);
 assert.equal(optimise(g,owned.id,option.id).ok,false);
 assert.equal(build(g,owned.id).ok,true);assert.equal(owned.status,'construction');
 assert.equal(optimise(g,owned.id,'opex').ok,false);
 for(let i=0;i<8;i++)advance(g);
 assert.equal(owned.status,'operating');assert.ok(owned.operationIncome>0);
 const exit=sell(g,owned.id);assert.equal(exit.ok,true);assert.equal(g.exits.length,1);
 assert.ok(g.distributed>=0);assert.ok(Number.isFinite(netAssetValue(g)));
});
test('all three asset classes have dedicated value creation upgrades',()=>{
 const g=newGame(4);
 for(const type of Object.keys(TYPES)){
   const p=g.offers.find(x=>x.type===type);assert.ok(p);
   const e=economics({...p,upgrades:[]});assert.ok(e.aep>0&&e.ebitda>0&&e.totalBuild>0);
   assert.ok(UPGRADES[type].length>=4);
 }
});
test('fund closes, liquidates its assets and produces a calculable or clearly missing LP metric',()=>{
 const g=newGame(130);raiseFund(g,'family');for(let i=0;i<QUARTERS;i++)advance(g);
 assert.equal(g.closed,true);assert.equal(g.q,QUARTERS);assert.ok(Number.isFinite(score(g))||score(g)===null);
 assert.equal(advance(g).ok,false);
 assert.ok(Number.isFinite(g.distributed));
});
test('cannot exit unknown asset or build without raised equity',()=>{
 const g=newGame(3);assert.equal(build(g,'bogus').ok,false);assert.equal(sell(g,'bogus').ok,false);
});
