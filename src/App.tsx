import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Home, Volume2, VolumeX } from "lucide-react";
import FilmIntro from "./components/FilmIntro";
import FilmOutro from "./components/FilmOutro";
import ChapterCard from "./components/ChapterCard";
import BootScreen from "./components/BootScreen";
import CustomerSelect from "./components/CustomerSelect";
import WhisperScreen from "./components/WhisperScreen";
import Scanner from "./components/Scanner";
import ReceiptView from "./components/ReceiptView";
import { RELS, YEAR, type RelConfig } from "./lib/data";
import { readHash } from "./lib/share";
import { clearState, loadState, saveState } from "./lib/storage";
import { chipTap, filmCut, setMuted as setMutedFlag } from "./lib/sound";

type Stage =
  | "film"
  | "boot"
  | "ch1"
  | "select"
  | "whisper"
  | "ch2"
  | "input"
  | "ch3"
  | "receipt"
  | "outro";

const shared = readHash();
const seenFilm = (() => {
  try {
    return localStorage.getItem("hdvh_seen") === "1";
  } catch {
    return false;
  }
})();
const resume = shared ? null : loadState();

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="tabular-nums">
      <span className="hidden sm:inline">20/10/{YEAR}&nbsp;&nbsp;</span>
      {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
    </span>
  );
}

const FLOW: Stage[] = ["film", "boot", "ch1", "select", "whisper", "ch2", "input", "ch3", "receipt", "outro"];

