export type RelKey = "me" | "vo" | "chi" | "ba" | "codi";

export interface Bucket {
  label: string;
  value: number;
}

export interface QuestionDef {
  id: string;
  prompt: string;
  unitLabel: string;
  input: "number" | "range";
  min: number;
  max: number;
  step: number;
  def: number;
  buckets?: Bucket[];
  formula: (raw: number, raws: number[]) => string;
  compute: (raw: number, raws: number[]) => number;
  itemName: string;
  qtyUnit: string;
  note?: (raw: number, raws: number[]) => string;
}

export interface RelConfig {
  key: RelKey;
  shortName: string;
  fullName: string;
  ageHint: string;
  pronounUp: string;
  pronounLow: string;
  whisper: string;
  settleLine: string;
  installments: string[];
  questions: QuestionDef[];
}

export interface LineItem {
  name: string;
  qty: number;
  unit: string;
  note?: string;
}

/** Năm hiện tại — ngày 20/10 lặp lại mỗi năm, hệ thống tự biết */
export const YEAR = new Date().getFullYear();

export const fmt = (n: number): string =>
  new Intl.NumberFormat("vi-VN").format(Math.round(n));

const num = (v: number, fb: number) =>
  Number.isFinite(v) ? Math.max(0, v) : fb;

/** chỉ số an toàn của một mức đã chọn */
const bi = (raw: number, len: number) =>
  Math.max(0, Math.min(len - 1, Math.round(num(raw, 0))));

/** lấy giá trị của mức đã chọn */
const bv = (list: Bucket[], raw: number) => list[bi(raw, list.length)].value;
/** lấy nhãn của mức đã chọn */
const bl = (list: Bucket[], raw: number) => list[bi(raw, list.length)].label.toLowerCase();

/* ============================================================
   NGUYÊN TẮC RA CÂU HỎI
   1. Chỉ hỏi thứ người dùng biết chắc: tuổi mình, tuổi bà,
      yêu nhau bao lâu, lần cuối gặp là khi nào.
   2. Mọi thứ còn lại hỏi bằng MỨC ĐỘ bằng lời
      (gần như mỗi ngày / thỉnh thoảng / hiếm khi...),
      tuyệt đối không bắt ai đếm số lần.
   3. Máy tự quy mức độ đó ra con số và ghi rõ "ước tính".
   ============================================================ */

/* ---------- thang dùng chung ---------- */

const RECENT: Bucket[] = [
  { label: "HÔM QUA", value: 1 },
  { label: "TUẦN NÀY", value: 7 },
  { label: "THÁNG TRƯỚC", value: 30 },
  { label: "VÀI THÁNG RỒI", value: 120 },
  { label: "LÂU LẮM RỒI", value: 365 },
  { label: "KHÔNG NHỚ NỔI", value: 720 },
];

const OFTEN: Bucket[] = [
  { label: "GẦN NHƯ MỖI NGÀY", value: 300 },
  { label: "VÀI LẦN MỖI TUẦN", value: 150 },
  { label: "MỖI TUẦN MỘT LẦN", value: 52 },
  { label: "THỈNH THOẢNG", value: 20 },
  { label: "HIẾM KHI", value: 6 },
];

/* ---------- MẸ ---------- */

const ME_FAR: Bucket[] = [
  { label: "Ở CHUNG VỚI MẸ", value: 20 },
  { label: "CÙNG THÀNH PHỐ", value: 300 },
  { label: "KHÁC TỈNH", value: 340 },
  { label: "KHÁC NƯỚC", value: 360 },
];

const ME_PICKUP: Bucket[] = [
  { label: "LUÔN BẮT MÁY NGAY", value: 0.5 },
  { label: "THƯỜNG LÀ BẮT ĐƯỢC", value: 2 },
  { label: "HAY LỠ, GỌI LẠI SAU", value: 4 },
  { label: "HAY QUÊN GỌI LẠI", value: 7 },
];

/* ---------- NGƯỜI YÊU / VỢ ---------- */

const VO_LONG: Bucket[] = [
  { label: "MỚI YÊU, VÀI THÁNG", value: 0.5 },
  { label: "KHOẢNG 1 NĂM", value: 1 },
  { label: "2 – 3 NĂM", value: 2.5 },
  { label: "4 – 6 NĂM", value: 5 },
  { label: "TRÊN 6 NĂM", value: 8 },
];

const VO_REPLY: Bucket[] = [
  { label: "TRẢ LỜI NGAY", value: 3 },
  { label: "TRONG VÀI PHÚT", value: 20 },
  { label: "KHI NÀO RẢNH THÌ REP", value: 120 },
  { label: "HAY ĐỂ TỚI HÔM SAU", value: 600 },
];

