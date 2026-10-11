import {quoteDraft} from "./engine.js";
const el=id=>document.getElementById(id);
let source={};
const status=(msg)=>el("status").textContent=msg;
const getProduct=()=>({title:el("title").value.trim(),price:el("price").value===""?null:Number(el("price").value),currency:el("currency").value,brand:source.brand || "",url:source.url || ""});
const allowedBase=url=> /^https:\/\/[\w.-]+\.vercel\.app$/.test(url) || url==="http://localhost:3000";
async function saveEndpoint(){
 const endpoint=el("endpoint").value.trim().replace(/\/+$/,"");
 if(!allowedBase(endpoint))throw new Error("Use a Vercel HTTPS URL or http://localhost:3000.");
 await chrome.storage.local.set({jackextEndpoint:endpoint});
}
async function inject(){
 const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
 if(!tab?.id || !/^https?:/.test(tab.url || ""))throw new Error("Open a regular shopping webpage first.");
 await chrome.scripting.executeScript({target:{tabId:tab.id},files:["content.js"]});
 return tab;
}
async function scan(){
 try{
  const tab=await inject();
  const response=await chrome.tabs.sendMessage(tab.id,{type:"JACK_EXTRACT"});
  source=response.product || {};
  el("title").value=source.title || "";
  el("price").value=source.price ?? "";
  el("currency").value=["GBP","USD","EUR"].includes(source.currency)?source.currency:"GBP";
  status(source.title ? "Page scanned. Confirm title and price before comparing." : "No product title found; enter it manually.");
 }catch(err){status(err.message || "Unable to scan this page.");}
}
function downloadQuote(quote) {
 const h=x=>String(x ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const html=`<!doctype html><html lang="en"><meta charset="utf-8"><title>JackEXT purchase estimate</title><style>body{font:16px system-ui;max-width:700px;margin:60px auto;padding:0 24px;color:#182332}h1{font-size:30px}dt{font-weight:700;margin-top:18px}dd{margin:5px 0 15px}footer{margin-top:55px;color:#5b6470}</style><h1>JackEXT · Purchase estimate</h1><p><strong>DRAFT · Not a merchant invoice</strong></p><dl><dt>Product</dt><dd>${h(quote.product)}</dd><dt>Seller</dt><dd>${h(quote.seller)}</dd><dt>Subtotal</dt><dd>${h(quote.currency)} ${quote.subtotal.toFixed(2)}</dd><dt>Shipping</dt><dd>${quote.shipping===null?"Not confirmed":h(quote.currency)+" "+quote.shipping.toFixed(2)}</dd><dt>Estimated total</dt><dd>${quote.estimatedTotal===null?"Not confirmed":h(quote.currency)+" "+quote.estimatedTotal.toFixed(2)}</dd><dt>Listing</dt><dd>${h(quote.offerUrl)}</dd><dt>Created</dt><dd>${h(quote.createdAt)}</dd></dl><footer>${h(quote.note)}</footer></html>`;
 const blob=new Blob([html],{type:"text/html"});
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download="jackext-purchase-estimate.html";a.click();
 setTimeout(()=>URL.revokeObjectURL(url),5000);
}
function showResults(response,product){
 const container=el("results");container.replaceChildren();
 if(response.demo){const banner=document.createElement("p");banner.className="notice";banner.textContent="DEMO DATA · These are sample prices, not real merchant offers.";container.append(banner);}
 const offers=response.offers || [];
 if(!offers.length){status("No close matches found. Try a more precise product name or model.");return;}
 status(`${offers.length} matching offer(s) · ${response.demo?"demo":"live provider"} · Verify final checkout pricing.`);
 for(const offer of offers.slice(0,8)){
  const box=document.createElement("div");box.className="offer";
  const name=document.createElement("strong");name.textContent=offer.title;
  const price=document.createElement("p");price.textContent=`${offer.currency} ${offer.price.toFixed(2)} · ${offer.hasShipping ? "shipping "+offer.currency+" "+offer.shipping.toFixed(2) : "shipping not confirmed"}`;
  box.append(name,price);
  if(offer.savings !== null){const savings=document.createElement("p");savings.className="saving";savings.textContent=offer.savings>0?`Potential saving: ${offer.currency} ${offer.savings.toFixed(2)}`:"No confirmed saving against the listed price";box.append(savings);}
  if(!response.demo){const a=document.createElement("a");a.href=offer.url;a.target="_blank";a.rel="noopener noreferrer";a.textContent="Open merchant listing ↗";box.append(a);}
  const btn=document.createElement("button");btn.textContent="Download estimate draft";btn.onclick=()=>downloadQuote(quoteDraft(product,offer));box.append(btn);
  container.append(box);
 }
}
async function compare(demo){
 try{
  if(!demo)await saveEndpoint();
  const product=getProduct();
  if(!product.title)throw new Error("Enter the product name.");
  el("compare").disabled=true;el("demo").disabled=true;status("Finding matches…");
  const response=await chrome.runtime.sendMessage({type:"JACK_COMPARE",product,demo});
  if(!response?.ok)throw new Error(response?.error || "Comparison failed.");
  showResults(response,product);
 }catch(err){status(err.message || "Comparison failed.");el("results").replaceChildren();}
 finally{el("compare").disabled=false;el("demo").disabled=false;}
}
el("form").onsubmit=e=>{e.preventDefault();compare(false);};
el("demo").onclick=()=>compare(true);
el("scan").onclick=scan;
el("widget").onclick=async()=>{
 try{const tab=await inject();await chrome.tabs.sendMessage(tab.id,{type:"JACK_WIDGET"});status("Floating widget opened on your current tab.");}
 catch(err){status(err.message);}
};
(async()=>{const saved=await chrome.storage.local.get({jackextEndpoint:"http://localhost:3000"});el("endpoint").value=saved.jackextEndpoint;await scan();})();
