import {compareOffers} from "../extension/engine.js";
import {searchEbay} from "../src/ebay.js";
const acceptableOrigin=origin=> !origin || /^chrome-extension:\/\/[a-p]{32}$/.test(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin) || /^http:\/\/localhost:3000$/.test(origin);
export default async function handler(req,res){
  const origin=req.headers.origin || "";
  if(!acceptableOrigin(origin)){res.status(403).json({error:"Origin not permitted."});return;}
  if(origin)res.setHeader("Access-Control-Allow-Origin",origin);
  res.setHeader("Vary","Origin");
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS"){res.status(204).end();return;}
  if(req.method!=="POST"){res.status(405).json({error:"POST required."});return;}
  const p=req.body?.product || {};
  const title=String(p.title || "").trim().slice(0,220);
  const currency=["GBP","USD","EUR"].includes(p.currency)?p.currency:"GBP";
  if(title.length<4){res.status(400).json({error:"Enter a descriptive product title (4+ characters)."});return;}
  try{
    const product={title,brand:String(p.brand || "").slice(0,80),currency,price:p.price,url:String(p.url || "").slice(0,2000)};
    const raw=await searchEbay(title,currency);
    const offers=compareOffers(product,raw);
    res.setHeader("Cache-Control","no-store");
    res.status(200).json({provider:"eBay Browse API",offers,checkedAt:new Date().toISOString(),note:"Seller checkout may differ. Shipping/tax may be unavailable."});
  }catch(err){
    const notConfigured=err.code==="PROVIDER_NOT_CONFIGURED";
    res.status(notConfigured?503:502).json({error:notConfigured?"Live search is not configured: set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET on the server.":"Shopping provider temporarily unavailable."});
  }
}
