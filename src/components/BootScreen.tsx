import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { confirmBeep, errorBuzz, keyTick } from "../lib/sound";

// lines kept <= 29 chars so they never wrap on a 360px phone
const BOOT_LINES = [
  "> KHỞI ĐỘNG HỆ THỐNG .. OK",
  "> GIẤY IN NHIỆT ...... OK",
  "> MỰC CẢM XÚC ........ OK",
  "> MỞ CA: 20/10 ....... OK",
  "> TẢI DỮ LIỆU VÔ HÌNH...",
  "> PHÁT HIỆN KHOẢN NỢ:",
  "  1.847.293 CHƯA THANH TOÁN",
  "> BẮT ĐẦU TÍNH HÓA ĐƠN? [Y/N]",
];

type Phase = "typing" | "prompt" | "accepted";

export default function BootScreen({ onDone }: { onDone: () => void }) {
  const [done, setDone] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [phase, setPhase] = useState<Phase>("typing");
  const [refused, setRefused] = useState(false);
  const [fast, setFast] = useState(false);
  const speedRef = useRef(false);
  const phaseRef = useRef<Phase>("typing");
  const refusedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  phaseRef.current = phase;

  useEffect(() => {
    let alive = true;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    (async () => {
      for (const line of BOOT_LINES) {
        setCurrent("");
        for (let i = 1; i <= line.length; i++) {
          if (!alive) return;
          setCurrent(line.slice(0, i));
          await sleep(speedRef.current ? 2 : 24);
        }
        if (!alive) return;
        setDone((d) => [...d, line]);
        setCurrent("");
        await sleep(speedRef.current ? 30 : 360);
      }
      if (!alive) return;
      keyTick();
      setPhase("prompt");
    })();
    return () => {
      alive = false;
    };
  }, []);

  const accept = () => {
    if (phaseRef.current !== "prompt") return;
    setPhase("accepted");
    confirmBeep();
    setDone((d) => [
      ...d,
      "> [Y] — XÁC NHẬN.",
      "> ĐANG MỞ HỒ SƠ KHÁCH HÀNG...",
    ]);
    setTimeout(() => onDoneRef.current(), 950);
  };

  const refuse = () => {
    if (phaseRef.current !== "prompt" || refusedRef.current) return;
    refusedRef.current = true;
    setRefused(true);
    errorBuzz();
    setDone((d) => [
      ...d,
      "> [N] — LỖI 20/10:",
      "  HÓA ĐƠN NÀY KHÔNG THỂ TỪ CHỐI.",
      "> NGƯỜI ẤY ĐÃ TRẢ TRƯỚC",
      "  BẰNG CẢ THANH XUÂN.",
      "> VUI LÒNG NHẤN [Y] _",
    ]);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === "typing") {
        speedRef.current = true;
        setFast(true);
        return;
      }
      if (phase !== "prompt") return;
      const k = e.key.toLowerCase();
      if (k === "y" || e.key === "Enter") accept();
      if (k === "n") refuse();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const speedUp = () => {
    if (phase === "typing") {
      speedRef.current = true;
      setFast(true);
    }
  };

  return (
    <div
      className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10"
      onClick={speedUp}
    >
      <div className="w-full max-w-3xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-2 text-[9px] uppercase tracking-[0.25em] text-dim-green sm:text-xs sm:tracking-[0.3em]">
          <span>BIOS v20.10 — HĐVH POS</span>
          <span className={fast ? "opacity-0" : "blink"}>CHẠM/NHẤN PHÍM ĐỂ NHANH HƠN</span>
        </div>

        <div className="pos-panel relative p-4 sm:p-10">
          <span className="absolute -left-1 -top-3 font-vt text-2xl text-[#00ff41]/60">+</span>
          <span className="absolute -right-1 -top-3 font-vt text-2xl text-[#00ff41]/60">+</span>
          <span className="absolute -bottom-3 -left-1 font-vt text-2xl text-[#00ff41]/60">+</span>
          <span className="absolute -bottom-3 -right-1 font-vt text-2xl text-[#00ff41]/60">+</span>

          <div className="space-y-1.5 font-vt text-xl leading-snug sm:text-[1.9rem]">
            {done.map((l, i) => (
              <div
                key={i}
                className={
                  l.includes("1.847.293") || l.includes("[!]") || l.includes("MÃ LỖI")
                    ? "text-glow-strong"
                    : "text-glow"
                }
              >
                {l}
              </div>
            ))}
            {phase === "typing" && (
              <div className="text-glow break-all">
                {current}
                <span className="block-caret" />
              </div>
            )}
            {(phase === "prompt" || phase === "accepted") && (
              <div className="text-glow">
                <span className="block-caret" />
              </div>
            )}
          </div>

          {phase === "prompt" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  accept();
                }}
                className="pos-btn pos-btn--fill px-7 py-2.5 text-3xl sm:px-10 sm:py-3 sm:text-4xl"
              >
                [ Y ] — ĐỒNG Ý
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  refuse();
                }}
                disabled={refused}
                className={`pos-btn px-8 py-3 text-3xl sm:text-4xl ${
                  refused ? "cursor-not-allowed opacity-25" : ""
                }`}
              >
                [ N ]
              </button>
              <span className="text-[10px] uppercase tracking-[0.25em] text-dim-green">
                hoặc nhấn phím Y / Enter
              </span>
            </motion.div>
          )}
        </div>

        <div className="mt-6 text-center text-[10px] uppercase tracking-[0.35em] text-white/25">
          hệ thống ghi nhận mọi khoản nợ — kể cả khoản bạn chưa từng thấy
        </div>
      </div>
    </div>
  );
}
