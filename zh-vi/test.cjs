const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const elements=new Map();
function element(){return {value:'',textContent:'',innerHTML:'',hidden:false,checked:false,dataset:{},classList:{toggle(){}},addEventListener(){},showModal(){},close(){},replaceChildren(){},append(){},click(){},elements:{},reset(){}};}
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
