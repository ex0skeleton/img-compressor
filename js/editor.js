/* Live image editor.
   Crops are stored per image in normalized original-image coordinates.
   Encodes are serialized, debounced and invalidated with a generation token. */
let editorOriginal = false;
let cropMode = false;
let cropSelection = null;
let editorSize = {width: 0, height: 0};
let liveTimer;
let liveChain = Promise.resolve();
let pointerStart = null;
let dragBase = null;

function stopLive() {
  state.liveToken++;
  clearTimeout(liveTimer);
}
function closeEditor() {
  stopLive();
  state.selected = null;
  cropMode = false;
  $('editor').hidden = true;
  $('crop-controls').hidden = true;
  $('crop-overlay').hidden = true;
  $('editor-image').removeAttribute('src');
  render();
}
async function openEditor(item) {
  stopLive();
  state.selected = item;
  editorSize = {width:0,height:0};
  editorOriginal = false;
  cropMode = false;
  $('editor').hidden = false;
  $('editor-name').textContent = item.file.name;
  $('crop-controls').hidden = true;
  $('crop-overlay').hidden = true;
  $('crop-toggle').setAttribute('aria-pressed','false');
  render();
  try {
    const bitmap = await createImageBitmap(item.file);
    const size = {width:bitmap.width,height:bitmap.height};
    bitmap.close();
    if(state.selected !== item) return;
    editorSize = size;
    if(size.width * size.height > 24000000 || Math.max(size.width,size.height)>12000) throw Error('Image exceeds the 24 MP / 12,000 px limit.');
    refreshEditor();
    if(!item.result) scheduleLive();
  } catch(e) { if(state.selected===item){$('editor-status').textContent=e.message;error(e.message);} }
}
function refreshEditor() {
  const item = state.selected;
  if(!item) return;
  $('editor-image').src = editorOriginal || cropMode || !item.resultUrl ? item.url : item.resultUrl;
  $('show-original').setAttribute('aria-pressed',String(editorOriginal && !cropMode));
  $('show-result').setAttribute('aria-pressed',String(!editorOriginal && !cropMode));
  if(item.result) {
    const r=item.result;
    $('editor-status').textContent=(editorOriginal?'Original: '+r.originalWidth+' × '+r.originalHeight+' · '+bytes(item.file.size):
      'Live result: '+r.width+' × '+r.height+' · '+bytes(r.blob.size)+(item.target?' · target met':''))+
      (item.crop?' · crop applied':'');
  } else $('editor-status').textContent = 'Preparing live preview…';
}
function scheduleLive() {
  if(!state.selected || state.busy || cropMode) return;
  stopLive();
  const token=state.liveToken, item=state.selected;
  $('editor-status').textContent='Updating preview…';
  liveTimer=setTimeout(()=>{
    liveChain=liveChain.catch(()=>{}).then(async()=>{
      if(token!==state.liveToken || state.selected!==item || state.busy)return;
      try {
        const options=readOptions();
        const result=await ImageCompressor.compress(item.file,{...options,crop:item.crop},
          ()=>token!==state.liveToken || state.selected!==item || state.busy);
        if(token!==state.liveToken || state.selected!==item)return;
        if(item.resultUrl)URL.revokeObjectURL(item.resultUrl);
        item.result=result;item.resultUrl=URL.createObjectURL(result.blob);item.target=options.target;item.status='Ready';
        render(); refreshEditor();
      } catch(e) {
        if(token!==state.liveToken || state.selected!==item)return;
        item.status=e.message;render();$('editor-status').textContent=e.message;error(e.message);
      }
    });
  },400);
}
function invalidateResults(onlySelected = false) {
  stopLive();
  for(const item of (onlySelected === true ? [state.selected] : state.items)) {
    if(item.resultUrl)URL.revokeObjectURL(item.resultUrl);
    delete item.result;delete item.resultUrl;item.status='Settings changed';
  }
  $('summary').hidden=true;$('achievement').hidden=true;
  render();
  if(state.selected) { refreshEditor();scheduleLive(); }
}
// Input events update only the selected image. A batch run applies current settings to all.
$('settings').addEventListener('input',invalidateResults);
$('settings').addEventListener('change',e=>{
  if(e.target.id==='resolution') {
    const custom=e.target.value!=='original';
    $('dimensions').hidden=!custom;$('fit-field').hidden=!custom;$('edge-field').hidden=custom;
    if(custom && e.target.value!=='custom') {
      const [width,height]=e.target.value.split('x');$('width').value=width;$('height').value=height;
    }
  }
  invalidateResults();
});
$('close-view').onclick=closeEditor;
$('show-original').onclick=()=>{if(cropMode)exitCrop();editorOriginal=true;refreshEditor();};
$('show-result').onclick=()=>{if(cropMode)exitCrop();editorOriginal=false;refreshEditor();if(!state.selected?.result)scheduleLive();};
$('help').onclick=()=>{$('help-dialog').showModal();$('help').setAttribute('aria-expanded','true');};
$('close-help').onclick=()=>$('help-dialog').close();
$('help-dialog').addEventListener('close',()=>{$('help').setAttribute('aria-expanded','false');$('help').focus();});

