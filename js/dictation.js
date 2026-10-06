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
  const command=raw.match(/^(?:add\s+)?(.+?)\s+(expenses?|income)$/i);
  if(!command)return fail('Use “[category] [amount] Expense” or “… Income”.');
  draft.type=command[2].toLowerCase()==='income'?'income':'expense';
  // Find an exact category prefix, leaving the amount untouched for parsing.
  const body=command[1];const matches=[];
  for(let i=1;i<body.length;i++)if(/\s/.test(body[i])){
    const name=categoryName(body.slice(0,i)),amount=body.slice(i).trim();
    for(const c of categories)if(!c.archived&&c.type===draft.type&&[c.name,c.id].some(x=>categoryName(x)===name))matches.push({c,amount,length:i});
  }
  matches.sort((a,b)=>b.length-a.length);
  if(!matches.length)return fail('Category not recognised. Choose an active category below, then enter the amount.');
  if(matches.filter(m=>m.length===matches[0].length).length!==1)return fail('Category is ambiguous. Choose it below.');
  draft.categoryId=matches[0].c.id;
  try{draft.amount=spokenAmount(matches[0].amount);}catch{return fail('Amount unclear. Check the amount below before saving.');}
  return {valid:true,draft,message:''};
}

export function speechAvailable(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition);}
export function createDictation({onState,onTranscript,onError,isComplete=()=>false}){
  let session=null;
  function cancel(){const old=session;session=null;if(old){clearTimeout(old.timer);try{old.recognition.abort();}catch{}}onState(false);}
  function start(){
    cancel();const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Recognition){onError('Dictation is unavailable in this browser. Please use manual entry.');return;}
    const recognition=new Recognition(),current={recognition,parts:[],confidence:[],timer:null,failed:false};session=current;
    recognition.lang='en-SG';recognition.continuous=false;recognition.interimResults=true;recognition.maxAlternatives=1;
    recognition.onresult=e=>{if(session!==current)return;for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal){current.parts[i]=e.results[i][0].transcript;current.confidence[i]=e.results[i][0].confidence;}const text=current.parts.filter(Boolean).join(' ').trim();if(text&&isComplete(text)){session=null;clearTimeout(current.timer);try{recognition.abort();}catch{}onState(false);onTranscript(text,current.confidence.some(c=>c>0&&c<0.65));}};
    recognition.onerror=e=>{if(session!==current)return;current.failed=true;const messages={'not-allowed':'Tap the microphone to start dictation. Allow microphone and speech access if asked.','service-not-allowed':'Speech recognition is disabled in this browser.','audio-capture':'Microphone unavailable. Check microphone access.','network':'Speech recognition needs a working connection. Please try again.','no-speech':'No speech heard. Tap the microphone and try again.','language-not-supported':'English (Singapore) is unavailable in this browser.'};onError(messages[e.error]||'Dictation could not be completed. Please try again.');cancel();};
    recognition.onend=()=>{if(session!==current)return;session=null;clearTimeout(current.timer);onState(false);if(current.failed)return;const text=current.parts.filter(Boolean).join(' ').trim();if(!text){onError('No complete speech heard. Tap the microphone and try again.');return;}onTranscript(text,current.confidence.some(c=>c>0&&c<0.65));};
    try{onState(true);recognition.start();current.timer=setTimeout(()=>{if(session===current){onError('Dictation timed out. Please try again.');cancel();}},20000);}catch{cancel();onError('Tap the microphone to start dictation. Check browser permissions if it still cannot start.');}
  }
  return {start,cancel,isListening:()=>!!session,stop:()=>{if(session)try{session.recognition.stop();}catch{cancel();}}};
}
