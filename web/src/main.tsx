import {useCallback, useEffect, useRef, useState} from "react";
import {createRoot} from "react-dom/client";
import "./index.css";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260530_042513_df96a13b-6155-4f6e-8b93-c9dee66fba08.mp4";
const SENSITIVITY = 0.8;
const EMAIL = "contact@mushee.xyz";
const TAGLINE = "Spot it anywhere. Find the better price. Know what you're paying before you buy.";
type PanelName = "scout" | "compare" | "widget" | "guide" | null;

function useTypewriter(text: string, speed = 38, startDelay = 600) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {setShown(text.length); return;}
    setShown(0);
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = window.setTimeout(() => {
      interval = window.setInterval(() => {
        setShown(count => {
          if (count >= text.length) {window.clearInterval(interval); return count;}
          return count + 1;
        });
      }, speed);
    }, startDelay);
    return () => {window.clearTimeout(timeout); if (interval) window.clearInterval(interval);};
  }, [text, speed, startDelay]);
  return {displayed: text.slice(0, shown), done: shown >= text.length};
}

const panelContent: Record<Exclude<PanelName, null>, {title: string; description: string; steps: string[]}> = {
  scout: {
    title: "Scan the thing you found.",
    description: "JackEXT reads an individual product page only when you ask it to.",
    steps: ["Open the product's own listing in Brave or Chrome.", "Click the JackEXT toolbar icon.", "Select Scan this page and confirm the product and its price."]
  },
  compare: {
    title: "Compare without guessing.",
    description: "The extension compares close product matches. Live listings require the configured provider API; demo data is always labelled.",
    steps: ["Scan or type a specific model and its price.", "Select Try demo for sample offers, or Compare live with a working backend.", "Check condition, model, shipping and final merchant checkout."]
  },
  widget: {
    title: "A scout that stays nearby.",
    description: "Open the little floating JackEXT widget directly on the shopping page.",
    steps: ["Visit an individual product listing.", "Open JackEXT from your browser's toolbar.", "Select Show floating widget to compare without leaving the page."]
  },
  guide: {
    title: "Spot. Compare. Decide.",
    description: "JackEXT is the shopping companion for 33JACK.",
    steps: ["Spot a product online.", "Find comparable listings, with shipping and match checks.", "Download a clearly labelled purchase estimate draft, never a seller-issued invoice."]
  }
};

