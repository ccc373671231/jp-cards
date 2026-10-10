const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const elements=new Map();
function element(){return {value:'',textContent:'',innerHTML:'',hidden:false,checked:false,dataset:{},style:{},children:[],attributes:{},setAttribute(k,v){this.attributes[k]=v;},classList:{toggle(){}},addEventListener(){},showModal(){},close(){},replaceChildren(){this.children=[];},append(...items){this.children.push(...items);},click(){},elements:{},reset(){}};}
const storage=new Map();
const ctx={console,Blob,URL,setTimeout,clearTimeout,confirm:()=>true,navigator:{},document:{getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},querySelectorAll(){return [];},documentElement:{dataset:{}},createElement:element},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},speechSynthesis:{getVoices:()=>[{name:'Chinese',lang:'zh-CN',voiceURI:'cn'},{name:'US English',lang:'en-US',voiceURI:'us'},{name:'UK English',lang:'en-GB',voiceURI:'uk'}],addEventListener(){},cancel(){},speak(u){ctx.lastSpeech=u;}},SpeechSynthesisUtterance:function(t){this.text=t;}};
vm.createContext(ctx);vm.runInContext(html.match(/const BUILT = [\s\S]*?;\s*<\/script>/)[0].replace(/<\/script>/,''),ctx);vm.runInContext(fs.readFileSync(__dirname+'/app.js','utf8'),ctx);
function run(code){return vm.runInContext(code,ctx);}
assert.equal(run('cards().length'),7);
assert.equal(ctx.document.documentElement.dataset.sky,'on');
elements.get('theme').onclick();assert.equal(ctx.document.documentElement.dataset.sky,'off');
assert.equal(JSON.parse(storage.get('enZhCards.v1')).starTheme,false);
elements.get('theme').onclick();assert.equal(ctx.document.documentElement.dataset.sky,'on');
assert.match(elements.get('cards').innerHTML,/本来可以/);
assert.match(elements.get('cards').innerHTML,/grammar/);
for(const mode of ['zh','en']){
  run(`state.prompt='${mode}';render();`);
  const first=elements.get('cards').innerHTML.match(/<details>([\s\S]*?)<\/details>/)[1];
  const summary=first.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)[1];
  const answer=first.match(/<p class="answer"[^>]*>([\s\S]*?)<\/p>/)[1];
  const en=run('esc(BUILT[0].en)'),zh=run('esc(BUILT[0].zh)');
  assert(summary.includes(mode==='zh'?zh:en));
  assert.equal(answer,mode==='zh'?en:zh);
  assert.equal(first.split(en).length-1,2); // visible sentence + speak button attribute
  assert.equal(first.split(zh).length-1,1); // Chinese sentence occurs only once
}
run("state.prompt='zh';render();");
assert.equal(run('voices.length'),2);
assert.throws(()=>run('validate({zh:"你好",vi:"xin chao"})'));
assert.equal(run('parseBulk("英文: Keep going.\\n中文: 继续前进。\\n单词: go | /ɡəʊ/ | 去")[0].vocab[0].ipa'),'/ɡəʊ/');
assert.equal(run('esc("<script>")'),'&lt;script&gt;');
run('removeCards(["en-seed-1"]);');assert.equal(run('cards().length'),6);elements.get('undo').onclick();assert.equal(run('cards().length'),7);
run('state.userCards.push(validate({id:"en-seed-1",en:"Updated",zh:"已修改",notes:"新说明"}));save();');assert.equal(run('cards().length'),7);assert.equal(run('cards()[0].notes'),'新说明');
run('state.dark=true;render();');assert.equal(ctx.document.documentElement.dataset.theme,'dark');
elements.get('voice').value='uk';run('speak("Keep going.");');assert.equal(ctx.lastSpeech.lang,'en-GB');
assert(storage.has('enZhCards.v1'));assert(!storage.has('zhViCards.v1'));
elements.get('prompt-en').onclick();assert.equal(run('state.prompt'),'en');
assert.equal(elements.get('prompt-en').attributes['aria-pressed'],'true');
assert.equal(elements.get('prompt-zh').attributes['aria-pressed'],'false');
assert.equal(JSON.parse(storage.get('enZhCards.v1')).prompt,'en');
elements.get('prompt-zh').onclick();assert.equal(run('state.prompt'),'zh');
assert.equal(elements.get('prompt-zh').attributes['aria-pressed'],'true');
elements.get('prompt-en').onclick();
assert.match(elements.get('cards').innerHTML,/lang="en"/);
console.log('PASS: 7 examples, notes, English-only voices, UK voice locale, Chinese labels, IPA parser, validation, escaping, undo, editing, theme, prompt mode, isolated storage');

