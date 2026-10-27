import {TEMPLATES, TYPES, FUNDRAISE, UPGRADES} from './catalog.js';

export const QUARTERS = 24;
const round = x => Math.round(x * 10000) / 10000;
const clamp = (x,min,max) => Math.max(min,Math.min(max,x));
export const freshId = () => typeof crypto!=='undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random()}`;
export const randomStep = state => {
  state.seed=(Math.imul(state.seed,1664525)+1013904223)>>>0;
  return state.seed/4294967296;
};
export function newGame(seed=Date.now()>>>0){
  const game={id:freshId(), seed:seed>>>0, q:0, closed:false, capital:0,cash:0,
    feesPaid:0,feesOwed:0, carryPaid:0, distributed:0, raised:0, trackRecord:0,
    lastRaise:-5, market:{price:1,valuation:1,rate:1,sentiment:66},
    offers:[],portfolio:[],exits:[],investorFlows:[],history:[],notes:[],mode:'normal'};
  game.offers=dealPipeline(game);
  addNote(game,'Fund mandate established. Raise your first LP commitments to start acquiring projects.');
  return game;
}
export function addNote(g,text){g.notes.unshift({q:g.q,text});g.notes=g.notes.slice(0,28);}
export function seasonLabel(q){return `Y${Math.floor(q/4)+1} · Q${q%4+1}`;}
export function dealPipeline(g){
  const order=['greenfield','brownfield','hybrid'];
  return order.map((type,index)=>{
    const pool=TEMPLATES.filter(d=>d.type===type);
    const template=pool[(Math.floor(g.q/2)+index+Math.floor(randomStep(g)*pool.length))%pool.length];
    const noise=(randomStep(g)-.5)*.08;
    return {...structuredClone(template),id:freshId(),q:g.q,expiry:g.q+2,
      rights:round(template.rights*(1+noise)),risk:clamp(template.risk+noise/4,.05,.27),
      channel:(g.q+index)%3===0 ? (template.channel==='auction'?'direct':'auction') : template.channel,
      diligence:false,discovered:null};
  });
}
export const capex = project => {
  // Upsizing turbines or the battery also increases funded construction costs.
  // Senior project debt finances 60%; the fund contributes the other 40%.
  let mw=project.mw,bess=project.bess||0;
  for(const key of project.upgrades||[]){
    const u=UPGRADES[project.type]?.find(x=>x.id===key);
    if(u?.mwFactor)mw*=u.mwFactor;
    if(u?.bessFactor)bess*=u.bessFactor;
  }
  return mw*project.capex + (project.type==='hybrid'?bess*.31:0);
};
export const equityBuild = project => capex(project)*.40;
export const projectDebt = project => capex(project)*.60;
export function effective(p){
  const v={mw:p.mw,cf:p.cf,bess:p.bess||0,opexFactor:1,windYield:1,bessMargin:1,ppa:null,risk:p.risk};
  for(const k of p.upgrades||[]){const o=UPGRADES[p.type]?.find(x=>x.id===k);if(!o)continue;
    if(o.mwFactor)v.mw*=o.mwFactor;
    if(o.yieldFactor)v.windYield*=o.yieldFactor;
    if(o.opexFactor)v.opexFactor*=o.opexFactor;
    if(o.bessFactor)v.bess*=o.bessFactor;
    if(o.bessFactorMargin)v.bessMargin*=o.bessFactorMargin;
    if(o.ppaPrice)v.ppa=o.ppaPrice;
    v.risk+=o.riskAdd||0;
  }
  v.risk=clamp(v.risk,.015,.32);return v;
}
export function economics(p,market={price:1,valuation:1,rate:1}){
  const v=effective(p);const aep=v.mw*8760*v.cf*v.windYield/1000;
  const realisedPrice=v.ppa??p.price*(market.price||1);
  const windRevenue=aep*realisedPrice/1000;
  const opex=v.mw*(p.type==='brownfield'?.051:.047)*v.opexFactor;
  const bessGross=v.bess*.26*v.bessMargin/100; // 100MWh ≈ €0.26m at baseline cycles/margins; deliberate conservative range
  const ebitda=windRevenue+bessGross-opex;
  const debt=projectDebt(p);
  const yieldRate=clamp(.083+(market.rate-1)*.06+v.risk*.025,.067,.115);
  const ev=Math.max(0,ebitda/yieldRate)*(market.valuation||1);
  const equityValue=Math.max(0,ev-debt);
  return {aep,windRevenue,opex,bessGross,ebitda,debt,ev,equityValue,yieldRate,effective:v,realisedPrice,
    totalBuild:capex(p),equityBuild:equityBuild(p)};
}
function recordCash(p,q,v){p.cashflows.push({q,amount:round(v)});}
export function raiseFund(g,id){
  if(g.closed)return {ok:false,msg:'The fund has already been wound down.'};
  const o=FUNDRAISE.find(t=>t.id===id);if(!o)return {ok:false,msg:'Unknown investor mandate.'};
  if(g.q-g.lastRaise<o.cooldown)return {ok:false,msg:'Investor relations needs more time before another capital closing.'};
  if(g.exits.length<o.minimumExits)return {ok:false,msg:'Institutional LPs require at least one completed project exit.'};
  if(g.raised+o.amount>500)return {ok:false,msg:'Fund mandate capped at €500m of cumulative equity commitments.'};
  if(o.id==='impact' && g.market.sentiment<35)return {ok:false,msg:'Investor confidence is too low for an impact fundraise this quarter.'};
  g.raised=round(g.raised+o.amount);
  const cost=round(o.amount*o.fee);
  g.cash=round(g.cash+o.amount-cost);g.feesPaid+=cost;
  g.investorFlows.push({q:g.q,amount:-o.amount,label:o.name});
  g.lastRaise=g.q;g.market.sentiment=clamp(g.market.sentiment+o.sentiment,15,95);
  addNote(g,`${o.name} closed €${o.amount}m in LP capital; fundraising costs €${cost.toFixed(2)}m.`);
  return {ok:true,msg:`€${o.amount}m raised from ${o.name}.`};
}
export function runDiligence(g,id){
  const p=g.offers.find(x=>x.id===id);if(!p)return {ok:false,msg:'The opportunity is no longer in the market.'};
  if(p.diligence)return {ok:false,msg:'The data room has already been reviewed.'};
  if(g.cash<.38)return {ok:false,msg:'You need €0.38m available for technical and legal diligence.'};
  g.cash=round(g.cash-.38);p.diligence=true;
  const hidden=randomStep(g);
  p.discovered=hidden < p.risk ? 'Permitting, grid or construction risk is elevated.' : 'No major red flags identified.';
  p.risk=clamp(p.risk-.035,.025,.32);
  addNote(g,`Due diligence completed on ${p.name}. ${p.discovered}`);
  return {ok:true,msg:`Due diligence complete: ${p.discovered}`};
}
export function acquire(g,id,bid='base'){
  if(g.closed)return {ok:false,msg:'Fund closed.'};
  const p=g.offers.find(x=>x.id===id);if(!p)return {ok:false,msg:'This opportunity is no longer available.'};
  const factors={conservative:.96,base:1.05,aggressive:1.18};if(!(bid in factors))return {ok:false,msg:'Unknown bid strategy.'};
  const multiplier=p.channel==='auction'?factors[bid]:(bid==='conservative'?.89:bid==='base'?.99:1.08);
  const price=round(p.rights*multiplier);
  const fee=round(price*(p.channel==='auction'?.018:.025));
  const total=price+fee;
  if(g.cash<total+2)return {ok:false,msg:'Insufficient liquidity after required €2m operating reserve.'};
  const winProbability=p.channel==='auction'?({conservative:.35,base:.65,aggressive:.93})[bid]:({conservative:.49,base:.80,aggressive:.96})[bid];
  const win=randomStep(g)<winProbability;
  if(!win){const aborted=round(Math.min(.28,g.cash));g.cash=round(g.cash-aborted);g.offers=g.offers.filter(x=>x.id!==id);addNote(g,`${p.name}: bid unsuccessful. €${aborted.toFixed(2)}m in advisory costs.`);return {ok:false,msg:`Bid unsuccessful. ${p.channel==='auction'?'The seller chose a competing buyer.':'The seller declined exclusivity.'}`};}
  const risk=randomStep(g);let surprise=0;
  if(risk<p.risk*(p.diligence?.45:1)){surprise=round(price*.10);if(g.cash<total+surprise+2)return {ok:false,msg:'Unexpected diligence finding. Insufficient capital to close safely.'};}
  const actual=round(total+surprise);
  g.cash=round(g.cash-actual);g.feesPaid=round(g.feesPaid+fee);
  const owned={...p, acquisition:actual,acquiredQ:g.q,capexBase:capex(p),status:'rights',buildFinish:null,
    upgrades:[],upgradeCosts:0,upgradeMonths:0,cashflows:[{q:g.q,amount:-actual}],operationIncome:0,hiddenSurprise:surprise};
  g.portfolio.push(owned);g.offers=g.offers.filter(x=>x.id!==id);
  g.market.sentiment=clamp(g.market.sentiment+1,15,95);
  addNote(g,`${p.channel==='auction'?'Competitive bid won':'Direct acquisition closed'}: ${p.name} for €${actual.toFixed(2)}m all-in.${surprise?' Additional issue discovered during closing.':''}`);
  return {ok:true,msg:`Acquired ${p.name} for €${actual.toFixed(2)}m.`};
}
export function optimise(g,id,upgradeId){
  const p=g.portfolio.find(x=>x.id===id);if(!p)return {ok:false,msg:'Asset not found.'};
  if(p.status!=='rights')return {ok:false,msg:'Engineering upgrades must be completed before construction starts.'};
  const u=UPGRADES[p.type]?.find(x=>x.id===upgradeId);if(!u)return {ok:false,msg:'Upgrade not available for this project.'};
  if(p.upgrades.includes(upgradeId))return {ok:false,msg:'This optimisation has already been delivered.'};
  if(g.cash<u.cost+2)return {ok:false,msg:'Insufficient free cash for engineering and liquidity reserves.'};
  g.cash=round(g.cash-u.cost);p.upgradeCosts=round(p.upgradeCosts+u.cost);
  p.upgradeMonths+=u.q*3;p.upgrades.push(u.id);recordCash(p,g.q,-u.cost);
  addNote(g,`${p.name}: ${u.name} completed. €${u.cost.toFixed(2)}m spent.`);
  return {ok:true,msg:`Optimisation completed: ${u.name}.`};
}
export function build(g,id){
  const p=g.portfolio.find(x=>x.id===id);if(!p||p.status!=='rights')return {ok:false,msg:'Only permitted rights can begin construction.'};
  const required=round(equityBuild(p));
  if(g.cash<required+2)return {ok:false,msg:`Need €${(required+2).toFixed(1)}m including liquidity reserve to finance construction.`};
  g.cash=round(g.cash-required);recordCash(p,g.q,-required);
  p.status='construction';p.buildFinish=g.q+(p.type==='brownfield'?3:4)+Math.ceil(p.upgradeMonths/6);
  p.equityBuildSpent=required;
  addNote(g,`${p.name} reached financial close. €${required.toFixed(1)}m fund equity deployed with 60% construction debt.`);
  return {ok:true,msg:`Construction funded. Expected COD in ${p.buildFinish-g.q} quarters.`};
}
export function exitValue(p,market){
  const e=economics(p,market);
  if(p.status==='operating')return round(Math.max(0,e.equityValue*.982));
  if(p.status==='construction')return round(Math.max(0,(p.acquisition+(p.equityBuildSpent||0)+p.upgradeCosts)*(.91+market.valuation*.055)));
  return round(Math.max(0,(p.acquisition+p.upgradeCosts)*(.83+(p.upgrades?.length||0)*.13)*market.valuation));
}
export function sell(g,id,forced=false){
  const i=g.portfolio.findIndex(p=>p.id===id);if(i<0)return {ok:false,msg:'Asset not found.'};
  const p=g.portfolio[i];const proceeds=exitValue(p,g.market);
  const cost=p.cashflows.filter(c=>c.amount<0).reduce((sum,c)=>sum-c.amount,0);
  const carry=round(Math.max(0,proceeds+p.operationIncome-cost)*.12);
  const net=round(Math.max(0,proceeds-carry));g.carryPaid=round(g.carryPaid+carry);
  recordCash(p,g.q,net);const projectIRR=irr(p.cashflows,g.q);
  p.exitQ=g.q;p.proceeds=net;p.carry=carry;p.projectIRR=projectIRR;p.status='sold';p.exitType=forced?'wind-down':'market';
  g.portfolio.splice(i,1);g.exits.push(p);g.cash=round(g.cash+net);
  // 80% of sale proceeds distributed to LPs, subject to holding a minimal working cash buffer.
  const distribution=round(Math.max(0,Math.min(net*.8,g.cash-4)));
  if(distribution>0){g.cash=round(g.cash-distribution);g.distributed=round(g.distributed+distribution);
    g.investorFlows.push({q:g.q,amount:distribution,label:`${p.name} exit`});}
  g.market.sentiment=clamp(g.market.sentiment+(projectIRR>.12?5:projectIRR<0?-9:1),15,95);
  addNote(g,`${p.name} exited for €${net.toFixed(1)}m net of carry. Project IRR: ${Number.isFinite(projectIRR)?(projectIRR*100).toFixed(1)+'%':'n/a'}. LP distribution: €${distribution.toFixed(1)}m.`);
  return {ok:true,msg:`Exit completed: €${net.toFixed(1)}m net; project IRR ${Number.isFinite(projectIRR)?(projectIRR*100).toFixed(1)+'%':'n/a'}.`};
}
export function advance(g){
  if(g.closed)return {ok:false,msg:'The fund has been wound down.'};
  if(g.q>=QUARTERS)return closeFund(g);
  g.q++;
  const priceJump=(randomStep(g)-.5)*.09, rateJump=(randomStep(g)-.5)*.065, valJump=(randomStep(g)-.5)*.06;
  g.market.price=clamp(g.market.price*(1+priceJump),.68,1.34);
  g.market.rate=clamp(g.market.rate+rateJump,.65,1.45);
  g.market.valuation=clamp(g.market.valuation*(1+valJump),.72,1.27);
  g.market.sentiment=clamp(g.market.sentiment+Math.round((randomStep(g)-.5)*8),15,95);
  const fee=round(g.raised*.011/4);const paid=Math.max(0,Math.min(g.cash,fee+g.feesOwed));
  g.cash=round(g.cash-paid);g.feesPaid=round(g.feesPaid+paid);g.feesOwed=round(Math.max(0,g.feesOwed+fee-paid));
  for(const p of g.portfolio){
    if(p.status==='construction' && g.q>=p.buildFinish){p.status='operating';addNote(g,`${p.name} reached commercial operation (COD).`);}
    if(p.status==='operating'){
      const e=economics(p,g.market);const interest=e.debt*.055*g.market.rate/4;
      const afterInterest=round((e.ebitda/4)-interest);
      g.cash=round(g.cash+afterInterest);p.operationIncome=round((p.operationIncome||0)+afterInterest);
      recordCash(p,g.q,afterInterest);
    }
  }
  g.offers=dealPipeline(g);
  addNote(g,`${seasonLabel(g.q)} market update. Power price index ${(g.market.price*100).toFixed(0)}; rates ${(g.market.rate*100).toFixed(0)}.`);
  g.history.push({q:g.q,cash:g.cash,nav:netAssetValue(g),lpIrr:projectedIrr(g)});
  if(g.q===QUARTERS)return closeFund(g);
  return {ok:true,msg:`Advanced to ${seasonLabel(g.q)}. New M&A opportunities available.`};
}
export function netAssetValue(g){
  return round(Math.max(0,g.cash-g.feesOwed)+g.portfolio.reduce((sum,p)=>sum+exitValue(p,g.market),0));
}
export function irr(flows,terminalQ=null){
  if(!Array.isArray(flows)||flows.length<2)return null;
  const origin=Math.min(...flows.map(f=>f.q));
  const yearly=(r)=>flows.reduce((acc,f)=>acc+f.amount/Math.pow(1+r,(f.q-origin)/4),0);
  let min=-.95,max=8;let y0=yearly(min),y1=yearly(max);
  if(y0*y1>0)return null;
  for(let i=0;i<110;i++){const mid=(min+max)/2,ym=yearly(mid);
    if(Math.abs(ym)<.00001)return mid;
    if(y0*ym>0){min=mid;y0=ym;}else{max=mid;y1=ym;}}
  return (min+max)/2;
}
export function projectedIrr(g){
  if(g.raised<=0||g.q===0)return null;
  const flows=g.investorFlows.map(x=>({...x}));
  const nav=netAssetValue(g);
  flows.push({q:g.q,amount:nav,label:'Unrealised NAV + residual cash'});
  return irr(flows,g.q);
}
export function closeFund(g){
  if(g.closed)return {ok:false,msg:'Fund already closed.'};
  if(g.q<4)return {ok:false,msg:'An investment fund must operate at least four quarters before voluntary liquidation.'};
  // At mandate end remaining assets are sold at current market values.
  for(const p of [...g.portfolio])sell(g,p.id,true);
  const residual=Math.max(0,round(g.cash-g.feesOwed));
  if(residual){g.distributed=round(g.distributed+residual);g.cash=0;g.investorFlows.push({q:g.q,amount:residual,label:'Final fund liquidation'});}
  g.closed=true;g.finalIrr=irr(g.investorFlows,g.q);g.finalMultiple=g.raised?g.distributed/g.raised:0;
  addNote(g,`Final liquidation: net LP IRR ${Number.isFinite(g.finalIrr)?(g.finalIrr*100).toFixed(1)+'%':'n/a'}, distributed capital multiple ${g.finalMultiple.toFixed(2)}x.`);
  return {ok:true,msg:'Fund wound down. Review the final LP performance and optionally submit it to your team leaderboard.'};
}
export const score = g => g.closed && Number.isFinite(g.finalIrr) ? round(g.finalIrr*100) : null;
