/* Local-only Whistle transcription, isolated from the app UI thread. */
importScripts('../vendor/whistle/needle.js');
const MODEL_URL='https://huggingface.co/Cactus-Compute/whistle/resolve/b358ddadd89b7a713b5aa131f23032d3cca1b251/whistle.cact';
const MODEL_SHA='b6e02f048568ac5d01a2042556c658061e699acbc0aa2a1439f52f3d461dffeb';
const WASM_SHA='c43f48e11f302087250d1e406024956781cd2f02595a5e343b3d7ddd5ef707fa';
let loading=null;
async function checkedBytes(url,sha,id,model=false){
  let cache;try{cache=await caches.open('whistle-assets-v1');}catch{}
  let response=await cache?.match(url),cached=!!response;
  if(!response){postMessage({id,status:model?'Downloading Whistle model…':'Loading Whistle engine…'});response=await fetch(url);if(!response.ok)throw Error('Could not download Whistle. Check your connection or choose Browser.');}
  const copy=response.clone();let bytes;
  if(model&&!cached&&response.body){const reader=response.body.getReader(),chunks=[];let total=0,last=0;while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>30*1024*1024)throw Error('Unexpected Whistle model size.');chunks.push(value);if(total-last>1024*1024){postMessage({id,status:`Downloading Whistle… ${(total/1024/1024).toFixed(1)} MB`});last=total;}}bytes=new Uint8Array(total);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}}
  else bytes=new Uint8Array(await response.arrayBuffer());
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(digest!==sha){await cache?.delete(url);throw Error('Whistle download could not be verified. Please retry.');}
  if(!cached)try{await cache?.put(url,copy);}catch{}
  return bytes;
}
function load(id){
  if(!loading)loading=(async()=>{
    const wasm=await checkedBytes(new URL('../vendor/whistle/needle.wasm',self.location).href,WASM_SHA,id);
    const model=await checkedBytes(MODEL_URL,MODEL_SHA,id,true);
    postMessage({id,status:'Preparing Whistle…'});
    const engine=await createNeedle({wasmBinary:wasm,print:()=>{},printErr:()=>{}});
    const ptr=engine._malloc(model.length);engine.HEAPU8.set(model,ptr);
    if(engine._needle_load(ptr,BigInt(model.length))<0)throw Error(engine.UTF8ToString(engine._needle_last_error()));
    // Model memory remains owned by the runtime for subsequent recordings.
    return engine;
  })().catch(error=>{loading=null;throw error;});
  return loading;
}
function resample(input,rate){
  if(rate===16000)return input;
  const result=new Float32Array(Math.floor(input.length*16000/rate)),ratio=rate/16000;
  // Average samples when reducing the rate; interpolate when increasing it.
  for(let i=0;i<result.length;i++){const start=i*ratio,end=(i+1)*ratio;if(ratio>=1){let sum=0,weight=0;for(let j=Math.floor(start);j<Math.ceil(end)&&j<input.length;j++){const w=Math.min(end,j+1)-Math.max(start,j);sum+=input[j]*w;weight+=w;}result[i]=weight?sum/weight:0;}else{const j=Math.floor(start),t=start-j;result[i]=(input[j]||0)*(1-t)+(input[j+1]||0)*t;}}
  return result;
}
self.onmessage=async({data})=>{
  const {id,kind}=data;let m,ptr=0,out=0,lang=0,keywords=0;
  try{
    m=await load(id);if(kind==='init'){postMessage({id,ready:true});return;}
    if(kind!=='transcribe')throw Error('Unknown Whistle request.');
    const input=new Float32Array(data.pcm);if(data.rate<8000||data.rate>192000||input.length/data.rate>15)throw Error('Recording is too long. Say one transaction at a time.');
    const pcm=resample(input,data.rate);if(!pcm.length)throw Error('No speech recorded.');
    ptr=m._malloc(pcm.byteLength);out=m._malloc(65536);
    new Float32Array(m.HEAPU8.buffer,ptr,pcm.length).set(pcm);
    const string=text=>{const bytes=new TextEncoder().encode(text+'\0'),p=m._malloc(bytes.length);m.HEAPU8.set(bytes,p);return p;};
    lang=string('en');keywords=string((data.keywords||[]).slice(0,150).join('\n'));
    const start=performance.now(),count=m._needle_transcribe(ptr,pcm.length,lang,keywords,1,out,65536);
    if(count<0)throw Error(m.UTF8ToString(m._needle_last_error()));
    const result=JSON.parse(m.UTF8ToString(out));
    postMessage({id,result:{...result,elapsedMs:Math.round(performance.now()-start)}});
  }catch(error){postMessage({id,error:error.message||'Whistle could not transcribe this recording.'});}
  finally{if(m)for(const p of [ptr,out,lang,keywords])if(p)m._free(p);}
};
