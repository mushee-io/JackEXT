import test from "node:test";
import assert from "node:assert/strict";
import {tokens,parseMoney,scoreMatch,compareOffers,quoteDraft} from "../extension/engine.js";
const source={title:"Acme Tote Bag Model X200",brand:"Acme",price:20,currency:"GBP",url:"https://shop.example/bag"};
test("normalizes product tokens and prices",()=>{assert.deepEqual(tokens("The BLACK tote-bag!"),["black","tote","bag"]);assert.equal(parseMoney("£12.50"),12.5);assert.equal(parseMoney("not a price"),null);});
test("rejects weak matches, used goods, currency mismatch and unsafe links",()=>{
 const x=compareOffers(source,[
 {title:"Acme Tote Bag Model X200",price:10,shipping:2,currency:"GBP",url:"https://safe.example/a",condition:"New"},
 {title:"Acme Tote Bag Model X200",price:2,shipping:0,currency:"GBP",url:"https://safe.example/b",condition:"Used"},
 {title:"Different phone case",price:1,shipping:0,currency:"GBP",url:"https://safe.example/c",condition:"New"},
 {title:"Acme Tote Bag Model X200",price:1,shipping:0,currency:"USD",url:"https://safe.example/d",condition:"New"},
 {title:"Acme Tote Bag Model X200",price:1,shipping:0,currency:"GBP",url:"javascript:alert(1)",condition:"New"}
 ]);
 assert.equal(x.length,1);assert.equal(x[0].total,12);assert.equal(x[0].savings,8);
});
test("unknown shipping must not produce a savings claim",()=>{
 const x=compareOffers(source,[{title:source.title,price:8,currency:"GBP",shipping:null,url:"https://safe.example/a"}]);
 assert.equal(x[0].savings,null);assert.equal(x[0].hasShipping,false);
});
test("model number mismatch reduces score",()=>{assert.ok(scoreMatch(source,{title:"Acme Tote Bag Model X300"})<0.65);});
test("quote is visibly a draft, never an actual merchant invoice",()=>{
 const quote=quoteDraft(source,{title:source.title,seller:"Merchant",price:10,shipping:2,url:"https://safe.example/a",currency:"GBP"});
 assert.equal(quote.type,"QUOTE_DRAFT_NOT_MERCHANT_INVOICE");assert.equal(quote.estimatedTotal,12);assert.match(quote.note,/NOT an invoice/);
});
