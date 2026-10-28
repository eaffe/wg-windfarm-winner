import { TYPES, CHANNELS, FUNDRAISE, UPGRADES, fmt, money, pct } from './catalog.js';
import {newGame,seasonLabel,raiseFund,runDiligence,acquire,optimise,build,sell,advance,closeFund, economics,exitValue,netAssetValue,projectedIrr,score,QUARTERS} from './engine.js';
import {Cloud} from './cloud.js';

const root=document.querySelector('#app');
const cloud=new Cloud();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storageKey='wfw-investment-game-1';
const clone=o=>structuredClone(o);
const loadLocal=()=>{try{const x=JSON.parse(localStorage.getItem(storageKey)||'null');return x&&Array.isArray(x.portfolio)&&Array.isArray(x.exits)&&Number.isInteger(x.q)&&x.q<=QUARTERS&&x.market?x:null;}catch{return null;}};
let game=loadLocal()||newGame();
let tab='dashboard',filter='all',accountPane='login',nickname='',cloudState='not connected',leaderboard=[],busy=false,notice='',error='',uploadTimer=null,saving=false;
try{nickname=localStorage.getItem('wfw-display-name')||'';}catch{}

function flash(msg,negative=false){notice=msg;error=negative?msg:'';render();}
function persist(quick=false){
  try{localStorage.setItem(storageKey,JSON.stringify(game));}catch{}
  if(cloud.user){clearTimeout(uploadTimer);uploadTimer=setTimeout(()=>{void saveCloud();},quick?0:1300);}
}
async function saveCloud(){if(saving||!cloud.user)return;saving=true;
  try{await cloud.save(game);cloudState='Synced';}catch(err){cloudState='Cloud save failed';console.warn('Cloud:',err.message);}finally{saving=false;render();}}
const since=x=>x===null?'—':pct(x);
function kpi(label,value,foot,tone=''){return `<div class="kpi ${tone}"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-foot">${foot}</div></div>`;}
function mark(type){return `<span class="type-icon ${type}">${TYPES[type].icon}</span>`;}
function badge(text,kind=''){return `<span class="badge ${kind}">${esc(text)}</span>`;}
function timebar(){return `<div class="timebar"><div class="timebar-top"><span>FUND LIFECYCLE</span><strong>${seasonLabel(game.q)} / Y6 · Q1</strong></div><div class="track"><div class="fill" style="width:${game.q/QUARTERS*100}%"></div></div></div>`;}
function assetClass(p){return TYPES[p.type]?.name||'Unknown';}
function turbineGraphic(){return `<svg viewBox="0 0 600 320" class="hero-scene" role="img" aria-label="Illustration of offshore wind turbines at dawn">
  <defs><linearGradient id="windsky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#244d43"/><stop offset="1" stop-color="#122a26"/></linearGradient><linearGradient id="windsea"><stop stop-color="#4e8e78"/><stop offset="1" stop-color="#1d5649"/></linearGradient></defs>
  <rect width="600" height="320" fill="url(#windsky)"/><circle cx="395" cy="82" r="60" fill="#c5ead0" opacity=".19"/>
  <path d="M0 222Q120 192 222 224T460 216T600 216V320H0Z" fill="#1b413a"/>
  <path d="M0 267Q150 243 280 269T600 261V320H0Z" fill="url(#windsea)" opacity=".65"/>
  <g stroke="#dcf0da" stroke-linejoin="round" stroke-linecap="round">
    <path d="M130 154L120 298h21Z" fill="#eaf7e8" stroke-width="3"/><circle cx="130" cy="154" r="8" fill="#c3eaa9"/>
    <path d="M130 154L125 45 137 44Z M130 154L203 206 194 216Z M130 154L47 219 38 209Z" fill="#cfe7d9" stroke-width="2"/>
    <path d="M358 132L346 289h24Z" fill="#eaf7e8" stroke-width="4"/><circle cx="358" cy="132" r="9" fill="#cbefb6"/>
    <path d="M358 132L352 7 366 5Z M358 132L452 190 442 201Z M358 132L262 212 254 201Z" fill="#dcefe2" stroke-width="2"/>
    <path d="M516 170L507 288h17Z" fill="#d4e4d8" stroke-width="3"/><circle cx="516" cy="170" r="7" fill="#c3e8a2"/>
    <path d="M516 170L513 91 522 90Z M516 170L574 211 569 219Z M516 170L463 218 458 211Z" fill="#c8e0d0" stroke-width="2"/>
  </g><path d="M0 284Q260 271 600 284" stroke="#b4ded0" stroke-width="2" opacity=".2" fill="none"/></svg>`;}
