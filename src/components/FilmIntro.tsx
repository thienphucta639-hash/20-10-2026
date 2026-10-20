import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { filmCut, leaderStomp, startBed, unlockAudio } from "../lib/sound";

interface Props {
  onDone: () => void;
}

type Scene =
  | { kind: "slate" }
  | { kind: "leader" }
  | { kind: "line"; lines: string[]; big?: boolean; sub?: string }
  | { kind: "stat"; value: string; label: string }
  | { kind: "title" };

/* Kịch bản mở đầu — mỗi cảnh là một nhịp thở */
const SCENES: Scene[] = [
  { kind: "slate" },
  { kind: "leader" },
  {
    kind: "line",
    lines: ["TRONG MỖI NGÔI NHÀ VIỆT NAM,", "CÓ MỘT NGƯỜI ĐI LÀM", "CẢ ĐỜI KHÔNG LƯƠNG."],
  },
  {
    kind: "line",
    lines: ["KHÔNG HỢP ĐỒNG.", "KHÔNG NGÀY PHÉP.", "KHÔNG MỘT LẦN ĐÒI TĂNG CA."],
  },
  {
    kind: "stat",
    value: "13 GIỜ",
    label: "một ngày trung bình của người phụ nữ việt",
  },
  {
    kind: "stat",
    value: "0 ĐỒNG",
    label: "số tiền được trả cho phần lớn công việc ấy",
  },
  {
    kind: "line",
    lines: ["BẠN GỌI ĐÓ LÀ", "“CHUYỆN HIỂN NHIÊN”."],
    sub: "kế toán gọi đó là nợ chưa ghi sổ",
  },
  {
    kind: "line",
    lines: ["CÓ NHỮNG VIỆC", "KHÔNG AI TRẢ TIỀN —", "NÊN KHÔNG AI ĐẾM."],
    sub: "và thứ không được đếm thì dễ bị quên",
  },
  {
    kind: "line",
    lines: ["HÔM NAY,", "CHÚNG TA TÍNH LẠI", "TẤT CẢ."],
    big: true,
  },
  { kind: "title" },
];

const LEADER_STEP = 1250; // mỗi số một nhịp
const HOLD: number[] = SCENES.map((s) =>
  s.kind === "slate"
    ? 4200
    : s.kind === "leader"
      ? LEADER_STEP * 3 + 600
      : s.kind === "title"
        ? 5200
        : s.kind === "stat"
          ? 5000
          : s.kind === "line" && s.lines.length >= 3
            ? 6400
            : 5600
);

