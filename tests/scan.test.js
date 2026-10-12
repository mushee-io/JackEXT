import test from "node:test";
import assert from "node:assert/strict";

const sent=[];
const injected=[];
let messageListener;
let savedTabId=42;
globalThis.chrome={
  runtime:{
    onInstalled:{addListener:()=>{}},
    onMessage:{addListener:listener=>{messageListener=listener;}}
  },
  contextMenus:{
    removeAll:()=>{},
    create:()=>{},
    onClicked:{addListener:()=>{}}
  },
  tabs:{
    get:async(id)=>({id,url:"https://www.amazon.co.uk/dp/B07D5K8WDB"}),
    sendMessage:async(id,message)=>{
      sent.push({id,type:message.type});
      if(message.type==="JACK_EXTRACT")return {product:{title:"Russell Hobbs Electric Kettle",price:23,currency:"GBP",url:"https://www.amazon.co.uk/dp/B07D5K8WDB"}};
      return {ok:true};
    }
  },
  storage:{local:{get:async()=>savedTabId==null?{}:{jackextSourceTabId:savedTabId}}},
  scripting:{executeScript:async(options)=>{injected.push(options.target.tabId);}}
};

await import("../extension/background.js");

function emit(message){
  return new Promise((resolve,reject)=>{
    const pending=messageListener(message,{},resolve);
    if(pending!==true)reject(new Error("Scan handler did not keep message channel open"));
  });
}

test("full-screen Scan reaches the original shopping tab", async()=>{
  const response=await emit({type:"JACK_SCAN_SOURCE"});
  assert.equal(response.ok,true);
  assert.equal(response.product.title,"Russell Hobbs Electric Kettle");
  assert.equal(response.tabId,42);
  assert.ok(injected.includes(42));
  assert.ok(sent.some(entry=>entry.type==="JACK_EXTRACT" && entry.id===42));
});

test("full-screen Widget opens on original shopping tab", async()=>{
  sent.length=0;
  const response=await emit({type:"JACK_SHOW_WIDGET_SOURCE"});
  assert.equal(response.ok,true);
  assert.ok(sent.some(entry=>entry.type==="JACK_WIDGET" && entry.id===42));
});

test("scanning without a remembered shopping tab gives recovery steps",async()=>{
  savedTabId=null;
  const response=await emit({type:"JACK_SCAN_SOURCE"});
  assert.equal(response.ok,false);
  assert.match(response.error,/Open an individual product page/i);
});
