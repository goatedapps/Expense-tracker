import {parseAmount} from './model.js';

const units=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const tens={twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
function smallInteger(text){
  if(/^\d{1,3}(?:,\d{3})+$/.test(text))text=text.replaceAll(',','');
  if(/^\d+$/.test(text))return Number(text);
  const words=text.split(' ');let value=0;
  if(words[1]==='hundred'){
    const n=units.indexOf(words.shift());if(n<1||n>9)throw Error('Unclear amount.');words.shift();value=n*100;if(words[0]==='and')words.shift();if(!words.length)return value;
  }
  if(words.length===1&&units.includes(words[0]))return value+units.indexOf(words[0]);
  if(words.length===1&&Object.hasOwn(tens,words[0]))return value+tens[words[0]];
  if(words.length===2&&Object.hasOwn(tens,words[0])&&units.indexOf(words[1])>0&&units.indexOf(words[1])<10)return value+tens[words[0]]+units.indexOf(words[1]);
  throw Error('Unclear amount.');
}
function integer(text){
  let rest=text,total=0,previous=Infinity;
  const scale=/(.*?)\b(billion|million|thousand)\b\s*/g;let match,last=0;
  while((match=scale.exec(text))){const size={billion:1e9,million:1e6,thousand:1e3}[match[2]],n=smallInteger(match[1].trim());if(size>=previous||n<1||n>999)throw Error('Unclear amount.');total+=n*size;previous=size;last=scale.lastIndex;}
  rest=text.slice(last).trim().replace(/^and /,'');const tail=rest?smallInteger(rest):0;if(last&&tail>=previous)throw Error('Unclear amount.');return total+tail;
}
export function spokenAmount(text){
  let s=text.toLowerCase().trim().replace(/(?<=[a-z])-(?=[a-z])/g,' ').replace(/,\s+/g,' ').replace(/\s+/g,' ').replace(/^(?:sgd|s\$|\$)\s*/,'');
  const numeric=s.replace(/ dollars?$/,'');
  if(/^(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?|\.\d{1,2})$/.test(numeric))return parseAmount(numeric.replaceAll(',','').replace(/^\./,'0.'));
  const centsOnly=s.match(/^(.+?)\s*(?:cents?|¢|c)$/);
  if(centsOnly&&!/\bdollars?\b/.test(s)){
    const cents=integer(centsOnly[1].trim());
    return parseAmount(`${Math.floor(cents/100)}.${String(cents%100).padStart(2,'0')}`);
  }
  const dollars=s.match(/^(.+?) dollars?(?: (.+))?$/);
  if(dollars){
    const whole=integer(dollars[1]);
    // Both “eleven dollars twenty” and “eleven dollars and twenty cents”.
    const fraction=dollars[2]?.replace(/^and /,'').replace(/\s*(?:cents?|¢|c)$/,'').trim();
    const cents=fraction?integer(fraction):0;
    if(dollars[2]&&!fraction||cents>99)throw Error('Unclear cents.');
    return parseAmount(`${whole}.${String(cents).padStart(2,'0')}`);
  }
  const point=s.split(/ (?:point|dot) /);
  if(point.length===2){const whole=integer(point[0]);let fraction=point[1].split(' ').map(w=>/^\d+$/.test(w)?w:units.indexOf(w)>=0&&units.indexOf(w)<10?String(units.indexOf(w)):'?').join('');if(fraction.includes('?')){const n=integer(point[1]);if(n<10||n>99)throw Error('Unclear decimal.');fraction=String(n);}if(!/^\d{1,2}$/.test(fraction))throw Error('Unclear decimal.');return parseAmount(`${whole}.${fraction}`);}
  return parseAmount(String(integer(s)));
}
const categoryName=s=>s.toLowerCase().replace(/&/g,' and ').replace(/[^\p{L}\p{N} ]/gu,' ').replace(/\s+/g,' ').trim();
export function parseDictation(text,categories){
  const draft={type:null,categoryId:'',amount:null};
  const fail=message=>({valid:false,draft,message});
  const raw=String(text).trim().replace(/[.!?]+$/,'').trim();
  if(raw.length>400)return fail('Say one transaction at a time.');
  if(!raw)return fail('Say a category and amount, such as “Groceries fifteen dollars”.');
  const income=/\bincome\b/i.test(raw),expense=/\bexpenses?\b/i.test(raw);
  if(income&&expense)return fail('Say either income or expense for one transaction.');
  draft.type=income?'income':'expense';
  const active=categories.filter(c=>!c.archived&&c.type===draft.type);
  const body=raw.replace(/^add\s+/i,'').trim();
  // Preserve the original category text (e.g. “Other income”), while also
  // allowing an explicit type at either end of the spoken command.
  const bodies=new Set([body]);
  for(const value of bodies){
    bodies.add(value.replace(/^(?:income|expenses?)[\s,]+/i,'').trim());
    bodies.add(value.replace(/[\s,]+(?:income|expenses?)$/i,'').trim());
  }
  const matches=[];
  function matchCategory(label,amount){
    const name=categoryName(label);if(!name)return;
    for(const c of active){
      const exact=categoryName(c.name)===name,idMatch=categoryName(c.id)===name;
      const first=categoryName(c.name).split(' ')[0];
      if(!exact&&!idMatch&&name!==first)continue;
      const cleaned=amount.replace(/\b(?:income|expenses?)\b/gi,' ').trim().replace(/^[,;:]+|[,;:]+$/g,'').trim();
      let cents=null;try{cents=spokenAmount(cleaned);}catch{}
      matches.push({c,rank:exact?2:1,length:name.length,amount:cents});
    }
  }
  for(const value of bodies){
    matchCategory(value,'');
    for(let i=1;i<value.length;i++)if(/\s/.test(value[i])){
      const left=value.slice(0,i).trim(),right=value.slice(i).trim();
      matchCategory(left,right);matchCategory(right,left);
    }
  }
  matches.sort((a,b)=>b.rank-a.rank||b.length-a.length);
  if(!matches.length)return fail(`Category not recognised for ${draft.type}. Choose an active category below.`);
  const best=matches.filter(m=>m.rank===matches[0].rank&&m.length===matches[0].length);
  if(new Set(best.map(m=>m.c.id)).size!==1)return fail('That category name matches more than one category. Say its full name or choose it below.');
  draft.categoryId=best[0].c.id;
  const amounts=[...new Set(best.filter(m=>m.amount!==null).map(m=>m.amount))];
  if(amounts.length!==1)return fail('Amount unclear. Check the amount below before saving.');
  draft.amount=amounts[0];
  return {valid:true,draft,message:''};
}

export function speechAvailable(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition);}
export function createDictation({onState,onTranscript,onError,onStatus=()=>{},isComplete=()=>false}){
  let session=null,draining=null,releaseTimer=null;
  const clearTimers=current=>{clearTimeout(current?.timer);clearTimeout(current?.readyTimer);};
  const finalText=current=>current.parts.filter(Boolean).join(' ').trim();
  function released(current){
    if(draining!==current)return;
    clearTimeout(releaseTimer);releaseTimer=null;draining=null;
    if(session&&!session.recognition)begin(session);
  }
  function cancel(){
    const old=session;session=null;clearTimers(old);
    if(old?.recognition){
      // Safari can still own the microphone until the aborted session ends.
      draining=old;
      releaseTimer=setTimeout(()=>released(old),800);
      try{old.recognition.abort();}catch{released(old);}
    }
    onState(false);
  }
  function fail(current,message){
    if(session!==current)return;
    const text=finalText(current)||current.interim;
    cancel();
    // An unfinished browser result can fill a draft, but must never auto-save.
    if(text)onTranscript(text,true);else onError(message);
  }
  function ready(current){
    if(session!==current||current.ready||current.stopping)return;
    current.ready=true;clearTimeout(current.readyTimer);
    onStatus('Listening… say “Groceries fifteen dollars”.');
  }
  function begin(current){
    if(session!==current)return;
    try{
      const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(!Recognition){fail(current,'Dictation is unavailable in this browser. Please use manual entry.');return;}
      const recognition=new Recognition();current.recognition=recognition;
      recognition.lang='en-SG';recognition.continuous=false;recognition.interimResults=true;recognition.maxAlternatives=1;
      recognition.onstart=()=>ready(current);
      recognition.onaudiostart=()=>ready(current);
      recognition.onspeechstart=()=>{if(session!==current||current.stopping)return;ready(current);onStatus('Voice detected… finish your transaction.');};
      recognition.onresult=e=>{
        if(session!==current)return;ready(current);
        const interim=[];
        for(let i=0;i<e.results.length;i++){
          const result=e.results[i];if(!result[0])continue;
          if(result.isFinal){current.parts[i]=result[0].transcript;current.confidence[i]=result[0].confidence;}
          interim.push(result[0].transcript);
        }
        current.interim=interim.join(' ').trim();
        const text=finalText(current);
        if(text&&isComplete(text)){
          const uncertain=current.confidence.some(c=>c>0&&c<0.65);
          cancel();onTranscript(text,uncertain);
        }
      };
      recognition.onerror=e=>{
        const messages={'not-allowed':'Tap the microphone to start dictation. Allow microphone and speech access if asked.','service-not-allowed':'Speech recognition is disabled in this browser.','audio-capture':'Microphone unavailable. Check microphone access.','network':'Speech recognition needs a working connection. Please try again.','no-speech':'No speech heard. Wait for “Listening”, then speak. Tap the microphone to retry.','language-not-supported':'English (Singapore) is unavailable in this browser.','aborted':'Dictation was interrupted. Tap the microphone to retry.'};
        fail(current,messages[e.error]||'Dictation could not be completed. Tap the microphone to retry.');
      };
      recognition.onend=()=>{
        if(draining===current){released(current);return;}
        if(session!==current)return;
        session=null;clearTimers(current);onState(false);
        const text=finalText(current);
        if(text)onTranscript(text,current.confidence.some(c=>c>0&&c<0.65));
        else if(current.interim)onTranscript(current.interim,true);
        else onError('No speech recognised. Wait for “Listening”, then speak. Tap the microphone to retry.');
      };
      current.readyTimer=setTimeout(()=>fail(current,'Microphone did not start. Tap the microphone to retry.'),5000);
      current.timer=setTimeout(()=>fail(current,'No completed speech received. Tap the microphone to retry.'),20000);
      recognition.start();
    }catch{fail(current,'Tap the microphone to start dictation. Check browser permissions if it still cannot start.');}
  }
  function start(){
    cancel();
    const current={recognition:null,parts:[],confidence:[],interim:'',ready:false,stopping:false,timer:null,readyTimer:null};
    session=current;onState(true);
    if(draining)onStatus('Restarting microphone… wait before speaking.');
    else begin(current);
  }
  function stop(){
    const current=session;if(!current)return;
    if(!current.recognition||!current.ready){cancel();return;}
    current.stopping=true;clearTimers(current);onStatus('Finishing dictation…');
    current.timer=setTimeout(()=>fail(current,'Speech recognition did not finish. Tap the microphone to retry.'),6000);
    try{current.recognition.stop();}catch{fail(current,'Dictation stopped. Tap the microphone to retry.');}
  }
  return {start,cancel,isListening:()=>!!session,stop};
}