export default function FilmIntro({ onDone }: Props) {
  const [i, setI] = useState(0);
  const [maxSeen, setMaxSeen] = useState(0);
  const [count, setCount] = useState(3);
  const [flash, setFlash] = useState(false);
  const doneRef = useRef(false);
  const scene = SCENES[i];

  /* đếm ngược 3-2-1 chạy trong CÙNG một cảnh — không remount, không giật */
  useEffect(() => {
    if (scene.kind !== "leader") return;
    leaderStomp(3);
    setCount(3);
    const t2 = setTimeout(() => {
      setCount(2);
      leaderStomp(3);
    }, LEADER_STEP);
    const t1 = setTimeout(() => {
      setCount(1);
      leaderStomp(3);
    }, LEADER_STEP * 2);
    return () => {
      clearTimeout(t2);
      clearTimeout(t1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const finish = () => {
    unlockAudio();
    if (doneRef.current) return;
    doneRef.current = true;
    setFlash(true);
    setTimeout(onDone, 260);
  };

  /** tua tới — CHỈ cho phép trong phần đã xem qua; phần mới phải tự chạy */
  const next = () => {
    unlockAudio();
    startBed(0.5);
    if (doneRef.current) return;
    if (i >= maxSeen) return; // chưa xem tới đây -> không nhảy cóc được
    filmCut();
    setI((v) => Math.min(v + 1, maxSeen));
  };

  /** tua lại — luôn được phép */
  const prev = () => {
    unlockAudio();
    if (doneRef.current || i === 0) return;
    filmCut();
    setI((v) => Math.max(0, v - 1));
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (doneRef.current) return;
      if (i >= SCENES.length - 1) {
        finish();
        return;
      }
      const n = i + 1;
      setI(n);
      setMaxSeen((m) => Math.max(m, n));
    }, HOLD[i]);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
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
  }, [i]);

  /* khóa cuộn trang khi lớp phim đang mở */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const progress = (i + 1) / SCENES.length;

  return (
    <motion.div
      className="fixed inset-0 z-[90] select-none overflow-hidden bg-black"
      onPointerDown={next}
      exit={{ opacity: 0, transition: { duration: 0.45 } }}
      style={{ WebkitTapHighlightColor: "transparent" }}
      role="dialog"
      aria-label="Đoạn mở đầu"
    >
      {/* ---------- LETTERBOX ---------- */}
      <motion.div
        initial={{ height: "50%" }}
        animate={{ height: "10%" }}
        transition={{ duration: 1.4, ease: [0.76, 0, 0.24, 1] }}
        className="absolute inset-x-0 top-0 z-30 bg-black"
      />
      <motion.div
        initial={{ height: "50%" }}
        animate={{ height: "10%" }}
        transition={{ duration: 1.4, ease: [0.76, 0, 0.24, 1] }}
        className="absolute inset-x-0 bottom-0 z-30 bg-black"
      />

      {/* ---------- PROJECTION GLOW + GRAIN ---------- */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 45%, rgba(0,255,65,0.07), transparent 70%)",
        }}
      />
      <div className="film-grain z-20" />
      <div className="film-scratch z-20" />
      <div className="film-flicker absolute inset-0 z-10 bg-white/[0.025]" />
      <div
        className="absolute inset-0 z-20"
        style={{
          background:
            "radial-gradient(ellipse 95% 95% at 50% 50%, transparent 45%, rgba(0,0,0,0.8) 100%)",
        }}
      />

      {/* ---------- SCENES ---------- */}
      <motion.div
        className="absolute inset-0 z-20 flex items-center justify-center px-7"
        animate={{ scale: [1, 1.03, 1.01], x: [0, -6, 4] }}
        transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
      >
        <AnimatePresence mode="wait">
          {scene.kind === "slate" && (
            <motion.div
              key="slate"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
              className="w-full max-w-[21rem] sm:max-w-md"
            >
              <motion.div
                initial={{ opacity: 0, scaleX: 0.9 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="border border-[#00ff41]/35 p-5"
              >
                <div className="flex items-center justify-between font-plex text-[9px] uppercase tracking-[0.25em] text-[#00ff41]/55">
                  <span>cuộn 01</span>
                  <span>bản dựng cuối</span>
                </div>
                <div className="my-4 h-px w-full bg-[#00ff41]/25" />
                <div className="font-vt text-[clamp(1.5rem,6.6vw,2.1rem)] leading-tight text-glow">
                  MỘT BẢN KIỂM KÊ
                  <br />
                  KHÔNG AI YÊU CẦU
                </div>
                <div className="my-4 h-px w-full bg-[#00ff41]/25" />
                <div className="flex items-center justify-between font-plex text-[9px] uppercase tracking-[0.25em] text-white/35">
                  <span>thời lượng: 30 giây</span>
                  <span>âm thanh: bật</span>
                </div>
              </motion.div>
            </motion.div>
          )}

          {scene.kind === "leader" && (
            <motion.div
              key="leader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.25 } }}
              className="relative flex items-center justify-center"
            >
              <svg viewBox="0 0 200 200" className="h-48 w-48 sm:h-60 sm:w-60">
                <circle cx="100" cy="100" r="94" fill="none" stroke="#00ff41" strokeWidth="1.5" opacity="0.4" />
                <circle cx="100" cy="100" r="72" fill="none" stroke="#00ff41" strokeWidth="1" opacity="0.22" />
                <circle cx="100" cy="100" r="46" fill="none" stroke="#00ff41" strokeWidth="1" opacity="0.14" />
                <line x1="100" y1="4" x2="100" y2="196" stroke="#00ff41" strokeWidth="1" opacity="0.28" />
                <line x1="4" y1="100" x2="196" y2="100" stroke="#00ff41" strokeWidth="1" opacity="0.28" />
                {/* kim quét một vòng mỗi nhịp — CSS nên luôn mượt */}
                <g className="leader-sweep" style={{ transformOrigin: "100px 100px" }}>
                  <path d="M100 100 L100 6 A94 94 0 0 1 160 28 Z" fill="#00ff41" opacity="0.14" />
                  <line x1="100" y1="100" x2="100" y2="6" stroke="#00ff41" strokeWidth="2" opacity="0.6" />
                </g>
              </svg>
              <span
                key={count}
                className="leader-num absolute font-vt leading-none text-glow-strong"
                style={{ fontSize: "clamp(4.5rem, 24vw, 7.5rem)" }}
              >
                {count}
              </span>
            </motion.div>
          )}

          {scene.kind === "line" && (
            <motion.div
              key={`t${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -12, filter: "blur(6px)", transition: { duration: 0.5 } }}
              className="w-full max-w-[22rem] text-center sm:max-w-2xl"
            >
              {scene.lines.map((l, k) => (
                <motion.span
                  key={k}
                  initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: 0.5 + k * 0.95, duration: 1.5, ease: "easeOut" }}
                  className={`block font-vt leading-[1.25] text-[#eafbea] ${
                    scene.big ? "text-glow-strong" : "text-glow"
                  }`}
                  style={{
                    fontSize: scene.big
                      ? "clamp(2rem, 9vw, 3.6rem)"
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
                initial={{ opacity: 0, scale: 0.86, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{ duration: 1, ease: [0.2, 0.9, 0.3, 1] }}
                className="font-vt leading-none text-glow-strong"
                style={{ fontSize: "clamp(3.6rem, 19vw, 7.5rem)" }}
              >
                {scene.value}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75, duration: 0.8 }}
                className="mx-auto mt-5 max-w-[18rem] text-balance font-plex text-[11px] uppercase leading-relaxed tracking-[0.22em] text-white/50 sm:max-w-sm sm:text-xs"
              >
                {scene.label}
              </motion.div>
            </motion.div>
          )}

          {scene.kind === "title" && (
            <motion.div
              key="title"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
              className="text-center"
            >
              <motion.div
                initial={{ opacity: 0, letterSpacing: "0.6em", filter: "blur(14px)" }}
                animate={{ opacity: 1, letterSpacing: "0.02em", filter: "blur(0px)" }}
                transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
                className="font-vt leading-none text-glow-strong"
                style={{ fontSize: "clamp(2.4rem, 13vw, 5.5rem)" }}
              >
                HÓA ĐƠN
              </motion.div>
              <motion.div
                initial={{ opacity: 0, letterSpacing: "0.6em", filter: "blur(14px)" }}
                animate={{ opacity: 1, letterSpacing: "0.02em", filter: "blur(0px)" }}
                transition={{ delay: 0.35, duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
                className="font-vt leading-none text-glow-strong"
                style={{ fontSize: "clamp(2.4rem, 13vw, 5.5rem)" }}
              >
                VÔ HÌNH
              </motion.div>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1.1, duration: 0.9, ease: "easeOut" }}
                className="mx-auto mt-5 h-px w-40 bg-[#00ff41]/60 sm:w-56"
              />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.8 }}
                className="mt-4 font-plex text-[10px] uppercase tracking-[0.42em] text-[#00ff41]/55"
              >
                một bản kiểm kê
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ---------- PROGRESS LINE ---------- */}
      <div className="absolute inset-x-0 bottom-[10%] z-40 h-[2px] bg-white/10">
        <motion.div
          className="h-full bg-[#00ff41]/70"
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* ---------- THANH ĐIỀU KHIỂN ---------- */}
      <div className="safe-x absolute inset-x-0 bottom-[calc(10%+0.75rem)] z-40 flex items-center justify-between px-3 sm:px-6">
        <button
          onPointerDown={(e) => {
            e.stopPropagation();
            prev();
          }}
          disabled={i === 0}
          className={`flex min-h-11 items-center gap-2 px-3 font-plex text-[10px] uppercase tracking-[0.25em] transition-colors ${
            i === 0 ? "pointer-events-none opacity-20" : "text-white/55 active:text-[#00ff41]"
          }`}
        >
          ◂◂ xem lại
        </button>

        <span className="font-plex text-[9px] uppercase tracking-[0.3em] text-white/25">
          {i < maxSeen ? "có thể tua" : "đang chiếu"}
        </span>

        <div className="flex items-center gap-1">
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              next();
            }}
            disabled={i >= maxSeen}
            className={`flex min-h-11 items-center gap-2 px-3 font-plex text-[10px] uppercase tracking-[0.25em] transition-colors ${
              i >= maxSeen
                ? "pointer-events-none opacity-20"
                : "text-white/55 active:text-[#00ff41]"
            }`}
          >
            tiếp ▸▸
          </button>
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              finish();
            }}
            className="flex min-h-11 items-center px-3 font-plex text-[10px] uppercase tracking-[0.25em] text-white/45 active:text-[#00ff41]"
          >
            bỏ qua ✕
          </button>
        </div>
      </div>

      {/* ---------- CUT TO WHITE ---------- */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-0 z-50 bg-[#d9ffe4]"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
