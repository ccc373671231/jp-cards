const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const elements=new Map();
function element(){return {value:'',textContent:'',innerHTML:'',hidden:false,checked:false,dataset:{},style:{},children:[],classList:{toggle(){}},addEventListener(){},showModal(){},close(){},replaceChildren(){this.children=[];},append(...items){this.children.push(...items);},click(){},elements:{},reset(){}};}
const storage=new Map();
const ctx={console,Blob,URL,setTimeout,clearTimeout,confirm:()=>true,navigator:{},document:{getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},querySelectorAll(){return [];},documentElement:{dataset:{}},createElement:element},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},speechSynthesis:{getVoices:()=>[{name:'Cantonese',lang:'zh-HK',voiceURI:'hk'},{name:'Mandarin',lang:'zh-CN',voiceURI:'cn'}],addEventListener(){},cancel(){},speak(u){ctx.lastSpeech=u;}},SpeechSynthesisUtterance:function(t){this.text=t;}};
vm.createContext(ctx);vm.runInContext(html.match(/const BUILT = [\s\S]*?;\s*<\/script>/)[0].replace(/<\/script>/,''),ctx);vm.runInContext(fs.readFileSync(__dirname+'/app.js','utf8'),ctx);
function run(code){return vm.runInContext(code,ctx);}
assert.equal(run('cards().length'),5);
assert.match(elements.get('cards').innerHTML,/刚才在工作/);
assert.equal(run('voices.length'),1);
assert.throws(()=>run('validate({ja:"こんにちは",en:"hello"})'));
assert.equal(run('parseBulk("中文: 你好。\\n越南语: Xin chào.\\n场景: Chào hỏi\\n单词: 你好/nǐ hǎo/xin chào")[0].vocab[0].zh'),'你好');
assert.equal(run('esc("<script>")'),'&lt;script&gt;');
run('removeCards(["seed-0"]);');assert.equal(run('cards().length'),4);elements.get('undo').onclick();assert.equal(run('cards().length'),5);
run('state.userCards.push(validate({id:"seed-0",zh:"修改",vi:"Đã sửa"}));save();');assert.equal(run('cards().length'),5);assert.equal(run('cards()[0].zh'),'修改');
run('state.dark=true;render();');assert.equal(ctx.document.documentElement.dataset.theme,'dark');
run('speak("你好");');assert.equal(ctx.lastSpeech.lang,'zh-CN');assert.equal(ctx.lastSpeech.voice.lang,'zh-CN');
assert(storage.has('zhViCards.v1'));
assert(!storage.has('jpCards'));
console.log('PASS: seeds, grouping, import parser, validation, escaping, deletion/undo, builtin editing, theme, Mandarin voice, isolated persistence');

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
  for(let i=0;i<5;i++)await run(`writeRecord({id:'take-${i}',card:'seed-0',time:${i},blob:sampleBlob})`);
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
  run('recordCard="seed-0"');
  await elements.get('record-button').onclick();assert.equal(ctx.currentRecorder.mimeType,'audio/mp4');
  await elements.get('record-button').onclick();await ctx.currentRecorder.done;
  assert.match(elements.get('record-status').textContent,/Đã lưu/);
  assert.equal(run('temporaryRecords.size'),0);assert.equal(elements.get('recordings').children.length,4);
  failure=true;
  await elements.get('record-button').onclick();await elements.get('record-button').onclick();await ctx.currentRecorder.done;
  assert.match(elements.get('record-status').textContent,/DataCloneError/);
  assert.equal(run('temporaryRecords.size'),1);
  assert(elements.get('recordings').children.some(row=>row.children.some(c=>c.textContent==='Tải bản ghi')));
  assert.equal(stoppedTracks,2);assert.equal(elements.get('record-button').disabled,false);
  await run('showRecords()');assert.equal(run('temporaryRecords.size'),1);
  assert.match(run('storageMessage({name:"QuotaExceededError"})'),/Bộ nhớ đã đầy/);
  console.log('PASS: binary audio storage, max-four retention, legacy Blob playback, MP4 negotiation, recording lifecycle, failed-save replay/download and explicit errors');
}
audioTests().catch(error=>{console.error(error);process.exitCode=1;});
