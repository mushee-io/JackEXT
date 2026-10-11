// Activated only by a user click; does not crawl browsing history or submit page contents.
(() => {
  if (window.__jackextContentLoaded) return;
  window.__jackextContentLoaded = true;
  const text = el => (el?.textContent || "").trim();
  const meta = (...selectors) => {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      const v = el?.getAttribute("content");
      if (v) return v.trim();
    }
    return "";
  };
  const getJsonProduct = () => {
    for (const node of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const root = JSON.parse(node.textContent || "{}");
        const queue = [root]; let count = 0;
        while (queue.length && count++ < 100) {
          const v = queue.shift();
          if (Array.isArray(v)) {queue.push(...v.slice(0,20));continue;}
          if (!v || typeof v !== "object") continue;
          if (String(v["@type"] || "").toLowerCase().includes("product")) return v;
          if (v["@graph"]) queue.push(v["@graph"]);
          if (v.mainEntity) queue.push(v.mainEntity);
        }
      } catch {}
    }
    return {};
  };
  function extract() {
    const url = location.href.split("#")[0].slice(0,2000);
    // Amazon search/category pages can contain dozens of prices. Never pretend they are one product.
    const amazon = /(^|\.)amazon\.[a-z.]+$/i.test(location.hostname);
    const detailPage = /\/(?:dp|gp\/product|gp\/aw\/d)\/[a-z0-9]{10}(?:\/|$)/i.test(location.pathname);
    if (amazon && !detailPage) {
      return {title:"",brand:"",price:null,currency:"GBP",url,
        error:"This is an Amazon search or category page. Open one product listing before scanning."};
    }
    const p = getJsonProduct();
    const rawOffers = Array.isArray(p.offers) ? p.offers[0] : p.offers || {};
    const priceMeta = meta('[property="product:price:amount"]','[itemprop="price"]');
    const visiblePrice = text(document.querySelector('[itemprop="price"], [data-testid="price"], .a-price .a-offscreen'));
    const value = String(rawOffers.price || rawOffers.lowPrice || priceMeta || visiblePrice || "");
    const parsed = Number(value.replace(/[^0-9.]/g, ""));
    const currency = String(rawOffers.priceCurrency || meta('[property="product:price:currency"]') || (value.includes("$") ? "USD" : "GBP")).toUpperCase();
    const brand = typeof p.brand === "string" ? p.brand : (p.brand?.name || "");
    return {
      title:String(p.name || meta('[property="og:title"]','[name="twitter:title"]') || document.title || "").slice(0,220),
      brand:String(brand).slice(0,80),
      price:Number.isFinite(parsed) && parsed > 0 ? parsed : null,
      currency, url:location.href.split("#")[0].slice(0,2000)
    };
  }
  const style = `#jackext-host{all:initial;position:fixed;right:18px;bottom:18px;z-index:2147483647;font-family:'Helvetica Neue',Arial,sans-serif}#jackext-host *{box-sizing:border-box}#jackext-box{width:340px;max-width:calc(100vw - 36px);background:rgba(246,246,242,.98);color:#111;border:1px solid #d5d5d0;border-radius:22px;box-shadow:0 18px 55px #0004;padding:20px;font:14px 'Helvetica Neue',Arial,sans-serif;backdrop-filter:blur(12px)}#jackext-box button{background:#fff;color:#111;border:1px solid #111;border-radius:999px;padding:9px 14px;font-weight:500;cursor:pointer;transition:background .2s,color .2s}#jackext-box button:hover{background:#111;color:#fff}#jackext-box button:disabled{opacity:.5;cursor:not-allowed}#jackext-box .x{float:right;background:none;color:#111;border:0;padding:0 4px;font-size:24px}#jackext-box h3{margin:0 0 14px;font-size:23px;font-weight:500;letter-spacing:-1.1px}#jackext-box .sub{color:#3a3a3a;font-size:13px;line-height:1.45;overflow-wrap:anywhere}#jackext-box .actions{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}#jackext-box .result{padding:10px 0;border-top:1px solid #d3d3d0;overflow-wrap:anywhere}#jackext-box a{color:#111;text-decoration:underline;text-underline-offset:2px}#jackext-box .muted{color:#666;font-size:12px;line-height:1.4}`;
  function widget() {
    let host = document.getElementById("jackext-host");
    if (host) {host.remove();return;}
    host = document.createElement("div");host.id = "jackext-host";
    const root = host.attachShadow({mode:"open"});
    const sheet = document.createElement("style");sheet.textContent = style;root.append(sheet);
    const box = document.createElement("div");box.id="jackext-box";root.append(box);
    const product = extract();
    const title = document.createElement("h3");title.textContent="JackEXT® ✳︎";
    const close = document.createElement("button");close.className="x";close.textContent="×";close.setAttribute("aria-label","Close JackEXT");close.onclick=()=>host.remove();
    const desc = document.createElement("p");desc.className="sub";desc.textContent=product.title || "No product title detected";
    const btn = document.createElement("button");btn.textContent="Find live offers";
    const demoBtn=document.createElement("button");demoBtn.textContent="Try demo";
    const actions=document.createElement("div");actions.className="actions";actions.append(btn,demoBtn);
    const output = document.createElement("div");output.className="result";
    box.append(close,title,desc,actions,output);document.documentElement.append(host);
    if (!product.title) {
      btn.disabled = true;
      demoBtn.disabled = true;
      output.textContent = product.error || "Open an individual product page before searching for offers.";
    }
    const searchOffers=(demo)=> {
      if (!product.title) return;
      btn.disabled=true;demoBtn.disabled=true;output.textContent="Comparing…";
      chrome.runtime.sendMessage({type:"JACK_COMPARE",product,demo},response=>{
        btn.disabled=false;demoBtn.disabled=false;output.replaceChildren();
        if(chrome.runtime.lastError || !response?.ok) {
          output.textContent=response?.error || chrome.runtime.lastError?.message || "Unable to compare";return;
        }
        const label=document.createElement("p");label.className="muted";label.textContent=response.demo ? "DEMO · Illustrative offers, not live prices" : "Live provider listings · Verify checkout price";output.append(label);
        const offers=response.offers || [];
        if(!offers.length) {const p=document.createElement("p");p.textContent="No sufficiently close matching offers found.";output.append(p);return;}
        for(const offer of offers.slice(0,4)){
          const row=document.createElement("div");row.className="result";
          const line=document.createElement("div");line.textContent=`${offer.title} · ${offer.currency} ${offer.price.toFixed(2)}`;row.append(line);
          const ship=document.createElement("div");ship.className="muted";ship.textContent=offer.hasShipping ? `Shipping: ${offer.currency} ${offer.shipping.toFixed(2)}` : "Shipping not confirmed";row.append(ship);
          if(!response.demo){const link=document.createElement("a");link.href=offer.url;link.target="_blank";link.rel="noopener noreferrer";link.textContent="View merchant listing";row.append(link);}
          output.append(row);
        }
        const note=document.createElement("div");note.className="muted";note.textContent="Open the extension popup to download a purchase estimate.";output.append(note);
      });
    };
    btn.onclick=()=>searchOffers(false);
    demoBtn.onclick=()=>searchOffers(true);
  }
  chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
    if(message?.type==="JACK_EXTRACT"){sendResponse({product:extract()});return;}
    if(message?.type==="JACK_WIDGET"){widget();sendResponse({ok:true});}
  });
})();
