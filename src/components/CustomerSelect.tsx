import { useEffect } from "react";
import { motion } from "framer-motion";
import { REL_LIST, type RelConfig } from "../lib/data";
import { dialKey, unlockAudio } from "../lib/sound";

export default function CustomerSelect({
  onPick,
  onWatchIntro,
}: {
  onPick: (rel: RelConfig) => void;
  onWatchIntro: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= REL_LIST.length) {
        dialKey(n);
        onPick(REL_LIST[n - 1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onPick]);

  return (
    <div className="screen-h-nav safe-x flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-3 text-[10px] uppercase tracking-[0.4em] text-dim-green sm:text-xs"
      >
        "BƯỚC 01 · CHỌN NGƯỜI PHỤ NỮ BẠN ĐANG NỢ"
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-2 text-center font-vt text-[clamp(2.2rem,10vw,5rem)] leading-none text-glow-strong"
      >
        HÓA ĐƠN CHO AI?
      </motion.h1>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mb-10 text-center text-[11px] uppercase tracking-[0.25em] text-white/40"
      >
        mỗi người một loại nợ — chưa ai trong số họ đòi bạn trả
      </motion.div>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2">
        {REL_LIST.map((r, i) => (
          <motion.button
            key={r.key}
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.11, type: "spring", stiffness: 260, damping: 22 }}
            onClick={() => {
              unlockAudio();
              dialKey(i + 1);
              onPick(r);
            }}
            className={`pos-btn group relative min-h-[7rem] px-5 py-6 text-left sm:px-6 sm:py-10 ${i === REL_LIST.length - 1 && REL_LIST.length % 2 === 1 ? "sm:col-span-2" : ""}`}
          >
            <span className="absolute right-3 top-2 font-vt text-lg text-[#00ff41]/40">
              F{i + 1}
            </span>
            <span className="block font-vt text-[clamp(1.6rem,6.4vw,3rem)] leading-none">
              [ {r.shortName} ]
            </span>
            <span className="cut-line my-4 block opacity-60 transition-opacity group-hover:opacity-100" />
            <span className="block text-pretty font-plex text-[10px] uppercase leading-relaxed tracking-[0.15em] text-[#00ff41]/55">
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
        máy chỉ đếm được phần nhìn thấy — phần còn lại bạn tự biết
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        onClick={onWatchIntro}
        className="mt-6 flex min-h-11 items-center gap-2 px-4 font-plex text-[10px] uppercase tracking-[0.25em] text-white/35 transition-colors active:text-[#00ff41]"
      >
        ▸ xem lại đoạn mở đầu
      </motion.button>
    </div>
  );
}