function chart(){const points=game.history.slice(-18);if(points.length<2)return `<div class="empty-chart"><span>↗</span><p>Your LP return trajectory appears as you advance quarters.</p></div>`;
  const hi=Math.max(.25,...points.map(p=>p.nav)),lo=0;
  const path=points.map((p,i)=>`${i?'L':'M'}${20+i*(540/Math.max(1,points.length-1))},${150-(p.nav-lo)/(hi-lo)*119}`).join(' ');
  return `<svg viewBox="0 0 580 170" class="performance-chart" role="img" aria-label="Unrealised portfolio NAV trend in million euros"><path d="M20 150H560" stroke="#35534a" stroke-dasharray="4 5"/><path d="${path} L560 150 L20 150 Z" fill="#9cf4bd" opacity=".10"/><path d="${path}" fill="none" stroke="#a8e7a7" stroke-width="3" stroke-linecap="round"/><text x="20" y="160" fill="#88a99c" font-size="12">${seasonLabel(points[0].q)}</text><text x="560" y="160" text-anchor="end" fill="#88a99c" font-size="12">${seasonLabel(points.at(-1).q)}</text></svg>`;}
function dashboard(){const irr=game.closed?game.finalIrr:projectedIrr(game);const nav=netAssetValue(game);
  return `<div class="dashboard-grid"><div class="hero"><div class="hero-copy"><div class="overline"><span class="ping"></span> PRIVATE EQUITY SIMULATION · EUROPE</div>
  <h1>Build the assets.<br/><em>Win the returns.</em></h1><p>You are the investment team. Raise LP capital, acquire wind projects, unlock value and deliver the strongest fund-level IRR.</p>
  <div class="hero-actions"><button class="btn primary" data-tab="deals">Explore deals <span>↗</span></button><button class="btn secondary" data-tab="investors">Raise capital <span>→</span></button></div>
  <small class="disclaimer">Fictional cases and illustrative financial assumptions. Not a real fund model or investment recommendation.</small></div><div class="hero-art">${turbineGraphic()}<div class="art-caption">ENERGY TRANSITION / INVESTMENT STRATEGY</div></div></div>
  <div class="kpis">${kpi('PROJECTED LP NET IRR',since(irr),'Fund-level, including fees and distributions',irr>=.12?'good':'')}
  ${kpi('UNDEPLOYED EQUITY',money(game.cash),'Available to deploy into projects')}
  ${kpi('CURRENT PORTFOLIO NAV',money(nav),'Cash and mark-to-market equity')}
  ${kpi('CAPITAL RAISED',money(game.raised),'LP equity commitments called')}
  </div><section class="dashboard-main"><div class="panel performance"><div class="panel-head"><div><p class="eyebrow">FUND PERFORMANCE</p><h2>Value creation over time</h2></div>${badge(game.closed?'FUND CLOSED':'LIVE MARK TO MARKET',game.closed?'gold':'')}</div>${chart()}
  <div class="metric-row"><span>Completed exits <b>${game.exits.length}</b></span><span>Assets held <b>${game.portfolio.length}</b></span><span>LP distributions <b>${money(game.distributed)}</b></span><span>GP carry <b>${money(game.carryPaid)}</b></span></div></div>
  <div class="panel focus"><div class="panel-head"><div><p class="eyebrow">YOUR NEXT MOVE</p><h2>Investment committee</h2></div><span class="circle-indicator">◎</span></div>
  ${!game.raised?`<p>No LP capital has been raised. Start with a capital closing to fund your acquisition strategy.</p><button data-tab="investors" class="btn primary block">Open investor room →</button>`:game.closed?`<p>The fund has been liquidated. Compare your LP net IRR against your colleagues and try a new strategy.</p><button data-tab="leaderboard" class="btn primary block">Review leaderboard →</button>`:game.portfolio.some(p=>p.status==='rights')?`<p>You have development rights waiting for a value-creation plan. Optimise or reach financial close before your exit.</p><button data-tab="portfolio" class="btn primary block">Review portfolio →</button>`:`<p>Discover new Greenfield, Repowering or Hybrid projects. Approach developers directly or compete in a structured M&A auction.</p><button data-tab="deals" class="btn primary block">See M&A opportunities →</button>`}
  <div class="focus-divider"></div>${timebar()}
  ${game.closed?`<button class="btn secondary block" data-action="new">Start a new fund ↻</button>`:`<button class="btn next block" data-action="advance">Advance one quarter <span>→</span></button><button class="link-button" data-action="close">Wind down fund early</button>`}</div></section>
  <section class="panel activity"><div class="panel-head"><div><p class="eyebrow">DEAL ACTIVITY</p><h2>Investment desk feed</h2></div><span>${game.notes.length} updates</span></div><div class="activity-list">${game.notes.slice(0,6).map(n=>`<div class="activity-row"><span class="feed-dot"></span><span><strong>${seasonLabel(n.q)}</strong> · ${esc(n.text)}</span></div>`).join('')}</div></section></div>`;}
