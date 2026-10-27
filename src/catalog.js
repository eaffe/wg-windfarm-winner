// Fictional opportunities and model inputs — no real WG transactions.
export const TYPES = {
  greenfield: { name: 'Greenfield', short: 'GF', icon: '◈', description: 'Acquire shovel-ready development rights. Optimise turbines, wake losses and O&M before construction.', color: '#8dd8ac' },
  brownfield: { name: 'Brownfield / Repowering', short: 'RP', icon: '↻', description: 'Purchase ageing onshore assets and unlock additional output by repowering the site.', color: '#f3c989' },
  hybrid: { name: 'Wind + BESS Hybrid', short: 'HY', icon: '✧', description: 'Acquire hybrid rights. Optimise wind yield, storage dispatch and contracted revenue.', color: '#86bcff' }
};
export const CHANNELS = {
  auction: {name: 'Competitive M&A', detail: 'Structured teaser, data room and binding bid. Win probability rises with your offer.'},
  direct: {name: 'Direct Acquisition', detail: 'Bilateral approach to a developer or operator. Negotiate exclusivity and manage diligence risk.'}
};
export const TEMPLATES = [
  {name:'North Sea Ridge', region:'Northern Germany', type:'greenfield', mw:56, cf:.32, price:69, rights:7.5, capex:1.38, risk:.13, bess:0, channel:'auction'},
  {name:'Valley Passage', region:'Western France', type:'greenfield', mw:42, cf:.34, price:72, rights:6.2, capex:1.43, risk:.09, bess:0, channel:'direct'},
  {name:'Baltic Crest', region:'Poland', type:'greenfield', mw:68, cf:.35, price:67, rights:9.8, capex:1.31, risk:.17, bess:0, channel:'auction'},
  {name:'Lowland Harvest', region:'The Netherlands', type:'greenfield', mw:38, cf:.31, price:75, rights:5.6, capex:1.50, risk:.12, bess:0, channel:'direct'},
  {name:'Granite Renewal', region:'Central Germany', type:'brownfield', mw:48, cf:.30, price:71, rights:15.2, capex:1.22, risk:.11, bess:0, channel:'direct'},
  {name:'Atlantic Rewind', region:'Western France', type:'brownfield', mw:60, cf:.33, price:70, rights:19.0, capex:1.26, risk:.14, bess:0, channel:'auction'},
  {name:'Moorland Generation II', region:'Belgium', type:'brownfield', mw:32, cf:.29, price:73, rights:11.6, capex:1.34, risk:.10, bess:0, channel:'direct'},
  {name:'Coastal Retrofit', region:'Denmark', type:'brownfield', mw:72, cf:.38, price:63, rights:22.2, capex:1.25, risk:.16, bess:0, channel:'auction'},
  {name:'Battery Horizon', region:'Northern Germany', type:'hybrid', mw:54, cf:.34, price:72, rights:11.0, capex:1.39, risk:.14, bess:110, channel:'auction'},
  {name:'Aquila Hybrid Hub', region:'Spain', type:'hybrid', mw:45, cf:.36, price:66, rights:8.8, capex:1.33, risk:.15, bess:90, channel:'direct'},
  {name:'Northwind Flex', region:'Belgium', type:'hybrid', mw:64, cf:.32, price:74, rights:13.4, capex:1.40, risk:.17, bess:128, channel:'auction'},
  {name:'Emerald Storage Link', region:'Ireland', type:'hybrid', mw:50, cf:.37, price:68, rights:10.5, capex:1.37, risk:.16, bess:100, channel:'direct'}
];
export const FUNDRAISE = [
  { id:'family', name:'Family Office Syndicate', amount:45, fee:.020, minimumExits:0, cooldown:2, blurb:'Flexible early capital, lower cheque size.', sentiment:-2 },
  { id:'pension', name:'Institutional Infrastructure LPs', amount:105, fee:.029, minimumExits:1, cooldown:3, blurb:'Large commitments once you establish a successful exit.', sentiment:3 },
  { id:'impact', name:'Energy Transition LP Club', amount:68, fee:.018, minimumExits:0, cooldown:3, blurb:'Patient capital with strong sustainability expectations.', sentiment:2 }
];
export const UPGRADES = {
  greenfield: [
    {id:'turbine', name:'Upsize turbine class', cost:2.0, q:1, detail:'+14% installed capacity, but re-run permitting and grid studies.', mwFactor:1.14, riskAdd:.035},
    {id:'layout', name:'Optimise turbine layout', cost:1.0, q:1, detail:'+6% net wind yield through wake and micro-siting improvements.', yieldFactor:1.06, riskAdd:-.018},
    {id:'opex', name:'Renegotiate O&M / OpEx', cost:.45, q:0, detail:'Reduce annual operating costs by 14%.', opexFactor:.86, riskAdd:0},
    {id:'ppa', name:'Secure long-term PPA', cost:.60, q:0, detail:'Stabilise the merchant price at €72/MWh.', ppaPrice:72, riskAdd:-.027}
  ],
  brownfield: [
    {id:'repower', name:'High-hub repowering design', cost:3.1, q:1, detail:'+19% capacity and +7% wind yield through modern turbine design.', mwFactor:1.19, yieldFactor:1.07, riskAdd:.03},
    {id:'grid', name:'Grid connection optimisation', cost:.85, q:1, detail:'Reduce curtailment and add 5% delivered electricity.', yieldFactor:1.05, riskAdd:-.018},
    {id:'opex', name:'Reset service agreement', cost:.55, q:0, detail:'Reduce full-service O&M costs by 17%.', opexFactor:.83, riskAdd:0},
    {id:'ppa', name:'Recontract power offtake', cost:.50, q:0, detail:'Secure €72/MWh fixed PPA instead of merchant exposure.', ppaPrice:72, riskAdd:-.025}
  ],
  hybrid: [
    {id:'battery', name:'Expand BESS energy capacity', cost:4.0, q:1, detail:'+25% battery energy and dispatch flexibility.', bessFactor:1.25, riskAdd:.018},
    {id:'dispatch', name:'AI-assisted BESS dispatch', cost:.85, q:0, detail:'+30% gross BESS trading / flexibility margin.', bessFactorMargin:1.30, riskAdd:-.012},
    {id:'layout', name:'Co-optimise wind & storage', cost:1.4, q:1, detail:'+6% wind yield through balancing and layout changes.', yieldFactor:1.06, riskAdd:-.015},
    {id:'opex', name:'Integrated O&M tender', cost:.58, q:0, detail:'Reduce annual operating costs by 12%.', opexFactor:.88, riskAdd:0},
    {id:'ppa', name:'Hybrid tolling agreement', cost:.55, q:0, detail:'Fix wind offtake at €72/MWh, preserving battery upside.', ppaPrice:72, riskAdd:-.025}
  ]
};
export const fmt = (x,dp=1) => Number(x||0).toLocaleString('en-GB',{maximumFractionDigits:dp,minimumFractionDigits:dp});
export const money = (x) => `€${fmt(x)}m`;
export const pct = (x, dp=1) => Number.isFinite(x) ? `${fmt(x*100,dp)}%` : '—';
