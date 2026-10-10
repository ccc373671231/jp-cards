'use strict';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY = 'enZhCards.v1';
let state;
try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { state = {}; }
state = Object.assign({userCards:[],deleted:[],mastered:[],ipa:true,prompt:'zh',hideMaster:false,rate:0.9,voice:'',dark:false,starTheme:true,collapsed:{},order:{}}, state);
let tab = 'pattern', editId = null, batch = false, selected = new Set(), undoState = null;
const uid = () => globalThis.crypto?.randomUUID?.() || `card-${Date.now()}-${Math.random().toString(36).slice(2)}`;
function notice(message) { $('status').textContent = message; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch { notice('保存失败：浏览器存储已满或被禁用，请导出 JSON 备份。'); return false; } }
function cards() { const map = new Map(BUILT.map(c => [c.id,c])); state.userCards.forEach(c => map.set(c.id,c)); return [...map.values()].filter(c => !state.deleted.includes(c.id)); }
function vocab(text) { return text.split(/\n/).filter(x=>x.trim()).map(line => { const [en,ipa,...zh] = line.split(line.includes('|')?'|':/[,，]/); return {en:en.trim(),ipa:(ipa||'').trim(),zh:zh.join(',').trim()}; }); }
function validate(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.en !== 'string' || !raw.en.trim() || typeof raw.zh !== 'string' || !raw.zh.trim()) throw Error('每张卡片必须填写英文短句和中文翻译。');
  for (const key of ['en','zh','ipa','pattern','notes','intent']) if (raw[key] != null && (typeof raw[key] !== 'string' || raw[key].length > 10000)) throw Error('卡片数据无效。');
  if (raw.scenes != null && (!Array.isArray(raw.scenes) || raw.scenes.some(x=>typeof x!=='string'))) throw Error('分类数据无效。');
  if (raw.vocab != null && (!Array.isArray(raw.vocab) || raw.vocab.some(x=>!x || typeof x.en!=='string' || typeof x.zh!=='string' || (x.ipa!=null && typeof x.ipa!=='string')))) throw Error('词汇数据无效。');
  return {id:typeof raw.id==='string' && raw.id ? raw.id:uid(),en:raw.en.trim(),zh:raw.zh.trim(),ipa:raw.ipa||'',notes:raw.notes||'',intent:raw.intent||'',pattern:raw.pattern||'实用表达',scenes:raw.scenes?.length ? [...new Set(raw.scenes)]:['其他'],vocab:raw.vocab||[]};
}
function setTab(value) { tab=value; document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab)); $('cards').hidden=tab==='add'; $('add-panel').hidden=tab!=='add'; render(); }
function render() {
  $('prompt-mode').value=state.prompt;$('ipa-toggle').checked=state.ipa; $('master-toggle').checked=state.hideMaster; document.documentElement.dataset.theme=state.dark?'dark':'light';
  document.documentElement.dataset.sky=state.starTheme?'on':'off';
  $('theme').textContent=state.starTheme?'☀ 米白':'✦ 星空';
  $('batch-tools').hidden=!batch; $('selected-count').textContent=`已选：${selected.size}`;
  const all=cards(), groups=new Map();
  all.forEach(c=>(tab==='scene'?c.scenes:[c.pattern]).forEach(g=>{if(!groups.has(g))groups.set(g,[]);groups.get(g).push(c);}));
  const order=state.order[tab]||[]; const keys=[...groups.keys()].sort((a,b)=>{const ai=order.indexOf(a),bi=order.indexOf(b);return (ai<0?999:ai)-(bi<0?999:bi);});
  $('cards').innerHTML=keys.map((g,index)=>`<section class="panel"><div class="actions"><button class="toolbar-button" data-group="${esc(g)}">${state.collapsed[tab+g]?'▶':'▼'} ${esc(g)} (${groups.get(g).length})</button><button class="toolbar-button" data-move="${esc(g)}" data-dir="-1" aria-label="上移" ${index===0?'disabled':''}>↑</button><button class="toolbar-button" data-move="${esc(g)}" data-dir="1" aria-label="下移" ${index===keys.length-1?'disabled':''}>↓</button></div><div ${state.collapsed[tab+g]?'hidden':''}>${groups.get(g).map(c=>`<article class="card" style="margin-top:12px;padding:14px">${batch?`<label><input type="checkbox" data-select="${esc(c.id)}" ${selected.has(c.id)?'checked':''}> 选择</label>`:''}<details><summary style="cursor:pointer"><span lang="${state.prompt==='zh'?'zh-CN':'en'}" class="c-ja">${esc(state.prompt==='zh'?c.zh:c.en)}</span><div class="intent">${esc(c.intent||'尝试用这个句型说出来')}</div><small>先说一句，再点击展开答案 ↓</small></summary><p class="answer" lang="${state.prompt==='zh'?'en':'zh-CN'}">${esc(state.prompt==='zh'?c.en:c.zh)}</p><p class="c-furigana" ${state.ipa?'':'hidden'}>${esc(c.ipa)}</p><div class="actions"><button class="toolbar-button" data-speak="${esc(c.en)}">🔊 听例句</button><button class="toolbar-button" data-record="${esc(c.id)}">🎙 跟读录音</button><button class="toolbar-button" data-edit="${esc(c.id)}">编辑</button><button class="toolbar-button" data-delete="${esc(c.id)}">删除</button></div><p>句型：${esc(c.pattern)}</p><p class="notice grammar">${esc(c.notes)}</p>${c.vocab.map(v=>{const key=c.id+'|'+v.en,mastered=state.mastered.includes(key);return state.hideMaster&&mastered?'':`<div class="actions" style="margin:8px 0"><button class="toolbar-button" data-speak="${esc(v.en)}" lang="en-US">🔊 ${esc(v.en)}</button><span ${state.ipa?'':'hidden'}>${esc(v.ipa)}</span><span>${esc(v.zh)}</span><label><input type="checkbox" data-master="${esc(key)}" ${mastered?'checked':''}> 已掌握</label></div>`;}).join('')}</details></article>`).join('')}</div></section>`).join('') || '<p>还没有卡片，添加一张开始积累吧。</p>';
  $('patterns').innerHTML=[...new Set(all.map(c=>c.pattern))].map(x=>`<option value="${esc(x)}"></option>`).join('');
  $('scenes').innerHTML=[...new Set(['日常交流','工作沟通','学习与行动','购物','餐饮','旅行','自我成长','网络聊天',...all.flatMap(c=>c.scenes)])].map(x=>`<option value="${esc(x)}"></option>`).join('');
}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
$('cards').onclick=event=>{
  const b=event.target.closest('button'); if(!b)return;
  if(b.dataset.speak)speak(b.dataset.speak);
  if(b.dataset.record)openRecord(b.dataset.record);
  if(b.dataset.edit){const c=cards().find(c=>c.id===b.dataset.edit);editId=c.id;const f=$('card-form');for(const key of ['en','zh','ipa','pattern','notes','intent'])f.elements[key].value=c[key];f.elements.scenes.value=c.scenes.join(', ');f.elements.vocab.value=c.vocab.map(v=>`${v.en} | ${v.ipa} | ${v.zh}`).join('\n');setTab('add');}
  if(b.dataset.delete)removeCards([b.dataset.delete]);
  if(b.dataset.group){const key=tab+b.dataset.group;state.collapsed[key]=!state.collapsed[key];save();render();}
  if(b.dataset.move){const groups=[...new Set(cards().flatMap(c=>tab==='scene'?c.scenes:[c.pattern]))];const old=state.order[tab]||[];groups.sort((a,b)=>(old.indexOf(a)<0?999:old.indexOf(a))-(old.indexOf(b)<0?999:old.indexOf(b)));const i=groups.indexOf(b.dataset.move),j=i+Number(b.dataset.dir);if(j>=0&&j<groups.length){[groups[i],groups[j]]=[groups[j],groups[i]];state.order[tab]=groups;save();render();}}
};
$('cards').onchange=e=>{if(e.target.dataset.select){e.target.checked?selected.add(e.target.dataset.select):selected.delete(e.target.dataset.select);render();}if(e.target.dataset.master){const k=e.target.dataset.master;state.mastered=state.mastered.filter(x=>x!==k);if(e.target.checked)state.mastered.push(k);save();render();}};
function removeCards(ids){if(!ids.length||!confirm(`删除 ${ids.length} 张卡片？`))return;undoState=[...state.deleted];state.deleted=[...new Set([...state.deleted,...ids])];selected.clear();save();render();$('undo').hidden=false;}
$('undo').onclick=()=>{if(undoState){state.deleted=undoState;undoState=null;save();render();$('undo').hidden=true;}};
$('batch').onclick=()=>{batch=!batch;selected.clear();render();};$('cancel-batch').onclick=()=>{batch=false;selected.clear();render();};$('select-all').onclick=()=>{selected=new Set(cards().map(c=>c.id));render();};$('delete-selected').onclick=()=>removeCards([...selected]);
$('prompt-mode').onchange=e=>{state.prompt=e.target.value;save();render();};
$('ipa-toggle').onchange=e=>{state.ipa=e.target.checked;save();render();};$('master-toggle').onchange=e=>{state.hideMaster=e.target.checked;save();render();};$('theme').onclick=()=>{state.starTheme=!state.starTheme;state.dark=false;save();render();};
$('cancel-edit').onclick=()=>{editId=null;$('card-form').reset();setTab('pattern');};
$('card-form').onsubmit=e=>{e.preventDefault();const f=e.target;try{const c=validate({id:editId||uid(),en:f.elements.en.value,zh:f.elements.zh.value,ipa:f.elements.ipa.value,notes:f.elements.notes.value,intent:f.elements.intent.value,pattern:f.elements.pattern.value,scenes:f.elements.scenes.value.split(/[,，]/).map(s=>s.trim()).filter(Boolean),vocab:vocab(f.elements.vocab.value)});state.userCards=state.userCards.filter(x=>x.id!==c.id);state.userCards.push(c);state.deleted=state.deleted.filter(x=>x!==c.id);save();editId=null;f.reset();setTab('pattern');notice('卡片已保存。');}catch(error){notice(error.message);}};
function parseBulk(text){if(text.trim().startsWith('['))return JSON.parse(text).map(validate);return text.trim().split(/\n\s*\n/).map(block=>{const raw={};block.split('\n').forEach(line=>{const m=line.match(/^\s*([^:：]+)[:：]\s*(.*)$/);if(!m)throw Error('每行请填写字段名和冒号。');const labels={'英文':'en','中文':'zh','音标':'ipa','说明':'notes','意图':'intent','句型':'pattern','场景':'scenes','单词':'vocab','en':'en','zh':'zh','ipa':'ipa','notes':'notes','intent':'intent','pattern':'pattern','scenes':'scenes','vocab':'vocab'};const k=labels[m[1].trim()];if(!k)throw Error('不支持的字段：'+m[1]);raw[k]=k==='scenes'?m[2].split(/[,，]/).map(s=>s.trim()):k==='vocab'?vocab(m[2].split(';').join('\n')):m[2];});return validate(raw);});}
$('bulk-add').onclick=()=>{try{const incoming=parseBulk($('bulk').value),seen=new Set(cards().map(c=>c.en));let count=0;incoming.forEach(c=>{if(!seen.has(c.en)){seen.add(c.en);state.userCards.push({...c,id:uid()});count++;}});save();render();$('bulk').value='';notice(`已导入 ${count} 张卡片（已跳过重复英文）。`);}catch(e){notice(e.message);}};
let voices=[];
function refreshVoices(){voices=(globalThis.speechSynthesis?.getVoices()||[]).filter(v=>/^en(?:-|$)/i.test(v.lang)).sort((a,b)=>Number(/Natural|Online|Google/i.test(b.name))-Number(/Natural|Online|Google/i.test(a.name)));$('voice').innerHTML='<option value="">自动选择</option>'+voices.map(v=>`<option value="${esc(v.voiceURI)}">${esc(v.name)} (${esc(v.lang)})</option>`).join('');$('voice').value=state.voice;$('voice-note').textContent=voices.length?'选择音色后可试听；可用音色由设备及浏览器决定。':'未找到英语音色，请安装系统英语语音包，或换用其他浏览器。';}
function speak(text){if(!globalThis.speechSynthesis){notice('此浏览器不支持语音朗读。');return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=Number($('rate').value)||state.rate;u.voice=voices.find(v=>v.voiceURI===$('voice').value)||voices[0]||null;u.lang=u.voice?.lang||'en-US';u.onerror=e=>{if(!['interrupted','canceled'].includes(e.error))notice('朗读失败，请尝试其他音色。');};speechSynthesis.speak(u);}
$('rate').value=state.rate;$('rate-label').textContent=Number(state.rate).toFixed(2)+'×';$('rate').oninput=e=>$('rate-label').textContent=Number(e.target.value).toFixed(2)+'×';$('settings').onclick=()=>{refreshVoices();$('settings-dialog').showModal();};document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());$('save-settings').onclick=()=>{state.rate=Number($('rate').value);state.voice=$('voice').value;save();$('settings-dialog').close();};$('test-voice').onclick=()=>speak("There is no point in waiting. Let’s start practising today.");if(globalThis.speechSynthesis)speechSynthesis.addEventListener('voiceschanged',refreshVoices);refreshVoices();
$('export').onclick=()=>{const blob=new Blob([JSON.stringify({app:'en-zh-cards',version:1,userCards:state.userCards,deleted:state.deleted,mastered:state.mastered},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='en-zh-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('import').onclick=()=>$('import-file').click();$('import-file').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>5000000)throw Error('文件过大，最大允许 5 MB。');const data=JSON.parse(await file.text());if(!Array.isArray(data)&&(data.app!=='en-zh-cards'||data.version!==1))throw Error('仅支持本英语版导出的 JSON 文件。');const incoming=(Array.isArray(data)?data:data.userCards);if(!Array.isArray(incoming))throw Error('卡片列表无效。');const clean=incoming.map(validate);for(const key of ['deleted','mastered'])if(!Array.isArray(data)&&(!Array.isArray(data[key])||data[key].some(x=>typeof x!=='string')))throw Error('学习进度无效。');const map=new Map(state.userCards.map(c=>[c.id,c]));clean.forEach(c=>map.set(c.id,c));state.userCards=[...map.values()];if(!Array.isArray(data)){state.deleted=[...new Set([...state.deleted,...data.deleted])];state.mastered=[...new Set([...state.mastered,...data.mastered])];}save();render();notice(`已导入 ${clean.length} 张卡片。`);}catch(error){notice('导入失败：'+error.message);}finally{e.target.value='';}};
// Audio storage v2: store bytes rather than MediaRecorder-backed Blobs (Safari).
let dbPromise,recordCard=null,recorder=null,recordSession=0,urls=[],recordBusy=false;
const temporaryRecords=new Map();
function db(){
  if(!dbPromise){
    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open('enZhRecordings',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('recordings',{keyPath:'id'});
      request.onsuccess=()=>{const database=request.result;database.onversionchange=()=>{database.close();dbPromise=null;};resolve(database);};
      request.onerror=()=>reject(request.error);
    });
    dbPromise.catch(()=>{dbPromise=null;});
  }
  return dbPromise;
}
async function records(){
  const database=await db();
  return new Promise((resolve,reject)=>{
    const tx=database.transaction('recordings'),req=tx.objectStore('recordings').getAll();
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
    tx.onabort=()=>reject(tx.error||Error('Read aborted'));
  });
}
async function writeRecord(item){
  // Convert before opening a transaction: awaiting inside it can make Safari
  // auto-commit the transaction. Old Blob records remain readable.
  const stored=item.blob?{id:item.id,card:item.card,time:item.time,mime:item.blob.type,data:await item.blob.arrayBuffer()}:item;
  const database=await db();
  return new Promise((resolve,reject)=>{
    const tx=database.transaction('recordings','readwrite'),store=tx.objectStore('recordings');
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error||Error('Write failed'));
    tx.onabort=()=>reject(tx.error||Error('Write aborted'));
    try{
      if(item.blob){
        store.put(stored);
        const req=store.getAll();
        req.onsuccess=()=>{
          req.result.filter(r=>r.card===item.card).sort((a,b)=>b.time-a.time).slice(4).forEach(r=>store.delete(r.id));
        };
      }else store.delete(item.id);
    }catch(error){tx.abort();reject(error);}
  });
}
function storageMessage(error){
  const name=error?.name||'UnknownError';
  const hint=name==='QuotaExceededError'?'存储空间不足。':name==='DataCloneError'?'浏览器无法保存该音频格式。':name==='SecurityError'||name==='InvalidStateError'?'浏览器存储被禁用或暂不可用。':'无法写入浏览器存储。';
  return hint+' ('+name+')';
}
function clearUrls(){urls.forEach(u=>URL.revokeObjectURL(u));urls=[];}
function recordingBlob(item){return item.blob||new Blob([item.data],{type:item.mime||'audio/mp4'});}
async function showRecords(){
  const card=recordCard,session=recordSession;
  let list=[],readError;
  try{list=(await records()).filter(r=>r.card===card);}catch(error){readError=error;}
  if(card!==recordCard||session!==recordSession)return;
  const merged=new Map(list.map(r=>[r.id,r]));
  temporaryRecords.forEach(r=>{if(r.card===card)merged.set(r.id,r);});
  clearUrls();$('recordings').replaceChildren();
  [...merged.values()].sort((a,b)=>b.time-a.time).forEach(r=>{
    const row=document.createElement('div'),audio=document.createElement('audio'),del=document.createElement('button'),download=document.createElement('a'),label=document.createElement('p');
    const blob=recordingBlob(r),url=URL.createObjectURL(blob);urls.push(url);
    label.textContent=new Date(r.time).toLocaleString('zh-CN')+(temporaryRecords.has(r.id)?' — 临时录音，未永久保存':'');
    audio.controls=true;audio.preload='metadata';audio.src=url;audio.style.maxWidth='100%';
    download.textContent='下载录音';download.href=url;download.download='english-practice-'+r.time+(blob.type.includes('mp4')?'.m4a':blob.type.includes('ogg')?'.ogg':'.webm');download.className='toolbar-button';
    del.textContent='删除';del.className='toolbar-button';
    del.onclick=async()=>{
      if(temporaryRecords.has(r.id)){temporaryRecords.delete(r.id);showRecords();return;}
      try{await writeRecord({id:r.id});showRecords();}catch(error){$('record-status').textContent=storageMessage(error);}
    };
    row.append(label,audio,download,del);$('recordings').append(row);
  });
  if(readError)$('record-status').textContent=storageMessage(readError)+' 临时录音仍可回放或下载，刷新页面后会丢失。';
}
function openRecord(id){
  recordCard=id;const c=cards().find(c=>c.id===id);
  $('record-en').textContent=c.en;$('record-ipa').textContent=state.ipa?c.ipa:'';$('record-zh').textContent=c.zh;
  $('record-status').textContent='';$('record-dialog').showModal();showRecords();
}
function closeRecord(){recordSession++;if(recorder?.state==='recording')recorder.stop();recordCard=null;clearUrls();$('record-dialog').close();}
$('close-record').onclick=closeRecord;
$('record-dialog').addEventListener('cancel',e=>{e.preventDefault();closeRecord();});
$('record-example').onclick=()=>{const c=cards().find(c=>c.id===recordCard);if(c)speak(c.en);};
function recorderOptions(){
  const mime=['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'].find(type=>MediaRecorder.isTypeSupported?.(type));
  return mime?{mimeType:mime}:{};
}
$('record-button').onclick=async()=>{
  if(recorder?.state==='recording'){
    $('record-button').disabled=true;$('record-status').textContent='正在处理并保存……';recorder.stop();return;
  }
  if(recordBusy||!recordCard)return;
  if(!globalThis.isSecureContext||!navigator.mediaDevices?.getUserMedia||!globalThis.MediaRecorder){$('record-status').textContent='录音需要 HTTPS 和支持录音的浏览器。';return;}
  const card=recordCard,session=++recordSession;let acquired=null;
  recordBusy=true;$('record-button').disabled=true;
  try{
    globalThis.speechSynthesis?.cancel();
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});acquired=stream;
    if(session!==recordSession||card!==recordCard){stream.getTracks().forEach(t=>t.stop());recordBusy=false;$('record-button').disabled=false;return;}
    const chunks=[],r=new MediaRecorder(stream,recorderOptions());let recordingError=null;recorder=r;
    r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    r.onstop=async()=>{
      if(recorder===r)recorder=null;
      try{
        const blob=new Blob(chunks,{type:r.mimeType||chunks[0]?.type||'audio/mp4'});
        if(!blob.size){if(recordCard===card)$('record-status').textContent=recordingError?'录音出错，请重试。':'没有收到音频，请录几秒后再停止。';return;}
        const item={id:uid(),card,time:Date.now(),blob};
        temporaryRecords.set(item.id,item);
        // Keep at most four unsaved takes per card.
        [...temporaryRecords.values()].filter(r=>r.card===card).sort((a,b)=>b.time-a.time).slice(4).forEach(r=>temporaryRecords.delete(r.id));
        let saveError;
        try{await writeRecord(item);temporaryRecords.delete(item.id);}catch(error){saveError=error;}
        if(recordCard===card){
          await showRecords();
          $('record-status').textContent=saveError?storageMessage(saveError)+' 可在下方回放或下载临时录音；刷新页面后临时录音会丢失。':'已保存，可在下方回放。';
        }
      }finally{
        stream.getTracks().forEach(t=>t.stop());recordBusy=false;$('record-button').disabled=false;$('record-button').textContent='🎙 开始录音';
      }
    };
    r.onerror=e=>{recordingError=e.error||Error('Recording failed');if(r.state!=='inactive')r.stop();};
    r.start();$('record-button').disabled=false;$('record-button').textContent='⏹ 停止并保存';$('record-status').textContent='正在录音……';
  }catch(error){
    acquired?.getTracks().forEach(t=>t.stop());recorder=null;recordBusy=false;$('record-button').disabled=false;
    $('record-status').textContent='无法开启麦克风或录音，请检查权限后重试。（'+(error.name||'UnknownError')+')';
  }
};
render();
