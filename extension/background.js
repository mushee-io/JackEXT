import {compareOffers} from "./engine.js";
chrome.runtime.onInstalled.addListener(()=> {
  chrome.contextMenus.removeAll(()=>chrome.contextMenus.create({id:"jackext-scan",title:"Scan product with JackEXT",contexts:["page","selection","link"]}));
});
chrome.contextMenus.onClicked.addListener(async (info,tab)=> {
  if(info.menuItemId!=="jackext-scan" || !tab?.id) return;
  try {
    await chrome.scripting.executeScript({target:{tabId:tab.id},files:["content.js"]});
    await chrome.tabs.sendMessage(tab.id,{type:"JACK_WIDGET"});
  } catch (e) {console.warn("JackEXT cannot open on this tab",e);}
});
const demoResults = source => {
  const title=String(source.title || "Everyday tote bag").slice(0,100);
  return [
    {title,price:7.5,shipping:1.5,currency:source.currency || "GBP",url:"https://example.com/demo-a",seller:"Example merchant A",condition:"New"},
    {title,price:8.75,shipping:2,currency:source.currency || "GBP",url:"https://example.com/demo-b",seller:"Example merchant B",condition:"New"}
  ];
};
chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
  if(message?.type!=="JACK_COMPARE") return;
  (async()=>{
    const product=message.product || {};
    if(!String(product.title || "").trim()) throw new Error("Enter a product title first.");
    if(message.demo){
      sendResponse({ok:true,demo:true,offers:compareOffers(product,demoResults(product))});
      return;
    }
    const saved=await chrome.storage.local.get({jackextEndpoint:"http://localhost:3000"});
    const base=String(saved.jackextEndpoint).replace(/\/+$/,"");
    if(!/^https:\/\/[\w.-]+\.vercel\.app$/.test(base) && base!=="http://localhost:3000"){
      throw new Error("Set a supported secure Vercel API URL or http://localhost:3000.");
    }
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),12000);
    let res;
    try{res=await fetch(base+"/api/compare",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({product}),signal:controller.signal});}finally{clearTimeout(timer);}
    const payload=await res.json();
    if(!res.ok) throw new Error(payload.error || "Price provider unavailable.");
    sendResponse({ok:true,demo:false,offers:compareOffers(product,payload.offers || [])});
  })().catch(e=>sendResponse({ok:false,error:String(e.message || e)}));
  return true;
});
