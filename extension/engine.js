// Portable, dependency-free comparison and quote logic shared by browser and API.
const stop = new Set(["a","an","and","at","by","for","from","in","of","on","or","the","to","with","new","free","delivery","shipping","sale","buy","item"]);
export function tokens(value) {
  return [...new Set(String(value || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").split(" ").filter(w => w.length > 1 && !stop.has(w)))];
}
export function parseMoney(value) {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}
export function scoreMatch(source, offer) {
  const a = tokens(source.title), b = tokens(offer.title);
  if (!a.length || !b.length) return 0;
  const bset = new Set(b);
  const overlap = a.filter(t => bset.has(t)).length;
  const coverage = overlap / a.length;
  const precision = overlap / b.length;
  let score = 0.8 * coverage + 0.2 * precision;
  const brand = tokens(source.brand || "")[0];
  if (brand && !bset.has(brand)) score *= 0.55;
  const modelCodes = a.filter(t => /[a-z]+\d|\d+[a-z]+/.test(t) && t.length > 3);
  if (modelCodes.some(t => !bset.has(t))) score *= 0.4;
  return Math.round(score * 100) / 100;
}
export function compareOffers(source, offers) {
  const sourcePrice = parseMoney(source.price);
  return (Array.isArray(offers) ? offers : []).map(item => {
    const price = parseMoney(item.price);
    const shipping = parseMoney(item.shipping);
    const hasShipping = shipping !== null;
    const total = price === null ? null : Math.round((price + (shipping ?? 0)) * 100) / 100;
    const matchScore = scoreMatch(source, item);
    const currency = String(item.currency || "GBP").toUpperCase();
    const savings = sourcePrice === null || total === null || !hasShipping || source.currency && currency !== source.currency
      ? null : Math.round((sourcePrice - total) * 100) / 100;
    return {...item, price, shipping, total, hasShipping, matchScore, savings, currency};
  }).filter(x => x.price !== null && x.matchScore >= 0.65 &&
    (!source.currency || x.currency === source.currency) &&
    !/used|refurbished|for parts/i.test(String(x.condition || "")) &&
    /^https:\/\//i.test(String(x.url || "")))
    .sort((a,b) => (a.total ?? Infinity) - (b.total ?? Infinity));
}
export function quoteDraft(source, offer, generatedAt = new Date().toISOString()) {
  if (!offer || parseMoney(offer.price) === null) throw new Error("Select a valid offer.");
  const subtotal = parseMoney(offer.price);
  const shipping = parseMoney(offer.shipping);
  return {
    title:"JackEXT purchase estimate", type:"QUOTE_DRAFT_NOT_MERCHANT_INVOICE",
    createdAt:generatedAt, product: String(offer.title || source.title || "").slice(0,200),
    seller:String(offer.seller || "Merchant not verified").slice(0,120),
    sourceUrl:String(source.url || ""), offerUrl:String(offer.url || ""),
    currency:String(offer.currency || source.currency || "GBP"),
    subtotal, shipping, estimatedTotal:shipping === null ? null : Math.round((subtotal + shipping)*100)/100,
    tax:"Not verified; check merchant checkout", availability:"Not verified",
    note:"This is an estimate drafted by JackEXT, NOT an invoice issued by the seller. Confirm item, delivery, tax and final checkout price with the merchant."
  };
}
