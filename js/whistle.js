export const whistleAvailable=()=>!!(window.Worker&&window.WebAssembly&&window.crypto?.subtle&&navigator.mediaDevices?.getUserMedia&&(window.AudioContext||window.webkitAudioContext));
export function createWhistle({onState,onStatus,onTranscript,onError,getKeywords}){
  let worker=null,ready=null,nextId=0,session=null;const pending=new Map();
  function request(kind,data={},transfer=[]){
    if(!worker){worker=new Worker(new URL('./whistle-worker.js',import.meta.url));worker.onmessage=({data})=>{const item=pending.get(data.id);if(!item)return;if(data.status){onStatus(data.status);return;}pending.delete(data.id);if(data.error)item.reject(Error(data.error));else item.resolve(data.result||data.ready);};worker.onerror=()=>{for(const item of pending.values())item.reject(Error('Whistle could not start. Please retry or choose Browser.'));pending.clear();worker.terminate();worker=null;ready=null;};}
    return new Promise((resolve,reject)=>{const id=++nextId;pending.set(id,{resolve,reject});worker.postMessage({id,kind,...data},transfer);});
  }
  function preload(){if(!whistleAvailable())return Promise.reject(Error('Whistle needs microphone access and WebAssembly support in this browser.'));if(!ready)ready=request('init').catch(e=>{ready=null;throw e;});return ready;}
  function cleanup(old){if(!old)return;clearTimeout(old.timeout);for(const node of [old.source,old.capture,old.gain])try{node?.disconnect();}catch{}old.stream?.getTracks().forEach(t=>t.stop());if(old.context)old.context.close().catch(()=>{});}
  function cancel(){const old=session;session=null;cleanup(old);onState(false);}
  async function finish(current){
    if(session!==current||current.finishing)return;current.finishing=true;cleanup(current);
    if(!current.voiced){session=null;onState(false);onError('No speech heard. Tap the microphone and try again.');return;}
    onStatus('Transcribing with Whistle…');
    const length=current.chunks.reduce((sum,c)=>sum+c.length,0),pcm=new Float32Array(length);let at=0;for(const c of current.chunks){pcm.set(c,at);at+=c.length;}current.chunks=[];
    try{const result=await request('transcribe',{pcm:pcm.buffer,rate:current.rate,keywords:getKeywords()},[pcm.buffer]);if(session!==current)return;session=null;onState(false);if(!result.text?.trim()){onError('No speech recognised. Please try again.');return;}onTranscript(result.text,(result.words||[]).some(w=>w.probability>0&&w.probability<0.2));}catch(e){if(session===current){session=null;onState(false);onError(e.message);}}
  }
  async function start(){
    cancel();const current={chunks:[],voiced:false,voiceFrames:0,lastVoice:0,finishing:false};session=current;
    try{
      if(!whistleAvailable())throw Error('Whistle is unavailable in this browser. Please choose Browser or use manual entry.');
      // Create/resume in the microphone button's user gesture for iOS.
      const Context=window.AudioContext||window.webkitAudioContext;current.context=new Context();current.context.resume().catch(()=>{});
      onState(true);onStatus('Loading Whistle…');await preload();if(session!==current)return;
      onStatus('Allow microphone access to start…');const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true},video:false});
      if(session!==current){stream.getTracks().forEach(t=>t.stop());return;}current.stream=stream;
      const context=current.context;current.rate=context.sampleRate;current.source=context.createMediaStreamSource(stream);current.gain=context.createGain();current.gain.gain.value=0;
      const collect=chunk=>{if(session!==current||current.finishing)return;current.chunks.push(chunk);let sum=0;for(const value of chunk)sum+=value*value;const now=performance.now(),rms=Math.sqrt(sum/chunk.length);if(rms>.009){current.voiceFrames++;if(current.voiceFrames>=2)current.voiced=true;current.lastVoice=now;}if(current.voiced&&now-current.lastVoice>700&&now-current.started>1000)finish(current);else if(current.chunks.reduce((n,c)=>n+c.length,0)/current.rate>=12)finish(current);};
      if(context.audioWorklet&&window.AudioWorkletNode){await context.audioWorklet.addModule(new URL('./whistle-audio-worklet.js',import.meta.url));if(session!==current)return;current.capture=new AudioWorkletNode(context,'whistle-capture');current.capture.port.onmessage=e=>collect(e.data);}
      else{current.capture=context.createScriptProcessor(2048,1,1);current.capture.onaudioprocess=e=>collect(new Float32Array(e.inputBuffer.getChannelData(0)));}
      current.started=performance.now();current.source.connect(current.capture);current.capture.connect(current.gain);current.gain.connect(context.destination);await context.resume();if(session!==current)return;
      onStatus('Listening with Whistle… say your transaction. Pause briefly to finish.');current.timeout=setTimeout(()=>finish(current),12000);
    }catch(e){if(session!==current)return;cancel();onError(e.name==='NotAllowedError'?'Allow microphone access, then try again.':e.message||'Whistle could not start. Please retry.');}
  }
  return {start,cancel,preload,isListening:()=>!!session,stop:()=>{if(session){if(session.finishing)cancel();else finish(session);}}};
}
