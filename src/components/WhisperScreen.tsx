import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { RelConfig } from "../lib/data";
import { bedFadeDown, heartbeat, filmCut } from "../lib/sound";

interface Props {
  rel: RelConfig;
  onDone: () => void;
}

export default function WhisperScreen({ rel, onDone }: Props) {
  const beats: { text: string; big?: boolean }[] = [
    { text: `BẠN ĐÃ CHỌN: ${rel.pronounUp}` },
    { text: rel.whisper, big: true },
    { text: "GIỜ THÌ THỬ ĐẾM LẠI XEM." },
  ];

  const [i, setI] = useState(0);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    filmCut();
    onDone();
  };

  useEffect(() => {
    heartbeat();
    bedFadeDown();
  }, []);

  useEffect(() => {
    const last = i >= beats.length - 1;
    const t = setTimeout(
      () => {
        if (last) finish();
        else {
          setI((v) => v + 1);
          if (i === 0) heartbeat();
        }
      },
      i === 1 ? 5600 : 3800
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  useEffect(() => {
    const k = () => finish();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const beat = beats[i];

  return (
    <div
      onPointerDown={finish}
      className="screen-h-nav safe-x relative flex flex-col items-center justify-center px-6 text-center"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="absolute left-0 right-0 top-10 font-plex text-[9px] uppercase tracking-[0.4em] text-dim-green"
      >
        hồ sơ: {rel.fullName}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.h1
          key={i}
          initial={{ opacity: 0, y: 16, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -12, filter: "blur(8px)", transition: { duration: 0.8 } }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className={`max-w-xl text-balance font-vt leading-tight ${
            beat.big ? "text-glow-strong" : "text-glow"
          }`}
          style={{
            fontSize: beat.big ? "clamp(1.7rem, 7.4vw, 2.8rem)" : "clamp(1.3rem, 5.6vw, 2rem)",
          }}
        >
          {beat.text}
        </motion.h1>
      </AnimatePresence>

      <div className="absolute bottom-16 flex items-center gap-2">
        {beats.map((_, k) => (
          <span
            key={k}
            className="h-[2px] w-6 transition-colors duration-700"
            style={{ background: k <= i ? "#00ff41aa" : "rgba(255,255,255,0.12)" }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.4, duration: 0.8 }}
        className="absolute bottom-8 font-plex text-[9px] uppercase tracking-[0.3em] text-white/20"
      >
        chạm để tiếp
      </motion.div>
    </div>
  );
}
