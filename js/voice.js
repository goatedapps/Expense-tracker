import {parseAmount,validDate,today} from './model.js';

// Voice links are untrusted drafts. Saving always goes through the normal form.
export function parseVoiceLink(text,categories,baseUrl){
  text=String(text).trim();
  if(text.length>6000)throw Error('That voice-entry link is too long.');
  let hash=text;
  if(!text.startsWith('#')){
    let url;try{url=new URL(text);}catch{throw Error('Paste the complete voice-entry link from your Shortcut.');}
    const base=new URL(baseUrl),production=new URL('https://goatedapps.github.io/Expense-tracker/');
    if(![base,production].some(b=>url.origin===b.origin&&url.pathname===b.pathname))throw Error('Use an Everyday expense-tracker link.');
    hash=url.hash;
  }
  if(!hash.startsWith('#add?'))throw Error('Use a voice-entry link containing #add?.');
  const params=new URLSearchParams(hash.slice(5));
  for(const key of params.keys())if(!['type','amount','category','date','note'].includes(key)||params.getAll(key).length!==1)throw Error('The voice-entry link has invalid fields.');
  const type=params.get('type')||'expense';if(!['expense','income'].includes(type))throw Error('Transaction type must be expense or income.');
  const amount=params.get('amount');const date=params.get('date')||today();
  if(!validDate(date))throw Error('Use a valid date in YYYY-MM-DD format.');
  const description=params.get('note')||'';if(description.length>1000)throw Error('The transaction note is too long.');
  const name=(params.get('category')||'').trim().toLowerCase();
  const category=categories.find(c=>!c.archived&&c.type===type&&(c.id.toLowerCase()===name||c.name.toLowerCase()===name));
  return {type,amount:amount?parseAmount(amount):null,date,description,categoryId:category?.id||'',labelIds:[],excluded:false};
}
