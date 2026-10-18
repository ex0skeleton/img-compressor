// Sonic Arcade sound engine, reused from supplied reference.
// Only the three sounds used by this app are included.
const SOUND_CATALOG = [
  {id:'toggle-on', name:'Toggle On', kind:'up', f:550},
  {id:'validation-error', name:'Validation Error', kind:'double', f:280},
  {id:'achievement-unlocked', name:'Achievement Unlocked', kind:'fanfare', f:420}
];
const SoundFX=(()=>{
 let ctx,master,analyser; const active=new Set(); const config={volume:.32,enabled:true};
 function init(){if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('Web Audio is unavailable in this browser.');ctx=new AC();master=ctx.createGain();master.gain.value=config.volume;analyser=ctx.createAnalyser();analyser.fftSize=512;master.connect(analyser);analyser.connect(ctx.destination);}return ctx;}
 async function unlock(){init();if(ctx.state==='suspended')await ctx.resume();return ctx.state==='running';}
 function duration(s){if(['rain','wind','hum','drone','ocean','pad'].includes(s.kind))return 4;if(['victory','ring','alarm'].includes(s.kind))return 1.6;if(['fanfare','sparkle','swell'].includes(s.kind))return 1.1;if(['melody','fallmelody','pulse'].includes(s.kind))return .75;return .4;}
 function synth(c,out,s,t){
  const f=s.f,k=s.kind;
  function tone(freq,len=.12,offset=0,type='sine',amp=.35,end=null,pan=0){const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(Math.max(20,freq),t+offset);if(end)o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+offset+len);g.gain.setValueAtTime(.0001,t+offset);g.gain.exponentialRampToValueAtTime(amp,t+offset+.008);g.gain.exponentialRampToValueAtTime(.0001,t+offset+len);o.connect(g);if(c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=pan;g.connect(p);p.connect(out);}else g.connect(out);o.start(t+offset);o.stop(t+offset+len+.02);}
  function noise(len=.15,filter=1000,offset=0,amp=.3,mode='bandpass',pan=0,swell=false){const b=c.createBuffer(1,Math.ceil(c.sampleRate*len),c.sampleRate),a=b.getChannelData(0);let seed=127;for(let i=0;i<a.length;i++){seed=(seed*16807)%2147483647;a[i]=seed/1073741823.5-1;}const n=c.createBufferSource(),g=c.createGain(),fil=c.createBiquadFilter();n.buffer=b;fil.type=mode;fil.frequency.value=filter;fil.Q.value=.7;g.gain.setValueAtTime(.0001,t+offset);g.gain.linearRampToValueAtTime(amp,t+offset+(swell?len*.45:.006));g.gain.exponentialRampToValueAtTime(.0001,t+offset+len);n.connect(fil);fil.connect(g);if(c.createStereoPanner){const p=c.createStereoPanner();p.pan.setValueAtTime(-pan,t+offset);p.pan.linearRampToValueAtTime(pan,t+offset+len);g.connect(p);p.connect(out);}else g.connect(out);n.start(t+offset);n.stop(t+offset+len);}
  if(k==='tick'){tone(f,.045,0,'triangle',.32,f*.6);noise(.025,f,0,.14);}
  else if(k==='tone')tone(f,.09,0,f===500?'square':'sine',.24);
  else if(k==='pop')tone(f,.18,0,'sine',.65,f*.22);
  else if(k==='noise')noise(.08,f,0,.5,f>3000?'highpass':'bandpass');
  else if(k==='bell'){[1,2.76,4.1].forEach((r,i)=>tone(f*r,.37-i*.07,0,'sine',.25/(i+1)));}
  else if(k==='up'||k==='down'){[1,k==='up'?1.5:.67].forEach((r,i)=>tone(f*r,.13,i*.08,'sine',.35));}
  else if(k==='double'){tone(f,.11);tone(f*1.15,.12,.15);}
  else if(k==='chord'){[1,1.25,1.5].forEach(r=>tone(f*r,.38,0,'sine',.2));}
  else if(['melody','fallmelody','fanfare','victory','sparkle'].includes(k)){let notes=k==='fallmelody'?[1.5,1.25,1,.75]:k==='sparkle'?[1,1.5,2,2.5,3,4]:k==='victory'?[1,1,1.25,1.5,1.25,1.5,2]:k==='fanfare'?[1,1.25,1.5,2]:[1,1.25,1.5];notes.forEach((r,i)=>tone(f*r,k==='sparkle'?.2:.22,i*(k==='victory'?.18:.12),k==='victory'?'triangle':'sine',.3));}
  else if(k==='buzz'){tone(f,.23,0,'sawtooth',.17,f*.8);tone(f*.98,.23,0,'square',.08);}
  else if(k==='alarm'||k==='ring'){for(let i=0;i<6;i++)tone(f*(i%2?1.25:1),.12,i*.23,'sine',.27);}
  else if(['swoosh','swooshdown','left','right'].includes(k)){noise(.3,f,0,.55,'bandpass',k==='left'?-1:k==='right'?1:0,true);tone(k==='swooshdown'?500:180,.2,0,'sine',.1,k==='swooshdown'?100:500);}
  else if(k==='laser'||k==='laserup')tone(f,.3,0,'sawtooth',.16,k==='laser'?55:f*4);
  else if(k==='boing'){tone(f,.32,0,'triangle',.45,f*.4);tone(f*1.03,.32,0,'sine',.18,f*.45);}
  else if(k==='glitch'){for(let i=0;i<8;i++){tone(f*(i%3+1),.028,i*.037,'square',.12);noise(.02,3000,i*.037,.13);}}
  else if(k==='snare'){noise(.16,1500,0,.65,'highpass');tone(180,.08,0,'triangle',.25);}
  else if(k==='impact'){tone(f,.3,0,'sine',.65,30);noise(.2,550,0,.4);}
  else if(k==='heartbeat'){tone(f,.12,0,'sine',.65,40);tone(f,.1,.17,'sine',.4,40);}
  else if(k==='pulse'){for(let i=0;i<4;i++)tone(f,.13,i*.17,'sine',.28);}
  else if(k==='swell')tone(f,1,0,'sine',.3,f*1.5);
  else if(['rain','wind','ocean'].includes(k)){noise(4,f,0,.6,k==='rain'?'highpass':'lowpass',0,true);}
  else if(['hum','drone','pad'].includes(k)){[1,1.5,2].forEach((r,i)=>tone(f*r,3.9,0,k==='hum'?'triangle':'sine',.12/(i+1)));}
 }
 async function play(id){const s=SOUND_CATALOG.find(x=>x.id===id);if(!s)throw Error('Unknown sound ID: '+id);if(!config.enabled)return;await unlock();if(ctx.state!=='running')throw Error('Audio is blocked. Tap Play again.');const bus=ctx.createGain();bus.connect(master);active.add(bus);synth(ctx,bus,s,ctx.currentTime+.015);return new Promise(resolve=>setTimeout(()=>{bus.disconnect();active.delete(bus);resolve();},(duration(s)+.1)*1000));}
 function stop(){const stopped=[...active];for(const b of stopped){b.gain.cancelScheduledValues(ctx.currentTime);b.gain.setTargetAtTime(0,ctx.currentTime,.01);}setTimeout(()=>{for(const b of stopped){b.disconnect();active.delete(b);}},45);}
 async function wav(id){const s=SOUND_CATALOG.find(x=>x.id===id);if(!s)throw Error('Unknown sound');const sr=44100,oc=new (window.OfflineAudioContext||window.webkitOfflineAudioContext)(2,Math.ceil((duration(s)+.1)*sr),sr),g=oc.createGain();g.gain.value=config.volume;g.connect(oc.destination);synth(oc,g,s,.015);const b=await oc.startRendering(),ab=new ArrayBuffer(44+b.length*4),v=new DataView(ab);function str(o,x){for(let i=0;i<x.length;i++)v.setUint8(o+i,x.charCodeAt(i));}str(0,'RIFF');v.setUint32(4,36+b.length*4,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,sr,true);v.setUint32(28,sr*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,b.length*4,true);for(let i=0;i<b.length;i++)for(let ch=0;ch<2;ch++)v.setInt16(44+(i*2+ch)*2,Math.max(-1,Math.min(1,b.getChannelData(ch)[i]))*32767,true);return new Blob([ab],{type:'audio/wav'});}
 return {play,stop,wav,list:()=>SOUND_CATALOG.map(x=>({...x,duration:duration(x)})),configure:o=>{if(o.volume!==undefined){config.volume=Math.max(0,Math.min(1,Number(o.volume)||0));if(master)master.gain.value=config.volume;}if(o.enabled!==undefined)config.enabled=!!o.enabled;},unlock,getAnalyser:()=>analyser};
})();window.SoundFX=SoundFX;
