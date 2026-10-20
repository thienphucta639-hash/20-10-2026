import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { buildItems, fmt, getYears, YEAR, type RelConfig } from "../lib/data";
import { filmCut, heartbeat, reelEnd, stopBed } from "../lib/sound";

interface Props {
  rel: RelConfig;
  raws: number[];
  onBack: () => void;
  onReplayIntro: () => void;
}

type Scene =
  | { kind: "line"; lines: string[]; sub?: string; big?: boolean }
  | { kind: "stat"; value: string; label: string }
  | { kind: "todo" }
  | { kind: "title" }
  | { kind: "end" };

export default function FilmOutro({ rel, raws, onBack, onReplayIntro }: Props) {
  const totalQty = buildItems(rel, raws).reduce((sum, it) => sum + it.qty, 0);
  const years = getYears(rel, raws);

  const [i, setI] = useState(0);
  const [maxSeen, setMaxSeen] = useState(0);

  const scenes: Scene[] = [
    { kind: "line", lines: ["BẠN VỪA ĐỌC XONG", "MỘT TỜ HÓA ĐƠN."] },
    {
      kind: "stat",
      value: fmt(totalQty),
      label: `đơn vị công sức ${rel.pronounLow} đã bỏ ra — chỉ tính 5 khoản`,
    },
    {
      kind: "line",
      lines: [`${rel.pronounUp} ĐÃ SỐNG`, "BẢN HÓA ĐƠN NÀY", `SUỐT ${fmt(years)} NĂM.`],
      sub: "không in ra. không ai ký nhận.",
    },
    {
      kind: "line",
      lines: ["HÔM NAY BẠN LÀ", "NGƯỜI ĐẦU TIÊN", "IN NÓ RA."],
      sub: "nhưng in xong rồi thì sao?",
    },
    {
      kind: "line",
      lines: ["TỜ HÓA ĐƠN NÀY", "SẼ KHÔNG BAO GIỜ", "ĐƯỢC GỬI ĐI."],
      sub: "người ta không đòi nợ người mình thương",
    },
    { kind: "todo" },
    {
      kind: "line",
      lines: ["BẠN KHÔNG NỢ TIỀN.", "BẠN NỢ SỰ CÓ MẶT."],
      sub: "thứ duy nhất không thể gửi qua chuyển khoản",
    },
    {
      kind: "line",
      lines: ["MỘT TỜ GIẤY", "KHÔNG TRẢ ĐƯỢC GÌ CẢ.", "CHỈ CÓ BẠN MỚI TRẢ ĐƯỢC."],
      big: true,
    },
    {
      kind: "line",
      lines: ["NÊN NÓ NẰM ĐÂY.", "ĐỢI BẠN TỰ TRẢ."],
      big: true,
    },
    { kind: "title" },
    { kind: "end" },
  ];

  /* nhịp đọc chậm — đủ thời gian để hấp thụ từng câu */
  const HOLD = scenes.map((s) =>
    s.kind === "stat"
      ? 5200
      : s.kind === "todo"
        ? 8600
        : s.kind === "title"
          ? 6000
          : s.kind === "end"
            ? 999999
            : 5800
  );
  
  const scene = scenes[i];

  /* khóa cuộn trang khi màn outro mở */
  useEffect(() => {
    heartbeat();
    stopBed();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  /** đã chiếu hết toàn bộ -> tua tự do hai chiều */
  const finished = maxSeen >= scenes.length - 1;

  const next = () => {
    if (i >= scenes.length - 1) return;
    if (!finished && i >= maxSeen) return; // chưa xem tới -> phải để tự chạy
    filmCut();
    setI((v) => Math.min(v + 1, scenes.length - 1));
  };

  const prev = () => {
    if (i === 0) return;
    filmCut();
    setI((v) => Math.max(0, v - 1));
  };

  useEffect(() => {
    setMaxSeen((m) => Math.max(m, i));
    if (scene.kind === "end") {
      reelEnd();
      return;
    }
    const t = setTimeout(() => {
      if (i < scenes.length - 1) {
        const n = i + 1;
        setI(n);
        setMaxSeen((m) => Math.max(m, n));
      }
    }, HOLD[i]);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
      else if (["ArrowLeft", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        prev();
      } else if ([" ", "Enter", "ArrowRight", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, maxSeen]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.45 } }}
      transition={{ duration: 1 }}
      onPointerDown={next}
      className="fixed inset-0 z-[90] select-none overflow-hidden bg-black"
      style={{ WebkitTapHighlightColor: "transparent" }}
      role="dialog"
      aria-label="Lời cuối"
    >
      <div className="absolute inset-x-0 top-0 z-30 h-[10%] bg-black" />
      <div className="absolute inset-x-0 bottom-0 z-30 h-[10%] bg-black" />
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 72% 55% at 50% 45%, rgba(0,255,65,0.07), transparent 70%)",
        }}
      />
      <div className="film-grain z-20" />
      <div className="film-scratch z-20" />
      <div className="film-flicker absolute inset-0 z-10 bg-white/[0.022]" />
      <div
        className="absolute inset-0 z-20"
        style={{
          background:
            "radial-gradient(ellipse 95% 95% at 50% 50%, transparent 45%, rgba(0,0,0,0.82) 100%)",
        }}
      />

      <motion.div
        className="absolute inset-0 z-20 flex items-center justify-center px-7"
        animate={{ scale: [1, 1.035, 1.01], x: [0, 5, -5] }}
        transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
      >
        <AnimatePresence mode="wait">
          {scene.kind === "line" && (
            <motion.div
              key={`l${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -10, filter: "blur(6px)", transition: { duration: 0.5 } }}
              className="w-full max-w-[22rem] text-center sm:max-w-2xl"
            >
              {scene.lines.map((l, k) => (
                <motion.span
                  key={k}
                  initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: 0.5 + k * 0.95, duration: 1.5, ease: "easeOut" }}
                  className={`block font-vt leading-[1.25] text-[#eafbea] ${
                    scene.big ? "text-glow-strong" : "text-glow"
                  }`}
                  style={{
                    fontSize: scene.big
                      ? "clamp(1.75rem, 7.6vw, 3rem)"
                      : "clamp(1.4rem, 6.2vw, 2.4rem)",
                  }}
                >
                  {l}
                </motion.span>
              ))}
              {scene.sub && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 + scene.lines.length * 0.95, duration: 1.2 }}
                  className="mt-5 block text-balance font-plex text-[10px] uppercase tracking-[0.3em] text-white/40"
                >
                  {scene.sub}
                </motion.span>
              )}
            </motion.div>
          )}

          {scene.kind === "stat" && (
            <motion.div
              key={`s${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, filter: "blur(6px)", transition: { duration: 0.45 } }}
              className="w-full max-w-[22rem] text-center sm:max-w-xl"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.88, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{ duration: 1, ease: [0.2, 0.9, 0.3, 1] }}
                className="font-vt leading-none text-glow-strong"
                style={{ fontSize: "clamp(3rem, 16vw, 7rem)" }}
              >
                {scene.value}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.8 }}
                className="mx-auto mt-5 max-w-[18rem] text-balance font-plex text-[11px] uppercase leading-relaxed tracking-[0.2em] text-white/50 sm:max-w-sm sm:text-xs"
              >
                {scene.label}
              </motion.div>
            </motion.div>
          )}

          {scene.kind === "todo" && (
            <motion.div
              key="todo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, filter: "blur(6px)", transition: { duration: 0.45 } }}
              className="w-full max-w-[23rem] sm:max-w-xl"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7 }}
                className="mb-6 text-center font-plex text-[10px] uppercase tracking-[0.35em] text-[#00ff41]/55"
              >
                ba khoản trả góp đầu tiên
              </motion.div>
              {rel.installments.map((t, k) => (
                <motion.div
                  key={k}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + k * 1.9, duration: 1.1, ease: "easeOut" }}
                  className="mb-4 flex items-start gap-3 border-l-2 border-[#00ff41]/50 pl-4"
                >
                  <span className="mt-[3px] font-vt text-xl leading-none text-[#00ff41]/70">
                    0{k + 1}
                  </span>
                  <span className="text-pretty font-plex text-[12px] uppercase leading-relaxed tracking-[0.08em] text-[#eafbea]/90 sm:text-sm">
                    {t}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}

          {scene.kind === "title" && (
            <motion.div
              key="title"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.4 } }}
              className="text-center"
            >
              <motion.div
                initial={{ opacity: 0, filter: "blur(16px)", letterSpacing: "0.5em" }}
                animate={{ opacity: 1, filter: "blur(0px)", letterSpacing: "0.08em" }}
                transition={{ duration: 1.9, ease: [0.16, 1, 0.3, 1] }}
                className="font-vt leading-none text-glow-strong"
                style={{ fontSize: "clamp(3.8rem, 21vw, 8rem)" }}
              >
                20/10
              </motion.div>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1.1, duration: 1, ease: "easeOut" }}
                className="mx-auto mt-5 h-px w-44 bg-[#00ff41]/60 sm:w-60"
              />
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5, duration: 1 }}
                className="mt-5 font-vt text-[clamp(1.1rem,5vw,1.7rem)] leading-tight tracking-[0.18em] text-glow"
              >
                NGÀY PHỤ NỮ VIỆT NAM
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.2, duration: 0.9 }}
                className="mt-4 font-plex text-[10px] uppercase tracking-[0.3em] text-white/40"
              >
                và 364 ngày còn lại của năm {YEAR}
              </motion.div>
            </motion.div>
          )}

          {scene.kind === "end" && (
            <motion.div
              key="end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-sm text-center"
            >
              <motion.div
                initial={{ opacity: 0, scale: 1.3, filter: "blur(12px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                className="font-vt leading-none text-glow-strong"
                style={{ fontSize: "clamp(3rem, 15vw, 5rem)" }}
              >
                HẾT.
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.3, duration: 1 }}
                className="mt-5 text-balance font-plex text-[11px] uppercase leading-relaxed tracking-[0.22em] text-white/45"
              >
                phần của bạn mới bắt đầu
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.1, duration: 0.8 }}
                className="mt-10 flex flex-col items-stretch gap-3"
              >
                <button
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    filmCut();
                    onBack();
                  }}
                  className="pos-btn min-h-[3.25rem] px-6 py-2 font-vt text-2xl"
                >
                  ◂ QUAY LẠI HÓA ĐƠN
                </button>
                <button
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    filmCut();
                    onReplayIntro();
                  }}
                  className="pos-btn min-h-[3.25rem] px-6 py-2 font-vt text-2xl"
                >
                  ↺ XEM LẠI MỞ ĐẦU
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* thanh tiến độ */}
      <div className="absolute inset-x-0 bottom-[10%] z-40 h-[2px] bg-white/10">
        <motion.div
          className="h-full bg-[#00ff41]/70"
          animate={{ width: `${((i + 1) / scenes.length) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* điều khiển */}
      <div className="safe-x absolute inset-x-0 bottom-[calc(10%+0.75rem)] z-40 flex items-center justify-between px-3 sm:px-6">
        <button
          onPointerDown={(e) => {
            e.stopPropagation();
            prev();
          }}
          disabled={i === 0}
          className={`flex min-h-11 items-center px-3 font-plex text-[10px] uppercase tracking-[0.25em] transition-colors ${
            i === 0 ? "pointer-events-none opacity-20" : "text-white/55 active:text-[#00ff41]"
          }`}
        >
          ◂◂ xem lại
        </button>

        <span className="font-plex text-[9px] uppercase tracking-[0.3em] text-white/25">
          {finished ? "tua tự do" : i < maxSeen ? "có thể tua" : "đang chiếu"}
        </span>

        <div className="flex items-center gap-1">
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              next();
            }}
            disabled={i >= scenes.length - 1 || (!finished && i >= maxSeen)}
            className={`flex min-h-11 items-center px-3 font-plex text-[10px] uppercase tracking-[0.25em] transition-colors ${
              i >= scenes.length - 1 || (!finished && i >= maxSeen)
                ? "pointer-events-none opacity-20"
                : "text-white/55 active:text-[#00ff41]"
            }`}
          >
            tiếp ▸▸
          </button>
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              filmCut();
              onBack();
            }}
            className="flex min-h-11 items-center px-3 font-plex text-[10px] uppercase tracking-[0.25em] text-white/45 active:text-[#00ff41]"
          >
            đóng ✕
          </button>
        </div>
      </div>

    </motion.div>
  );
}