function dealCard(p){const e=economics(p,game.market);const tag=CHANNELS[p.channel];return `<article class="deal-card"><div class="deal-head"><div>${mark(p.type)}<span class="deal-type">${assetClass(p)}</span></div>${badge(tag.name,p.channel==='auction'?'auction':'direct')}</div>
  <div class="deal-title"><h3>${esc(p.name)}</h3><p>${esc(p.region)} · ${fmt(p.mw,0)} MW${p.type==='hybrid'?' + '+fmt(p.bess,0)+' MWh BESS':''}</p></div>
  <div class="deal-metrics"><div><small>ASKING RIGHTS PRICE</small><strong>${money(p.rights)}</strong></div><div><small>EST. EQUITY TO BUILD</small><strong>${money(e.equityBuild)}</strong></div><div><small>STABILISED EBITDA</small><strong>${money(e.ebitda)}/yr</strong></div></div>
  <div class="deal-details"><span>Capacity factor <strong>${pct(p.cf,0)}</strong></span><span>Deal risk <strong>${pct(p.risk,0)}</strong></span><span>Indicative gross EV <strong>${money(e.ev)}</strong></span></div>
  <p class="deal-process">${esc(tag.detail)}</p>
  ${p.diligence?`<div class="diligence-result">✓ Data room reviewed · ${esc(p.discovered)}</div>`:`<button class="link-button diligence" data-action="diligence" data-id="${p.id}">⌕ Review data room · €0.38m</button>`}
  <div class="deal-footer"><label class="field compact">Offer strategy<select id="bid-${p.id}" aria-label="Offer strategy for ${esc(p.name)}"><option value="conservative">Disciplined / lower bid</option><option value="base" selected>Base case</option><option value="aggressive">Win at a premium</option></select></label><button class="btn small primary" data-action="acquire" data-id="${p.id}" ${game.closed?'disabled':''}>Submit ${p.channel==='auction'?'bid':'LOI'} ↗</button></div>
</article>`;}
function deals(){const offers=filter==='all'?game.offers:game.offers.filter(p=>p.type===filter);return `<section class="section-intro"><p class="eyebrow">THE INVESTMENT PIPELINE</p><h1>Find tomorrow's energy winners.</h1><p>Six strategies. Three asset classes. Two routes to acquisition. Build your conviction before submitting a price.</p></section>
<div class="toolbar"><div class="filters">${[['all','All opportunities'],['greenfield','Greenfield'],['brownfield','Repowering'],['hybrid','Wind + BESS']].map(([id,name])=>`<button data-filter="${id}" class="chip ${filter===id?'selected':''}">${name}</button>`).join('')}</div>${badge('3 NEW DEALS EVERY QUARTER')}</div>
${game.closed?`<div class="empty">This fund is closed. Start a new fund for fresh deal opportunities.</div>`:`<div class="deal-grid">${offers.map(dealCard).join('')}</div>`}
<div class="insight-panel"><strong>INVESTMENT COMMITTEE NOTE</strong><p><b>Competitive M&A</b> rewards a stronger binding bid but reduces entry-price discipline. <b>Direct acquisitions</b> may offer discounts with a higher negotiation risk. Due diligence reduces uncertainty. Prices are stylised and the terms are not real transaction advice.</p></div>`;}
function upgradesPanel(p){const list=UPGRADES[p.type]||[];return `<div class="upgrades"><h4>Value creation levers</h4><div class="upgrade-grid">${list.map(u=>`<button data-action="upgrade" data-id="${p.id}" data-upgrade="${u.id}" class="upgrade ${p.upgrades.includes(u.id)?'done':''}" ${p.status!=='rights'||p.upgrades.includes(u.id)||game.closed?'disabled':''}><span class="upgrade-head"><strong>${esc(u.name)}</strong><em>${p.upgrades.includes(u.id)?'✓ Done':money(u.cost)}</em></span><small>${esc(u.detail)}</small></button>`).join('')}</div></div>`;}
function projectCard(p){const e=economics(p,game.market);const status=p.status==='rights'?'DEVELOPMENT RIGHTS':p.status==='construction'?'UNDER CONSTRUCTION':'OPERATIONAL';const net=exitValue(p,game.market);
  const invested=p.cashflows.filter(x=>x.amount<0).reduce((v,c)=>v-c.amount,0);
  return `<article class="portfolio-card"><div class="portfolio-top"><div><div class="asset-heading">${mark(p.type)}<span><small>${esc(assetClass(p))} · ${esc(p.region)}</small><h3>${esc(p.name)}</h3></span></div></div>${badge(status,p.status==='operating'?'green':'')}</div>
  <div class="mini-metrics"><div><small>WIND CAPACITY</small><b>${fmt(e.effective.mw,1)} MW</b></div><div><small>NET AEP</small><b>${fmt(e.aep,0)} GWh</b></div><div><small>OPERATING EBITDA</small><b>${money(e.ebitda)}/yr</b></div><div><small>EXIT EQUITY EST.</small><b>${money(net)}</b></div><div><small>EQUITY INVESTED</small><b>${money(invested)}</b></div><div><small>RISK EXPOSURE</small><b>${pct(e.effective.risk,0)}</b></div></div>
  ${p.status==='construction'?`<div class="construction">↗ Construction in progress · expected COD ${seasonLabel(p.buildFinish)}</div>`:''}
  ${p.status==='rights'?upgradesPanel(p):''}
  <div class="portfolio-actions">${p.status==='rights'?`<button class="btn primary small" data-action="build" data-id="${p.id}">Finance construction · ${money(e.equityBuild)} ↗</button>`:''}<button class="btn secondary small" data-action="sell" data-id="${p.id}">Exit asset · ${money(net)} →</button></div></article>`;}
