class WhistleCapture extends AudioWorkletProcessor{
  constructor(){super();this.buffer=new Float32Array(2048);this.at=0;}
  process(inputs){const channels=inputs[0];if(channels?.length){for(let i=0;i<channels[0].length;i++){let sample=0;for(const channel of channels)sample+=channel[i];this.buffer[this.at++]=sample/channels.length;if(this.at===this.buffer.length){this.port.postMessage(this.buffer,[this.buffer.buffer]);this.buffer=new Float32Array(2048);this.at=0;}}}return true;}
}
registerProcessor('whistle-capture',WhistleCapture);