export default function App() {
  const [stage, setStage] = useState<Stage>(
    shared ? "receipt" : resume?.done ? "receipt" : seenFilm ? "select" : "film"
  );
  const [rel, setRel] = useState<RelConfig>(
    shared ? RELS[shared.r] : resume ? RELS[resume.rel] : RELS.me
  );
  const [raws, setRaws] = useState<number[]>(shared ? shared.a : resume?.raws ?? []);
  const [fromShare, setFromShare] = useState(!!shared);
  const [muted, setMuted] = useState(false);
  const [replayTo, setReplayTo] = useState<Stage | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    setMutedFlag(m);
    if (!m) chipTap();
  };

  const restart = () => {
    filmCut();
    try {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    } catch {
      /* noop */
    }
    setFromShare(false);
    setRaws([]);
    clearState();
    setStage("select");
  };

  return (
    <div className="screen-h relative">
      {/* ---------- INFINITY WATERMARK ---------- */}
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-[-12vh] right-[-5vw] z-0 select-none font-vt text-[42vw] leading-none text-[#00ff41]/[0.03]"
      >
        ∞
      </div>

      {/* ---------- POS STATUS BAR ---------- */}
      <header className="sticky top-0 z-40 border-b border-[#00ff41]/20 bg-[#0a0a0a]/85 backdrop-blur-sm">
        <div className="safe-x mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 font-plex text-[10px] uppercase tracking-[0.22em] text-[#00ff41]/70 sm:text-xs">
          <span className="flex items-center gap-2">
            <span className={stage === "receipt" ? "" : "blink"}>▮</span>
            <span className="font-vt text-sm tracking-[0.2em] text-[#00ff41] sm:text-base">
              HÓA ĐƠN VÔ HÌNH
            </span>
          </span>
          
          <span className="flex items-center gap-3 sm:gap-4">
            {stage !== "film" && stage !== "boot" && (
              <button
                onClick={() => {
                  filmCut();
                  if (confirm("Quay về đầu? Dữ liệu đang nhập sẽ mất.")) {
                    setRaws([]);
                    setFromShare(false);
                    setStage("select");
                  }
                }}
                aria-label="Về đầu"
                className="-my-2 flex h-11 w-11 items-center justify-center border border-[#00ff41]/30 text-[#00ff41]/70 transition-colors active:bg-[#00ff41]/20 sm:h-9 sm:w-9"
              >
                <Home className="h-3.5 w-3.5" strokeWidth={2.4} />
              </button>
            )}
            <Clock />
            <button
              onClick={toggleMute}
              aria-label={muted ? "Bật âm thanh" : "Tắt âm thanh"}
              className="-my-2 flex h-11 w-11 items-center justify-center border border-[#00ff41]/40 text-[#00ff41] transition-colors active:bg-[#00ff41]/25 sm:h-9 sm:w-9"
            >
              {muted ? (
                <VolumeX className="h-3.5 w-3.5" strokeWidth={2.4} />
              ) : (
                <Volume2 className="h-3.5 w-3.5" strokeWidth={2.4} />
              )}
            </button>
          </span>
        </div>
        {/* tiến độ bộ phim */}
        <div className="h-[2px] w-full bg-white/5">
          <motion.div
            className="h-full bg-[#00ff41]/50"
            animate={{
              width: `${((Math.max(0, FLOW.indexOf(stage)) + 1) / FLOW.length) * 100}%`,
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </header>

      {/* ---------- STAGES ---------- */}
      <main className="relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            initial={{
              opacity: 0,
              filter: "brightness(2.6) blur(4px)",
              scale: 1.02,
            }}
            animate={{
              opacity: 1,
              filter: "brightness(1) blur(0px)",
              scale: 1,
            }}
            exit={{
              opacity: 0,
              filter: "brightness(0.6) blur(6px)",
              scale: 0.99,
              transition: { duration: 0.4, ease: "easeIn" },
            }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {stage === "boot" && <BootScreen onDone={() => setStage("ch1")} />}
            {stage === "select" && (
              <CustomerSelect
                onWatchIntro={() => {
                  setReplayTo("select");
                  setStage("film");
                }}
                onPick={(r) => {
                  setRel(r);
                  setStage("whisper");
                }}
              />
            )}
            {stage === "whisper" && (
              <WhisperScreen rel={rel} onDone={() => setStage("ch2")} />
            )}
            {stage === "input" && (
              <Scanner
                rel={rel}
                startAt={editIdx}
                initialRaws={raws.length ? raws : undefined}
                onBack={() => setStage("select")}
                onDone={(rs) => {
                  setRaws(rs);
                  saveState({ rel: rel.key, raws: rs, done: true, at: Date.now() });
                  setEditIdx(null);
                  setStage(editIdx === null ? "ch3" : "receipt");
                }}
              />
            )}
            {stage === "receipt" && (
              <ReceiptView
                rel={rel}
                raws={raws}
                fromShare={fromShare}
                onRestart={restart}
                onShowOutro={() => setStage("outro")}
                onEdit={(i) => {
                  setEditIdx(i);
                  setStage("input");
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ---------- CINEMA LAYERS ---------- */}
      <div className="cine-vig" aria-hidden />
      <div className="cine-dust" aria-hidden />
      <div className="cine-frame" aria-hidden />

      {/* ---------- CRT OVERLAY ---------- */}
      <div className="crt" aria-hidden>
        <div className="crt-noise" />
        <div className="crt-beam" />
      </div>

      {/* ---------- THẺ CHUYỂN CHƯƠNG ---------- */}
      <AnimatePresence>
        {stage === "ch1" && (
          <ChapterCard
            num="I"
            title="NGƯỜI ẤY LÀ AI?"
            sub="mỗi nhà đều có một người như vậy"
            onDone={() => {
              setStage("select");
            }}
          />
        )}
        {stage === "ch2" && (
          <ChapterCard
            num="II"
            title="KIỂM KÊ"
            sub="năm câu hỏi. không câu nào cần bạn đoán."
            onDone={() => {
              setStage("input");
            }}
          />
        )}
        {stage === "ch3" && (
          <ChapterCard
            num="III"
            title="HÓA ĐƠN"
            sub="máy bắt đầu in. nó sẽ dài hơn bạn nghĩ."
            ms={6000}
            onDone={() => {
              setStage("receipt");
            }}
          />
        )}
      </AnimatePresence>

      {/* ---------- CINEMATIC COLD OPEN / OUTRO ---------- */}
      <AnimatePresence>
        {stage === "film" && (
          <FilmIntro
            onDone={() => {
              try {
                localStorage.setItem("hdvh_seen", "1");
              } catch {
                /* noop */
              }
              setStage(replayTo ?? "boot");
              setReplayTo(null);
            }}
          />
        )}
        {stage === "outro" && (
          <FilmOutro
            rel={rel}
            raws={raws}
            onBack={() => setStage("receipt")}
            onReplayIntro={() => {
              setReplayTo("receipt");
              setStage("film");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
