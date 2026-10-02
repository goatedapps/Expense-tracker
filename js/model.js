export const STORAGE_KEY = 'everyday-sgd-v1';
export const uid = () => crypto.randomUUID();
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export const money = cents => new Intl.NumberFormat('en-SG', {style:'currency',currency:'SGD'}).format(cents/100);
export const monthLabel = month => new Date(`${month}-01T12:00:00`).toLocaleDateString('en-SG',{month:'long',year:'numeric'});
export const dateLabel = date => new Date(`${date}T12:00:00`).toLocaleDateString('en-SG',{day:'numeric',month:'short',year:'numeric'});
export const singaporeDate = timestamp => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(timestamp));
export const FREQUENCIES = {none:'Don’t repeat',daily:'Every day',workday:'Every weekday',weekly:'Every week',fortnightly:'Every 2 weeks',fourweekly:'Every 4 weeks',monthly:'Every month',bimonthly:'Every 2 months',quarterly:'Every 3 months',halfyearly:'Every 6 months',yearly:'Every year'};
export const BUDGET_FREQUENCIES={daily:'Daily',weekly:'Weekly',fortnightly:'Bi-weekly (every 2 weeks)',monthly:'Monthly',yearly:'Yearly'};
const defaults = [
  ['food','Food & Drink','🍴','#e9ad25','expense'],['groceries','Groceries','🥐','#c88248','expense'],['transport','Transport','🚆','#d2ab22','expense'],['shopping','Shopping','🛍️','#c879cd','expense'],['bills','Bills & Fees','🧾','#4ea994','expense'],['home','Home','🏠','#ab9461','expense'],['entertainment','Entertainment','🎭','#ea9749','expense'],['health','Healthcare','🩺','#d67e95','expense'],['education','Education','🎓','#5c8fbd','expense'],['travel','Travel','✈️','#d872a9','expense'],['personal','Personal','👤','#6ab1c6','expense'],['other','Other','◈','#849291','expense'],['salary','Salary','💼','#0b8064','income'],['dividend','Dividends','🌱','#54a867','income'],['other-income','Other income','＋','#5d9d8e','income']
];
export function initialState(){ return {version:1,transactions:[],categories:defaults.map(([id,name,icon,color,type])=>({id,name,icon,color,type,archived:false})),labels:[],budgets:[],rules:[],settings:{theme:'system',openAddByDefault:false}}; }
export function parseAmount(value){
  const s=String(value).trim(); if(!/^\d+(\.\d{1,2})?$/.test(s)) throw Error('Enter an amount with up to 2 decimal places.');
  const [a,b='']=s.split('.'); const n=Number(a)*100+Number(b.padEnd(2,'0'));
  if(!Number.isSafeInteger(n)||n<=0||n>100000000000) throw Error('Enter an amount between $0.01 and $1,000,000,000.00.'); return n;
}
export function validDate(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s)||s<'1900-01-01'||s>'2200-12-31')return false;const d=new Date(s+'T12:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s;}
export function shiftMonth(month,step){const d=new Date(`${month}-01T12:00:00Z`);d.setUTCMonth(d.getUTCMonth()+step);return d.toISOString().slice(0,7);}
export function occurrence(rule,index){
  if(index===0)return rule.startDate;
  const d=new Date(rule.startDate+'T12:00:00Z');
  const months={monthly:1,bimonthly:2,quarterly:3,halfyearly:6,yearly:12};
  if(months[rule.frequency]) {const day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months[rule.frequency]*index);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));}
  else if(rule.frequency==='workday'){do{d.setUTCDate(d.getUTCDate()+1);}while(d.getUTCDay()===0||d.getUTCDay()===6);const n=index-1,remaining=n%5;d.setUTCDate(d.getUTCDate()+Math.floor(n/5)*7+remaining+(d.getUTCDay()+remaining>5?2:0));}
  else d.setUTCDate(d.getUTCDate()+({daily:1,weekly:7,fortnightly:14,fourweekly:28}[rule.frequency]||1)*index);
  return d.toISOString().slice(0,10);
}
export function processRules(state,through=today()){
  let count=0;const keys=new Set(state.transactions.filter(t=>t.ruleId).map(t=>`${t.ruleId}:${t.date}`));
  for(const rule of state.rules){if(!rule.active)continue;let guard=0;while(guard++<120000){const date=occurrence(rule,rule.nextIndex);if(date>through||date>'2200-12-31'||(rule.endDate&&date>rule.endDate))break;
    if(!keys.has(`${rule.id}:${date}`)){state.transactions.push({id:uid(),...rule.template,date,ruleId:rule.id});keys.add(`${rule.id}:${date}`);count++;}rule.nextIndex++;
  }}return count;
}
export function summary(transactions){return transactions.filter(t=>!t.excluded).reduce((s,t)=>{s[t.type]+=t.amount;return s;},{income:0,expense:0});}
const addDays=(date,days)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
export function budgetPeriod(budget,date){
  if(date<budget.startDate)return null;
  const frequency=budget.frequency||'monthly';let start,end;
  if(frequency==='monthly'){start=date.slice(0,7)+'-01';end=addDays(shiftMonth(date.slice(0,7),1)+'-01',-1);}
  else if(frequency==='yearly'){start=date.slice(0,4)+'-01-01';end=date.slice(0,4)+'-12-31';}
  else{const days={daily:1,weekly:7,fortnightly:14}[frequency];const elapsed=Math.round((new Date(date+'T12:00:00Z')-new Date(budget.startDate+'T12:00:00Z'))/86400000);start=addDays(budget.startDate,Math.floor(elapsed/days)*days);end=addDays(start,days-1);}
  if(start<budget.startDate)start=budget.startDate;return {start,end};
}
export function budgetPeriodsForMonth(budget,month){
  const first=month+'-01',last=addDays(shiftMonth(month,1)+'-01',-1),periods=[];let date=first<budget.startDate?budget.startDate:first;
  while(date<=last&&periods.length<31){const period=budgetPeriod(budget,date);if(!period)break;periods.push(period);date=addDays(period.end,1);}return periods;
}
export function budgetTransactions(state,budget,period){return period?state.transactions.filter(t=>t.date>=period.start&&t.date<=period.end&&t.date>=budget.startDate&&t.date<=today()&&t.type==='expense'&&!t.excluded&&(!budget.categoryIds.length||budget.categoryIds.includes(t.categoryId))):[];}
export function budgetUsage(state,budget,selected){const period=typeof selected==='string'?budgetPeriod(budget,selected===today().slice(0,7)?today():addDays(shiftMonth(selected,1)+'-01',-1)):selected;return budgetTransactions(state,budget,period).reduce((sum,t)=>sum+t.amount,0);}
export function validateState(data){
  const fail=()=>{throw Error('This file is not a valid Everyday backup.');};
  if(!data||data.version!==1)fail();
  for(const key of ['transactions','categories','labels','budgets','rules'])if(!Array.isArray(data[key])||data[key].length>120000)fail();
  const str=(v,max=500)=>typeof v==='string'&&v.length<=max;
  const ids=key=>{const a=data[key].map(x=>x.id);if(a.some(x=>!str(x,100)||!x)||new Set(a).size!==a.length)fail();return new Set(a);};
  const cats=ids('categories'),labs=ids('labels'),rules=ids('rules');ids('transactions');ids('budgets');
  for(const c of data.categories)if(!str(c.name,80)||!c.name.trim()||!str(c.icon,20)||!/^#[0-9a-f]{6}$/i.test(c.color)||!['income','expense'].includes(c.type)||typeof c.archived!=='boolean')fail();
  for(const l of data.labels)if(!str(l.name,60)||!l.name.trim())fail();
  const transaction=(t,withDate)=>{if(!t||!['income','expense'].includes(t.type)||!Number.isSafeInteger(t.amount)||t.amount<=0||t.amount>100000000000||!cats.has(t.categoryId)||data.categories.find(c=>c.id===t.categoryId).type!==t.type||!Array.isArray(t.labelIds)||t.labelIds.some(id=>!labs.has(id))||!str(t.description,1000)||typeof t.excluded!=='boolean'||(withDate&&!validDate(t.date)))fail();};
  for(const t of data.transactions){transaction(t,true);if(t.ruleId!=null&&!rules.has(t.ruleId))fail();if(t.timestamp!=null&&(!str(t.timestamp,40)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(t.timestamp)||!Number.isFinite(Date.parse(t.timestamp))||singaporeDate(t.timestamp)!==t.date))fail();}
  for(const r of data.rules){if(!Object.hasOwn(FREQUENCIES,r.frequency)||r.frequency==='none'||!validDate(r.startDate)||!Number.isInteger(r.nextIndex)||r.nextIndex<0||r.nextIndex>120000||typeof r.active!=='boolean'||(r.endDate&&(!validDate(r.endDate)||r.endDate<r.startDate)))fail();transaction(r.template,false);}
  for(const b of data.budgets)if(!str(b.name,80)||!b.name.trim()||!Number.isSafeInteger(b.amount)||b.amount<=0||b.amount>100000000000||!validDate(b.startDate)||(b.frequency!=null&&!Object.hasOwn(BUDGET_FREQUENCIES,b.frequency))||!Array.isArray(b.categoryIds)||b.categoryIds.some(id=>!cats.has(id)||data.categories.find(c=>c.id===id).type!=='expense'))fail();
  if(!data.settings||!['blue','colourful','cheerful','pastel','system','light','dark'].includes(data.settings.theme))fail();
  if(data.settings.openAddByDefault!==undefined&&typeof data.settings.openAddByDefault!=='boolean')fail();
  const cleanTemplate=t=>({type:t.type,amount:t.amount,categoryId:t.categoryId,labelIds:[...new Set(t.labelIds)],description:t.description,excluded:t.excluded});
  return {version:1,categories:data.categories.map(c=>({id:c.id,name:c.name,icon:c.icon,color:c.color,type:c.type,archived:c.archived})),labels:data.labels.map(l=>({id:l.id,name:l.name})),transactions:data.transactions.map(t=>({id:t.id,...cleanTemplate(t),date:t.date,...(t.ruleId?{ruleId:t.ruleId}:{}),...(t.timestamp?{timestamp:t.timestamp}:{})})),budgets:data.budgets.map(b=>({id:b.id,name:b.name,amount:b.amount,startDate:b.startDate,frequency:b.frequency||'monthly',categoryIds:[...new Set(b.categoryIds)]})),rules:data.rules.map(r=>({id:r.id,template:cleanTemplate(r.template),frequency:r.frequency,startDate:r.startDate,nextIndex:r.nextIndex,active:r.active,endDate:r.endDate||null})),settings:{theme:data.settings.theme==='blue'?'light':data.settings.theme,openAddByDefault:data.settings.openAddByDefault===true}};
}
export function loadState(){const raw=localStorage.getItem(STORAGE_KEY);return raw?validateState(JSON.parse(raw)):initialState();}
export function saveState(state){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
const csvCell=(v,protect=true)=>{let s=String(v??'');if(protect&&/^[\s]*[=+@-]/.test(s))s="'"+s;return /[\s,"]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;};
export function transactionsCsv(state,rows=state.transactions){
  const timestamp=t=>t.timestamp||new Date(`${t.date}T00:00:00+08:00`).toISOString().replace('.000Z','+00:00');
  const sorted=[...rows].sort((a,b)=>a.date.localeCompare(b.date)||timestamp(a).localeCompare(timestamp(b)));
  const header=['Date','Wallet','Type','Category name','Amount','Currency','Note','Labels'];
  const output=sorted.map(t=>[timestamp(t),'',t.type==='expense'?'Expense':'Income',state.categories.find(c=>c.id===t.categoryId)?.name||'',`${t.type==='expense'?'-':''}${(t.amount/100).toFixed(2)}000000`,'SGD',t.description,t.labelIds.map(id=>state.labels.find(l=>l.id===id)?.name||'').join('; ')]);
  return '\uFEFF'+[header.map(v=>csvCell(v)).join(','),...output.map(row=>row.map((v,i)=>csvCell(v,i!==4)).join(','))].join('\r\n');
}
