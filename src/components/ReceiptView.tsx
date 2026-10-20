import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Check, Film, Link2, MessageCircle, RotateCcw, Share2 } from "lucide-react";
import html2canvas from "html2canvas";
import { buildItems, fmt, YEAR, type RelConfig } from "../lib/data";
import { chipTap, cutterSnip, filmCut, lockClick, printChatter, rubberStamp, shutterClick, stepStamp } from "../lib/sound";
import { encodeState } from "../lib/share";
import { loadTodos, toggleTodo } from "../lib/storage";

interface Props {
  rel: RelConfig;
  raws: number[];
  fromShare: boolean;
  onRestart: () => void;
  onShowOutro: () => void;
  onEdit: (i: number) => void;
}

const Div = ({ ch = "─" }: { ch?: string }) => (
  <div className="overflow-hidden whitespace-nowrap opacity-70" aria-hidden>
    {ch.repeat(60)}
  </div>
);

const heroWrap = {
  hidden: {},
  show: { transition: { staggerChildren: 0.34, delayChildren: 0.6 } },
};
const heroItem = {
  hidden: { opacity: 0, y: 28, filter: "blur(5px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring" as const, stiffness: 90, damping: 16 },
  },
};

export default function ReceiptView({ rel, raws, fromShare, onRestart, onShowOutro, onEdit }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"printing" | "done">("printing");
  const [prog, setProg] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [todos, setTodos] = useState<Record<string, boolean>>(() => loadTodos());

  const items = buildItems(rel, raws);
  const totalQty = items.reduce((s, it) => s + it.qty, 0);

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
      await new Promise((r) => setTimeout(r, 1400));
      if (!alive) return;
      const el = wrapRef.current;
      const cap = captureRef.current;
      if (!el || !cap) return;
      const ph = cap.offsetHeight;
      // print speed scales with paper length — long enough to feel mechanical,
      // short enough not to stall
      const ms = Math.min(26000, Math.max(15000, Math.round(ph * 9)));
      const topAbs = el.getBoundingClientRect().top + window.scrollY;
      printChatter(ms);

      const anim = el.animate([{ height: "0px" }, { height: `${ph}px` }], {
        duration: ms,
        easing: "steps(190)",
        fill: "forwards",
      });

      const t0 = performance.now();
      let lastP = -1;
      const raf = () => {
        if (!alive) return;
        const p = Math.min(1, (performance.now() - t0) / ms);
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
    shutterClick();
    setBusy(true);
    toast("ĐANG CHỤP HÓA ĐƠN...");
    try {
      const el = captureRef.current;
      el.querySelectorAll<HTMLElement>(".no-shot").forEach((n) => (n.style.display = "none"));
      const scale = Math.max(
        1,
        Math.min(3, Math.floor((8192 / Math.max(el.offsetHeight, 1)) * 10) / 10)
      );
      const canvas = await html2canvas(el, {
        backgroundColor: "#0a0a0a",
        scale,
        logging: false,
      });
      const a = document.createElement("a");
      a.download = `hoa-don-vo-hinh-2010.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
      el.querySelectorAll<HTMLElement>(".no-shot").forEach((n) => (n.style.display = ""));
      lockClick();
      toast("ĐÃ LƯU ẢNH — ĐĂNG STORY ĐƯỢC NGAY");
    } catch {
      captureRef.current
        ?.querySelectorAll<HTMLElement>(".no-shot")
        .forEach((n) => (n.style.display = ""));
      toast("MÁY ẢNH KẸT GIẤY — THỬ LẠI");
    }
    setBusy(false);
  };

  /** gửi thẳng qua Zalo/Messenger/SMS bằng trình chia sẻ của máy */
  const systemShare = async () => {
    rubberStamp();
    const text = `Mình vừa tính thử "hóa đơn vô hình" cho ${rel.pronounLow} — ${fmt(
      totalQty
    )} đơn vị công sức chưa ai trả. Thử đi:`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "HÓA ĐƠN VÔ HÌNH", text, url: window.location.href });
        lockClick();
        toast("ĐÃ GỬI ĐI");
      } else {
        await navigator.clipboard.writeText(`${text} ${window.location.href}`);
        lockClick();
        toast("ĐÃ SAO CHÉP — DÁN VÀO ZALO/MESSENGER");
      }
    } catch {
      /* người dùng huỷ — im lặng */
    }
  };

  /** soạn sẵn lời nhắn gửi cho chính người ấy */
  const copyMessage = async () => {
    rubberStamp();
    const msgs: Record<string, string> = {
      me: "Mẹ ơi, con thương mẹ. Cuối tuần con về ăn cơm với mẹ nhé.",
      vo: "Cảm ơn em vì những điều anh hay quên nói. Tối nay mình đi ăn nhé?",
      chi: "Lâu rồi không hỏi thăm. Cảm ơn vì hồi nhỏ toàn nhường em/anh. Hôm nào cà phê nhé?",
      ba: "Bà ơi, cháu nhớ bà. Cuối tuần cháu về thăm bà.",
      codi: "Con cảm ơn cô/dì vì ngày xưa hay bênh con. Dịp tới con về sớm phụ cô/dì.",
    };
    const text = msgs[rel.key] ?? msgs.me;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    lockClick();
    toast("ĐÃ CHÉP LỜI NHẮN — GỬI CHO NGƯỜI ẤY ĐI");
  };

  const copyLink = async () => {
    rubberStamp();
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      lockClick();
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
    <div className="safe-x safe-b mx-auto w-full max-w-2xl px-3 pb-24 pt-8 sm:pt-10">
      <div className="mb-2 text-center text-[10px] uppercase tracking-[0.4em] text-dim-green sm:text-xs">
        "BƯỚC 03 · BIÊN LAI CUỐI CÙNG"
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
          ? `đừng tắt máy — hóa đơn của ${rel.pronounLow} dài lắm`
          : "xé hóa đơn. rồi hành động đi."}
      </div>

      {fromShare && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="pos-panel dash-box mx-auto mt-6 max-w-md px-4 py-3 text-center"
        >
          <div className="font-vt text-[clamp(1.2rem,5.4vw,1.6rem)] leading-tight text-glow">
            HÓA ĐƠN ĐƯỢC GỬI CHO BẠN
          </div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/40">
            ai đó đã ngồi bấm từng con số này — nhân ngày 20/10
          </div>
        </motion.div>
      )}

      {/* ================= PRINTER + PAPER ================= */}
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.95, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        transition={{ delay: 0.5, duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto mt-6 w-full max-w-[440px]"
      >
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
          <div ref={captureRef} className="bg-[#0a0a0a] p-2 sm:p-3">
            <div className="paper paper-ink px-6 py-9 font-plex text-[13px] leading-[1.9] sm:px-8">
              {/* ---------- HEADER ---------- */}
              <div className="text-center">
                <div className="font-vt text-[clamp(1.9rem,8.6vw,2.6rem)] leading-none tracking-wide">
                  HÓA ĐƠN VÔ HÌNH
                </div>
                <div className="mt-1.5 text-[10px] uppercase tracking-[0.25em] paper-ink-faded">
                  những khoản công sức chưa ai trả
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-[0.25em] paper-ink-faded">
                  lập theo lời khai của chính bạn
                </div>
              </div>

              <div className="my-3">
                <Div />
              </div>
              <div className="flex justify-between text-[11px]">
                <span>20/10/{YEAR}</span>
                <span>20:10</span>
                <span>SỐ 001</span>
              </div>
              <div className="my-3">
                <Div ch="═" />
              </div>

              <div className="space-y-0.5 uppercase">
                <div>
                  khách hàng: <span className="font-bold">{rel.fullName}</span>
                </div>
                <div className="paper-ink-faded">người trả nợ: bạn</div>
              </div>

              <div className="my-3">
                <Div />
              </div>

              {phase === "done" && !fromShare && (
                <div className="no-shot mb-2 text-center text-[9px] uppercase tracking-[0.18em] paper-ink-faded">
                  ✎ chạm vào một dòng để sửa lại
                </div>
              )}

              {/* ---------- ITEMS ---------- */}
              <div className="space-y-3">
                {items.map((it, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      if (phase === "done" && !fromShare) {
                        chipTap();
                        onEdit(i);
                      }
                    }}
                    className={phase === "done" && !fromShare ? "cursor-pointer" : ""}
                  >
                    <div className="uppercase">
                      {String(i + 1).padStart(2, "0")}. {it.name}
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

              {/* ---------- TOTALS ---------- */}
              <div className="my-3">
                <Div ch="═" />
              </div>
              <div className="space-y-1.5 uppercase">
                <div>
                  <div>tạm tính</div>
                  <div className="flex items-end">
                    <span className="pl-4">{fmt(totalQty)} đơn vị công sức</span>
                    <span className="dotted-leader" />
                    <span className="font-bold">∞</span>
                  </div>
                </div>
                <div className="flex items-end">
                  <span>thuế tình cảm (đã gồm)</span>
                  <span className="dotted-leader" />
                  <span className="font-bold">∞</span>
                </div>
                <div className="flex items-end">
                  <span>phí trễ hạn — rất lâu rồi</span>
                  <span className="dotted-leader" />
                  <span className="font-bold">∞</span>
                </div>
              </div>

              <div className="my-3">
                <Div ch="═" />
              </div>
              <div className="py-1 text-center">
                <div className="text-[10px] uppercase tracking-[0.5em]">tổng cộng</div>
                <div className="mt-1 font-vt text-[3.4rem] leading-none sm:text-[4.2rem]">
                  VÔ GIÁ
                </div>
              </div>
              <div className="my-3">
                <Div ch="═" />
              </div>

              {/* ---------- PAYMENT NOTICE ---------- */}
              <div className="border-2 border-[#1c1c12]/80 px-3 py-4 text-center uppercase sm:px-4">
                <div className="font-vt text-[clamp(1.2rem,5.6vw,1.9rem)] leading-tight">
                  ( ! ) không thể thanh toán
                </div>
                <div className="mt-2 text-[11px] leading-relaxed">
                  nhưng có thể trả góp bằng sự quan tâm.
                  <br />
                  không lãi. không kỳ hạn.
                </div>
              </div>

              <div className="mt-4 uppercase">
                <div className="text-[10px] tracking-[0.15em] paper-ink-faded">
                  kế hoạch trả góp — bắt đầu ngay hôm nay:
                </div>
                <div className="mt-1.5 space-y-2 text-[11px]">
                  {rel.installments.map((t, i) => {
                    const id = `${rel.key}-${i}`;
                    const on = !!todos[id];
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          if (on) chipTap();
                          else stepStamp();
                          setTodos(toggleTodo(id));
                        }}
                        className="flex w-full items-start gap-2 text-left"
                      >
                        <span className="font-bold">[{on ? "✓" : "\u00A0\u00A0"}]</span>
                        <span className={on ? "line-through opacity-50" : ""}>{t}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 text-[9px] tracking-[0.15em] paper-ink-faded">
                  ✓ đánh dấu khi bạn đã làm — máy nhớ giúp bạn
                </div>
              </div>

              {/* ---------- THE MEANING ---------- */}
              <div className="my-4">
                <Div ch="═" />
              </div>
              <div className="bg-[#1c1c12] px-4 py-6 text-center uppercase text-[#f5f5dc]">
                <div className="text-[9px] tracking-[0.3em] opacity-75">
                  lời nhắn cho người cầm hóa đơn
                </div>
                <div className="mt-3 font-vt text-[clamp(1.3rem,6vw,1.9rem)] leading-tight">
                  20/10 KHÔNG PHẢI NGÀY
                </div>
                <div className="font-vt text-[clamp(1.3rem,6vw,1.9rem)] leading-tight">
                  TRẢ HẾT MÓN NỢ NÀY.
                </div>
                <div className="mt-3 text-[11px] leading-[2] opacity-90">
                  không ai trả hết được.
                  <br />
                  ngày này chỉ để nhìn rõ một điều:
                  <br />
                  suốt bấy lâu — {rel.pronounLow} đã trả thay bạn.
                </div>
                <div className="mx-auto my-3 h-px w-1/2 bg-[#f5f5dc]/30" />
                <div className="font-vt text-[clamp(1.6rem,7.4vw,2.3rem)] leading-tight">
                  BẮT ĐẦU TRẢ.
                </div>
                <div className="font-vt text-[clamp(1.6rem,7.4vw,2.3rem)] leading-tight">
                  TỪ HÔM NAY.
                </div>
                <div className="mt-2 text-[11px] leading-[1.9] opacity-90">
                  không bằng một bó hoa. bằng một hành động.
                </div>
              </div>

              {/* ---------- BARCODE + FOOTER ---------- */}
              <div className="my-4">
                <Div />
              </div>
              <div className="barcode opacity-90" />
              <div className="mt-1 text-center font-vt text-xl tracking-[0.4em]">*2010{String(YEAR).slice(2)}*</div>

              <div className="mt-5 text-center uppercase leading-relaxed">
                <div className="font-bold">cảm ơn quý khách.</div>
                <div className="text-[12px]">hẹn gặp lại mỗi ngày, không chỉ 20/10.</div>
              </div>
              <div className="my-3">
                <Div ch="═" />
              </div>
            </div>
            <div className="torn-bottom" />
          </div>
        </div>
      </motion.div>

      {/* ================= SHARE PANEL ================= */}
      <AnimatePresence>
        {phase === "done" && (
          <>
          <motion.section
            variants={heroWrap}
            initial="hidden"
            animate="show"
            className="mx-auto mt-16 w-full max-w-[560px] px-1 text-center"
          >
            <motion.div variants={heroItem} className="text-[10px] uppercase tracking-[0.4em] text-dim-green">
              khoản cuối cùng — không in trên giấy
            </motion.div>
            <motion.h2
              variants={heroItem}
              className="mt-5 font-vt leading-tight text-glow-strong"
              style={{ fontSize: "clamp(2rem, 8.5vw, 3.4rem)" }}
            >
              ĐÂY KHÔNG PHẢI
              <br />
              LÀ HÓA ĐƠN.
            </motion.h2>
            <motion.p
              variants={heroItem}
              className="mx-auto mt-4 max-w-xs text-balance font-plex text-xs leading-relaxed text-white/55 sm:max-w-sm sm:text-sm"
            >
              chỉ là 5 món trong hàng triệu việc {rel.pronounLow} làm
              mà chưa từng ai trả công.
            </motion.p>
            <motion.h3
              variants={heroItem}
              className="mt-14 font-vt leading-tight text-glow"
              style={{ fontSize: "clamp(1.9rem, 7.6vw, 3rem)" }}
            >
              NGÀY 20/10
              <br />
              KHÔNG THIẾU HOA.
              <br />
              CHỈ THIẾU NHỮNG NGƯỜI
              <br />
              ĐÀN ÔNG CHỊU TRẢ.
            </motion.h3>
            <motion.p
              variants={heroItem}
              className="mt-4 font-plex text-[10px] uppercase tracking-[0.3em] text-white/50 sm:text-xs"
            >
              người đầu tiên nên là bạn — hôm nay.
            </motion.p>
          </motion.section>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3.4, type: "spring", stiffness: 200, damping: 22 }}
            className="mx-auto mt-12 w-full max-w-[440px]"
          >
            <div className="pos-panel p-4 sm:p-5">
              <div className="mb-4 text-center">
                <div className="font-vt text-[clamp(1.35rem,5.6vw,1.85rem)] leading-tight text-glow">
                  GỬI CHO ĐÀN ÔNG QUANH BẠN
                </div>
                <div className="mt-1 text-[9px] uppercase tracking-[0.2em] text-white/35">
                  ai cũng đang cầm một tờ hóa đơn y vậy
                </div>
              </div>
              <div className="grid gap-3">
                <button
                  onClick={capture}
                  disabled={busy}
                  className="pos-btn pos-btn--fill flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <Camera className="h-6 w-6 shrink-0" strokeWidth={2.4} />
                  <span>
                    <span className="block font-vt text-2xl leading-none sm:text-3xl">
                      CHỤP HÓA ĐƠN
                    </span>
                    <span className="mt-1 block font-plex text-[10px] uppercase tracking-[0.12em] opacity-75">
                      ảnh dọc — đăng story được ngay
                    </span>
                  </span>
                </button>
                <button
                  onClick={copyMessage}
                  className="pos-btn flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <MessageCircle className="h-6 w-6 shrink-0" strokeWidth={2.4} />
                  <span>
                    <span className="block font-vt text-2xl leading-none sm:text-3xl">
                      CHÉP LỜI NHẮN SẴN
                    </span>
                    <span className="mt-1 block font-plex text-[10px] uppercase tracking-[0.12em] text-white/40">
                      gửi thẳng cho {rel.pronounLow} — đừng chỉ đăng story
                    </span>
                  </span>
                </button>
                <button
                  onClick={systemShare}
                  className="pos-btn flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <Share2 className="h-6 w-6 shrink-0" strokeWidth={2.4} />
                  <span>
                    <span className="block font-vt text-2xl leading-none sm:text-3xl">
                      CHIA SẺ NHANH
                    </span>
                    <span className="mt-1 block font-plex text-[10px] uppercase tracking-[0.12em] text-white/40">
                      zalo · messenger · tin nhắn
                    </span>
                  </span>
                </button>
                <button
                  onClick={copyLink}
                  className="pos-btn flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <Link2 className="h-6 w-6 shrink-0" strokeWidth={2.4} />
                  <span>
                    <span className="block font-vt text-2xl leading-none sm:text-3xl">
                      SAO CHÉP LINK
                    </span>
                    <span className="mt-1 block font-plex text-[10px] uppercase tracking-[0.12em] text-white/40">
                      gửi ai đó — để họ tự soi lại mình
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => {
                    filmCut();
                    onRestart();
                  }}
                  className="pos-btn flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <RotateCcw className="h-6 w-6 shrink-0" strokeWidth={2.4} />
                  <span>
                    <span className="block font-vt text-2xl leading-none sm:text-3xl">
                      TÍNH HÓA ĐƠN MỚI
                    </span>
                    <span className="mt-1 block font-plex text-[10px] uppercase tracking-[0.12em] text-white/40">
                      {fromShare ? "lần này tính cho người của bạn" : "còn người khác bạn cũng đang nợ"}
                    </span>
                  </span>
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

            {/* ---------- OUTRO CTA ---------- */}
            <motion.button
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 4.2, duration: 0.8 }}
              onClick={() => {
                filmCut();
                window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
                onShowOutro();
              }}
              className="pos-btn pos-btn--fill mt-12 flex w-full items-center justify-center gap-3 px-4 py-4"
            >
              <Film className="h-5 w-5 shrink-0" strokeWidth={2.4} />
              <span className="font-vt text-[clamp(1.35rem,5.6vw,1.85rem)] leading-none">
                XEM LỜI CUỐI
              </span>
            </motion.button>
            <div className="mt-2 text-center text-[10px] uppercase tracking-[0.25em] text-white/30">
              30 giây — phần quan trọng nhất của tờ hóa đơn
            </div>

            <div className="mt-12 text-center text-[10px] uppercase tracking-[0.25em] text-white/25">
              tính nợ xong rồi. giờ đi trả đi.
            </div>
          </motion.div></>

        )}
      </AnimatePresence>

    </div>
  );
}
