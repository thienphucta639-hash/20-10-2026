import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CornerDownLeft, ScanBarcode } from "lucide-react";
import { buildItems, fmt, type LineItem, type RelConfig } from "../lib/data";
import { bedFadeDown, cashRegister, chipTap, heartbeat, reflectChime, rulerDown, rulerUp, scanLine } from "../lib/sound";
import Odometer from "./Odometer";

interface Props {
  rel: RelConfig;
  onDone: (raws: number[]) => void;
  onBack: () => void;
  startAt?: number | null;
  initialRaws?: number[];
}

const slide = {
  enter: { x: 90, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -90, opacity: 0 },
};

export default function Scanner({ rel, onDone, onBack, startAt, initialRaws }: Props) {
  const qs = rel.questions;
  const [raws, setRaws] = useState<number[]>(
    () => initialRaws ?? qs.map((q) => q.def)
  );
  const [idx, setIdx] = useState(startAt ?? 0);
  const [items, setItems] = useState<LineItem[]>(() =>
    startAt !== null && startAt !== undefined && initialRaws
      ? buildItems(rel, initialRaws).slice(0, startAt)
      : []
  );
  const [phase, setPhase] = useState<"ask" | "reflect" | "pay" | "settle">("ask");
  const [lastItem, setLastItem] = useState<LineItem | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const q = qs[Math.min(idx, qs.length - 1)];
  const raw = raws[idx] ?? 0;
  const totalQty = useMemo(() => items.reduce((s, it) => s + it.qty, 0), [items]);

  useEffect(() => {
    // Chỉ tự động focus trên máy có chuột. Trên điện thoại việc này
    // bật bàn phím che mất màn hình mỗi câu hỏi — rất khó chịu.
    const finePointer =
      typeof window !== "undefined" &&
      window.matchMedia?.("(pointer: fine)").matches;
    if (!finePointer) return;
    const t = setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
      inputRef.current?.select?.();
    }, 420);
    return () => clearTimeout(t);
  }, [idx]);

  const clamp = (v: number) => Math.min(q.max, Math.max(q.min, Number.isFinite(v) ? v : q.min));

  const commit = () => {
    if (busy) return;
    setBusy(true);
    const v = clamp(raws[idx]);
    const nextRaws = raws.map((r, i) => (i === idx ? v : r));
    setRaws(nextRaws);
    const item: LineItem = {
      name: q.itemName,
      qty: Math.round(q.compute(v, nextRaws)),
      unit: q.qtyUnit,
      note: q.note?.(v, nextRaws),
    };
    scanLine();
    setItems((arr) => [...arr, item]);
    setLastItem(item);

    // nhịp lặng: để con số vừa hiện ra kịp thấm
    setTimeout(() => { reflectChime(); setPhase("reflect"); bedFadeDown(0.01, 1.8); }, 420);
    setTimeout(() => {
      if (startAt !== null && startAt !== undefined) {
        onDone(nextRaws);
        return;
      }
      if (idx === qs.length - 1) {
        setPhase("pay");
      } else {
        setIdx(idx + 1);
        setPhase("ask");
      }
      setBusy(false);
    }, 5200);
  };

  /** lùi lại câu trước — hoặc thoát ra chọn lại người nếu đang ở câu 1 */
  const goBack = () => {
    if (busy) return;
    rulerDown();
    if (phase === "pay") {
      setPhase("ask");
      setItems((arr) => arr.slice(0, -1));
      setIdx(qs.length - 1);
      return;
    }
    if (idx === 0) {
      onBack();
      return;
    }
    setItems((arr) => arr.slice(0, -1));
    setIdx(idx - 1);
  };

  const pay = () => {
    if (busy) return;
    setBusy(true);
    cashRegister();
    heartbeat();
    setTimeout(heartbeat, 2400);
    setTimeout(heartbeat, 4800);
    setPhase("settle");
    // nhịp lặng có chủ đích trước khi cuộn giấy chạy
    setTimeout(() => onDone(raws), 12000);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Backspace") {
        if (phaseRef.current === "ask" || phaseRef.current === "pay") {
          e.preventDefault();
          goBack();
        }
        return;
      }
      if (e.key !== "Enter") return;
      if (phaseRef.current === "settle" || phaseRef.current === "reflect") return;
      e.preventDefault();
      if (phaseRef.current === "ask") commit();
      else pay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, raws]);

  const setRaw = (v: number) => {
    setRaws((rs) => rs.map((r, i) => (i === idx ? v : r)));
  };
  /** chọn một mức — cảm giác "chốt" */
  const pickRaw = (v: number) => {
    chipTap();
    setRaw(v);
  };
  /** bấm tăng/giảm — cảm giác "gõ phím" */
  const stepRaw = (v: number) => {
    const cur = Number.isFinite(raws[idx]) ? (raws[idx] as number) : 0;
    if (v > cur) rulerUp();
    else rulerDown();
    setRaw(v);
  };

  return (
    <div className="safe-x safe-b mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.3em] text-dim-green sm:text-xs">
        <button
          onClick={goBack}
          disabled={busy}
          className="flex min-h-9 items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/45 transition-colors active:text-[#00ff41] disabled:opacity-30"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
          {idx === 0 ? "đổi người" : "câu trước"}
        </button>
        <span className="hidden sm:inline">{`BƯỚC 02 · ${rel.pronounUp}`}</span>
        <span>
          khách: <span className="text-glow">[{rel.shortName}]</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* ================= LEFT: QUESTION / PAY ================= */}
        <div className="lg:col-span-3">
          <div className="pos-panel relative flex flex-col p-5 sm:min-h-[420px] sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-glow">
                <ScanBarcode className="h-5 w-5" strokeWidth={2.4} />
                <span className="font-vt text-2xl tracking-wide">
                  {phase === "ask"
                    ? `QUÉT ${String(idx + 1).padStart(2, "0")}/${String(qs.length).padStart(2, "0")}`
                    : "TỔNG KẾT"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-vt text-xl">
                {qs.map((_, i) => (
                  <span
                    key={i}
                    className={
                      i < items.length
                        ? "text-glow"
                        : i === idx && phase === "ask"
                          ? "blink text-glow"
                          : "text-white/15"
                    }
                  >
                    ■
                  </span>
                ))}
              </div>
            </div>
            <div className="cut-line my-5" />

            <AnimatePresence mode="wait">
              {phase === "ask" ? (
                <motion.div
                  key={`q-${idx}`}
                  variants={slide}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 240, damping: 26 }}
                  className="flex flex-1 flex-col"
                >
                  <h2 className="text-balance font-vt text-[clamp(1.6rem,6.4vw,2.9rem)] leading-tight text-glow">
                    {q.prompt}
                  </h2>

                  {/* INPUT ZONE */}
                  <div className="mt-8">
                    {q.input === "number" ? (
                      <div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            aria-label="giảm"
                            className="stepper shrink-0"
                            onClick={() => stepRaw(Math.max(q.min, (Number(raw) || 0) - 1))}
                          >
                            −
                          </button>
                          <input
                            ref={inputRef}
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            min={q.min}
                            max={q.max}
                            value={Number.isFinite(raw) ? String(raw) : ""}
                            onChange={(e) =>
                              setRaw(e.target.value === "" ? 0 : Number(e.target.value))
                            }
                            className="pos-input min-w-0 flex-1 text-center font-vt text-5xl leading-none sm:text-6xl"
                          />
                          <button
                            type="button"
                            aria-label="tăng"
                            className="stepper shrink-0"
                            onClick={() => stepRaw(Math.min(q.max, (Number(raw) || 0) + 1))}
                          >
                            +
                          </button>
                        </div>
                        <div className="mt-3 text-center font-vt text-xl text-[#00ff41]/60">
                          {q.unitLabel}
                        </div>
                        <div className="mt-1 text-center text-[10px] uppercase tracking-[0.2em] text-white/30">
                          chạm số để gõ — hoặc bấm − / +
                        </div>
                      </div>
                    ) : q.buckets ? (
                      <div>
                        <div className="min-h-[3.2rem]">
                          <span className="block font-vt text-3xl leading-tight text-glow sm:text-4xl">
                            “{q.buckets[Math.min(raw, q.buckets.length - 1)].label}”
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {q.buckets.map((b, k) => (
                            <button
                              key={k}
                              type="button"
                              onClick={() => pickRaw(k)}
                              className={`chip ${
                                Math.min(raw, q.buckets!.length - 1) === k ? "chip--on" : ""
                              }`}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>
                        <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/30">
                          chạm chọn mức gần đúng nhất
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="mb-3 flex items-end gap-4">
                          <span className="font-vt text-6xl leading-none text-glow sm:text-7xl">
                            {String(raw).padStart(2, "0")}
                          </span>
                          <span className="pb-2 font-vt text-xl text-[#00ff41]/60 sm:text-2xl">
                            {q.unitLabel}
                          </span>
                        </div>
                        <input
                          ref={inputRef}
                          type="range"
                          min={q.min}
                          max={q.max}
                          step={q.step}
                          value={raw}
                          onChange={(e) => setRaw(Number(e.target.value))}
                          onPointerUp={() => chipTap()}
                          className="pos-range mt-2"
                        />
                        <div className="mt-3 flex justify-between text-[10px] uppercase tracking-[0.15em] text-white/30">
                          <span>ít thôi</span>
                          <span>thành thật đi</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* LIVE FORMULA */}
                  <div className="mt-6 border border-[#00ff41]/15 bg-black/40 px-4 py-3">
                    <div className="font-plex text-xs leading-relaxed text-[#00ff41]/85 sm:text-sm">
                      <span className="mr-2 text-glow">▸</span>
                      <span key={String(raw)} className="pop-scan inline-block">
                        {q.formula(raw, raws)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto pt-8">
                    <button
                      onClick={commit}
                      disabled={busy}
                      className="pos-btn group flex min-h-[3.5rem] w-full items-center justify-center gap-3 px-5 py-4 text-[clamp(1.5rem,6vw,2.25rem)]"
                    >
                      <CornerDownLeft className="h-6 w-6" strokeWidth={2.5} />
                      QUÉT VÀO PHIẾU
                    </button>
                    <div className="mt-2 text-center text-[10px] uppercase tracking-[0.25em] text-white/25">
                      hoặc nhấn phím Enter
                    </div>
                  </div>
                </motion.div>
              ) : phase === "reflect" ? (
                <motion.div
                  key={`r-${idx}`}
                  initial={{ opacity: 0, filter: "blur(10px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(8px)", transition: { duration: 0.6 } }}
                  transition={{ duration: 1 }}
                  className="flex flex-1 flex-col items-center justify-center py-10 text-center"
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="text-[10px] uppercase tracking-[0.35em] text-dim-green"
                  >
                    đã ghi vào hóa đơn
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.85, filter: "blur(12px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    transition={{ delay: 0.45, duration: 1.2, ease: [0.2, 0.9, 0.3, 1] }}
                    className="mt-5 font-vt leading-none text-glow-strong"
                    style={{ fontSize: "clamp(3rem, 15vw, 5.5rem)" }}
                  >
                    {fmt(lastItem?.qty ?? 0)}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1, duration: 0.9 }}
                    className="mt-3 max-w-xs text-balance font-plex text-[12px] uppercase tracking-[0.18em] text-white/70"
                  >
                    {lastItem?.unit} {lastItem?.name.toLowerCase()}
                  </motion.div>

                  {lastItem?.note && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 2, duration: 1 }}
                      className="mt-6 max-w-[17rem] text-balance font-plex text-[11px] leading-relaxed text-[#00ff41]/60"
                    >
                      {lastItem.note}
                    </motion.div>
                  )}
                </motion.div>
              ) : phase === "pay" ? (
                <motion.div
                  key="pay"
                  variants={slide}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 240, damping: 26 }}
                  className="flex flex-1 flex-col items-center justify-center text-center"
                >
                  <div className="text-[10px] uppercase tracking-[0.35em] text-dim-green">
                    đã quét đủ {qs.length}/{qs.length} mặt hàng vô hình
                  </div>
                  <div className="mt-4 font-vt text-[3.3rem] leading-none text-glow-strong sm:text-[6.5rem]">
                    <Odometer value={totalQty} />
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.3em] text-white/40">
                    đơn vị công sức chưa thanh toán
                  </div>

                  <button
                    onClick={pay}
                    disabled={busy}
                    className="pos-btn pos-btn--fill mt-10 w-full px-4 py-5 text-[clamp(1.7rem,7.5vw,3.4rem)] sm:py-6"
                  >
                    [ THANH TOÁN ]
                  </button>
                  <div className="mt-3 text-[10px] uppercase tracking-[0.25em] text-dim-green">
                    hóa đơn này không nhận tiền — bấm để xem vì sao
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="settle"
                  initial={{ opacity: 0, filter: "blur(8px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                  className="flex flex-1 flex-col items-center justify-center text-center"
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                    className="text-[10px] uppercase tracking-[0.35em] text-dim-green"
                  >
                    tổng kết sổ sách
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, filter: "blur(12px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    transition={{ delay: 0.6, duration: 1.6, ease: [0.2, 0.9, 0.3, 1] }}
                    className="mt-5 font-vt leading-none text-glow-strong"
                    style={{ fontSize: "clamp(2.8rem, 14vw, 5rem)" }}
                  >
                    {fmt(totalQty)}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.8, duration: 1 }}
                    className="mt-2 text-[11px] uppercase tracking-[0.25em] text-white/45"
                  >
                    đơn vị công sức — chỉ từ 5 câu hỏi
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 4, duration: 1.4 }}
                    className="mx-auto mt-10 h-px w-20 bg-[#00ff41]/40"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 14, filter: "blur(10px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ delay: 5, duration: 1.8, ease: "easeOut" }}
                    className="mt-8 max-w-sm text-balance font-vt text-[clamp(1.6rem,6.6vw,2.9rem)] leading-tight text-glow-strong sm:max-w-md">
                    {rel.settleLine}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 8, duration: 1.2 }}
                    className="blink mt-10 text-[10px] uppercase tracking-[0.3em] text-white/30"
                  >
                    máy đang nạp cuộn giấy…
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ================= RIGHT: LIVE PREVIEW ================= */}
        <div className="lg:col-span-2">
          <div className="pos-panel dash-box relative flex min-h-[280px] flex-col p-5 sm:p-6 lg:min-h-[420px]">
            <div className="flex items-center justify-between">
              <span className="font-vt text-2xl tracking-wide text-glow">PHIẾU TẠM TÍNH</span>
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/30">
                {rel.fullName}
              </span>
            </div>
            <div className="cut-line my-4" />

            <div className="flex-1 space-y-3 overflow-hidden">
              {items.length === 0 ? (
                <div className="flex h-full min-h-40 items-center justify-center">
                  <span className="blink text-[11px] uppercase tracking-[0.3em] text-white/25">
                    "từng câu trả lời sẽ hiện ra ở đây"
                  </span>
                </div>
              ) : (
                items.map((it, i) => (
                  <div key={i} className="pop-scan">
                    <div className="flex items-end gap-2">
                      <span className="font-plex text-[11px] font-semibold uppercase tracking-[0.12em] text-white/75">
                        {it.name}
                      </span>
                      <span className="dotted-leader-green" />
                      <span className="font-vt text-2xl leading-none text-glow">
                        {fmt(it.qty)}
                        <span className="ml-1 text-base text-[#00ff41]/50">{it.unit}</span>
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between font-plex text-[10px] text-white/30">
                      <span>{it.note ?? "chưa từng được trả"}</span>
                      <span className="text-[#00ff41]/60">∞</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="cut-line my-4" />
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-dim-green">
                tổng hạng mục chưa thanh toán
              </div>
              <div className="mt-1 font-vt text-[2.6rem] leading-none text-glow sm:text-6xl">
                <Odometer value={totalQty} />
              </div>
              <div className="mt-2 flex items-end justify-between font-plex text-[11px] text-white/40">
                <span>THÀNH TIỀN</span>
                <span className="font-vt text-2xl text-glow">∞ VND</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