const VO_FIRST: Bucket[] = [
  { label: "LUÔN LÀ CÔ ẤY", value: 300 },
  { label: "THƯỜNG LÀ CÔ ẤY", value: 200 },
  { label: "NGANG NHAU", value: 120 },
  { label: "THƯỜNG LÀ MÌNH", value: 60 },
];

const VO_NOTICE: Bucket[] = [
  { label: "MÌNH NHẬN RA NGAY", value: 1 },
  { label: "THƯỜNG THÌ NHẬN RA", value: 4 },
  { label: "PHẢI NÓI MÌNH MỚI BIẾT", value: 9 },
  { label: "NÓI RỒI VẪN CHƯA ĐỂ TÂM", value: 14 },
];

/* ---------- CHỊ / EM ---------- */

const CHI_YIELD: Bucket[] = [
  { label: "LÚC NÀO CŨNG NHƯỜNG MÌNH", value: 300 },
  { label: "THƯỜNG LÀ NHƯỜNG MÌNH", value: 180 },
  { label: "NGANG NHAU", value: 90 },
  { label: "MÌNH HAY NHƯỜNG HƠN", value: 30 },
];

const CHI_COVER: Bucket[] = [
  { label: "ĐỨNG RA NHẬN THAY MÌNH", value: 10 },
  { label: "BÊNH MÌNH TRƯỚC BỐ MẸ", value: 7 },
  { label: "IM LẶNG CHO QUA", value: 4 },
  { label: "MẮNG, NHƯNG KHÔNG MÁCH", value: 3 },
];

const CHI_PEACE: Bucket[] = [
  { label: "LUÔN LÀ CHỊ/EM TRƯỚC", value: 9 },
  { label: "THƯỜNG LÀ CHỊ/EM", value: 7 },
  { label: "NGANG NHAU", value: 5 },
  { label: "THƯỜNG LÀ MÌNH", value: 2 },
];

/* ---------- BÀ ---------- */

const BA_VISIT: Bucket[] = [
  { label: "HẰNG TUẦN", value: 50 },
  { label: "MỖI THÁNG MỘT LẦN", value: 12 },
  { label: "VÀI THÁNG MỘT LẦN", value: 4 },
  { label: "CHỈ GIỖ, TẾT", value: 2 },
  { label: "HIẾM LẮM MỚI VỀ", value: 1 },
];

const BA_CALL: Bucket[] = [
  { label: "NGHE ĐẾN KHI BÀ DỪNG", value: 20 },
  { label: "ĐƯỢC MƯỜI PHÚT", value: 10 },
  { label: "VÀI CÂU RỒI CÚP", value: 3 },
  { label: "BÀ KHÔNG GỌI ĐƯỢC NỮA", value: 0 },
];

const BA_GIVE: Bucket[] = [
  { label: "LẦN NÀO CŨNG CÓ", value: 100 },
  { label: "HẦU NHƯ LẦN NÀO", value: 75 },
  { label: "THỈNH THOẢNG", value: 40 },
  { label: "BÀ KHÔNG CÒN SỨC NỮA", value: 0 },
];

/* ---------- CÔ / DÌ / BÁC ---------- */

const CD_SIDE: Bucket[] = [
  { label: "LUÔN BÊNH MÌNH", value: 300 },
  { label: "HAY BÊNH MÌNH", value: 180 },
  { label: "THỈNH THOẢNG", value: 80 },
  { label: "ÍT KHI, NHƯNG CÓ", value: 30 },
];

const CD_KITCHEN: Bucket[] = [
  { label: "LO GẦN HẾT TỪ SÁNG SỚM", value: 8 },
  { label: "LÀM PHẦN LỚN", value: 6 },
  { label: "CHIA NHAU VỚI MỌI NGƯỜI", value: 4 },
  { label: "PHỤ MỘT ÍT", value: 2 },
];

const CD_GIFT: Bucket[] = [
  { label: "DỊP NÀO CŨNG CÓ PHẦN", value: 10 },
  { label: "HAY CHO QUÀ, LÌ XÌ", value: 7 },
  { label: "THỈNH THOẢNG", value: 4 },
  { label: "ÍT KHI", value: 2 },
];

