'use strict';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY = 'zhViCards.v1';
let state;
try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { state = {}; }
state = Object.assign({userCards:[],deleted:[],mastered:[],pinyin:true,hideMaster:false,rate:0.9,voice:'',dark:false,collapsed:{},order:{}}, state);
let tab = 'pattern', editId = null, batch = false, selected = new Set(), undoState = null;
const uid = () => globalThis.crypto?.randomUUID?.() || `card-${Date.now()}-${Math.random().toString(36).slice(2)}`;
function notice(message) { $('status').textContent = message; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch { notice('Không lưu được: bộ nhớ trình duyệt đã đầy hoặc bị chặn. Hãy xuất JSON để sao lưu.'); return false; } }
function cards() { const map = new Map(BUILT.map(c => [c.id,c])); state.userCards.forEach(c => map.set(c.id,c)); return [...map.values()].filter(c => !state.deleted.includes(c.id)); }
function vocab(text) { return text.split(/\n/).filter(x=>x.trim()).map(line => { const [zh,pinyin,...vi] = line.split(/[,，/]/); return {zh:zh.trim(),pinyin:(pinyin||'').trim(),vi:vi.join(',').trim()}; }); }
function validate(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.zh !== 'string' || !raw.zh.trim() || typeof raw.vi !== 'string' || !raw.vi.trim()) throw Error('Mỗi thẻ cần câu tiếng Trung và bản dịch tiếng Việt.');
  for (const key of ['zh','vi','pinyin','pattern']) if (raw[key] != null && (typeof raw[key] !== 'string' || raw[key].length > 10000)) throw Error('Dữ liệu thẻ không hợp lệ.');
  if (raw.scenes != null && (!Array.isArray(raw.scenes) || raw.scenes.some(x=>typeof x!=='string'))) throw Error('Chủ đề không hợp lệ.');
  if (raw.vocab != null && (!Array.isArray(raw.vocab) || raw.vocab.some(x=>!x || typeof x.zh!=='string' || typeof x.vi!=='string' || (x.pinyin!=null && typeof x.pinyin!=='string')))) throw Error('Từ vựng không hợp lệ.');
  return {id:typeof raw.id==='string' && raw.id ? raw.id:uid(),zh:raw.zh.trim(),vi:raw.vi.trim(),pinyin:raw.pinyin||'',pattern:raw.pattern||'Câu thông dụng',scenes:raw.scenes?.length ? [...new Set(raw.scenes)]:['Khác'],vocab:raw.vocab||[]};
}
function setTab(value) { tab=value; document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab)); $('cards').hidden=tab==='add'; $('add-panel').hidden=tab!=='add'; render(); }
function render() {
  $('pinyin-toggle').checked=state.pinyin; $('master-toggle').checked=state.hideMaster; document.documentElement.dataset.theme=state.dark?'dark':'light';
  $('batch-tools').hidden=!batch; $('selected-count').textContent=`Đã chọn: ${selected.size}`;
  const all=cards(), groups=new Map();
  all.forEach(c=>(tab==='scene'?c.scenes:[c.pattern]).forEach(g=>{if(!groups.has(g))groups.set(g,[]);groups.get(g).push(c);}));
  const order=state.order[tab]||[]; const keys=[...groups.keys()].sort((a,b)=>{const ai=order.indexOf(a),bi=order.indexOf(b);return (ai<0?999:ai)-(bi<0?999:bi);});
  $('cards').innerHTML=keys.map((g,index)=>`<section class="panel"><div class="actions"><button class="toolbar-button" data-group="${esc(g)}">${state.collapsed[tab+g]?'▶':'▼'} ${esc(g)} (${groups.get(g).length})</button><button class="toolbar-button" data-move="${esc(g)}" data-dir="-1" aria-label="Lên" ${index===0?'disabled':''}>↑</button><button class="toolbar-button" data-move="${esc(g)}" data-dir="1" aria-label="Xuống" ${index===keys.length-1?'disabled':''}>↓</button></div><div ${state.collapsed[tab+g]?'hidden':''}>${groups.get(g).map(c=>`<article class="card" style="margin-top:12px;padding:14px">${batch?`<label><input type="checkbox" data-select="${esc(c.id)}" ${selected.has(c.id)?'checked':''}> Chọn</label>`:''}<details><summary style="cursor:pointer"><span lang="zh-CN" class="c-ja">${esc(c.zh)}</span><div>${esc(c.vi)}</div></summary><p class="c-furigana" ${state.pinyin?'':'hidden'}>${esc(c.pinyin)}</p><div class="actions"><button class="toolbar-button" data-speak="${esc(c.zh)}">🔊 Nghe</button><button class="toolbar-button" data-record="${esc(c.id)}">🎙 Luyện nói</button><button class="toolbar-button" data-edit="${esc(c.id)}">Sửa</button><button class="toolbar-button" data-delete="${esc(c.id)}">Xóa</button></div><p>Mẫu câu: ${esc(c.pattern)}</p>${c.vocab.map(v=>{const key=c.id+'|'+v.zh,mastered=state.mastered.includes(key);return state.hideMaster&&mastered?'':`<div class="actions" style="margin:8px 0"><button class="toolbar-button" data-speak="${esc(v.zh)}" lang="zh-CN">🔊 ${esc(v.zh)}</button><span ${state.pinyin?'':'hidden'}>${esc(v.pinyin)}</span><span>${esc(v.vi)}</span><label><input type="checkbox" data-master="${esc(key)}" ${mastered?'checked':''}> Đã thuộc</label></div>`;}).join('')}</details></article>`).join('')}</div></section>`).join('') || '<p>Chưa có thẻ. Hãy thêm thẻ mới.</p>';
  $('patterns').innerHTML=[...new Set(all.map(c=>c.pattern))].map(x=>`<option value="${esc(x)}"></option>`).join('');
  $('scenes').innerHTML=[...new Set(['Chào hỏi','Giới thiệu bản thân','Lớp học','Mua sắm','Ăn uống','Giao thông','Học tập','Trò chuyện trực tuyến',...all.flatMap(c=>c.scenes)])].map(x=>`<option value="${esc(x)}"></option>`).join('');
}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
$('cards').onclick=event=>{
  const b=event.target.closest('button'); if(!b)return;
  if(b.dataset.speak)speak(b.dataset.speak);
  if(b.dataset.record)openRecord(b.dataset.record);
  if(b.dataset.edit){const c=cards().find(c=>c.id===b.dataset.edit);editId=c.id;const f=$('card-form');for(const key of ['zh','vi','pinyin','pattern'])f.elements[key].value=c[key];f.elements.scenes.value=c.scenes.join(', ');f.elements.vocab.value=c.vocab.map(v=>`${v.zh}/${v.pinyin}/${v.vi}`).join('\n');setTab('add');}
  if(b.dataset.delete)removeCards([b.dataset.delete]);
  if(b.dataset.group){const key=tab+b.dataset.group;state.collapsed[key]=!state.collapsed[key];save();render();}
  if(b.dataset.move){const groups=[...new Set(cards().flatMap(c=>tab==='scene'?c.scenes:[c.pattern]))];const old=state.order[tab]||[];groups.sort((a,b)=>(old.indexOf(a)<0?999:old.indexOf(a))-(old.indexOf(b)<0?999:old.indexOf(b)));const i=groups.indexOf(b.dataset.move),j=i+Number(b.dataset.dir);if(j>=0&&j<groups.length){[groups[i],groups[j]]=[groups[j],groups[i]];state.order[tab]=groups;save();render();}}
};
$('cards').onchange=e=>{if(e.target.dataset.select){e.target.checked?selected.add(e.target.dataset.select):selected.delete(e.target.dataset.select);render();}if(e.target.dataset.master){const k=e.target.dataset.master;state.mastered=state.mastered.filter(x=>x!==k);if(e.target.checked)state.mastered.push(k);save();render();}};
function removeCards(ids){if(!ids.length||!confirm(`Xóa ${ids.length} thẻ?`))return;undoState=[...state.deleted];state.deleted=[...new Set([...state.deleted,...ids])];selected.clear();save();render();$('undo').hidden=false;}
$('undo').onclick=()=>{if(undoState){state.deleted=undoState;undoState=null;save();render();$('undo').hidden=true;}};
$('batch').onclick=()=>{batch=!batch;selected.clear();render();};$('cancel-batch').onclick=()=>{batch=false;selected.clear();render();};$('select-all').onclick=()=>{selected=new Set(cards().map(c=>c.id));render();};$('delete-selected').onclick=()=>removeCards([...selected]);
$('pinyin-toggle').onchange=e=>{state.pinyin=e.target.checked;save();render();};$('master-toggle').onchange=e=>{state.hideMaster=e.target.checked;save();render();};$('theme').onclick=()=>{state.dark=!state.dark;save();render();};
$('cancel-edit').onclick=()=>{editId=null;$('card-form').reset();setTab('pattern');};
$('card-form').onsubmit=e=>{e.preventDefault();const f=e.target;try{const c=validate({id:editId||uid(),zh:f.elements.zh.value,vi:f.elements.vi.value,pinyin:f.elements.pinyin.value,pattern:f.elements.pattern.value,scenes:f.elements.scenes.value.split(/[,，]/).map(s=>s.trim()).filter(Boolean),vocab:vocab(f.elements.vocab.value)});state.userCards=state.userCards.filter(x=>x.id!==c.id);state.userCards.push(c);state.deleted=state.deleted.filter(x=>x!==c.id);save();editId=null;f.reset();setTab('pattern');notice('Đã lưu thẻ.');}catch(error){notice(error.message);}};
function parseBulk(text){if(text.trim().startsWith('['))return JSON.parse(text).map(validate);return text.trim().split(/\n\s*\n/).map(block=>{const raw={};block.split('\n').forEach(line=>{const m=line.match(/^\s*([^:：]+)[:：]\s*(.*)$/);if(!m)throw Error('Mỗi dòng cần có nhãn và dấu hai chấm.');const labels={'中文':'zh','越南语':'vi','拼音':'pinyin','句型':'pattern','场景':'scenes','单词':'vocab','zh':'zh','vi':'vi','pinyin':'pinyin','pattern':'pattern','scenes':'scenes','vocab':'vocab'};const k=labels[m[1].trim()];if(!k)throw Error('Nhãn không được hỗ trợ: '+m[1]);raw[k]=k==='scenes'?m[2].split(/[,，]/).map(s=>s.trim()):k==='vocab'?vocab(m[2].split(';').join('\n')):m[2];});return validate(raw);});}
$('bulk-add').onclick=()=>{try{const incoming=parseBulk($('bulk').value),seen=new Set(cards().map(c=>c.zh));let count=0;incoming.forEach(c=>{if(!seen.has(c.zh)){seen.add(c.zh);state.userCards.push({...c,id:uid()});count++;}});save();render();$('bulk').value='';notice(`Đã nhập ${count} thẻ (bỏ qua câu trùng).`);}catch(e){notice(e.message);}};
let voices=[];
function refreshVoices(){voices=(globalThis.speechSynthesis?.getVoices()||[]).filter(v=>/^(zh-(CN|SG|Hans)|cmn)/i.test(v.lang)).sort((a,b)=>Number(/Natural|Online|Xiaoxiao|Yunxi|Google/i.test(b.name))-Number(/Natural|Online|Xiaoxiao|Yunxi|Google/i.test(a.name)));$('voice').innerHTML='<option value="">Tự động</option>'+voices.map(v=>`<option value="${esc(v.voiceURI)}">${esc(v.name)} (${esc(v.lang)})</option>`).join('');$('voice').value=state.voice;$('voice-note').textContent=voices.length?'Chọn giọng và nghe thử. Danh sách tùy thuộc thiết bị.':'Chưa tìm thấy giọng phổ thông. Hãy cài giọng tiếng Trung trong hệ điều hành hoặc thử trình duyệt khác.';}
function speak(text){if(!globalThis.speechSynthesis){notice('Trình duyệt không hỗ trợ đọc văn bản.');return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='zh-CN';u.rate=Number($('rate').value)||state.rate;u.voice=voices.find(v=>v.voiceURI===$('voice').value)||voices[0]||null;u.onerror=e=>{if(!['interrupted','canceled'].includes(e.error))notice('Không phát được giọng đọc. Hãy thử giọng khác.');};speechSynthesis.speak(u);}
$('rate').value=state.rate;$('rate-label').textContent=Number(state.rate).toFixed(2)+'×';$('rate').oninput=e=>$('rate-label').textContent=Number(e.target.value).toFixed(2)+'×';$('settings').onclick=()=>{refreshVoices();$('settings-dialog').showModal();};document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());$('save-settings').onclick=()=>{state.rate=Number($('rate').value);state.voice=$('voice').value;save();$('settings-dialog').close();};$('test-voice').onclick=()=>speak('你好，欢迎一起学习中文。');if(globalThis.speechSynthesis)speechSynthesis.addEventListener('voiceschanged',refreshVoices);refreshVoices();
$('export').onclick=()=>{const blob=new Blob([JSON.stringify({app:'zh-vi-cards',version:1,userCards:state.userCards,deleted:state.deleted,mastered:state.mastered},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='zh-vi-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('import').onclick=()=>$('import-file').click();$('import-file').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>5000000)throw Error('Tệp quá lớn (tối đa 5 MB).');const data=JSON.parse(await file.text());if(!Array.isArray(data)&&(data.app!=='zh-vi-cards'||data.version!==1))throw Error('Chỉ hỗ trợ JSON của ứng dụng Trung–Việt.');const incoming=(Array.isArray(data)?data:data.userCards);if(!Array.isArray(incoming))throw Error('Danh sách thẻ không hợp lệ.');const clean=incoming.map(validate);for(const key of ['deleted','mastered'])if(!Array.isArray(data)&&(!Array.isArray(data[key])||data[key].some(x=>typeof x!=='string')))throw Error('Tiến độ không hợp lệ.');const map=new Map(state.userCards.map(c=>[c.id,c]));clean.forEach(c=>map.set(c.id,c));state.userCards=[...map.values()];if(!Array.isArray(data)){state.deleted=[...new Set([...state.deleted,...data.deleted])];state.mastered=[...new Set([...state.mastered,...data.mastered])];}save();render();notice(`Đã nhập ${clean.length} thẻ.`);}catch(error){notice('Không nhập được: '+error.message);}finally{e.target.value='';}};
// Audio storage v2: store bytes rather than MediaRecorder-backed Blobs (Safari).
let dbPromise,recordCard=null,recorder=null,recordSession=0,urls=[],recordBusy=false;
const temporaryRecords=new Map();
function db(){
  if(!dbPromise){
    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open('zhViRecordings',1);
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
  const hint=name==='QuotaExceededError'?'Bộ nhớ đã đầy.':name==='DataCloneError'?'Trình duyệt không lưu được định dạng âm thanh.':name==='SecurityError'||name==='InvalidStateError'?'Bộ nhớ trình duyệt đang bị chặn hoặc không khả dụng.':'Không ghi được vào bộ nhớ trình duyệt.';
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
    label.textContent=new Date(r.time).toLocaleString('vi-VN')+(temporaryRecords.has(r.id)?' — Tạm thời, chưa lưu':'');
    audio.controls=true;audio.preload='metadata';audio.src=url;audio.style.maxWidth='100%';
    download.textContent='Tải bản ghi';download.href=url;download.download='luyen-noi-'+r.time+(blob.type.includes('mp4')?'.m4a':blob.type.includes('ogg')?'.ogg':'.webm');download.className='toolbar-button';
    del.textContent='Xóa';del.className='toolbar-button';
    del.onclick=async()=>{
      if(temporaryRecords.has(r.id)){temporaryRecords.delete(r.id);showRecords();return;}
      try{await writeRecord({id:r.id});showRecords();}catch(error){$('record-status').textContent=storageMessage(error);}
    };
    row.append(label,audio,download,del);$('recordings').append(row);
  });
  if(readError)$('record-status').textContent=storageMessage(readError)+' Bản ghi tạm vẫn có thể nghe / tải xuống; sẽ mất khi tải lại trang.';
}
function openRecord(id){
  recordCard=id;const c=cards().find(c=>c.id===id);
  $('record-zh').textContent=c.zh;$('record-pinyin').textContent=state.pinyin?c.pinyin:'';$('record-vi').textContent=c.vi;
  $('record-status').textContent='';$('record-dialog').showModal();showRecords();
}
function closeRecord(){recordSession++;if(recorder?.state==='recording')recorder.stop();recordCard=null;clearUrls();$('record-dialog').close();}
$('close-record').onclick=closeRecord;
$('record-dialog').addEventListener('cancel',e=>{e.preventDefault();closeRecord();});
$('record-example').onclick=()=>{const c=cards().find(c=>c.id===recordCard);if(c)speak(c.zh);};
function recorderOptions(){
  const mime=['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'].find(type=>MediaRecorder.isTypeSupported?.(type));
  return mime?{mimeType:mime}:{};
}
$('record-button').onclick=async()=>{
  if(recorder?.state==='recording'){
    $('record-button').disabled=true;$('record-status').textContent='Đang xử lý và lưu…';recorder.stop();return;
  }
  if(recordBusy||!recordCard)return;
  if(!globalThis.isSecureContext||!navigator.mediaDevices?.getUserMedia||!globalThis.MediaRecorder){$('record-status').textContent='Cần HTTPS và trình duyệt hỗ trợ ghi âm.';return;}
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
        if(!blob.size){if(recordCard===card)$('record-status').textContent=recordingError?'Ghi âm bị lỗi. Vui lòng thử lại.':'Không nhận được âm thanh. Hãy ghi ít nhất vài giây rồi thử lại.';return;}
        const item={id:uid(),card,time:Date.now(),blob};
        temporaryRecords.set(item.id,item);
        // Keep at most four unsaved takes per card.
        [...temporaryRecords.values()].filter(r=>r.card===card).sort((a,b)=>b.time-a.time).slice(4).forEach(r=>temporaryRecords.delete(r.id));
        let saveError;
        try{await writeRecord(item);temporaryRecords.delete(item.id);}catch(error){saveError=error;}
        if(recordCard===card){
          await showRecords();
          $('record-status').textContent=saveError?storageMessage(saveError)+' Có thể nghe / tải bản ghi tạm bên dưới. Bản tạm sẽ mất khi tải lại trang.':'Đã lưu. Nghe lại bên dưới.';
        }
      }finally{
        stream.getTracks().forEach(t=>t.stop());recordBusy=false;$('record-button').disabled=false;$('record-button').textContent='🎙 Bắt đầu ghi âm';
      }
    };
    r.onerror=e=>{recordingError=e.error||Error('Recording failed');if(r.state!=='inactive')r.stop();};
    r.start();$('record-button').disabled=false;$('record-button').textContent='⏹ Dừng và lưu';$('record-status').textContent='Đang ghi âm…';
  }catch(error){
    acquired?.getTracks().forEach(t=>t.stop());recorder=null;recordBusy=false;$('record-button').disabled=false;
    $('record-status').textContent='Không mở được micrô / ghi âm. Hãy kiểm tra quyền và thử lại. ('+(error.name||'UnknownError')+')';
  }
};
render();
