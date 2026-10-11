# JackEXT — 33JACK Shopping Scout

**Chrome Manifest V3 beta**. Scan a product on a page you choose, get matching prices from an authorised marketplace API and download a clearly labelled **purchase estimate draft**. A compact floating webpage widget uses the same comparison API. Mobile native overlays are **not** shipped in this beta.

## Milestones
- [x] M1: Standalone repository and browser-extension foundation.
- [x] M2: User-triggered scan of Product JSON-LD, product meta tags and visible selected price fields; manual edits.
- [x] M3: Compact desktop floating widget and right-click context menu.
- [x] M4: Live price adapter to eBay Browse API (credentials required); excludes low-confidence or used matches.
- [x] M5: Shipping-aware savings, linked merchant listings and downloadable purchase-estimate HTML.
- [x] M6: Explicitly labelled offline demo data, server-side credentials, basic validation and Node tests.
- [ ] M7: Deploy API and configure eBay keys; complete browser end-to-end testing on Amazon, fashion storefronts and permitted marketplace pages.
- [ ] M8: Additional authorised shopping providers, better image/model matching and shipping/tax certainty.
- [ ] M9: 33JACK account connection and optional invoice hand-off (requires separate auth and approvals).
- [ ] M10: Mobile PWA/share-sheet widget and eventual Android overlay; iOS cannot use a system-wide floating Chrome extension.

## Local test (no provider account required)
1. Visit `chrome://extensions` in desktop Chrome.
2. Enable **Developer mode** → **Load unpacked** → select the `extension` folder.
3. Open a product page and click JackEXT. It attempts to read product metadata (edit the title and price if necessary).
4. Click **Try demo**. These are **synthetic examples**, never real merchant prices.
5. Click **Show floating widget** or right-click → **Scan product with JackEXT**.
6. Download an estimate draft from the popup. It is **not** an invoice from any merchant.
7. Run `npm test` (Node.js 20+) for logic tests.

## Live API setup
1. Create eBay developer application credentials for the **production** Browse API (with approved access).
2. Put `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET` in Vercel project **server-side** environment variables, or in local env for `vercel dev`. Never expose secrets in the extension.
3. Deploy this repository as a Vercel Node.js project; serverless `/api/health` and POST `/api/compare` are defined under `api/`.
4. In the extension popup set **Comparison API** to `https://YOUR-PROJECT.vercel.app`, or `http://localhost:3000` for `vercel dev`.
5. Click **Compare live**. A missing provider key returns a clear 503; it **never silently substitutes demo offers**.

Example request:

```sh
curl -X POST https://YOUR-PROJECT.vercel.app/api/compare \
  -H 'Content-Type: application/json' \
  -d '{"product":{"title":"black leather tote bag","price":30,"currency":"GBP"}}'
```

## Product policy and limitations
- Consent-based scanning only when the user opens JackEXT or clicks the context menu. No persistent all-sites content script.
- Product extraction is best effort. Instagram and many other pages may not expose a product title or price and require manual entry; pages such as `chrome://` cannot be scanned.
- Source price excludes unconfirmed shipping. A comparison shows a *saving* only when shipping is known for the candidate; even then the source merchant shipping/tax may differ. All offers require merchant checkout verification.
- Text similarity is an initial filter, not a guarantee of exact equivalence. Check SKU, capacity, colour, seller reputation, condition, returns and fulfilment.
- Search provider is eBay **only** until more lawful provider adapters are added; this is not a universal market scan. Do not claim universal coverage or guaranteed cheapest prices.
- Quote HTML has a prominent not-an-invoice notice. JackEXT does not issue invoices for third-party merchants, collect checkout payments or send orders.
- This beta has not been published in the Chrome Web Store or tested in all browsers.