function portfolio(){return `<section class="section-intro"><p class="eyebrow">ASSET MANAGEMENT</p><h1>Engineer the upside.</h1><p>Unlock energy yield, optimise contracted costs, finance construction and time the exit for LP returns.</p></section>
<div class="kpis mini">${kpi('ASSETS UNDER MANAGEMENT',String(game.portfolio.length),'Live deals in the portfolio')}${kpi('PRODUCTION CAPACITY',`${fmt(game.portfolio.reduce((v,p)=>v+economics(p,game.market).effective.mw,0),0)} MW`,'Includes optimised project capacity')}${kpi('UNREALISED EXIT VALUE',money(game.portfolio.reduce((v,p)=>v+exitValue(p,game.market),0)),'Indicative equity value, not a quote')}</div>
${game.portfolio.length?`<div class="portfolio-list">${game.portfolio.map(projectCard).join('')}</div>`:`<div class="empty with-action"><span>◇</span><h2>No active investments</h2><p>Acquire your first project rights to start creating value.</p><button class="btn primary" data-tab="deals">Visit deal room →</button></div>`}
${game.exits.length?`<section class="panel exits"><div class="panel-head"><div><p class="eyebrow">TRACK RECORD</p><h2>Completed exits</h2></div>${badge(game.exits.length+' SOLD','green')}</div><div class="table-scroll"><table><thead><tr><th>Project</th><th>Strategy</th><th>Net proceeds</th><th>Project IRR</th><th>Exit quarter</th></tr></thead><tbody>${game.exits.slice().reverse().map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(assetClass(p))}</td><td>${money(p.proceeds)}</td><td class="positive">${since(p.projectIRR)}</td><td>${seasonLabel(p.exitQ)}</td></tr>`).join('')}</tbody></table></div></section>`:''}`;}
function investorCard(i){const can=!game.closed&&game.q-game.lastRaise>=i.cooldown&&game.exits.length>=i.minimumExits&&game.raised+i.amount<=500;
  return `<article class="investor-card"><div class="investor-icon">${i.id==='family'?'◉':i.id==='pension'?'▤':'✳'}</div><div class="investor-main"><p class="eyebrow">LP CAPITAL PARTNER</p><h3>${i.name}</h3><p>${i.blurb}</p></div><div class="investor-raise"><strong>${money(i.amount)}</strong><small>Fundraising cost ${pct(i.fee)}</small><button class="btn primary block" data-action="raise" data-id="${i.id}" ${can?'':'disabled'}>${can?'Secure commitments ↗':i.minimumExits>game.exits.length?'1 exit required':game.raised+i.amount>500?'Fund cap reached':'Not available yet'}</button></div></article>`;}
function investors(){const irr=game.closed?game.finalIrr:projectedIrr(game);return `<section class="section-intro"><p class="eyebrow">CAPITAL FORMATION</p><h1>Win confidence.<br/>Deploy with discipline.</h1><p>Secure LP commitments, control fundraising and management fees, invest only in the strongest opportunities and return capital through timely exits.</p></section>
<div class="kpis mini">${kpi('TOTAL CALLED CAPITAL',money(game.raised),'Capital contributed by investors')}${kpi('DISTRIBUTIONS TO LPs',money(game.distributed),'Cash returned on exits')}${kpi('LP NET IRR',since(irr),'Fund-level annualised return')}${kpi('FEE LEAKAGE',money(game.feesPaid+game.carryPaid+game.feesOwed),'Placement, management fees and carry')}</div>
<section class="panel"><div class="panel-head"><div><p class="eyebrow">INVESTOR RELATIONS</p><h2>Fundraising mandates</h2></div>${badge(`${fmt(game.market.sentiment,0)}/100 LP CONFIDENCE`,game.market.sentiment>65?'green':'')}</div><div class="investor-grid">${FUNDRAISE.map(investorCard).join('')}</div><div class="insight-inline">Management fee: 1.1% p.a. on capital called · Carry: 12% of project profits at exit · 80% of exit proceeds distributed to LPs · Max LP commitments: €500m.</div></section>
<section class="panel"><div class="panel-head"><div><p class="eyebrow">CASH FLOW TIMELINE</p><h2>Fund-level economics</h2></div></div>${game.investorFlows.length?`<div class="flow-list">${game.investorFlows.slice().reverse().map(f=>`<div class="flow-row"><span>${esc(seasonLabel(f.q))}</span><span>${esc(f.label)}</span><strong class="${f.amount>0?'positive':'negative'}">${f.amount>0?'+':'−'}${money(Math.abs(f.amount))}</strong></div>`).join('')}</div>`:'<p class="muted">No LP contributions or distributions yet.</p>'}</section>`;}
function leaderboardView(){return `<section class="section-intro"><p class="eyebrow">THE WG LEAGUE</p><h1>Where investment teams compete.</h1><p>Compare completed fund simulations using <b>annualised LP net IRR</b> and equity multiples. Rankings are voluntary and based on self-reported game runs, not verified investment results.</p></section>
<div class="leaderboard-layout"><section class="panel"><div class="panel-head"><div><p class="eyebrow">TEAM LEADERBOARD</p><h2>Highest completed LP IRR</h2></div><button class="btn subtle small" data-action="load-board">↻ Refresh</button></div>
  ${!cloud.available?`<div class="empty mini-empty"><h3>Online competition ready for setup</h3><p>A new, separate Supabase project must be connected to activate sign-in and the shared leaderboard. Offline investment simulations work now.</p></div>`:leaderboard.length?`<div class="leaderboard-table"><div class="leaderboard-header"><span>RANK</span><span>INVESTMENT TEAM</span><span>LP NET IRR</span><span>LP MULTIPLE</span></div>${leaderboard.map((x,i)=>`<div class="leaderboard-entry"><strong>${String(i+1).padStart(2,'0')}</strong><span>${esc(x.nickname)}</span><strong>${pct(Number(x.lp_irr)/100)}</strong><span>${fmt(x.multiple,2)}×</span></div>`).join('')}</div>`:`<div class="empty mini-empty"><h3>No published fund results yet.</h3><p>Complete a fund mandate, opt into the leaderboard and submit your score.</p></div>`}
