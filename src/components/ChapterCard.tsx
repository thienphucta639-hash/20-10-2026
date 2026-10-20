import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { chapterCard as chapterCardSound } from "../lib/sound";

interface Props {
  num: string;
  title: string;
  sub?: string;
  ms?: number;
  onDone: () => void;
}

export default function ChapterCard({ num, title, sub, ms = 5400, onDone }: Props) {
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  useEffect(() => {
    chapterCardSound();
    const t = setTimeout(finish, ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const k = () => finish();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8 } }}
      transition={{ duration: 0.9 }}
      onPointerDown={finish}
      className="fixed inset-0 z-[88] flex select-none items-center justify-center bg-black px-8"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div className="film-grain z-10 opacity-60" />
      <div
        className="absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 50%, rgba(0,255,65,0.05), transparent 72%)",
        }}
      />

      <div className="relative z-20 text-center">
        <motion.div
          initial={{ opacity: 0, letterSpacing: "0.9em" }}
          animate={{ opacity: 1, letterSpacing: "0.45em" }}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
          className="font-plex text-[10px] uppercase text-[#00ff41]/55 sm:text-xs"
        >
          chương {num}
        </motion.div>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.5, duration: 1.1, ease: "easeOut" }}
          className="mx-auto my-6 h-px w-24 bg-[#00ff41]/40 sm:w-32"
        />

        <motion.h2
          initial={{ opacity: 0, y: 14, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.85, duration: 1.5, ease: "easeOut" }}
          className="text-balance font-vt leading-tight text-glow-strong"
          style={{ fontSize: "clamp(1.9rem, 8.4vw, 3.2rem)" }}
        >
          {title}
        </motion.h2>

        {sub && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.9, duration: 1.2 }}
            className="mx-auto mt-6 max-w-xs text-balance font-plex text-[11px] uppercase leading-relaxed tracking-[0.22em] text-white/40 sm:max-w-sm"
          >
            {sub}
          </motion.p>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3, duration: 0.8 }}
        className="safe-b absolute bottom-6 left-0 right-0 text-center font-plex text-[9px] uppercase tracking-[0.3em] text-white/20"
      >
        chạm để tiếp
      </motion.div>
    </motion.div>
  );
}
