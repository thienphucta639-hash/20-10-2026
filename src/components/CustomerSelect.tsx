import { useEffect } from "react";
import { motion } from "framer-motion";
import { REL_LIST, type RelConfig } from "../lib/data";
import { confirmBeep } from "../lib/sound";

export default function CustomerSelect({
  onPick,
}: {
  onPick: (rel: RelConfig) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= REL_LIST.length) {
        confirmBeep();
        onPick(REL_LIST[n - 1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onPick]);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-3 text-[10px] uppercase tracking-[0.4em] text-dim-green sm:text-xs"
      >
        {"// BƯỚC 01 — MỞ TÀI KHOẢN KHÁCH HÀNG"}
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-2 text-center font-vt text-6xl leading-none text-glow-strong sm:text-8xl"
      >
        HÓA ĐƠN CHO AI?
      </motion.h1>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mb-10 text-center text-[11px] uppercase tracking-[0.25em] text-white/40"
      >
        mỗi người một loại nợ — nhưng đều không có kỳ hạn
      </motion.div>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2">
        {REL_LIST.map((r, i) => (
          <motion.button
            key={r.key}
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.11, type: "spring", stiffness: 260, damping: 22 }}
            onClick={() => {
              confirmBeep();
              onPick(r);
            }}
            className="pos-btn group relative px-6 py-8 text-left sm:py-10"
          >
            <span className="absolute right-3 top-2 font-vt text-lg text-[#00ff41]/40">
              F{i + 1}
            </span>
            <span className="block font-vt text-4xl leading-none sm:text-5xl">
              [ {r.shortName} ]
            </span>
            <span className="cut-line my-4 block opacity-60 transition-opacity group-hover:opacity-100" />
            <span className="block font-plex text-[10px] uppercase leading-relaxed tracking-[0.15em] text-[#00ff41]/55">
              {r.ageHint}
            </span>
          </motion.button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-10 text-center text-[10px] uppercase tracking-[0.3em] text-white/25"
      >
        nhấn phím 1–4 để chọn nhanh — máy chỉ tính được những gì đếm được
      </motion.div>
    </div>
  );
}
