import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CornerDownLeft, ScanBarcode } from "lucide-react";
import { fmt, type LineItem, type RelConfig } from "../lib/data";
import { keyTick, payBeep, scanBeep } from "../lib/sound";
import Odometer from "./Odometer";

interface Props {
  rel: RelConfig;
  onDone: (raws: number[]) => void;
}

const slide = {
  enter: { x: 90, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -90, opacity: 0 },
};

export default function Scanner({ rel, onDone }: Props) {
  const qs = rel.questions;
  const [raws, setRaws] = useState<number[]>(() => qs.map((q) => q.def));
  const [idx, setIdx] = useState(0);
  const [items, setItems] = useState<LineItem[]>([]);
  const [phase, setPhase] = useState<"ask" | "pay">("ask");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const q = qs[Math.min(idx, qs.length - 1)];
  const raw = raws[idx] ?? 0;
  const totalQty = useMemo(() => items.reduce((s, it) => s + it.qty, 0), [items]);

  useEffect(() => {
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
    scanBeep();
    setItems((arr) => [...arr, item]);
    if (idx === qs.length - 1) {
      setTimeout(() => {
        setPhase("pay");
        setBusy(false);
      }, 420);
    } else {
      setTimeout(() => {
        setIdx(idx + 1);
        setBusy(false);
      }, 320);
    }
  };

  const pay = () => {
    if (busy) return;
    setBusy(true);
    payBeep();
    setTimeout(() => onDone(raws), 650);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (phaseRef.current === "ask") commit();
      else pay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, raws]);

  const setRaw = (v: number) => {
    keyTick();
    setRaws((rs) => rs.map((r, i) => (i === idx ? v : r)));
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.3em] text-dim-green sm:text-xs">
        <span>{"// BƯỚC 02 — ĐANG QUÉT MẶT HÀNG VÔ HÌNH"}</span>
        <span>
          khách: <span className="text-glow">[{rel.shortName}]</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* ================= LEFT: QUESTION / PAY ================= */}
        <div className="lg:col-span-3">
          <div className="pos-panel relative flex min-h-[420px] flex-col p-6 sm:p-8">
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
                  <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[#00ff41]/40">
                    mã hàng: {q.id.toUpperCase()}-VH — khối lượng: tính bằng cả đời người
                  </div>
                  <h2 className="font-vt text-3xl leading-tight text-glow sm:text-5xl">
                    {q.prompt}
                  </h2>

                  {/* INPUT ZONE */}
                  <div className="mt-8">
                    {q.input === "number" ? (
                      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
                        <input
                          ref={inputRef}
                          type="number"
                          inputMode="numeric"
                          min={q.min}
                          max={q.max}
                          value={Number.isFinite(raw) ? String(raw) : ""}
                          onChange={(e) =>
                            setRaw(e.target.value === "" ? 0 : Number(e.target.value))
                          }
                          className="pos-input w-48 max-w-full text-center font-vt text-6xl leading-none sm:text-7xl"
                        />
                        <span className="pb-2 font-vt text-2xl text-[#00ff41]/60">
                          {q.unitLabel}
                        </span>
                        <span className="pb-2 text-[10px] uppercase tracking-[0.2em] text-white/30">
                          (từ {q.min} đến {fmt(q.max)})
                        </span>
                      </div>
                    ) : (
                      <div>
                        <div className="mb-4 flex items-end gap-4">
                          <span className="font-vt text-6xl leading-none text-glow sm:text-7xl">
                            {String(raw).padStart(2, "0")}
                          </span>
                          <span className="pb-2 font-vt text-2xl text-[#00ff41]/60">
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
                          className="pos-range"
                        />
                        <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.2em] text-white/30">
                          <span>ít thôi (chắc?)</span>
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
                      className="pos-btn group flex w-full items-center justify-center gap-3 px-6 py-4 text-3xl sm:text-4xl"
                    >
                      <CornerDownLeft className="h-6 w-6" strokeWidth={2.5} />
                      QUÉT VÀO PHIẾU
                    </button>
                    <div className="mt-2 text-center text-[10px] uppercase tracking-[0.25em] text-white/25">
                      hoặc nhấn Enter
                    </div>
                  </div>
                </motion.div>
              ) : (
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
                  <div className="mt-4 font-vt text-[6rem] leading-none text-glow-strong sm:text-[8rem]">
                    <Odometer value={totalQty} />
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.3em] text-white/40">
                    đơn vị công sức chưa thanh toán
                  </div>

                  <button
                    onClick={pay}
                    disabled={busy}
                    className="pos-btn pos-btn--fill mt-10 w-full px-6 py-6 text-5xl sm:text-6xl"
                  >
                    [ THANH TOÁN ]
                  </button>
                  <div className="mt-3 text-[10px] uppercase tracking-[0.25em] text-dim-green">
                    máy pos này không nhận tiền — cứ bấm đi rồi hiểu
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ================= RIGHT: LIVE PREVIEW ================= */}
        <div className="lg:col-span-2">
          <div className="pos-panel dash-box relative flex min-h-[420px] flex-col p-5 sm:p-6">
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
                    {"<< chưa có mặt hàng — máy đang chờ >>"}
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
                      <span>{it.note ?? "giá niêm yết: không niêm yết được"}</span>
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
              <div className="mt-1 font-vt text-5xl leading-none text-glow sm:text-6xl">
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
