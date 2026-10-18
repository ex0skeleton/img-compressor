/* UI state and event handlers. User filenames are rendered only as text. */
const $ = id => document.getElementById(id);
const state = {items:[], busy:false, cancel:false, sound:true, selected:null, liveToken:0};
const bytes = n => n < 1000 ? n+' B' : n < 1000000 ? (n/1000).toFixed(1)+' KB' : (n/1000000).toFixed(2)+' MB';
const sound = id => { if(state.sound) SoundFX.play(id).catch(()=>{}); };
function error(message) { $('notice').hidden=false; $('notice').textContent=message; sound('validation-error'); }
function download(blob, name) {
  const url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url; a.download=name; document.body.append(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function release(item) { if(item.url) URL.revokeObjectURL(item.url); if(item.resultUrl) URL.revokeObjectURL(item.resultUrl); }
function outputName(item) {
  const ext = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[item.result.format];
  return item.file.name.replace(/\.[^.]+$/,'').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_')+'-compressed.'+ext;
}
function render() {
  $('items').replaceChildren();
  document.querySelectorAll('#editor button, #editor input').forEach(control=>control.disabled=state.busy);
  for(const item of state.items) {
    const row=document.createElement('article'); row.className='item'+(state.selected===item?' selected':'');
    const img=document.createElement('img'); img.alt=''; img.src=item.resultUrl||item.url; img.loading='lazy';
    const thumbnail=document.createElement('button'); thumbnail.className='thumbnail'; thumbnail.setAttribute('aria-label','View and edit '+item.file.name); thumbnail.disabled=state.busy; thumbnail.append(img); thumbnail.onclick=()=>openEditor(item);
    const info=document.createElement('div'), name=document.createElement('strong'), sizes=document.createElement('small'), status=document.createElement('small');
    name.textContent=item.file.name; sizes.textContent=bytes(item.file.size);
    if(item.result) {
      const r=item.result, saving=Math.round((1-r.blob.size/item.file.size)*100);
      sizes.textContent+=' → '+bytes(r.blob.size)+' · '+(saving>=0?saving+'% smaller':Math.abs(saving)+'% larger');
      status.textContent=(r.unchanged?'Already optimized · original kept':r.width+' × '+r.height+(r.format==='image/png'?' · PNG': ' · quality '+Math.round(r.quality*100)+'%'))+(item.target?' · target met':'');
    } else status.textContent=item.status||'Ready to compress';
    status.className='state'; info.append(name,sizes,status);
    const actions=document.createElement('div'); actions.className='item-actions';
    const button=(text,fn)=>{const b=document.createElement('button'); b.textContent=text;b.disabled=state.busy;b.onclick=fn;actions.append(b);};
    if(item.result) {button('Compare',()=>{ $('preview-title').textContent=item.file.name; $('before').src=item.url;$('after').src=item.resultUrl;$('preview').showModal();});button('Download',()=>download(item.result.blob,outputName(item)));actions.lastElementChild.className='download-button';}
    button('Remove',()=>{if(state.selected===item)closeEditor();release(item);state.items=state.items.filter(x=>x!==item);$('summary').hidden=true;render();});
    row.append(thumbnail,info,actions);$('items').append(row);
  }
  const done=state.items.filter(x=>x.result);
  $('drop').hidden=!!state.items.length;
  $('add-more').hidden=!state.items.length; $('add-more').disabled=state.busy;
  $('count').textContent=state.items.length; $('empty').hidden=!!state.items.length;
  $('compress').disabled=state.busy||!state.items.length;
  $('clear').disabled=state.busy||!state.items.length; $('browse').disabled=state.busy;
  $('settings').disabled=state.busy; $('download-all').disabled=state.busy||!done.length;
  $('total').textContent=state.items.length?state.items.length+' images · '+bytes(state.items.reduce((n,x)=>n+x.file.size,0)):'No images added';
}
function addFiles(files) {
  if(state.busy)return;
  const errors=[]; let total=state.items.reduce((n,x)=>n+x.file.size,0);
  for(const file of files) {
    if(state.items.length>=50){errors.push('Batch limit: 50 images.');break;}
    if(!/\.(jpe?g|png|webp)$/i.test(file.name)){errors.push(file.name+': Use JPG, PNG or WebP.');continue;}
    if(!file.size||file.size>30000000){errors.push(file.name+': File must be between 1 byte and 30 MB.');continue;}
    if(total+file.size>150000000){errors.push('Batch exceeds 150 MB. Process fewer images.');continue;}
    if(state.items.some(x=>x.file.name===file.name&&x.file.size===file.size&&x.file.lastModified===file.lastModified))continue;
    total+=file.size;state.items.push({file,url:URL.createObjectURL(file)});
  }
  $('summary').hidden=true;$('achievement').hidden=true;render();
  if(errors.length)error(errors.join('\n'));else $('notice').hidden=true;
}
$('browse').onclick=()=>$('files').click();
$('add-more').onclick=()=>$('files').click();
$('files').onchange=e=>{addFiles(e.target.files);e.target.value='';};
['dragenter','dragover'].forEach(type=>$('drop').addEventListener(type,e=>{e.preventDefault();if(!state.busy)$('drop').classList.add('dragging');}));
$('drop').ondragleave=()=>$('drop').classList.remove('dragging');
$('drop').ondrop=e=>{e.preventDefault();$('drop').classList.remove('dragging');addFiles(e.dataTransfer.files);};
window.addEventListener('dragover',e=>e.preventDefault());window.addEventListener('drop',e=>e.preventDefault());
$('clear').onclick=()=>{closeEditor();state.items.forEach(release);state.items=[];$('summary').hidden=true;$('notice').hidden=true;$('achievement').hidden=true;render();};
$('quality').onchange=()=>{$('custom-quality').hidden=$('quality').value!=='custom';};
$('target').onchange=()=>{$('custom-size').hidden=$('target').value!=='custom';};
$('quality-range').oninput=()=>$('quality-value').textContent=$('quality-range').value+'%';
$('cancel').onclick=()=>{state.cancel=true;$('cancel').disabled=true;$('progress-label').textContent='Stopping…';};
function readOptions() {
  const target=$('target').value==='custom'?Number($('size').value)*Number($('unit').value):Number($('target').value);
  if(!Number.isFinite(target)||target<0||($('target').value==='custom'&&(!$('size').value||Number($('size').value)<=0||target<1000)))throw Error('Enter a custom size of at least 1 KB.');
  let width=0,height=0;
  if($('resolution').value!=='original') {
    width=Number($('width').value);height=Number($('height').value);
    if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1)throw Error('Enter positive whole numbers for width and height.');
  }
  return {target,width,height,fit:$('fit').value,quality:$('quality').value==='custom'?Number($('quality-range').value)/100:Number($('quality').value),format:$('format').value,edge:Number($('max-edge').value)};
}
$('compress').onclick=async()=>{
  let options;
  try { options=readOptions(); } catch(e) { return error(e.message); }
  const target=options.target;
  stopLive();
  if(cropMode)exitCrop();
  state.busy=true;state.cancel=false;$('notice').hidden=true;$('summary').hidden=true;$('achievement').hidden=true;$('progress-area').hidden=false;$('cancel').disabled=false;
  // Remove stale results when applying a new set of compression rules.
  for(const item of state.items){if(item.resultUrl)URL.revokeObjectURL(item.resultUrl);delete item.result;delete item.resultUrl;item.status='Queued';}
  render();let failures=0,processed=0;
  try{
    for(const item of state.items){
      if(state.cancel)break;
      item.status='Compressing…';render();$('progress-label').textContent='Processing '+(processed+1)+' of '+state.items.length;$('progress').value=processed/state.items.length*100;
      try{item.result=await ImageCompressor.compress(item.file,{...options,crop:item.crop},()=>state.cancel);item.target=target;item.resultUrl=URL.createObjectURL(item.result.blob);item.status='Done';}
      catch(e){if(state.cancel){item.status='Stopped';break;}item.status=e.message;failures++;sound('validation-error');}
      processed++;render();
    }
  }finally{
    state.busy=false;
    for(const item of state.items)if(!item.result&&['Queued','Compressing…'].includes(item.status))item.status='Not processed';
    $('progress-area').hidden=true;render();
    if(state.selected)refreshEditor();
    const done=state.items.filter(x=>x.result), saved=done.reduce((n,x)=>n+x.file.size-x.result.blob.size,0);
    $('summary').hidden=false;$('summary').textContent=(state.cancel?'Batch stopped. ':'Batch complete. ')+done.length+' ready, '+failures+' failed, '+(state.items.length-processed)+' not processed. '+(saved>=0?bytes(saved)+' saved.':bytes(-saved)+' added by the selected format.')+(done.length?' Your files are ready to download.':' No files are ready. Review the errors and try again.');
    if(done.length&&!state.cancel){
      $('achievement-detail').textContent=done.length+' image'+(done.length===1?'':'s')+' ready · '+(saved>=0?bytes(saved)+' saved':'conversion complete');
      $('achievement').querySelector('strong').textContent=done.length===1?'Your file is ready to download.':'Your files are ready to download.';
      $('achievement').hidden=false;sound('achievement-unlocked');
    }
  }
};
$('download-all').onclick=async()=>{
  $('download-all').disabled=true;
  try{
    const used=new Set(),entries=state.items.filter(x=>x.result).map(item=>{
      let name=outputName(item),i=2,base=name;
      while(used.has(name))name=base.replace(/(\.[^.]+)$/,'-'+i+++'$1');
      used.add(name);return{name,blob:item.result.blob};
    });
    download(await makeZip(entries),'Image-Wiz-compressed.zip');
  }catch(e){error('ZIP download failed: '+e.message);}finally{render();}
};
$('sound').onclick=()=>{
  state.sound=!state.sound;try{localStorage.setItem('image-wiz-sound',String(state.sound));}catch{}
  $('sound').setAttribute('aria-pressed',String(state.sound));$('sound').textContent=state.sound?'♫ Sound on':'♫ Sound off';
  if(state.sound)sound('toggle-on');
};
try{if(localStorage.getItem('image-wiz-sound')==='false')$('sound').click();}catch{}
document.addEventListener('click',e=>{if(e.target.closest('button')&&!e.target.closest('#sound'))sound('toggle-on');},true);
$('dismiss').onclick=()=>$('achievement').hidden=true;
$('close-preview').onclick=()=>$('preview').close();
$('preview').addEventListener('close',()=>{$('before').removeAttribute('src');$('after').removeAttribute('src');});
render();
