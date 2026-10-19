export type RelKey = "me" | "vo" | "chi" | "co";

export interface QuestionDef {
  id: string;
  prompt: string;
  unitLabel: string;
  input: "number" | "range";
  min: number;
  max: number;
  step: number;
  def: number;
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
  tagline: string;
  ageHint: string;
  installments: string[];
  questions: QuestionDef[];
}

export interface LineItem {
  name: string;
  qty: number;
  unit: string;
  note?: string;
}

export const fmt = (n: number): string =>
  new Intl.NumberFormat("vi-VN").format(Math.round(n));

const num = (v: number, fb: number) =>
  Number.isFinite(v) ? Math.max(0, v) : fb;

export const RELS: Record<RelKey, RelConfig> = {
  me: {
    key: "me",
    shortName: "MẸ",
    fullName: "MẸ CỦA BẠN",
    tagline: "TÀI KHOẢN MỞ TỪ NGÀY BẠN CHÀO ĐỜI",
    ageHint: "NGƯỜI ĐẦU TIÊN NHẤC MÁY MỖI KHI BẠN GỌI",
    installments: [
      "01 CUỘC GỌI MỖI TUẦN — KHÔNG GỌI KHI ĐÃ 11H ĐÊM",
      "01 BỮA CƠM ĂN CÙNG, KHÔNG CẦM ĐIỆN THOẠI",
      "01 CÂU \"CON THƯƠNG MẸ\" — TRƯỚC KHI QUÁ MUỘN",
    ],
    questions: [
      {
        id: "me1",
        prompt: "MẸ ĐÃ NẤU CƠM CHO BẠN BAO NHIÊU NĂM?",
        unitLabel: "NĂM",
        input: "number",
        min: 1, max: 60, step: 1, def: 18,
        formula: (r) => `${num(r, 0)} năm × 365 ngày × 2 bữa = ${fmt(num(r, 0) * 730)} bữa cơm`,
        compute: (r) => num(r, 0) * 730,
        itemName: "BỮA CƠM ĐÃ NẤU",
        qtyUnit: "bữa",
      },
      {
        id: "me2",
        prompt: "MỖI THÁNG, MẸ THỨC KHUYA LO CHO BẠN MẤY ĐÊM?",
        unitLabel: "ĐÊM / THÁNG",
        input: "number",
        min: 0, max: 31, step: 1, def: 4,
        formula: (r, rw) => `${num(r, 0)} đêm × 12 tháng × ${num(rw[0], 0)} năm = ${fmt(num(r, 0) * 12 * num(rw[0], 0))} đêm trắng`,
        compute: (r, rw) => num(r, 0) * 12 * num(rw[0], 0),
        itemName: "ĐÊM MẤT NGỦ VÌ BẠN",
        qtyUnit: "đêm",
      },
      {
        id: "me3",
        prompt: "MỖI THÁNG MẸ NÓI \"MẸ KHÔNG SAO\"… MẤY LẦN KHI THẬT RA CÓ SAO?",
        unitLabel: "LẦN / THÁNG",
        input: "range",
        min: 1, max: 60, step: 1, def: 12,
        formula: (r, rw) => `ước tính: ${r} lần × 12 tháng × ${num(rw[0], 0)} năm = ${fmt(r * 12 * num(rw[0], 0))} lời nói dối trắng`,
        compute: (r, rw) => r * 12 * num(rw[0], 0),
        itemName: "LỜI \"MẸ KHÔNG SAO\"",
        qtyUnit: "lần",
      },
      {
        id: "me4",
        prompt: "SỐ CUỘC GỌI CỦA MẸ MÀ BẠN CHƯA GỌI LẠI?",
        unitLabel: "CUỘC",
        input: "number",
        min: 0, max: 999, step: 1, def: 5,
        formula: (r) => `${num(r, 0)} cuộc × 5 phút chờ = ${fmt(num(r, 0) * 5)} phút bất an`,
        compute: (r) => num(r, 0),
        itemName: "CUỘC GỌI NHỠ",
        qtyUnit: "cuộc",
        note: (r) => `≈ ${fmt(num(r, 0) * 5)} phút chờ không hồi âm`,
      },
      {
        id: "me5",
        prompt: "MẸ ĐÃ GIẶT CHO BẠN KHOẢNG BAO NHIÊU CÁI ÁO?",
        unitLabel: "CÁI ÁO",
        input: "number",
        min: 0, max: 99999, step: 1, def: 800,
        formula: (r) => `${fmt(num(r, 0))} cái × 15 phút = ${fmt((num(r, 0) * 15) / 60)} giờ giặt giũ`,
        compute: (r) => (num(r, 0) * 15) / 60,
        itemName: "GIỜ GIẶT GIŨ",
        qtyUnit: "giờ",
      },
    ],
  },
  vo: {
    key: "vo",
    shortName: "VỢ / NGƯỜI YÊU",
    fullName: "NGƯỜI ĐỒNG HÀNH",
    tagline: "TÀI KHOẢN MỞ TỪ BUỔI HẸN ĐẦU TIÊN",
    ageHint: "NGƯỜI CHỌN Ở LẠI SAU CẢ NHỮNG NGÀY XẤU XÍ NHẤT",
    installments: [
      "01 BUỔI TỐI RẢNH HẲN — CHỈ ĐỂ NGHE CÔ ẤY NÓI",
      "01 LẦN RỬA CHÉN KHÔNG AI NHẮC",
      "01 CÂU \"EM LÀM VẬY LÀ ĐỦ RỒI\" — NÓI THẬT LÒNG",
    ],
    questions: [
      {
        id: "vo1",
        prompt: "CÔ ẤY ĐÃ NẤU ĂN CHO CĂN NHÀ CHUNG BAO NHIÊU NĂM?",
        unitLabel: "NĂM",
        input: "number",
        min: 1, max: 50, step: 1, def: 5,
        formula: (r) => `${num(r, 0)} năm × 365 ngày × 2 bữa = ${fmt(num(r, 0) * 730)} bữa ăn`,
        compute: (r) => num(r, 0) * 730,
        itemName: "BỮA ĂN ĐÃ NẤU",
        qtyUnit: "bữa",
      },
      {
        id: "vo2",
        prompt: "MỖI THÁNG, CÔ ẤY THỨC CHỜ BẠN VỀ MẤY ĐÊM?",
        unitLabel: "ĐÊM / THÁNG",
        input: "number",
        min: 0, max: 31, step: 1, def: 6,
        formula: (r, rw) => `${num(r, 0)} đêm × 12 tháng × ${num(rw[0], 0)} năm = ${fmt(num(r, 0) * 12 * num(rw[0], 0))} đêm chờ cửa`,
        compute: (r, rw) => num(r, 0) * 12 * num(rw[0], 0),
        itemName: "ĐÊM CHỜ CỬA",
        qtyUnit: "đêm",
      },
      {
        id: "vo3",
        prompt: "MỖI THÁNG, CÔ ẤY NÓI \"EM ỔN MÀ\"… MẤY LẦN KHI KHÔNG ỔN CHÚT NÀO?",
        unitLabel: "LẦN / THÁNG",
        input: "range",
        min: 1, max: 60, step: 1, def: 10,
        formula: (r, rw) => `ước tính: ${r} lần × 12 tháng × ${num(rw[0], 0)} năm = ${fmt(r * 12 * num(rw[0], 0))} lần nuốt nước mắt`,
        compute: (r, rw) => r * 12 * num(rw[0], 0),
        itemName: "LẦN GIẤU NHẸM NƯỚC MẮT",
        qtyUnit: "lần",
      },
      {
        id: "vo4",
        prompt: "SỐ TIN NHẮN CỦA CÔ ẤY BẠN ĐÃ XEM MÀ CHƯA TRẢ LỜI?",
        unitLabel: "TIN",
        input: "number",
        min: 0, max: 999, step: 1, def: 12,
        formula: (r) => `${num(r, 0)} tin × 10 phút chờ = ${fmt(num(r, 0) * 10)} phút nhìn màn hình`,
        compute: (r) => num(r, 0),
        itemName: "TIN NHẮN \"ĐÃ XEM\"",
        qtyUnit: "tin",
        note: (r) => `≈ ${fmt(num(r, 0) * 10)} phút chờ bóng bóng xanh`,
      },
      {
        id: "vo5",
        prompt: "CÔ ẤY ĐÃ DỌN SAU BẠN KHOẢNG BAO NHIÊU LẦN?",
        unitLabel: "LẦN",
        input: "number",
        min: 0, max: 9999, step: 1, def: 96,
        formula: (r) => `${fmt(num(r, 0))} lần × 20 phút = ${fmt((num(r, 0) * 20) / 60)} giờ dọn dẹp`,
        compute: (r) => (num(r, 0) * 20) / 60,
        itemName: "GIỜ DỌN DẸP",
        qtyUnit: "giờ",
      },
    ],
  },
  chi: {
    key: "chi",
    shortName: "CHỊ / EM",
    fullName: "CHỊ / EM CỦA BẠN",
    tagline: "TÀI KHOẢN MỞ TỪ CÁI LẦN ĐẦU TIÊN NHƯỜNG BẠN",
    ageHint: "NGƯỜI CÃI VỚI BẠN NHƯNG ĐẾN KHI NGƯỜI TA ĐỤNG VÀO BẠN…",
    installments: [
      "01 CUỘC CÀ PHÊ LẦN NÀY BẠN TRẢ",
      "01 TIN NHẮN HỎI THĂM TRƯỚC, KHÔNG ĐỢI CÓ VIỆC",
      "01 LẦN NÓI \"CHỊ/EM GIỎI THẬT\" — ĐỪNG GIỮ TRONG LÒNG",
    ],
    questions: [
      {
        id: "chi1",
        prompt: "CÔ ẤY ĐÃ NHƯỜNG NHỊN BẠN BAO NHIÊU NĂM NAY?",
        unitLabel: "NĂM",
        input: "number",
        min: 1, max: 60, step: 1, def: 15,
        formula: (r) => `${num(r, 0)} năm × 365 ngày = ${fmt(num(r, 0) * 365)} phần ngon đã nhường`,
        compute: (r) => num(r, 0) * 365,
        itemName: "PHẦN NGON ĐÃ NHƯỜNG",
        qtyUnit: "phần",
      },
      {
        id: "chi2",
        prompt: "MỖI THÁNG, CÔ ẤY NGHE BẠN THAN THỞ MẤY LẦN?",
        unitLabel: "LẦN / THÁNG",
        input: "number",
        min: 0, max: 60, step: 1, def: 5,
        formula: (r, rw) => `${num(r, 0)} lần × 12 tháng × ${num(rw[0], 0)} năm = ${fmt(num(r, 0) * 12 * num(rw[0], 0))} lần làm chỗ dựa`,
        compute: (r, rw) => num(r, 0) * 12 * num(rw[0], 0),
        itemName: "LẦN LÀM CHỖ DỰA",
        qtyUnit: "lần",
      },
      {
        id: "chi3",
        prompt: "MỖI THÁNG, CÔ ẤY NÓI \"KHÔNG SAO ĐÂU\"… MẤY LẦN ĐỂ BẠN KHỎI LO?",
        unitLabel: "LẦN / THÁNG",
        input: "range",
        min: 1, max: 60, step: 1, def: 10,
        formula: (r, rw) => `ước tính: ${r} lần × 12 tháng × ${num(rw[0], 0)} năm = ${fmt(r * 12 * num(rw[0], 0))} nỗi buồn bị giấu`,
        compute: (r, rw) => r * 12 * num(rw[0], 0),
        itemName: "LẦN GIẤU NỖI BUỒN",
        qtyUnit: "lần",
      },
      {
        id: "chi4",
        prompt: "SỐ BUỔI HẸN VỚI CÔ ẤY MÀ BẠN ĐÃ HỦY PHÚT CHÓT?",
        unitLabel: "BUỔI",
        input: "number",
        min: 0, max: 999, step: 1, def: 3,
        formula: (r) => `${num(r, 0)} buổi × 90 phút = ${fmt(num(r, 0) * 90)} phút chờ một mình`,
        compute: (r) => num(r, 0),
        itemName: "BUỔI HẸN BỊ HỦY",
        qtyUnit: "buổi",
        note: (r) => `≈ ${fmt(num(r, 0) * 90)} phút ngồi bàn hai người, gọi một món`,
      },
      {
        id: "chi5",
        prompt: "CÔ ẤY ĐÃ LÀM THAY BẠN BAO NHIÊU VIỆC VẶT TRONG NHÀ?",
        unitLabel: "VIỆC",
        input: "number",
        min: 0, max: 9999, step: 1, def: 120,
        formula: (r) => `${fmt(num(r, 0))} việc × 20 phút = ${fmt((num(r, 0) * 20) / 60)} giờ đỡ đần`,
        compute: (r) => (num(r, 0) * 20) / 60,
        itemName: "GIỜ LÀM THAY",
        qtyUnit: "giờ",
      },
    ],
  },
  co: {
    key: "co",
    shortName: "CÔ GIÁO",
    fullName: "CÔ GIÁO CŨ",
    tagline: "TÀI KHOẢN MỞ TỪ TIẾT HỌC ĐẦU TIÊN",
    ageHint: "NGƯỜI NHỚ TÊN BẠN DÙ ĐÃ DẠY THÊM HÀNG NGÀN NGƯỜI",
    installments: [
      "01 LẦN GHÉ THĂM LỚP CŨ — CÔ VẪN Ở ĐÓ",
      "01 LỜI NHẮN 20/10, KHÔNG GỬI TIN MẪU",
      "01 CÂU \"CON NHỚ BÀI CÔ DẠY\" — CÔ SẼ NHỚ MÃI",
    ],
    questions: [
      {
        id: "co1",
        prompt: "CÔ ĐÃ ĐỨNG LỚP BAO NHIÊU NĂM?",
        unitLabel: "NĂM",
        input: "number",
        min: 1, max: 45, step: 1, def: 20,
        formula: (r) => `${num(r, 0)} năm × 180 ngày × 5 tiết = ${fmt(num(r, 0) * 900)} tiết dạy`,
        compute: (r) => num(r, 0) * 900,
        itemName: "TIẾT HỌC ĐÃ DẠY",
        qtyUnit: "tiết",
      },
      {
        id: "co2",
        prompt: "MỖI THÁNG, CÔ CHẤM BÀI ĐẾN KHUYA MẤY ĐÊM?",
        unitLabel: "ĐÊM / THÁNG",
        input: "number",
        min: 0, max: 31, step: 1, def: 8,
        formula: (r, rw) => `${num(r, 0)} đêm × 12 tháng × ${num(rw[0], 0)} năm = ${fmt(num(r, 0) * 12 * num(rw[0], 0))} đêm đèn vàng`,
        compute: (r, rw) => num(r, 0) * 12 * num(rw[0], 0),
        itemName: "ĐÊM CHẤM BÀI",
        qtyUnit: "đêm",
      },
      {
        id: "co3",
        prompt: "MỖI TUẦN, CÔ NÉN GIẬN ĐỂ NHẸ NHÀNG NHẮC NHỞ… MẤY LẦN?",
        unitLabel: "LẦN / TUẦN",
        input: "range",
        min: 1, max: 50, step: 1, def: 15,
        formula: (r, rw) => `ước tính: ${r} lần × 40 tuần × ${num(rw[0], 0)} năm = ${fmt(r * 40 * num(rw[0], 0))} lần kiên nhẫn`,
        compute: (r, rw) => r * 40 * num(rw[0], 0),
        itemName: "LẦN KIÊN NHẪN",
        qtyUnit: "lần",
      },
      {
        id: "co4",
        prompt: "ĐÃ BAO NHIÊU NĂM BẠN CHƯA GHÉ THĂM CÔ?",
        unitLabel: "NĂM",
        input: "number",
        min: 0, max: 40, step: 1, def: 3,
        formula: (r) => `${num(r, 0)} năm × 365 ngày = ${fmt(num(r, 0) * 365)} ngày chờ học trò cũ`,
        compute: (r) => num(r, 0) * 365,
        itemName: "NGÀY CHỜ HỌC TRÒ CŨ",
        qtyUnit: "ngày",
      },
      {
        id: "co5",
        prompt: "CÔ ĐÃ VIẾT BAO NHIÊU LỜI PHÊ TRONG VỞ CỦA BẠN?",
        unitLabel: "LỜI PHÊ",
        input: "number",
        min: 0, max: 9999, step: 1, def: 200,
        formula: (r) => `${fmt(num(r, 0))} lời phê × 2 phút = ${fmt((num(r, 0) * 2) / 60)} giờ tâm huyết`,
        compute: (r) => (num(r, 0) * 2) / 60,
        itemName: "GIỜ LỜI PHÊ TÂM HUYẾT",
        qtyUnit: "giờ",
      },
    ],
  },
};

export const REL_LIST: RelConfig[] = [RELS.me, RELS.vo, RELS.chi, RELS.co];

export function buildItems(rel: RelConfig, raws: number[]): LineItem[] {
  return rel.questions.map((q, i) => ({
    name: q.itemName,
    qty: Math.round(q.compute(num(raws[i], 0), raws)),
    unit: q.qtyUnit,
    note: q.note ? q.note(num(raws[i], 0), raws) : undefined,
  }));
}

/** Deterministic pseudo random 0..1 from seed */
export const prand = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};
