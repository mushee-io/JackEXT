// The server owns credentials; do not place tokens or provider keys inside the extension.
let cache={token:"",expires:0};
async function getToken() {
  const id=process.env.EBAY_CLIENT_ID,secret=process.env.EBAY_CLIENT_SECRET;
  if(!id || !secret){const e=new Error("eBay not configured");e.code="PROVIDER_NOT_CONFIGURED";throw e;}
  if(cache.token && Date.now()<cache.expires)return cache.token;
  const basic=Buffer.from(id+":"+secret).toString("base64");
  const res=await fetch("https://api.ebay.com/identity/v1/oauth2/token",{
    method:"POST",headers:{"Authorization":"Basic "+basic,"Content-Type":"application/x-www-form-urlencoded"},
    body:"grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope"
  });
  if(!res.ok)throw new Error("eBay token request failed: "+res.status);
  const data=await res.json();cache={token:data.access_token,expires:Date.now()+Math.max(30,Number(data.expires_in || 3600)-120)*1000};
  return cache.token;
}
export async function searchEbay(query,currency="GBP"){
  const token=await getToken();
  const marketplace=currency==="USD"?"EBAY_US":currency==="EUR"?"EBAY_DE":"EBAY_GB";
  const url=new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
  url.searchParams.set("q",String(query).slice(0,220));
  url.searchParams.set("limit","40");
  const res=await fetch(url,{headers:{"Authorization":"Bearer "+token,"X-EBAY-C-MARKETPLACE-ID":marketplace}});
  if(!res.ok)throw new Error("eBay search failed: "+res.status);
  const body=await res.json();
  return (body.itemSummaries || []).map(item=>{
    const shippingPrice=item.shippingOptions?.[0]?.shippingCost?.value;
    return {
      title:item.title || "",seller:item.seller?.username || "eBay seller",
      price:item.price?.value,shipping:shippingPrice ?? null,
      currency:item.price?.currency || currency,url:item.itemWebUrl || "",
      condition:item.condition || "",marketplace:"eBay",itemId:item.itemId || ""
    };
  });
}
