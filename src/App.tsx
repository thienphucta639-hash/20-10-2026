import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import BootScreen from "./components/BootScreen";
import CustomerSelect from "./components/CustomerSelect";
import Scanner from "./components/Scanner";
import ReceiptView from "./components/ReceiptView";
import { RELS, type RelConfig } from "./lib/data";
import { readHash } from "./lib/share";
import { keyTick, setMuted as setMutedFlag } from "./lib/sound";

type Stage = "boot" | "select" | "input" | "receipt";

const shared = readHash();

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="tabular-nums">
      20/10/2025&nbsp;&nbsp;{pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
    </span>
  );
}

export default function App() {
  const [stage, setStage] = useState<Stage>(shared ? "receipt" : "boot");
  const [rel, setRel] = useState<RelConfig>(shared ? RELS[shared.r] : RELS.me);
  const [raws, setRaws] = useState<number[]>(shared ? shared.a : []);
  const [fromShare, setFromShare] = useState(!!shared);
  const [muted, setMuted] = useState(false);

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    setMutedFlag(m);
    if (!m) keyTick();
  };

  const restart = () => {
    keyTick();
    try {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    } catch {
      /* noop */
    }
    setFromShare(false);
    setRaws([]);
    setStage("select");
  };

  return (
    <div className="relative min-h-screen">
      {/* ---------- INFINITY WATERMARK ---------- */}
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-[-12vh] right-[-5vw] z-0 select-none font-vt text-[42vw] leading-none text-[#00ff41]/[0.03]"
      >
        ∞
      </div>

      {/* ---------- POS STATUS BAR ---------- */}
      <header className="sticky top-0 z-40 border-b border-[#00ff41]/20 bg-[#0a0a0a]/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 font-plex text-[10px] uppercase tracking-[0.22em] text-[#00ff41]/70 sm:text-xs">
          <span className="flex items-center gap-2">
            <span className={stage === "receipt" ? "" : "blink"}>▮</span> POS-20/10 · HĐVH v1.0
          </span>
          <span className="hidden md:inline">ca trực: 20:10 → ∞ · thu ngân: quản gia</span>
          <span className="flex items-center gap-4">
            <Clock />
            <button
              onClick={toggleMute}
              aria-label={muted ? "Bật âm thanh" : "Tắt âm thanh"}
              className="flex h-7 w-7 items-center justify-center border border-[#00ff41]/40 text-[#00ff41] transition-colors hover:bg-[#00ff41]/15"
            >
              {muted ? (
                <VolumeX className="h-3.5 w-3.5" strokeWidth={2.4} />
              ) : (
                <Volume2 className="h-3.5 w-3.5" strokeWidth={2.4} />
              )}
            </button>
          </span>
        </div>
      </header>

      {/* ---------- STAGES ---------- */}
      <main className="relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            initial={{ opacity: 0, filter: "brightness(1.6)" }}
            animate={{ opacity: 1, filter: "brightness(1)" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32 }}
          >
            {stage === "boot" && <BootScreen onDone={() => setStage("select")} />}
            {stage === "select" && (
              <CustomerSelect
                onPick={(r) => {
                  setRel(r);
                  setStage("input");
                }}
              />
            )}
            {stage === "input" && (
              <Scanner
                rel={rel}
                onDone={(rs) => {
                  setRaws(rs);
                  setStage("receipt");
                }}
              />
            )}
            {stage === "receipt" && (
              <ReceiptView rel={rel} raws={raws} fromShare={fromShare} onRestart={restart} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ---------- CRT OVERLAY ---------- */}
      <div className="crt" aria-hidden>
        <div className="crt-noise" />
        <div className="crt-beam" />
      </div>
    </div>
  );
}