export const RELS: Record<RelKey, RelConfig> = {
  me: {
    key: "me",
    shortName: "MẸ",
    fullName: "MẸ CỦA BẠN",
    ageHint: "NGƯỜI ĐẦU TIÊN NHẤC MÁY MỖI KHI BẠN GỌI",
    pronounUp: "MẸ",
    pronounLow: "mẹ",
    whisper: "TRƯỚC KHI BẠN BIẾT NÓI, MẸ ĐÃ BIẾT BẠN CẦN GÌ.",
    settleLine: "NÓ BẮT ĐẦU TỪ TIẾNG KHÓC CHÀO ĐỜI CỦA BẠN.",
    installments: [
      "HÔM NAY: GỌI CHO MẸ TRƯỚC, ĐỪNG ĐỂ MẸ GỌI",
      "TUẦN NÀY: VỀ ĂN VỚI MẸ MỘT BỮA CƠM",
      "20/10 NÀY: NÓI \"CON THƯƠNG MẸ\" BẰNG MIỆNG",
    ],
    questions: [
      {
        id: "me1",
        prompt: "NĂM NAY BẠN BAO NHIÊU TUỔI?",
        unitLabel: "TUỔI",
        input: "number",
        min: 10,
        max: 70,
        step: 1,
        def: 22,
        formula: (r) =>
          `${num(r, 0)} năm × 365 ngày × 2 bữa = ${fmt(num(r, 0) * 730)} bữa mẹ lo`,
        compute: (r) => num(r, 0) * 730,
        itemName: "BỮA ĂN MẸ ĐÃ LO",
        qtyUnit: "bữa",
        note: () => "ước tính theo tuổi bạn — mẹ chưa từng ghi sổ",
      },
      {
        id: "me2",
        prompt: "BÂY GIỜ BẠN Ở ĐÂU SO VỚI MẸ?",
        unitLabel: "KHOẢNG CÁCH",
        input: "range",
        min: 0,
        max: ME_FAR.length - 1,
        step: 1,
        def: 1,
        buckets: ME_FAR,
        formula: (r) =>
          `${bl(ME_FAR, r)} → ước tính ${fmt(bv(ME_FAR, r))} ngày trong năm mẹ không thấy mặt bạn`,
        compute: (r) => bv(ME_FAR, r),
        itemName: "NGÀY TRONG NĂM MẸ KHÔNG THẤY BẠN",
        qtyUnit: "ngày",
        note: () => "phần cơm của bạn vẫn được nhắc tới trong bữa",
      },
      {
        id: "me3",
        prompt: "MẸ HỎI \"CON ĂN CƠM CHƯA?\" THƯỜNG XUYÊN CỠ NÀO?",
        unitLabel: "MỨC ĐỘ",
        input: "range",
        min: 0,
        max: OFTEN.length - 1,
        step: 1,
        def: 1,
        buckets: OFTEN,
        formula: (r, rw) =>
          `${bl(OFTEN, r)} ≈ ${fmt(bv(OFTEN, r))} lần/năm × ${num(rw[0], 0)} năm = ${fmt(
            bv(OFTEN, r) * num(rw[0], 0)
          )} lần`,
        compute: (r, rw) => bv(OFTEN, r) * num(rw[0], 0),
        itemName: "LẦN MẸ HỎI BẠN ĂN CHƯA",
        qtyUnit: "lần",
        note: () => "câu hỏi mẹ dùng để nói rằng mẹ nhớ bạn",
      },
      {
        id: "me4",
        prompt: "MẸ GỌI ĐIỆN — BẠN THƯỜNG THẾ NÀO?",
        unitLabel: "THÓI QUEN",
        input: "range",
        min: 0,
        max: ME_PICKUP.length - 1,
        step: 1,
        def: 2,
        buckets: ME_PICKUP,
        formula: (r, rw) =>
          `${bl(ME_PICKUP, r)} ≈ ${bv(ME_PICKUP, r)} cuộc lỡ/tháng × 12 × ${num(
            rw[0],
            0
          )} năm = ${fmt(bv(ME_PICKUP, r) * 12 * num(rw[0], 0))} cuộc`,
        compute: (r, rw) => bv(ME_PICKUP, r) * 12 * num(rw[0], 0),
        itemName: "CUỘC GỌI MẸ PHẢI CHỜ",
        qtyUnit: "cuộc",
        note: () => "mỗi cuộc là một lần mẹ cầm máy lên rồi lại đặt xuống",
      },
      {
        id: "me5",
        prompt: "LẦN CUỐI BẠN NÓI THƯƠNG MẸ LÀ KHI NÀO?",
        unitLabel: "THỜI ĐIỂM",
        input: "range",
        min: 0,
        max: RECENT.length - 1,
        step: 1,
        def: 3,
        buckets: RECENT,
        formula: (r) => `${bl(RECENT, r)} = ${fmt(bv(RECENT, r))} ngày mẹ chưa nghe lại câu đó`,
        compute: (r) => bv(RECENT, r),
        itemName: "NGÀY MẸ CHƯA NGHE CÂU THƯƠNG",
        qtyUnit: "ngày",
        note: () => "mẹ không đợi đến 20/10 — mẹ đợi hôm nay",
      },
    ],
  },

  vo: {
    key: "vo",
    shortName: "NGƯỜI YÊU/VỢ",
    fullName: "NGƯỜI ĐỒNG HÀNH",
    ageHint: "NGƯỜI CHỌN Ở LẠI SAU CẢ NHỮNG NGÀY XẤU XÍ NHẤT",
    pronounUp: "CÔ ẤY",
    pronounLow: "cô ấy",
    whisper: "GIỮA HÀNG TỶ NGƯỜI, CÔ ẤY CHỌN DỪNG LẠI Ở BẠN.",
    settleLine: "NÓ BẮT ĐẦU TỪ LẦN ĐẦU CÔ ẤY NÓI CÓ.",
    installments: [
      "HÔM NAY: TRẢ LỜI TIN CỦA CÔ ẤY NGAY, THẬT DÀI",
      "TUẦN NÀY: MỘT BUỔI HẸN DO BẠN TỰ NGHĨ RA",
      "20/10 NÀY: KHEN CÔ ẤY VÀ NÓI RÕ VÌ SAO",
    ],
    questions: [
      {
        id: "vo1",
        prompt: "HAI NGƯỜI Ở BÊN NHAU BAO LÂU RỒI?",
        unitLabel: "CỘT MỐC",
        input: "range",
        min: 0,
        max: VO_LONG.length - 1,
        step: 1,
        def: 2,
        buckets: VO_LONG,
        formula: (r) => `${bl(VO_LONG, r)} = ${fmt(bv(VO_LONG, r) * 365)} ngày cô ấy chọn bạn`,
        compute: (r) => bv(VO_LONG, r) * 365,
        itemName: "NGÀY CÔ ẤY CHỌN BẠN",
        qtyUnit: "ngày",
        note: () => "mỗi sáng tỉnh dậy là một lần chọn lại",
      },
      {
        id: "vo2",
        prompt: "CÔ ẤY NHẮN TIN — BẠN THƯỜNG TRẢ LỜI THẾ NÀO?",
        unitLabel: "TỐC ĐỘ",
        input: "range",
        min: 0,
        max: VO_REPLY.length - 1,
        step: 1,
        def: 1,
        buckets: VO_REPLY,
        formula: (r, rw) =>
          `${bl(VO_REPLY, r)} ≈ ${bv(VO_REPLY, r)} phút × ${fmt(
            520 * bv(VO_LONG, rw[0])
          )} tin = ${fmt((bv(VO_REPLY, r) * 520 * bv(VO_LONG, rw[0])) / 60)} giờ chờ`,
        compute: (r, rw) => (bv(VO_REPLY, r) * 520 * bv(VO_LONG, rw[0])) / 60,
        itemName: "GIỜ CÔ ẤY NHÌN MÀN HÌNH CHỜ BẠN",
        qtyUnit: "giờ",
        note: () => "ước tính 10 tin mỗi tuần — bóng bóng xoay rồi tắt",
      },
      {
        id: "vo3",
        prompt: "BUỔI SÁNG, AI THƯỜNG NHẮN TRƯỚC?",
        unitLabel: "THÓI QUEN",
        input: "range",
        min: 0,
        max: VO_FIRST.length - 1,
        step: 1,
        def: 1,
        buckets: VO_FIRST,
        formula: (r, rw) =>
          `${bl(VO_FIRST, r)} ≈ ${bv(VO_FIRST, r)} lần/năm × ${fmt(
            bv(VO_LONG, rw[0])
          )} năm = ${fmt(bv(VO_FIRST, r) * bv(VO_LONG, rw[0]))} lời chào`,
        compute: (r, rw) => bv(VO_FIRST, r) * bv(VO_LONG, rw[0]),
        itemName: "LỜI CHÀO SÁNG CÔ ẤY GỬI TRƯỚC",
        qtyUnit: "lời",
        note: () => "bạn nhắn trước một lần, cô ấy nhớ rất lâu",
      },
      {
        id: "vo4",
        prompt: "KHI CÔ ẤY BUỒN, BẠN NHẬN RA THẾ NÀO?",
        unitLabel: "MỨC ĐỘ",
        input: "range",
        min: 0,
        max: VO_NOTICE.length - 1,
        step: 1,
        def: 2,
        buckets: VO_NOTICE,
        formula: (r, rw) =>
          `${bl(VO_NOTICE, r)} ≈ ${bv(VO_NOTICE, r)} lần/năm × ${fmt(
            bv(VO_LONG, rw[0])
          )} năm = ${fmt(bv(VO_NOTICE, r) * bv(VO_LONG, rw[0]))} lần tự chịu một mình`,
        compute: (r, rw) => bv(VO_NOTICE, r) * bv(VO_LONG, rw[0]),
        itemName: "LẦN CÔ ẤY BUỒN MỘT MÌNH",
        qtyUnit: "lần",
        note: () => "\"em không sao\" hiếm khi có nghĩa là không sao",
      },
      {
        id: "vo5",
        prompt: "LẦN CUỐI BẠN KHEN CÔ ẤY THẬT LÒNG LÀ KHI NÀO?",
        unitLabel: "THỜI ĐIỂM",
        input: "range",
        min: 0,
        max: RECENT.length - 1,
        step: 1,
        def: 3,
        buckets: RECENT,
        formula: (r) => `${bl(RECENT, r)} = ${fmt(bv(RECENT, r))} ngày không một lời khen`,
        compute: (r) => bv(RECENT, r),
        itemName: "NGÀY KHÔNG MỘT LỜI KHEN",
        qtyUnit: "ngày",
        note: () => "cô ấy sửa tóc, sửa áo — chờ bạn để ý",
      },
    ],
  },

  chi: {
    key: "chi",
    shortName: "CHỊ / EM",
    fullName: "CHỊ / EM CỦA BẠN",
    ageHint: "NGƯỜI CÃI VỚI BẠN NHƯNG GÁNH THAY BẠN TRƯỚC AI HẾT",
    pronounUp: "CHỊ / EM",
    pronounLow: "chị/em",
    whisper: "CÓ NGƯỜI NHƯỜNG BẠN TẤT CẢ — MÀ KHÔNG AI BẮT PHẢI NHƯỜNG.",
    settleLine: "NÓ BẮT ĐẦU TỪ LẦN ĐẦU TIÊN CÔ ẤY NHƯỜNG BẠN.",
    installments: [
      "HÔM NAY: NHẮN HỎI THĂM TRƯỚC, KHÔNG CHỜ CÓ VIỆC",
      "TUẦN NÀY: RỦ ĐI ĂN MỘT BỮA, LẦN NÀY BẠN TRẢ",
      "20/10 NÀY: NÓI CHO CÔ ẤY BIẾT BẠN BIẾT ƠN",
    ],
    questions: [
      {
        id: "chi1",
        prompt: "NĂM NAY BẠN BAO NHIÊU TUỔI?",
        unitLabel: "TUỔI",
        input: "number",
        min: 8,
        max: 70,
        step: 1,
        def: 22,
        formula: (r) => `${num(r, 0)} năm có nhau = ${fmt(num(r, 0) * 365)} ngày chung một nhà`,
        compute: (r) => num(r, 0) * 365,
        itemName: "NGÀY LỚN LÊN CÙNG NHAU",
        qtyUnit: "ngày",
      },
      {
        id: "chi2",
        prompt: "HỒI NHỎ, AI THƯỜNG NHƯỜNG AI?",
        unitLabel: "THÓI QUEN",
        input: "range",
        min: 0,
        max: CHI_YIELD.length - 1,
        step: 1,
        def: 1,
        buckets: CHI_YIELD,
        formula: (r, rw) =>
          `${bl(CHI_YIELD, r)} ≈ ${bv(CHI_YIELD, r)} lần/năm × ${num(rw[0], 0)} năm = ${fmt(
            bv(CHI_YIELD, r) * num(rw[0], 0)
          )} lần nhường`,
        compute: (r, rw) => bv(CHI_YIELD, r) * num(rw[0], 0),
        itemName: "LẦN NHƯỜNG PHẦN CHO BẠN",
        qtyUnit: "lần",
        note: () => "miếng ngon, chỗ ngồi, lượt chơi — toàn thứ nhỏ nhặt",
      },
      {
        id: "chi3",
        prompt: "KHI BẠN CÓ LỖI, CHỊ/EM THƯỜNG LÀM GÌ?",
        unitLabel: "PHẢN ỨNG",
        input: "range",
        min: 0,
        max: CHI_COVER.length - 1,
        step: 1,
        def: 1,
        buckets: CHI_COVER,
        formula: (r, rw) =>
          `${bl(CHI_COVER, r)} ≈ ${bv(CHI_COVER, r)} lần/năm × ${num(rw[0], 0)} năm = ${fmt(
            bv(CHI_COVER, r) * num(rw[0], 0)
          )} lần đứng về phía bạn`,
        compute: (r, rw) => bv(CHI_COVER, r) * num(rw[0], 0),
        itemName: "LẦN ĐỨNG VỀ PHÍA BẠN",
        qtyUnit: "lần",
      },
      {
        id: "chi4",
        prompt: "SAU MỖI LẦN CÃI NHAU, AI LÀM LÀNH TRƯỚC?",
        unitLabel: "THÓI QUEN",
        input: "range",
        min: 0,
        max: CHI_PEACE.length - 1,
        step: 1,
        def: 1,
        buckets: CHI_PEACE,
        formula: (r, rw) =>
          `${bl(CHI_PEACE, r)} ≈ ${bv(CHI_PEACE, r)} lần/năm × ${num(rw[0], 0)} năm = ${fmt(
            bv(CHI_PEACE, r) * num(rw[0], 0)
          )} lần xuống nước`,
        compute: (r, rw) => bv(CHI_PEACE, r) * num(rw[0], 0),
        itemName: "LẦN LÀM LÀNH TRƯỚC",
        qtyUnit: "lần",
        note: () => "tự ái nuốt vào trong, không quy ra tiền được",
      },
      {
        id: "chi5",
        prompt: "LẦN CUỐI BẠN CHỦ ĐỘNG HỎI THĂM LÀ KHI NÀO?",
        unitLabel: "THỜI ĐIỂM",
        input: "range",
        min: 0,
        max: RECENT.length - 1,
        step: 1,
        def: 3,
        buckets: RECENT,
        formula: (r) => `${bl(RECENT, r)} = ${fmt(bv(RECENT, r))} ngày chờ bạn nhắn trước`,
        compute: (r) => bv(RECENT, r),
        itemName: "NGÀY CHỜ BẠN NHẮN TRƯỚC",
        qtyUnit: "ngày",
        note: () => "cô ấy không chờ đến 20/10 đâu",
      },
    ],
  },

  ba: {
    key: "ba",
    shortName: "BÀ",
    fullName: "BÀ NỘI / BÀ NGOẠI",
    ageHint: "NGƯỜI DÚI TIỀN VÀO TAY BẠN KHI TIỄN RA CỬA",
    pronounUp: "BÀ",
    pronounLow: "bà",
    whisper: "BÀ LÀ NGƯỜI THƯƠNG BẠN MÀ KHÔNG CẦN BẠN GIỎI GIANG GÌ.",
    settleLine: "VÀ QUỸ THỜI GIAN CỦA BÀ KHÔNG CÒN NHIỀU.",
    installments: [
      "HÔM NAY: GỌI CHO BÀ, NGHE ĐẾN KHI BÀ KỂ XONG",
      "THÁNG NÀY: VỀ ĂN VỚI BÀ MỘT BỮA CƠM",
      "LẦN TỚI VỀ: CHỤP VỚI BÀ MỘT TẤM HÌNH",
    ],
    questions: [
      {
        id: "ba1",
        prompt: "NĂM NAY BÀ KHOẢNG BAO NHIÊU TUỔI?",
        unitLabel: "TUỔI",
        input: "number",
        min: 50,
        max: 105,
        step: 1,
        def: 75,
        formula: (r) => `${num(r, 0)} tuổi — bà đã đi qua ${fmt(num(r, 0) * 365)} ngày`,
        compute: (r) => num(r, 0) * 365,
        itemName: "NGÀY BÀ ĐÃ SỐNG",
        qtyUnit: "ngày",
        note: () => "phần lớn trong số đó là lo cho con, rồi lo cho cháu",
      },
      {
        id: "ba2",
        prompt: "BẠN VỀ THĂM BÀ ĐƯỢC THƯỜNG XUYÊN CỠ NÀO?",
        unitLabel: "MỨC ĐỘ",
        input: "range",
        min: 0,
        max: BA_VISIT.length - 1,
        step: 1,
        def: 2,
        buckets: BA_VISIT,
        formula: (r, rw) => {
          const left = Math.max(1, 85 - num(rw[0], 75));
          return `${bl(BA_VISIT, r)} × ${left} năm bà còn ≈ ${fmt(
            bv(BA_VISIT, r) * left
          )} lần gặp nữa`;
        },
        compute: (r, rw) => bv(BA_VISIT, r) * Math.max(1, 85 - num(rw[0], 75)),
        itemName: "SỐ LẦN BẠN CÒN GẶP BÀ",
        qtyUnit: "lần",
        note: () => "con số này không tăng lên được nữa",
      },
      {
        id: "ba3",
        prompt: "BÀ GỌI ĐIỆN — BẠN NGHE ĐƯỢC BAO LÂU?",
        unitLabel: "ĐỘ DÀI",
        input: "range",
        min: 0,
        max: BA_CALL.length - 1,
        step: 1,
        def: 1,
        buckets: BA_CALL,
        formula: (r) => {
          const m = bv(BA_CALL, r);
          return m > 0
            ? `${bl(BA_CALL, r)} ≈ ${m} phút × 52 tuần = ${fmt(m * 52)} phút mỗi năm`
            : "bà không còn gọi được nữa — số phút còn lại là 0";
        },
        compute: (r) => bv(BA_CALL, r) * 52,
        itemName: "PHÚT NGHE BÀ NÓI MỖI NĂM",
        qtyUnit: "phút",
        note: () => "bà kể đi kể lại một chuyện, chỉ để giữ bạn lâu thêm chút",
      },
      {
        id: "ba4",
        prompt: "MỖI LẦN BẠN VỀ, BÀ CÓ DÚI GÌ CHO MANG ĐI KHÔNG?",
        unitLabel: "MỨC ĐỘ",
        input: "range",
        min: 0,
        max: BA_GIVE.length - 1,
        step: 1,
        def: 0,
        buckets: BA_GIVE,
        formula: (r, rw) => {
          const times = Math.round((bv(BA_GIVE, r) / 100) * bv(BA_VISIT, rw[1]) * 10);
          return bv(BA_GIVE, r) > 0
            ? `${bl(BA_GIVE, r)} ≈ ${fmt(times)} lần trong 10 năm qua`
            : "bà không còn sức chuẩn bị nữa — nhưng vẫn hỏi bạn ăn gì chưa";
        },
        compute: (r, rw) => Math.round((bv(BA_GIVE, r) / 100) * bv(BA_VISIT, rw[1]) * 10),
        itemName: "LẦN BÀ DÚI ĐỒ CHO MANG ĐI",
        qtyUnit: "lần",
        note: () => "bà giấu sẵn trong túi áo từ trước khi bạn tới",
      },
      {
        id: "ba5",
        prompt: "LẦN CUỐI BẠN NGỒI NGHE BÀ KỂ CHUYỆN LÀ KHI NÀO?",
        unitLabel: "THỜI ĐIỂM",
        input: "range",
        min: 0,
        max: RECENT.length - 1,
        step: 1,
        def: 3,
        buckets: RECENT,
        formula: (r) => `${bl(RECENT, r)} = ${fmt(bv(RECENT, r))} ngày bà ngóng ra cổng`,
        compute: (r) => bv(RECENT, r),
        itemName: "NGÀY BÀ NGÓNG RA CỔNG",
        qtyUnit: "ngày",
      },
    ],
  },

  codi: {
    key: "codi",
    shortName: "CÔ / DÌ / BÁC",
    fullName: "CÔ / DÌ / BÁC CỦA BẠN",
    ageHint: "NGƯỜI BÊNH BẠN KHI CẢ NHÀ ĐANG MẮNG",
    pronounUp: "CÔ / DÌ",
    pronounLow: "cô/dì",
    whisper: "CÓ NGƯỜI KHÔNG SINH RA BẠN — NHƯNG THƯƠNG BẠN NHƯ CON.",
    settleLine: "NÓ BẮT ĐẦU TỪ LẦN ĐẦU CÔ BÊNH BẠN.",
    installments: [
      "HÔM NAY: NHẮN HỎI THĂM, ĐỪNG ĐỢI ĐÁM GIỖ MỚI GẶP",
      "DỊP TỚI: VỀ SỚM PHỤ DỌN CỖ, KHÔNG CHỜ AI GỌI",
      "20/10 NÀY: CẢM ƠN VÌ NHỮNG LẦN CÔ/DÌ BÊNH BẠN",
    ],
    questions: [
      {
        id: "cd1",
        prompt: "NĂM NAY BẠN BAO NHIÊU TUỔI?",
        unitLabel: "TUỔI",
        input: "number",
        min: 8,
        max: 70,
        step: 1,
        def: 22,
        formula: (r) =>
          `${num(r, 0)} năm = ${fmt(num(r, 0) * 365)} ngày cô/dì xem bạn như con cháu trong nhà`,
        compute: (r) => num(r, 0) * 365,
        itemName: "NGÀY ĐƯỢC THƯƠNG NHƯ CON",
        qtyUnit: "ngày",
      },
      {
        id: "cd2",
        prompt: "HỒI NHỎ, CÔ/DÌ CÓ HAY BÊNH BẠN KHÔNG?",
        unitLabel: "MỨC ĐỘ",
        input: "range",
        min: 0,
        max: CD_SIDE.length - 1,
        step: 1,
        def: 1,
        buckets: CD_SIDE,
        formula: (r, rw) =>
          `${bl(CD_SIDE, r)} ≈ ${bv(CD_SIDE, r)} lần/năm × ${num(rw[0], 0)} năm = ${fmt(
            bv(CD_SIDE, r) * num(rw[0], 0)
          )} lần`,
        compute: (r, rw) => bv(CD_SIDE, r) * num(rw[0], 0),
        itemName: "LẦN CÔ/DÌ ĐỨNG RA BÊNH BẠN",
        qtyUnit: "lần",
        note: () => "nhờ vậy bạn mới dám lớn lên theo cách của mình",
      },
      {
        id: "cd3",
        prompt: "MỖI DỊP GIỖ, TẾT — CÔ/DÌ LO BẾP NÚC THẾ NÀO?",
        unitLabel: "MỨC ĐỘ",
        input: "range",
        min: 0,
        max: CD_KITCHEN.length - 1,
        step: 1,
        def: 0,
        buckets: CD_KITCHEN,
        formula: (r) =>
          `${bl(CD_KITCHEN, r)} ≈ ${bv(CD_KITCHEN, r)} tiếng × 6 dịp × 10 năm = ${fmt(
            bv(CD_KITCHEN, r) * 60
          )} tiếng`,
        compute: (r) => bv(CD_KITCHEN, r) * 60,
        itemName: "TIẾNG ĐỨNG BẾP LO CỖ",
        qtyUnit: "tiếng",
        note: () => "cả nhà ngồi mâm trên, cô/dì ăn sau cùng",
      },
      {
        id: "cd4",
        prompt: "CÔ/DÌ CÓ HAY CHO QUÀ, LÌ XÌ BẠN KHÔNG?",
        unitLabel: "MỨC ĐỘ",
        input: "range",
        min: 0,
        max: CD_GIFT.length - 1,
        step: 1,
        def: 1,
        buckets: CD_GIFT,
        formula: (r, rw) =>
          `${bl(CD_GIFT, r)} ≈ ${bv(CD_GIFT, r)} lần/năm × ${num(rw[0], 0)} năm = ${fmt(
            bv(CD_GIFT, r) * num(rw[0], 0)
          )} lần`,
        compute: (r, rw) => bv(CD_GIFT, r) * num(rw[0], 0),
        itemName: "LẦN CHO QUÀ, LÌ XÌ",
        qtyUnit: "lần",
        note: () => "chưa lần nào tính lại với bạn",
      },
      {
        id: "cd5",
        prompt: "LẦN CUỐI BẠN CHỦ ĐỘNG HỎI THĂM CÔ/DÌ LÀ KHI NÀO?",
        unitLabel: "THỜI ĐIỂM",
        input: "range",
        min: 0,
        max: RECENT.length - 1,
        step: 1,
        def: 4,
        buckets: RECENT,
        formula: (r) => `${bl(RECENT, r)} = ${fmt(bv(RECENT, r))} ngày chỉ gặp nhau qua đám giỗ`,
        compute: (r) => bv(RECENT, r),
        itemName: "NGÀY KHÔNG MỘT LỜI HỎI THĂM",
        qtyUnit: "ngày",
        note: () => "cô/dì vẫn hỏi bố mẹ bạn: dạo này nó sao rồi?",
      },
    ],
  },
};

export const REL_LIST: RelConfig[] = [RELS.me, RELS.vo, RELS.chi, RELS.ba, RELS.codi];

/** Số năm của mối quan hệ — câu 1 có thể là số tuổi hoặc một mức chọn,
 *  nên phải quy đổi thay vì đọc thẳng raws[0]. */
export function getYears(rel: RelConfig, raws: number[]): number {
  const q = rel.questions[0];
  const r0 = Number.isFinite(raws[0]) ? Math.max(0, raws[0]) : 0;
  if (q.buckets && q.buckets.length) {
    return Math.max(1, Math.round(bv(q.buckets, r0)));
  }
  return Math.max(1, Math.round(r0));
}

export function buildItems(rel: RelConfig, raws: number[]): LineItem[] {
  return rel.questions.map((q, i) => ({
    name: q.itemName,
    qty: Math.round(q.compute(num(raws[i], 0), raws)),
    unit: q.qtyUnit,
    note: q.note ? q.note(num(raws[i], 0), raws) : undefined,
  }));
}