// Fit the crop overlay exactly over the displayed original, excluding stage letterboxing.
function positionOverlay() {
  if(!cropMode)return;
  const stage=$('stage').getBoundingClientRect(), image=$('editor-image').getBoundingClientRect();
  if(!image.width||!image.height)return;
  const canvas=$('crop-overlay');
  canvas.style.left=(image.left-stage.left-$('stage').clientLeft)+'px';
  canvas.style.top=(image.top-stage.top-$('stage').clientTop)+'px';
  canvas.style.width=image.width+'px';canvas.style.height=image.height+'px';
  canvas.width=Math.round(image.width*devicePixelRatio);
  canvas.height=Math.round(image.height*devicePixelRatio);
  paintCrop();
}
function paintCrop() {
  if(!cropSelection)return;
  const canvas=$('crop-overlay'),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const {x,y,width,height}=cropSelection, left=x*w,top=y*h,cw=width*w,ch=height*h;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#0009';ctx.fillRect(0,0,w,h);ctx.clearRect(left,top,cw,ch);
  ctx.strokeStyle='#ff6a2b';ctx.lineWidth=2*devicePixelRatio;ctx.strokeRect(left,top,cw,ch);
  ctx.lineWidth=devicePixelRatio;ctx.strokeStyle='#ffffff88';
  for(let i=1;i<3;i++){
    ctx.beginPath();ctx.moveTo(left+cw*i/3,top);ctx.lineTo(left+cw*i/3,top+ch);ctx.stroke();
    ctx.beginPath();ctx.moveTo(left,top+ch*i/3);ctx.lineTo(left+cw,top+ch*i/3);ctx.stroke();
  }
}
function syncCropFields() {
  const c=cropSelection;
  $('crop-x').value=Math.round(c.x*editorSize.width);
  $('crop-y').value=Math.round(c.y*editorSize.height);
  $('crop-w').value=Math.max(1,Math.min(editorSize.width-Number($('crop-x').value),Math.round(c.width*editorSize.width)));
  $('crop-h').value=Math.max(1,Math.min(editorSize.height-Number($('crop-y').value),Math.round(c.height*editorSize.height)));
}
function exitCrop() {
  cropMode=false;pointerStart=null;$('crop-controls').hidden=true;$('crop-overlay').hidden=true;
  $('crop-toggle').setAttribute('aria-pressed','false');refreshEditor();
}
$('crop-toggle').onclick=()=>{
  if(!state.selected || !editorSize.width)return;
  if(cropMode){exitCrop();scheduleLive();return;}
  stopLive();cropMode=true;
  cropSelection={...(state.selected.crop||{x:0,y:0,width:1,height:1})};
  $('crop-toggle').setAttribute('aria-pressed','true');$('crop-controls').hidden=false;$('crop-overlay').hidden=false;
  refreshEditor();syncCropFields();positionOverlay();
  $('editor-status').textContent='Drag to draw a crop, or enter pixel values below.';
};
$('editor-image').addEventListener('load',positionOverlay);
new ResizeObserver(positionOverlay).observe($('stage'));
function point(event) {
  const r=$('crop-overlay').getBoundingClientRect();
  return {x:Math.min(1,Math.max(0,(event.clientX-r.left)/r.width)),y:Math.min(1,Math.max(0,(event.clientY-r.top)/r.height))};
}
$('crop-overlay').onpointerdown=e=>{
  if(state.busy)return;
  pointerStart=point(e);dragBase={...cropSelection};
  $('crop-overlay').setPointerCapture(e.pointerId);e.preventDefault();
};
$('crop-overlay').onpointermove=e=>{
  if(!pointerStart)return;
  const end=point(e);
  cropSelection={x:Math.min(pointerStart.x,end.x),y:Math.min(pointerStart.y,end.y),width:Math.abs(end.x-pointerStart.x),height:Math.abs(end.y-pointerStart.y)};
  paintCrop();syncCropFields();
};
$('crop-overlay').onpointerup=()=>{
  if(pointerStart && (cropSelection.width*editorSize.width<1||cropSelection.height*editorSize.height<1))cropSelection=dragBase;
  pointerStart=null;paintCrop();syncCropFields();
};
$('crop-overlay').onpointercancel=()=>{pointerStart=null;if(dragBase)cropSelection=dragBase;paintCrop();syncCropFields();};
function numericCrop() {
  const x=Number($('crop-x').value),y=Number($('crop-y').value),width=Number($('crop-w').value),height=Number($('crop-h').value);
  if(![x,y,width,height].every(Number.isInteger)||x<0||y<0||width<1||height<1||x+width>editorSize.width||y+height>editorSize.height)throw Error('Crop must fit inside the original '+editorSize.width+' × '+editorSize.height+' image.');
  return {x:x/editorSize.width,y:y/editorSize.height,width:width/editorSize.width,height:height/editorSize.height};
}
for(const id of ['crop-x','crop-y','crop-w','crop-h'])$(id).addEventListener('input',()=>{try{cropSelection=numericCrop();paintCrop();}catch{}});
$('apply-crop').onclick=()=>{
  try {state.selected.crop=numericCrop();exitCrop();editorOriginal=false;invalidateResults(true);}
  catch(e){error(e.message);}
};
$('cancel-crop').onclick=()=>{exitCrop();scheduleLive();};
$('reset-crop').onclick=()=>{
  if(!state.selected)return;
  delete state.selected.crop;exitCrop();editorOriginal=false;invalidateResults(true);
};
