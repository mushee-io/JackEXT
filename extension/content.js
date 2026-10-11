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
  const style = `#jackext-host{all:initial;position:fixed;right:18px;bottom:18px;z-index:2147483647;font-family:system-ui,sans-serif}#jackext-host *{box-sizing:border-box}#jackext-box{width:320px;max-width:calc(100vw - 36px);background:#111827;color:#f9fafb;border:1px solid #43506a;border-radius:18px;box-shadow:0 15px 50px #0008;padding:15px;font:14px system-ui,sans-serif}#jackext-box button{background:#c4f56a;color:#14210a;border:0;border-radius:10px;padding:9px 12px;font-weight:700;cursor:pointer}#jackext-box .x{float:right;background:none;color:#fff;padding:0 4px;font-size:20px}#jackext-box h3{margin:0 0 12px;font-size:17px}#jackext-box .sub{color:#bbc7d7;font-size:12px}#jackext-box .result{padding:9px 0;border-top:1px solid #324054}#jackext-box a{color:#c4f56a;text-decoration:underline}#jackext-box .muted{color:#aeb8c7;font-size:12px}`;
  function widget() {
    let host = document.getElementById("jackext-host");
    if (host) {host.remove();return;}
    host = document.createElement("div");host.id = "jackext-host";
    const root = host.attachShadow({mode:"open"});
    const sheet = document.createElement("style");sheet.textContent = style;root.append(sheet);
    const box = document.createElement("div");box.id="jackext-box";root.append(box);
    const product = extract();
    const title = document.createElement("h3");title.textContent="JackEXT · Price Scout";
    const close = document.createElement("button");close.className="x";close.textContent="×";close.setAttribute("aria-label","Close JackEXT");close.onclick=()=>host.remove();
    const desc = document.createElement("p");desc.className="sub";desc.textContent=product.title || "No product title detected";
    const btn = document.createElement("button");btn.textContent="Find offers";
    const output = document.createElement("div");output.className="result";
    box.append(close,title,desc,btn,output);document.documentElement.append(host);
    if (!product.title) {
      btn.disabled = true;
      output.textContent = product.error || "Open an individual product page before searching for offers.";
    }
    btn.onclick=()=> {
      if (!product.title) return;
      btn.disabled=true;output.textContent="Comparing…";
      chrome.runtime.sendMessage({type:"JACK_COMPARE",product},response=>{
        btn.disabled=false;output.replaceChildren();
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
  }
  chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
    if(message?.type==="JACK_EXTRACT"){sendResponse({product:extract()});return;}
    if(message?.type==="JACK_WIDGET"){widget();sendResponse({ok:true});}
  });
})();