const NAV: {label: string; panel: Exclude<PanelName, null>}[] = [
  {label: "Scout", panel: "scout"},
  {label: "Compare", panel: "compare"},
  {label: "Widget", panel: "widget"},
  {label: "How it works", panel: "guide"}
];

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previousXRef = useRef<number | null>(null);
  const targetTimeRef = useRef(0);
  const seekingRef = useRef(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pillsReady, setPillsReady] = useState(false);
  const [panel, setPanel] = useState<PanelName>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const {displayed, done} = useTypewriter(TAGLINE);

  const seekNext = useCallback(() => {
    const video = videoRef.current;
    if (!video || seekingRef.current || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const next = Math.min(video.duration, Math.max(0, targetTimeRef.current));
    if (Math.abs(video.currentTime - next) < 0.025) return;
    seekingRef.current = true;
    try {video.currentTime = next;} catch {seekingRef.current = false;}
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setPillsReady(true), 400);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const previousX = previousXRef.current;
      previousXRef.current = event.clientX;
      if (previousX === null) return;
      const video = videoRef.current;
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
      const delta = event.clientX - previousX;
      const offset = (delta / window.innerWidth) * SENSITIVITY * video.duration;
      targetTimeRef.current = Math.max(0, Math.min(video.duration, targetTimeRef.current + offset));
      seekNext();
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [seekNext]);

  const showPanel = (name: Exclude<PanelName, null>) => {
    setPanel(name);
    setMobileOpen(false);
  };

  const openScanner = async (fallback: Exclude<PanelName, null>) => {
    // Chrome/Brave extension builds can open the existing, fully-functional scanner.
    // Ordinary web previews show actionable instructions instead.
    const extension = (globalThis as unknown as {
      chrome?: {
        runtime?: {id?: string};
        action?: {openPopup?: () => Promise<void>};
        storage?: {local?: {get: (keys: string) => Promise<{jackextSourceTabId?: number}>}};
        tabs?: {update: (tabId: number, properties: {active: boolean}) => Promise<unknown>}
      }
    }).chrome;
    if (extension?.runtime?.id && extension.action?.openPopup) {
      try {
        const saved = await extension.storage?.local?.get("jackextSourceTabId");
        if (saved?.jackextSourceTabId && extension.tabs) {
          // Go back to the shopping page: scanning the dashboard itself would be misleading.
          await extension.tabs.update(saved.jackextSourceTabId, {active: true});
        }
        await extension.action.openPopup();
        setMobileOpen(false);
        return;
      } catch { /* Some Brave/Chrome versions do not permit this shortcut. */ }
    }
    showPanel(fallback);
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopyStatus("Email copied");
    } catch {
      setCopyStatus("Copy unavailable — select the email to copy it");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-black">
      <video
        ref={videoRef}
        className="hero-video"
        src={VIDEO_URL}
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        onLoadedMetadata={() => seekNext()}
        onSeeked={() => {seekingRef.current = false; seekNext();}}
        onError={() => {seekingRef.current = false;}}
      />
      <div className="pointer-events-none fixed inset-0 z-[1] bg-gradient-to-r from-white/70 via-white/35 to-white/5" />

      <header className="fixed inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
        <a href="#top" aria-label="JackEXT home" className="flex items-center gap-3 text-black no-underline">
          <span className="logo-word text-[21px] tracking-tight sm:text-[26px]">JackEXT®</span>
          <span className="select-none text-[25px] tracking-[-0.02em] sm:text-[30px]" aria-hidden="true">✳︎</span>
        </a>
        <nav aria-label="Main navigation" className="hidden items-center text-[23px] md:flex">
          {NAV.map((item, index) => (
            <span key={item.panel}>
              <button className="transition-opacity hover:opacity-60" onClick={() => showPanel(item.panel)}>{item.label}</button>
              {index !== NAV.length - 1 && <span>,&nbsp;</span>}
            </span>
          ))}
        </nav>
        <a href={"mailto:" + EMAIL} className="hidden text-[23px] underline underline-offset-2 transition-opacity hover:opacity-60 md:block">Get in touch</a>
        <button
          type="button"
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(value => !value)}
          className="relative z-20 flex flex-col gap-[5px] p-2 md:hidden"
        >
          <span className={"h-[2px] w-6 bg-black transition-transform duration-300 " + (mobileOpen ? "translate-y-[7px] rotate-45" : "")} />
          <span className={"h-[2px] w-6 bg-black transition-opacity duration-300 " + (mobileOpen ? "opacity-0" : "")} />
          <span className={"h-[2px] w-6 bg-black transition-transform duration-300 " + (mobileOpen ? "-translate-y-[7px] -rotate-45" : "")} />
        </button>
      </header>

      <nav
        aria-label="Mobile navigation"
        aria-hidden={!mobileOpen}
        className={"fixed inset-0 z-[9] flex flex-col justify-center gap-8 bg-white/95 px-8 backdrop-blur-sm transition-opacity duration-300 md:hidden " + (mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0")}
      >
        {NAV.map(item => (
          <button key={item.panel} className="text-left text-[32px] font-medium" onClick={() => showPanel(item.panel)} tabIndex={mobileOpen ? 0 : -1}>{item.label}</button>
        ))}
        <a tabIndex={mobileOpen ? 0 : -1} href={"mailto:" + EMAIL} className="text-[32px] font-medium underline underline-offset-2">Get in touch</a>
      </nav>

      <main id="top" className="relative z-[2] flex h-screen flex-col justify-end overflow-hidden px-5 pb-12 sm:px-8 md:justify-center md:px-10 md:pb-0">
        <div className="relative z-10 max-w-xl">
          <p
            className="pointer-events-none mb-5 select-none whitespace-pre-line text-black sm:mb-6"
            style={{fontSize:"clamp(18px, 4vw, 26px)",lineHeight:1.3,fontWeight:400,filter:"blur(4px)"}}
          >
            {"Hey there, meet J.A.C.K.,\nYour adaptive shopping scout from 33JACK"}
          </p>
          <p className="mb-5 min-h-[54px] text-black sm:mb-6" style={{fontSize:"clamp(18px, 4vw, 26px)",lineHeight:1.35,fontWeight:400}}>
            {displayed}
            {!done && <span aria-hidden="true" className="type-cursor ml-[2px] inline-block h-[1.1em] w-[2px] bg-black align-middle" />}
          </p>
          <div className={"action-pills flex flex-wrap gap-y-1 " + (pillsReady ? "ready" : "")}>
            {([
              ["Scan a product", "scout"],
              ["Compare prices", "compare"],
              ["Open the widget", "widget"],
              ["See how it works", "guide"]
            ] as const).map(([label, name]) => (
              <button
                key={name}
                type="button"
                onClick={() => name === "guide" ? showPanel(name) : void openScanner(name)}
                className="mx-[0.2em] mb-[0.4em] inline-flex items-center justify-center whitespace-nowrap rounded-full border border-black/10 bg-white px-4 py-[0.3em] text-[13px] text-black transition-colors duration-200 hover:bg-black hover:text-white sm:px-5 sm:text-[15px]"
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              title={"Copy " + EMAIL}
              onClick={() => void copyEmail()}
              className="mx-[0.2em] mb-[0.4em] inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white bg-transparent px-4 py-[0.3em] text-[13px] text-white transition-colors duration-200 hover:bg-white hover:text-black sm:gap-3 sm:px-5 sm:text-[15px]"
            >
              <span>Reach us: <u className="underline-offset-1">{EMAIL}</u></span>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 12 12" aria-hidden="true">
                <rect x="4" y="1" width="7" height="8" rx="1" />
                <path d="M8 9v1a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h2" />
              </svg>
            </button>
          </div>
          <div role="status" aria-live="polite" className="mt-2 text-sm text-black">{copyStatus}</div>
          {panel && (
            <section className="panel-enter mt-4 max-w-[520px] rounded-2xl border border-black/10 bg-white/95 p-5 shadow-xl backdrop-blur" aria-label={panelContent[panel].title}>
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl">{panelContent[panel].title}</h2>
                <button type="button" aria-label="Close information" className="text-xl" onClick={() => setPanel(null)}>×</button>
              </div>
              <p className="mt-2 text-sm leading-relaxed">{panelContent[panel].description}</p>
              <ol className="mt-3 list-inside list-decimal space-y-1 text-sm">
                {panelContent[panel].steps.map(step => <li key={step}>{step}</li>)}
              </ol>
              <button className="mt-4 rounded-full bg-black px-4 py-2 text-sm text-white" onClick={() => void openScanner(panel === "guide" ? "scout" : panel)}>Open the scanner ↗</button>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
