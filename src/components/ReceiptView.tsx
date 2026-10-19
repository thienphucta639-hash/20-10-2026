import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Check, Link2, RotateCcw } from "lucide-react";
import html2canvas from "html2canvas";
import { buildItems, fmt, prand, type RelConfig } from "../lib/data";
import { cutterSnip, printChatter } from "../lib/sound";
import { encodeState } from "../lib/share";

interface Props {
  rel: RelConfig;
  raws: number[];
  fromShare: boolean;
  onRestart: () => void;
}

const PRINT_MS = 9000;

const Div = ({ ch = "─" }: { ch?: string }) => (
  <div className="overflow-hidden whitespace-nowrap opacity-70" aria-hidden>
    {ch.repeat(60)}
  </div>
);

export default function ReceiptView({ rel, raws, fromShare, onRestart }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"printing" | "done">("printing");
  const [prog, setProg] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const items = buildItems(rel, raws);
  const totalQty = items.reduce((s, it) => s + it.qty, 0);
  const years = Math.max(1, Math.round(raws[0] || 1));
  const ledgerN = Math.min(years, 18);
  const mkLedger = (qty: number, seed: number) =>
    Array.from({ length: ledgerN }, (_, i) => ({
      label: `KỲ ${String(i + 1).padStart(2, "0")}`,
      val: Math.max(1, Math.round((qty / years) * (0.86 + prand(i * 13 + seed) * 0.28))),
    }));
  const ledgerA = mkLedger(items[0].qty, 7);
  const ledgerB = mkLedger(items[1].qty, 29);

  const REASONS = [
    "nguyên liệu: tự nguyện 100%",
    "công thức: bí mật nhà, không sao chép",
    "làm lúc bạn còn chưa thức dậy",
    "lặp lại mỗi ngày, không phàn nàn",
    "sản xuất độc quyền tại gia",
  ];
  const billNo = `2010-${String(Math.floor(prand(years * 91) * 8999) + 1000)}`;

  useEffect(() => {
    try {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search + `#d=${encodeState({ r: rel.key, a: raws })}`
      );
    } catch {
      /* noop */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await document.fonts.ready;
      } catch {
        /* noop */
      }
      if (!alive) return;
      await new Promise((r) => setTimeout(r, 350));
      if (!alive) return;
      const el = wrapRef.current;
      const cap = captureRef.current;
      if (!el || !cap) return;
      const ph = cap.offsetHeight;
      const topAbs = el.getBoundingClientRect().top + window.scrollY;
      printChatter(PRINT_MS);

      const anim = el.animate([{ height: "0px" }, { height: `${ph}px` }], {
        duration: PRINT_MS,
        easing: "steps(140)",
        fill: "forwards",
      });

      const t0 = performance.now();
      let lastP = -1;
      const raf = () => {
        if (!alive) return;
        const p = Math.min(1, (performance.now() - t0) / PRINT_MS);
        if (Math.floor(p * 100) !== lastP) {
          lastP = Math.floor(p * 100);
          setProg(lastP);
        }
        const y = topAbs + ph * p - window.innerHeight * 0.78;
        window.scrollTo({ top: Math.max(0, y), behavior: "instant" as ScrollBehavior });
        if (p < 1) requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);

      anim.onfinish = () => {
        if (!alive) return;
        el.style.height = "auto";
        cutterSnip();
        setPhase("done");
      };
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toast = (t: string) => {
    setMsg(t);
    setTimeout(() => setMsg(null), 2600);
  };

  const capture = async () => {
    if (busy || !captureRef.current) return;
    setBusy(true);
    toast("ĐANG CHỤP HÓA ĐƠN...");
    try {
      const el = captureRef.current;
      const scale = Math.max(1, Math.min(2.5, Math.floor((16384 / Math.max(el.offsetHeight, el.offsetWidth)) * 10) / 10));
      const canvas = await html2canvas(el, {
        backgroundColor: "#0a0a0a",
        scale,
        logging: false,
      });
      const a = document.createElement("a");
      a.download = `hoa-don-vo-hinh-${rel.key}-2010.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
      toast("ĐÃ LƯU PNG — ĐĂNG STORY ĐƯỢC LUÔN");
    } catch {
      toast("MÁY ẢNH KẸT GIẤY — THỬ LẠI");
    }
    setBusy(false);
  };

  const copyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast("ĐÃ SAO CHÉP LINK HÓA ĐƠN");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      toast("ĐÃ SAO CHÉP LINK HÓA ĐƠN");
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-3 pb-24 pt-8 sm:pt-10">
      <div className="mb-2 text-center text-[10px] uppercase tracking-[0.4em] text-dim-green sm:text-xs">
        {"// BƯỚC 03 — XUẤT HÓA ĐƠN"}
      </div>
      <h1 className="text-center font-vt text-5xl leading-none text-glow-strong sm:text-6xl">
        {phase === "printing" ? (
          <>
            MÁY ĐANG IN<span className="blink">…</span>
          </>
        ) : (
          "IN XONG."
        )}
      </h1>
      <div className="mt-2 text-center text-[10px] uppercase tracking-[0.3em] text-white/35">
        {phase === "printing"
          ? "đừng tắt máy — hóa đơn của cô ấy dài lắm"
          : "xé hóa đơn. rồi hành động đi."}
      </div>

      {fromShare && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="pos-panel dash-box mx-auto mt-6 max-w-md px-4 py-3 text-center"
        >
          <div className="font-vt text-2xl text-glow">HÓA ĐƠN ĐƯỢC GỬI CHO BẠN</div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/40">
            ai đó đã ngồi bấm từng con số này — 20/10
          </div>
        </motion.div>
      )}

      {/* ================= PRINTER + PAPER ================= */}
      <div className="mx-auto mt-6 w-full max-w-[440px]">
        <div className="slot-bar flex items-center gap-3 rounded-t-md px-4 py-3">
          <div className="slot-screw" />
          <div className="slot-gap h-2.5 flex-1 rounded-sm" />
          <div
            className={`font-vt text-lg leading-none ${
              phase === "printing" ? "blink text-glow" : "text-[#00ff41]/50"
            }`}
          >
            {phase === "printing" ? `IN ${prog}%` : "READY"}
          </div>
          <div className="slot-screw" />
        </div>
        {phase === "printing" && <div className="print-head mx-3" />}

        <div ref={wrapRef} className="relative overflow-hidden" style={{ height: 0 }}>
          <div ref={captureRef} className="bg-[#0a0a0a]">
            <div className="paper paper-ink px-6 py-10 font-plex text-[13.5px] leading-[1.95] sm:px-8">
              {/* ---------- HEADER ---------- */}
              <div className="text-center">
                <div className="font-vt text-[2.6rem] leading-none tracking-wide">
                  HÓA ĐƠN VÔ HÌNH
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.28em] paper-ink-faded">
                  siêu thị những thứ không ai trả tiền
                </div>
                <div className="mt-2 text-[11px] uppercase">
                  đ/c: trong lòng bạn — mọi tỉnh thành
                </div>
                <div className="text-[11px] uppercase">mst: vh-201025 • hotline: 1900-mẹ</div>
              </div>

              <div className="my-3">
                <Div />
              </div>
              <div className="flex justify-between text-[11px]">
                <span>20/10/2025</span>
                <span>20:10</span>
                <span>HĐ #{billNo}</span>
              </div>
              <div className="my-3">
                <Div ch="═" />
              </div>

              <div className="space-y-0.5 uppercase">
                <div>
                  khách hàng: <span className="font-bold">{rel.fullName}</span>
                </div>
                <div>thu ngân: lương tâm của bạn</div>
                <div className="text-[10px] paper-ink-faded">ghi chú: {rel.tagline}</div>
              </div>

              <div className="my-3">
                <Div />
              </div>

              {/* ---------- ITEMS ---------- */}
              <div className="space-y-3">
                {items.map((it, i) => (
                  <div key={i}>
                    <div className="flex items-end uppercase">
                      <span>
                        {String(i + 1).padStart(2, "0")}. {it.name}
                      </span>
                    </div>
                    <div className="flex items-end">
                      <span className="pl-4">
                        {fmt(it.qty)} {it.unit}
                      </span>
                      <span className="dotted-leader" />
                      <span className="font-bold">∞</span>
                    </div>
                    {it.note && (
                      <div className="pl-4 text-[10px] paper-ink-faded">▸ {it.note}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* ---------- LEDGERS ---------- */}
              <div className="my-3">
                <Div />
              </div>
              {(
                [
                  ["sổ cái phần I", items[0], ledgerA],
                  ["sổ cái phần II", items[1], ledgerB],
                ] as const
              ).map(([title, it, rows], li) => (
                <div key={li} className={li === 1 ? "mt-4" : ""}>
                  <div className="text-[10px] uppercase paper-ink-faded">
                    {title} — theo dõi: {it.name.toLowerCase()} ({ledgerN}/{years} kỳ gần nhất)
                  </div>
                  <div className="mt-1 space-y-[3px] text-[11px]">
                    {rows.map((r, i) => (
                      <div key={i} className="flex items-end">
                        <span>{r.label}</span>
                        <span className="dotted-leader opacity-60" />
                        <span>
                          {fmt(r.val)} {it.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {years > ledgerN && (
                <div className="mt-2 pt-1 text-center text-[10px] uppercase paper-ink-faded">
                  … còn {fmt(years - ledgerN)} kỳ nữa đang xếp hàng chờ ra giấy …
                </div>
              )}
              <div className="mt-1 text-center text-[10px] uppercase paper-ink-faded">
                tiếp tục ở cuộn giấy sau. kho còn {fmt(totalQty)} cuộn nữa.
              </div>

              {/* ---------- REASONS ---------- */}
              <div className="mt-4">
                <Div />
              </div>
              <div className="mt-2 text-[10px] uppercase tracking-[0.15em] paper-ink-faded">
                phụ lục a — lý do không thể định giá:
              </div>
              <div className="mt-1 space-y-1.5">
                {items.map((it, i) => (
                  <div key={i}>
                    <div className="text-[11px] uppercase">
                      {String(i + 1).padStart(2, "0")}. {it.name}
                    </div>
                    <div className="pl-4 text-[10px] paper-ink-faded">
                      ▸ {REASONS[i % REASONS.length]}
                    </div>
                  </div>
                ))}
              </div>

              {/* ---------- TOTALS ---------- */}
              <div className="my-3">
                <Div ch="═" />
              </div>
              <div className="space-y-1 uppercase">
                <div className="flex items-end">
                  <span>tạm tính ({fmt(totalQty)} đ.vị vô hình)</span>
                  <span className="dotted-leader" />
                  <span className="font-bold">∞</span>
                </div>
                <div className="flex items-end">
                  <span>thuế tình cảm (đã gồm)</span>
                  <span className="dotted-leader" />
                  <span className="font-bold">∞</span>
                </div>
                <div className="flex items-end">
                  <span>phí tổn thương phát sinh</span>
                  <span className="dotted-leader" />
                  <span className="font-bold">∞</span>
                </div>
                <div className="flex items-end paper-ink-faded">
                  <span>giảm giá khách quen</span>
                  <span className="dotted-leader" />
                  <span>-0đ</span>
                </div>
              </div>

              <div className="my-3">
                <Div ch="═" />
              </div>
              <div className="py-1 text-center">
                <div className="text-[10px] uppercase tracking-[0.5em]">tổng cộng</div>
                <div className="mt-1 font-vt text-[4.2rem] leading-none">VÔ GIÁ</div>
              </div>
              <div className="my-3">
                <Div ch="═" />
              </div>

              {/* ---------- WARNING ---------- */}
              <div className="border-2 border-[#1c1c12]/80 px-4 py-4 text-center uppercase">
                <div className="font-vt text-3xl leading-none">( ! ) không thể thanh toán</div>
                <div className="mt-2 text-[11px] leading-relaxed">
                  nhưng có thể trả góp bằng sự quan tâm.
                  <br />
                  kể từ hôm nay. không lãi. không kỳ hạn.
                </div>
              </div>

              <div className="mt-4 uppercase">
                <div className="text-[10px] tracking-[0.2em] paper-ink-faded">
                  lịch trả góp gợi ý — tự đánh dấu:
                </div>
                <div className="mt-1 space-y-1 text-[11.5px]">
                  {rel.installments.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <span>[&nbsp;&nbsp;]</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ---------- COUPON ---------- */}
              <div className="mt-5 text-center text-[10px] uppercase tracking-[0.3em] paper-ink-faded">
                - - - - - - - - xé dọc đường này - - - - - - - -
              </div>
              <div className="mt-2 border-2 border-dashed border-[#1c1c12]/60 px-4 py-4 text-center uppercase">
                <div className="font-vt text-3xl leading-none">phiếu bảo hành trọn đời</div>
                <div className="mt-2 text-[10.5px] leading-relaxed">
                  áp dụng: mỗi khi bạn chịu quay về thăm.
                  <br />
                  không cần giữ hóa đơn gốc —<br />
                  cô ấy nhớ hết rồi.
                </div>
              </div>

              {/* ---------- BARCODE + FOOTER ---------- */}
              <div className="my-5">
                <Div />
              </div>
              <div className="barcode opacity-90" />
              <div className="mt-1 text-center font-vt text-xl tracking-[0.4em]">
                *{billNo}*
              </div>

              <div className="mt-5 text-center uppercase leading-relaxed">
                <div className="font-bold">cảm ơn quý khách.</div>
                <div>hẹn gặp lại mỗi ngày,</div>
                <div className="font-bold">không chỉ 20/10.</div>
              </div>

              <div className="my-3">
                <Div ch="═" />
              </div>
              <div className="text-center text-[9px] uppercase tracking-[0.25em] paper-ink-faded">
                powered by hđvh pos v20.10 — in trên giấy nhiệt,
                <br />
                giữ được cả đời
              </div>
            </div>
            <div className="torn-bottom" />
          </div>
        </div>
      </div>

      {/* ================= SHARE PANEL ================= */}
      <AnimatePresence>
        {phase === "done" && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, type: "spring", stiffness: 200, damping: 22 }}
            className="mx-auto mt-10 w-full max-w-[440px]"
          >
            <div className="pos-panel p-5">
              <div className="mb-4 text-center font-vt text-3xl text-glow">
                GỬI HÓA ĐƠN NÀY ĐI ĐÂU?
              </div>
              <div className="grid gap-3">
                <button
                  onClick={capture}
                  disabled={busy}
                  className="pos-btn pos-btn--fill flex items-center justify-center gap-3 px-4 py-4 text-2xl"
                >
                  <Camera className="h-5 w-5" strokeWidth={2.4} />
                  CHỤP HÓA ĐƠN (PNG DỌC — VỪA STORY)
                </button>
                <button
                  onClick={copyLink}
                  className="pos-btn flex items-center justify-center gap-3 px-4 py-4 text-2xl"
                >
                  <Link2 className="h-5 w-5" strokeWidth={2.4} />
                  CHIA SẺ LINK HÓA ĐƠN
                </button>
                <button
                  onClick={onRestart}
                  className="pos-btn flex items-center justify-center gap-3 px-4 py-3 text-2xl"
                >
                  <RotateCcw className="h-5 w-5" strokeWidth={2.4} />
                  {fromShare ? "TÍNH HÓA ĐƠN CHO NGƯỜI CỦA MÌNH" : "TÍNH HÓA ĐƠN MỚI"}
                </button>
              </div>
              <div className="mt-3 flex h-5 items-center justify-center text-[11px] uppercase tracking-[0.25em] text-glow">
                {msg && (
                  <span className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5" />
                    {msg}
                  </span>
                )}
              </div>
            </div>

            {/* ---------- CLOSING QUOTE ---------- */}
            <div className="mt-16 text-center">
              <div className="font-vt text-4xl leading-tight text-glow sm:text-5xl">
                HÓA ĐƠN NÀY DÀI HƠN BẠN NGHĨ.
                <br />
                NHƯNG CÔ ẤY CHƯA BAO GIỜ
                <br />
                ĐÒI BẠN TRẢ.
              </div>
              <div className="mt-6 text-[10px] uppercase tracking-[0.4em] text-dim-green">
                — 20 tháng 10 · ngày phụ nữ việt nam —
              </div>
              <div className="mt-2 text-[10px] uppercase tracking-[0.25em] text-white/25">
                in trên giấy nhiệt · giữ được vĩnh viễn
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