</section><section class="panel account-panel"><div class="panel-head"><div><p class="eyebrow">ACCOUNT & CLOUD SAVE</p><h2>${cloud.user?'Your fund manager profile':'Sign in to compete'}</h2></div>${badge(cloud.user?'CONNECTED':cloud.available?'OPTIONAL':'OFFLINE')}</div>${accountView()}</section></div>
${game.closed?`<section class="panel result-panel"><p class="eyebrow">YOUR COMPLETED FUND</p><h2>${Number.isFinite(game.finalIrr)?pct(game.finalIrr):'No calculable IRR'} net LP IRR</h2><p>LP multiple ${fmt(game.finalMultiple,2)}× · ${game.exits.length} exits · ${money(game.raised)} called capital</p><button class="btn primary" data-action="publish" ${!cloud.user?'disabled':''}>Publish my best result to the team leaderboard ↗</button><p class="small-muted">Only visible if you've opted in under your profile. Rankings are unverified game outcomes.</p></section>`:''}`;}
function accountView(){if(!cloud.available)return `<p class="muted">The standalone demo is fully playable. Connect the separate Supabase project to enable authentication, cloud saves and a shared leaderboard.</p><div class="notice-inline">Current mode: <strong>local browser save</strong>. Your data does not leave this device.</div>`;
  if(cloud.user)return `<div class="account-user"><div class="avatar">${(nickname.trim().charAt(0)||'W').toUpperCase()}</div><div><strong>${esc(nickname||'Fund manager')}</strong><p>${esc(cloud.user.email||'')}</p><small>Cloud: ${esc(cloudState)}</small></div></div>
    <form id="profile-form" class="auth-form"><label>Display name<input name="nickname" maxlength="30" required value="${esc(nickname)}" placeholder="Your name or team alias"></label><label class="check-label"><input type="checkbox" name="optIn" id="opt-in" ${window._boardOptIn?'checked':''}> <span>Appear on the public game leaderboard</span></label><button class="btn primary block" type="submit">Save profile</button></form><div class="account-actions"><button class="btn secondary small" data-action="cloud-pull">Load latest cloud fund</button><button class="btn subtle small" data-action="logout">Sign out</button></div>`;
  return `<div class="auth-tabs"><button class="chip ${accountPane==='login'?'selected':''}" data-account="login">Sign in</button><button class="chip ${accountPane==='signup'?'selected':''}" data-account="signup">Create account</button></div>
    <form id="auth-form" class="auth-form">${accountPane==='signup'?`<label>Player / team name<input name="nickname" maxlength="30" minlength="3" required autocomplete="nickname" placeholder="Your display name"></label>`:''}
    <label>Work or personal email<input name="email" type="email" required autocomplete="email" placeholder="you@example.com"></label>
    <label>Password<input name="password" type="password" minlength="8" required autocomplete="${accountPane==='signup'?'new-password':'current-password'}" placeholder="At least 8 characters"></label>
    <button class="btn primary block" type="submit">${accountPane==='signup'?'Create account ↗':'Sign in ↗'}</button></form>
    <button class="link-button" data-action="password-reset">Forgot password?</button><p class="small-muted">Email confirmation may be required. Use a dedicated game password, not any workplace credentials.</p>`;}
function footer(){return `<footer class="footer"><span><b>WG</b> / WINDFARM WINNER</span><span>SIMULATED CAPITAL · FICTIONAL ASSETS · V1.0</span><span>Made for colleagues who think in megawatts and IRR.</span></footer>`;}
function appShell(){return `<div class="shell"><header class="header"><button class="wordmark" data-tab="dashboard" aria-label="WindFarm Winner home"><span class="symbol">↗</span><span><strong>WG</strong><small>WINDFARM WINNER</small></span></button><div class="header-right"><span class="sim-tag"><span class="led"></span> SIMULATION</span><span class="quarter-tag">${seasonLabel(game.q)}</span><button class="user-pill" data-tab="leaderboard">◯ <span>${esc(nickname||'Guest manager')}</span></button></div></header>
 <nav class="nav" aria-label="Main navigation">${[['dashboard','◫','Dashboard'],['deals','◇','Deal Room'],['portfolio','▤','Portfolio'],['investors','◎','Investors'],['leaderboard','♛','Leaderboard & Account']].map(([id,ico,name])=>`<button data-tab="${id}" class="nav-item ${tab===id?'active':''}"><span>${ico}</span>${name}</button>`).join('')}<div class="nav-space"></div><button class="new-fund" data-action="new" title="Start a new six-year fund">↺ <span>New fund</span></button></nav>
 <main class="content">${notice?`<div class="banner ${error?'alert':''}" role="status"><span>${error?'!':'✓'}</span><p>${esc(notice)}</p><button data-action="dismiss" aria-label="Dismiss notification">×</button></div>`:''}${tab==='dashboard'?dashboard():tab==='deals'?deals():tab==='portfolio'?portfolio():tab==='investors'?investors():leaderboardView()}</main>${footer()}</div>`;}
function render(){root.innerHTML=appShell();}
function action(doIt){let result;try{result=doIt();}catch(ex){flash(ex.message||'Unexpected error',true);return;}if(result){notice=result.msg||'';error=result.ok?'':notice;}if(result?.ok){persist();}render();}
root.addEventListener('click',async e=>{
  const t=e.target.closest('[data-tab],[data-filter],[data-account],[data-action]');if(!t||t.disabled||busy)return;
  if(t.dataset.tab){tab=t.dataset.tab;notice='';error='';render();if(tab==='leaderboard')void fetchBoard(true);return;}
  if(t.dataset.filter){filter=t.dataset.filter;render();return;}
  if(t.dataset.account){accountPane=t.dataset.account;render();return;}
  const a=t.dataset.action,id=t.dataset.id;
  if(a==='dismiss'){notice='';error='';render();return;}
  if(a==='raise')return action(()=>raiseFund(game,id));
  if(a==='diligence')return action(()=>runDiligence(game,id));
  if(a==='acquire'){const bid=root.querySelector('#bid-'+CSS.escape(id))?.value||'base';return action(()=>acquire(game,id,bid));}
  if(a==='upgrade')return action(()=>optimise(game,id,t.dataset.upgrade));
  if(a==='build')return action(()=>build(game,id));
  if(a==='sell'){if(!confirm('Sell this project at the current indicative market value?'))return;return action(()=>sell(game,id));}
  if(a==='advance')return action(()=>advance(game));
  if(a==='close'){if(!confirm('Wind down this fund now? Any remaining assets will be sold immediately. This cannot be undone.'))return;action(()=>closeFund(game));if(game.closed)tab='dashboard';render();return;}
  if(a==='new'){if(!confirm('Start a NEW investment fund? Your current local fund will be replaced. Cloud records of completed funds remain available.'))return;game=newGame();tab='dashboard';notice='New six-year fund launched.';error='';persist();render();return;}
  if(a==='load-board')return fetchBoard();
  if(a==='logout')return authAction(async()=>{await cloud.signOut();cloudState='signed out';window._boardOptIn=false;notice='Signed out. Local guest fund is still available.';});
  if(a==='cloud-pull')return authAction(async()=>{const loaded=await cloud.loadLatest();if(!loaded)throw Error('No cloud game saved yet.');if(!confirm('Replace the current local fund with your latest cloud fund?'))return;game=loaded;persist();notice='Latest cloud fund loaded.';});
  if(a==='publish')return authAction(async()=>{if(!game.closed)throw Error('Only completed funds can be submitted.');await cloud.save(game);notice=window._boardOptIn?'Completed fund saved to leaderboard.':'Completed fund saved privately. Enable leaderboard visibility under your profile to publish it.';await fetchBoard(true);});
  if(a==='password-reset'){const email=prompt('Enter the email used for your account:');if(email)return authAction(async()=>{await cloud.resetPassword(email.trim());notice='If the account exists, a password recovery email has been sent.';});}
});
async function authAction(fn){busy=true;render();try{await fn();error='';}catch(err){error=err.message||'Authentication failed';notice=error;}finally{busy=false;render();}}
root.addEventListener('submit',e=>{const f=e.target;if(!['auth-form','profile-form'].includes(f.id))return;e.preventDefault();if(busy)return;
  const d=new FormData(f);
  if(f.id==='auth-form')return authAction(async()=>{
    const email=String(d.get('email')||'').trim(),password=String(d.get('password')||'');
    if(accountPane==='signup'){
      const name=String(d.get('nickname')||'').trim();if(name.length<3||name.length>30)throw Error('Display name must be 3–30 characters.');
      const response=await cloud.signUp(email,password,name);nickname=name;localStorage.setItem('wfw-display-name',nickname);
      notice=response.confirmationRequired?'Check your email to verify the account. You can continue playing offline until verification.':'Account created and signed in.';
      if(cloud.user&&!response.confirmationRequired){await cloud.setProfile(name,false);await saveCloud();}
    } else {await cloud.signIn(email,password);const profile=await cloud.profile();nickname=profile?.nickname||nickname;window._boardOptIn=Boolean(profile?.leaderboard_opt_in);
      localStorage.setItem('wfw-display-name',nickname);
      const latest=await cloud.loadLatest();if(latest?.q>=0&&confirm('Account connected. Load your latest saved cloud fund on this device?'))game=latest;
      persist();notice='Signed in. Your investment desk is ready.';}
  });
  if(f.id==='profile-form')return authAction(async()=>{const name=String(d.get('nickname')||'').trim();if(name.length<3||name.length>30)throw Error('Name must be 3–30 characters.');
    const optIn=d.has('optIn');await cloud.setProfile(name,optIn);nickname=name;window._boardOptIn=optIn;
    localStorage.setItem('wfw-display-name',name);notice=optIn?'Profile saved. Completed funds are visible on the leaderboard.':'Profile saved; your scores remain private.';await fetchBoard(true);});
});
async function fetchBoard(quiet=false){if(!cloud.available)return;try{leaderboard=await cloud.leaderboard();if(!quiet){notice='Leaderboard updated.';error='';}}catch(err){notice='Leaderboard unavailable: '+err.message;error=notice;}render();}

render();
if(cloud.available){cloud.connect().then(async()=>{if(cloud.user){const p=await cloud.profile();nickname=p?.nickname||nickname;window._boardOptIn=Boolean(p?.leaderboard_opt_in);cloudState='Connected';void fetchBoard(true);}render();}).catch(e=>{cloudState='Offline';console.warn('Supabase not available:',e.message);render();});}
if('serviceWorker' in navigator && location.protocol!=='file:')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn),{once:true});