async function audioTests(){
  const items=new Map();let failure=false;
  ctx.fakeDatabase={transaction(){
    const tx={error:null,objectStore(){return {
      put(item){assert(!('blob' in item),'Never write MediaRecorder Blob to IndexedDB');assert.equal(Object.prototype.toString.call(item.data),'[object ArrayBuffer]');if(failure){const e=new Error('Blob storage unavailable');e.name='DataCloneError';throw e;}items.set(item.id,item);},
      delete(id){items.delete(id);},
      getAll(){const req={};setTimeout(()=>{req.result=[...items.values()];req.onsuccess?.();setTimeout(()=>tx.oncomplete?.(),0);},0);return req;}
    };},abort(){setTimeout(()=>tx.onabort?.(),0);}};
    return tx;
  }};
  run('db=async()=>fakeDatabase');
  ctx.sampleBlob=new Blob(['recorded audio'],{type:'audio/mp4'});
  for(let i=0;i<5;i++)await run(`writeRecord({id:'take-${i}',card:'en-seed-1',time:${i},blob:sampleBlob})`);
  assert.equal(items.size,4);assert(!items.has('take-0'));
  ctx.savedItem=items.get('take-4');assert.equal(await run('recordingBlob(savedItem).text()'),'recorded audio');
  assert.equal(run('recordingBlob({blob:sampleBlob})===sampleBlob'),true);
  ctx.isSecureContext=true;let stoppedTracks=0;
  ctx.navigator.mediaDevices={getUserMedia:async()=>({getTracks:()=>[{stop(){stoppedTracks++;}}]})};
  ctx.MediaRecorder=class {
    static isTypeSupported(type){return type==='audio/mp4';}
    constructor(stream,options){this.mimeType=options.mimeType;this.state='inactive';ctx.currentRecorder=this;}
    start(){this.state='recording';}
    stop(){this.state='inactive';this.ondataavailable({data:new Blob(['take'],{type:this.mimeType})});this.done=this.onstop();}
  };
  run('recordCard="en-seed-1"');
  await elements.get('record-button').onclick();assert.equal(ctx.currentRecorder.mimeType,'audio/mp4');
  await elements.get('record-button').onclick();await ctx.currentRecorder.done;
  assert.match(elements.get('record-status').textContent,/已保存/);
  assert.equal(run('temporaryRecords.size'),0);assert.equal(elements.get('recordings').children.length,4);
  failure=true;
  await elements.get('record-button').onclick();await elements.get('record-button').onclick();await ctx.currentRecorder.done;
  assert.match(elements.get('record-status').textContent,/DataCloneError/);
  assert.equal(run('temporaryRecords.size'),1);
  assert(elements.get('recordings').children.some(row=>row.children.some(c=>c.textContent==='下载录音')));
  assert.equal(stoppedTracks,2);assert.equal(elements.get('record-button').disabled,false);
  await run('showRecords()');assert.equal(run('temporaryRecords.size'),1);
  assert.match(run('storageMessage({name:"QuotaExceededError"})'),/存储空间不足/);
  console.log('PASS: binary audio storage, max-four retention, legacy Blob playback, MP4 negotiation, recording lifecycle, failed-save replay/download and explicit errors');
}
audioTests().catch(error=>{console.error(error);process.exitCode=1;});
