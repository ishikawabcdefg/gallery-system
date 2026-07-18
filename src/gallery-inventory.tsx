import React, { useState, useMemo, useEffect, useRef } from "react";

// ─── 定数 ────────────────────────────────────────────────
const STATUSES = {
  in_stock:  { label: "在庫あり", color: "#22c55e" },
  consigned: { label: "委託中",   color: "#38bdf8" },
  sold:      { label: "売却済み", color: "#f87171" },
};
const EVENT_LABELS = {
  purchase:          "仕入",
  purchase_discount: "仕入値引き",
  purchase_increase: "仕入値上げ",
  consign:           "委託",
  return:            "委託返却",
  sold:              "売上",
  sold_discount:     "売上値引き",
  sold_increase:     "売上値上げ",
  memo:              "メモ",
};
const EVENT_COLORS = {
  purchase:          "#60a5fa",
  purchase_discount: "#60a5fa",
  purchase_increase: "#60a5fa",
  consign:           "#5A57A6",
  return:            "#64748b",
  sold:              "#22c55e",
  sold_discount:     "#22c55e",
  sold_increase:     "#22c55e",
  memo:              "#64748b",
};
// 取引先種別バッジは全種別共通でグレーのニュートラルスタイルに統一
const CP_TYPE_BADGE_BG     = "#EFEFEF";
const CP_TYPE_BADGE_BORDER = "#C6C6C8";
const CP_TYPE_BADGE_TEXT   = "#5E6367";

// 全角・半角スペースを半角スペース1つに正規化（連続スペースも圧縮）
const normalizeSpaces = (s: string) => s.replace(/[\u3000\u0020]+/g, " ");

// 価格フィールド用：数値入力→カンマ表示コンポーネント
function PriceInput({ value, onChange, placeholder="例：280000", style={} }: {
  value: number|string; onChange: (v:number)=>void; placeholder?: string; style?: any;
}) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState(String(value||""));
  useEffect(()=>{ if(!focused) setRaw(String(value||"")); },[value,focused]);
  const display = focused ? raw : (value!=null&&value!==""&&!isNaN(Number(value)) ? Number(value).toLocaleString() : "");
  return (
    <input
      style={{...S?.formInput,...style}}
      type={focused?"number":"text"}
      placeholder={placeholder}
      value={display}
      onChange={e=>{setRaw(e.target.value);onChange(Number(e.target.value)||0);}}
      onFocus={()=>{setFocused(true);setRaw(String(value||""));}}
      onBlur={()=>setFocused(false)}
    />
  );
}

// フリガナ用 onBlur サニタイザ：カタカナ・半角スペース・長音符以外を除去し、スペースを正規化
// ひらがな→カタカナ変換
const hiraToKata = (s: string) => s.replace(/[\u3041-\u3096]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));

const sanitizeKana = (s: string) =>
  normalizeSpaces(s.replace(/[^\u30A0-\u30FF\u0020\u3000]/g, "")).trim();

// 作家グループ初期データ（is_foreign:true だった作家を「外国作家」グループに移行）
const initialArtworkGroups = [
  { id: 1, name: "外国作家" },
];

// 取引先種別初期データ
// category: "individual"（氏名を主名称として表示） / "corporate"（会社名を主名称として表示）
const initialCounterpartyTypes = [
  { id: 1, name: "個人",       category: "individual" },
  { id: 2, name: "法人",       category: "corporate" },
  { id: 3, name: "作家",       category: "individual" },
  { id: 4, name: "画廊・施設", category: "corporate" },
];
// 旧仕様（固定enum文字列）からの移行マップ
const LEGACY_CP_TYPE_MAP: Record<string, number> = { individual: 1, corporate: 2, artist: 3, gallery: 4 };
// 旧データ（type: "individual" 等の固定文字列）を type_id（数値）に変換する
const migrateCpType = (cp: any) => {
  if (cp.type_id !== undefined) return cp;
  const { type, ...rest } = cp;
  return { ...rest, type_id: type ? (LEGACY_CP_TYPE_MAP[type] ?? null) : null };
};

const initialArtists = [
  { id: 1,  artist_id: "0001", name: "伊藤 美咲",       name_kana: "イトウ ミサキ",       group_id: null },
  { id: 2,  artist_id: "0002", name: "井上 大輔",       name_kana: "イノウエ ダイスケ",    group_id: null },
  { id: 3,  artist_id: "0003", name: "Elena Rossi",     name_kana: "エレナ ロッシ",       group_id: 1 },
  { id: 4,  artist_id: "0004", name: "加藤 律子",       name_kana: "カトウ リツコ",       group_id: null },
  { id: 5,  artist_id: "0005", name: "木村 咲",         name_kana: "キムラ サキ",         group_id: null },
  { id: 6,  artist_id: "0006", name: "小林 浩二",       name_kana: "コバヤシ コウジ",     group_id: null },
  { id: 7,  artist_id: "0007", name: "佐藤 花",         name_kana: "サトウ ハナ",         group_id: null },
  { id: 8,  artist_id: "0008", name: "清水 隆",         name_kana: "シミズ タカシ",       group_id: null },
  { id: 9,  artist_id: "0009", name: "James Carter",    name_kana: "ジェームズ カーター", group_id: 1 },
  { id: 10, artist_id: "0010", name: "鈴木 一郎",       name_kana: "スズキ イチロウ",     group_id: null },
  { id: 11, artist_id: "0011", name: "Sofia Andersson", name_kana: "ソフィア アンデルション", group_id: 1 },
  { id: 12, artist_id: "0012", name: "田中 誠",         name_kana: "タナカ マコト",       group_id: null },
  { id: 13, artist_id: "0013", name: "Thomas Klein",    name_kana: "トーマス クライン",   group_id: 1 },
  { id: 14, artist_id: "0014", name: "中村 葵",         name_kana: "ナカムラ アオイ",     group_id: null },
  { id: 15, artist_id: "0015", name: "林 雅子",         name_kana: "ハヤシ マサコ",       group_id: null },
  { id: 16, artist_id: "0016", name: "松本 玲",         name_kana: "マツモト レイ",       group_id: null },
  { id: 17, artist_id: "0017", name: "Marie Dupont",    name_kana: "マリー デュポン",     group_id: 1 },
  { id: 18, artist_id: "0018", name: "山田 信夫",       name_kana: "ヤマダ ノブオ",       group_id: null },
  { id: 19, artist_id: "0019", name: "山本 竜",         name_kana: "ヤマモト リュウ",     group_id: null },
  { id: 20, artist_id: "0020", name: "Yuna Park",       name_kana: "ユナ パク",           group_id: 1 },
  { id: 21, artist_id: "0021", name: "吉田 蒼",         name_kana: "ヨシダ アオ",         group_id: null },
  { id: 22, artist_id: "0022", name: "Lucas Bernard",   name_kana: "リュカ ベルナール",   group_id: 1 },
  { id: 23, artist_id: "0023", name: "Luca Ferretti",   name_kana: "ルカ フェレッティ",   group_id: 1 },
  { id: 24, artist_id: "0024", name: "渡辺 健",         name_kana: "ワタナベ ケン",       group_id: null },
];

const initialConsignments = [
  {
    id: 1,
    date: "2023-12-02",
    consignee_id: null,
    consignee_name: "六本木ヒルズ",
    staff_id: 1,
    staff_name: "山田 太郎",
    note: "",
    items: [
      { artwork_id:"2615001", artist:"Lucas Bernard", title:"Deep Memory", size:"F50 (116.7×91.0cm)", announce_price:370000, price:640000 },
      { artwork_id:"2365001", artist:"吉田 蒼", title:"青い物語 09", size:"F3 (27.3×22.0cm)", announce_price:740000, price:290000 },
      { artwork_id:"249G001", artist:"Marie Dupont", title:"Night Landscape No.11", size:"F3 (27.3×22.0cm)", announce_price:690000, price:560000 },
      { artwork_id:"248M001", artist:"伊藤 美咲", title:"静かな残像", size:"F30 (90.9×72.7cm)", announce_price:470000, price:416000 },
      { artwork_id:"235N001", artist:"田中 誠", title:"夜の断章 20", size:"F30 (90.9×72.7cm)", announce_price:160000, price:540000 },
    ],
  },
  {
    id: 2,
    date: "2024-05-14",
    consignee_id: "0003",
    consignee_name: "ホテル椿山荘",
    staff_id: 2,
    staff_name: "鈴木 花子",
    note: "",
    items: [
      { artwork_id:"2538001", artist:"伊藤 美咲", title:"青い輪郭", size:"F50 (116.7×91.0cm)", announce_price:520000, price:466000 },
      { artwork_id:"2566001", artist:"井上 大輔", title:"空の物語 04", size:"F30 (90.9×72.7cm)", announce_price:920000, price:890000 },
      { artwork_id:"247H001", artist:"鈴木 一郎", title:"青い物語", size:"F3 (27.3×22.0cm)", announce_price:700000, price:610000 },
      { artwork_id:"237K001", artist:"Thomas Klein", title:"Distant Landscape", size:"F10 (53.0×45.5cm)", announce_price:350000, price:420000 },
      { artwork_id:"235U001", artist:"佐藤 花", title:"遠い肖像 13", size:"F10 (53.0×45.5cm)", announce_price:2000000, price:370000 },
      { artwork_id:"245S001", artist:"松本 玲", title:"深い気配 07", size:"F6 (41.0×31.8cm)", announce_price:600000, price:760000 },
      { artwork_id:"243I001", artist:"林 雅子", title:"森の季節", size:"F100 (162.1×130.3cm)", announce_price:160000, price:310000 },
      { artwork_id:"251K001", artist:"山本 竜", title:"光の森", size:"F20 (72.7×60.6cm)", announce_price:320000, price:300000 },
      { artwork_id:"248E001", artist:"山本 竜", title:"朝の肖像", size:"F50 (116.7×91.0cm)", announce_price:300000, price:840000 },
    ],
  },
  {
    id: 3,
    date: "2024-09-06",
    consignee_id: "0018",
    consignee_name: "丸の内ビル",
    staff_id: 1,
    staff_name: "山田 太郎",
    note: "",
    items: [
      { artwork_id:"239G001", artist:"小林 浩二", title:"海の輪郭 06", size:"F15 (65.2×53.0cm)", announce_price:1050000, price:260000 },
      { artwork_id:"23CF001", artist:"Sofia Andersson", title:"Blue Landscape", size:"F30 (90.9×72.7cm)", announce_price:410000, price:340000 },
    ],
  },
  {
    id: 4,
    date: "2025-08-08",
    consignee_id: null,
    consignee_name: "品川インターシティ",
    staff_id: 2,
    staff_name: "鈴木 花子",
    note: "",
    items: [
      { artwork_id:"241O001", artist:"渡辺 健", title:"風の物語", size:"F100 (162.1×130.3cm)", announce_price:270000, price:310000 },
      { artwork_id:"24A1001", artist:"木村 咲", title:"深い季節 04", size:"F100 (162.1×130.3cm)", announce_price:610000, price:280000 },
    ],
  },
  {
    id: 5,
    date: "2025-10-12",
    consignee_id: "0017",
    consignee_name: "東京ミッドタウン",
    staff_id: 1,
    staff_name: "山田 太郎",
    note: "",
    items: [
      { artwork_id:"259P001", artist:"中村 葵", title:"空の物語 06", size:"F50 (116.7×91.0cm)", announce_price:1220000, price:480000 },
      { artwork_id:"259P002", artist:"佐藤 花", title:"白い響き", size:"F20 (72.7×60.6cm)", announce_price:1350000, price:100000 },
      { artwork_id:"25BI001", artist:"Sofia Andersson", title:"Deep Dream", size:"F20 (72.7×60.6cm)", announce_price:110000, price:470000 },
    ],
  },
];


// 消費税デフォルト設定
const DEFAULT_TAX_SETTINGS = {
  // 通常消費税率（売上・仕入共通）。from 昇順で保持。
  rates: [
    { from: "1989-04-01", rate: 0.03 },
    { from: "1997-04-01", rate: 0.05 },
    { from: "2014-04-01", rate: 0.08 },
    { from: "2019-10-01", rate: 0.10 },
  ],
  // インボイス未登録事業者からの仕入：経過措置控除割合
  transitionalRates: [
    { from: "2023-10-01", to: "2026-09-30", rate: 0.80 },
    { from: "2026-10-01", to: "2028-09-30", rate: 0.70 },
    { from: "2028-10-01", to: "2029-09-30", rate: 0.50 },
    { from: "2029-10-01", to: "2031-09-30", rate: 0.30 },
    { from: "2031-10-01", to: null,         rate: 0.00 },
  ],
  // 消費税端数処理：'floor'（切り捨て）| 'round'（四捨五入）| 'ceil'（切り上げ）
  rounding: "floor",
};

// 指定日時点の消費税率を返す（売上・仕入共通）
const getTaxRate = (date, rates) => {
  if (!date || !rates || rates.length === 0) return 0.10;
  const sorted = [...rates].sort((a, b) => a.from.localeCompare(b.from));
  let result = sorted[0].rate;
  for (const r of sorted) {
    if (date >= r.from) result = r.rate;
    else break;
  }
  return result;
};

// 仕入日とインボイス有無から控除割合を取得
const getPurchaseCreditRate = (purchaseDate, hasInvoice, taxSettings) => {
  if (!purchaseDate) return 1.0;
  if (hasInvoice) return 1.0;
  const d = purchaseDate;
  for (const r of taxSettings.transitionalRates) {
    if (d >= r.from && (r.to === null || d <= r.to)) return r.rate;
  }
  return 1.0; // 2023-10-01以前は100%
};

// 消費税額計算（税込価格から税抜・税額を逆算）
// rounding: 'floor'=切り捨て, 'round'=四捨五入, 'ceil'=切り上げ
const roundFn = (rounding: string) => {
  if (rounding === "round") return Math.round;
  if (rounding === "ceil")  return Math.ceil;
  return Math.floor;
};
const calcTax = (taxIncPrice, rate, rounding="floor") => {
  if (!taxIncPrice) return { excl: 0, tax: 0 };
  const fn  = roundFn(rounding);
  const tax = fn(taxIncPrice - taxIncPrice / (1 + rate));
  const excl = taxIncPrice - tax;
  return { excl, tax };
};

// その月の末日を返す（y=年, m=月1-12）
const daysInMonthOf = (y, m) => new Date(y, m, 0).getDate();

// "YYYY-MM-DD" 形式の文字列が実在する日付かを判定する
// （JSのDateはオーバーフローを繰り上げてしまうため、年月日を分解して直接検証する）
const isRealDate = (str) => {
  if (!str) return false;
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(str);
  if (!m) return false;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  if (mo < 1 || mo > 12) return false;
  if (d < 1 || d > daysInMonthOf(y, mo)) return false;
  return true;
};

// ─── サンプルデータ ───────────────────────────────────────
const initialCounterparties = [
  {
    id: 1, cp_id: "0001", invoice_no: "T1234567890123", invoice_from: "2023-10-01", invoice_to: null, type_id: 3, name: "田中 誠", name_kana: "タナカ マコト",
    company: null, department: null,
    email: "tanaka@example.com", phone: "090-1234-5678",
    zip: "150-0001", address: "東京都渋谷区神南1-1-1", building: "", note: "油彩専門。毎年個展開催。",
  },
  {
    id: 2, cp_id: "0002", invoice_no: "", invoice_from: null, invoice_to: null, type_id: 1, name: "田村 一郎", name_kana: "タムラ イチロウ",
    company: "田村商事株式会社", department: null,
    email: "tamura@example.com", phone: "03-1234-5678",
    zip: "106-0032", address: "東京都港区六本木1-2-3", building: "田村ビル4F", note: "コレクター。近代日本画を好む。",
  },
  {
    id: 3, cp_id: "0003", invoice_no: "T9876543210987", invoice_from: "2023-10-01", invoice_to: null, type_id: 4, name: null, name_kana: null,
    company: "ホテル椿山荘", department: "宴会・文化事業部",
    email: "art@tsubakiyama.example.com", phone: "03-9876-5432",
    zip: "112-8680", address: "東京都文京区関口2-10-8", building: "", note: "ロビー展示スペースあり。",
  },
  {
    id: 4, cp_id: "0004", invoice_no: "T1111222233334", invoice_from: "2023-10-01", invoice_to: null, type_id: 3, name: "山本 竜", name_kana: "ヤマモト リュウ",
    company: null, department: null,
    email: "yamamoto@example.com", phone: "06-1111-2222",
    zip: "530-0001", address: "大阪府大阪市北区梅田1-1-1", building: "", note: "版画・シルクスクリーン専門。",
  },
  {
    id: 5, cp_id: "0005", invoice_no: "T5555666677778", invoice_from: "2023-10-01", invoice_to: null, type_id: 2, name: null, name_kana: null,
    company: "株式会社アート・ソリューションズ", department: "コレクション部",
    email: "collection@artsol.example.com", phone: "03-5555-6666",
    zip: "100-0001", address: "東京都千代田区千代田1-1", building: "千代田ビル10F", note: "企業コレクション担当。大口取引あり。",
  },
  {
    id: 6, cp_id: "0006", invoice_no: "T2222333344445", invoice_from: "2023-10-01", invoice_to: null, type_id: 4, name: null, name_kana: "タナカ アトリエ",
    company: "田中アトリエ", department: null,
    email: "", phone: "", zip: "", address: "", building: "", note: "作家直営アトリエ。直接買付。",
  },
  {
    id: 7, cp_id: "0007", invoice_no: "T3333444455556", invoice_from: "2023-10-01", invoice_to: null, type_id: 4, name: null, name_kana: "アート オオサカ ジッコウ イインカイ",
    company: "アート大阪実行委員会", department: null,
    email: "", phone: "", zip: "", address: "", building: "", note: "アート大阪出展作家より仕入れ。",
  },
  {
    id: 8, cp_id: "0008", invoice_no: "", invoice_from: null, invoice_to: null, type_id: 4, name: null, name_kana: "ガレリア ヴィスタ",
    company: "ガレリア・ヴィスタ", department: null,
    email: "", phone: "", zip: "", address: "", building: "", note: "ミラノ系現代アートギャラリー。海外作家取次。",
  },
  {
    id: 9, cp_id: "0009", invoice_no: "T4444555566667", invoice_from: "2023-10-01", invoice_to: null, type_id: 4, name: null, name_kana: "ギンザ アート コレクティブ",
    company: "銀座アートコレクティブ", department: null,
    email: "", phone: "", zip: "", address: "", building: "", note: "銀座エリアの作家グループ。年2回企画展開催。",
  },
  {
    id: 10, cp_id: "0010", invoice_no: "", invoice_from: null, invoice_to: null, type_id: 4, name: null, name_kana: "スペース ムー",
    company: "スペース・ムー", department: null,
    email: "", phone: "", zip: "", address: "", building: "", note: "渋谷区の貸しギャラリー。個展作品の買取対応あり。",
  },
  {
    id: 11, cp_id: "0011", invoice_no: "", invoice_from: null, invoice_to: null, type_id: 4, name: null, name_kana: "アートブリッジ インターナショナル",
    company: "アートブリッジ・インターナショナル", department: null,
    email: "", phone: "", zip: "", address: "", building: "", note: "欧米作家の日本展開を支援するエージェント会社。",
  },
  {
    id: 12, cp_id: "0012", invoice_no: "T6666777788889", invoice_from: "2023-10-01", invoice_to: null, type_id: 4, name: null, name_kana: "オークション ハウス セントラル",
    company: "オークションハウス・セントラル", department: null,
    email: "", phone: "", zip: "", address: "", building: "", note: "東京都内の美術品競売会社。",
  },
  {
    id: 13, cp_id: "0013", invoice_no: "T7777888899990", invoice_from: "2023-10-01", invoice_to: null, type_id: 4, name: null, name_kana: "シンワ オークション",
    company: "シンワオークション株式会社", department: null,
    email: "", phone: "", zip: "", address: "", building: "", note: "国内大手美術品オークション会社。",
  },
  {
    id: 14, cp_id: "0014", invoice_no: "", invoice_from: null, invoice_to: null, type_id: 4, name: null, name_kana: "アトリエ ノルド",
    company: "アトリエ・ノルド", department: null,
    email: "", phone: "", zip: "", address: "", building: "", note: "北欧系作家のエージェント兼ギャラリー。",
  },
  {
    id: 15, cp_id: "0015", invoice_no: "T8888999900001", invoice_from: "2023-10-01", invoice_to: null, type_id: 4, name: null, name_kana: "ギンザ アートギャラリー イチバンカン",
    company: "銀座アートギャラリー・壱番館", department: null,
    email: "", phone: "", zip: "", address: "", building: "", note: "銀座中央通り沿いの老舗画廊。",
  }
];

const initialArtworks = [
  {
    id: 1, artwork_id: "25EA001", title: "夜明けの海", artist: "田中 誠", artist_id: "0002", artist_kana: "タナカ マコト", medium: "油彩",
    size: "F30 (90.9×72.7cm)", appraisal: "東京美術倶楽部",
    purchase_price: 280000, supplier: "田中 誠", supplier_id: "0001",
    announce_price: 580000,
    consignment_price: null, consignee: null, consignee_id: null, consigned_at: null,
    sold_price: null, buyer: null, buyer_id: null,
    status: "in_stock", purchased_at: "2025-05-10", sold_at: null,
  },
  {
    id: 2, artwork_id: "2493001", title: "静物 No.7", artist: "佐藤 花", artist_id: "0001", artist_kana: "サトウ ハナ", medium: "水彩",
    size: "F10 (53.0×45.5cm)", appraisal: "",
    purchase_price: 95000, supplier: "銀座アートギャラリー・壱番館", supplier_id: "0015",
    announce_price: 220000,
    consignment_price: null, consignee: null, consignee_id: null, consigned_at: null,
    sold_price: 200000, buyer: "田村 一郎", buyer_id: "0002",
    status: "sold", purchased_at: "2024-09-03", sold_at: "2025-01-15",
  },
  {
    id: 3, artwork_id: "251K001", title: "光の森", artist: "山本 竜", artist_id: "0019", artist_kana: "ヤマモト リュウ", medium: "版画",
    size: "F20 (72.7×60.6cm)", appraisal: "日動美術財団",
    purchase_price: 150000, supplier: "山本 竜", supplier_id: "0004",
    announce_price: 320000,
    consignment_price: 300000, consignee: "ホテル椿山荘", consignee_id: "0003", consigned_at: "2025-03-01",
    sold_price: null, buyer: null, buyer_id: null,
    status: "consigned", purchased_at: "2025-01-20", sold_at: null,
  },
];

const initialHistory = [
  { id: 1, artwork_id: "25EA001", event_type: "purchase", old_price: null,   new_price: 280000, counterparty: "田中 誠",       counterparty_id: "0001", memo: "アトリエ直接仕入",      created_at: "2024-11-10", purchase_tax: 25454, tax_credit: 25454 },
  { id: 2, artwork_id: "2493001", event_type: "purchase", old_price: null,   new_price: 95000,  counterparty: "銀座アートギャラリー・壱番館", counterparty_id: "0015", memo: "グループ展より引き取り", created_at: "2024-09-03", purchase_tax: 8636,  tax_credit: 8636  },
  { id: 3, artwork_id: "2493001", event_type: "sold_discount", old_price: 220000, new_price: 200000, counterparty: "田村 一郎",     counterparty_id: "0002", memo: "顧客交渉により値引き",  created_at: "2025-01-15" },
  { id: 4, artwork_id: "2493001", event_type: "sold",     old_price: null,   new_price: 200000, counterparty: "田村 一郎",     counterparty_id: "0002", memo: "田村様コレクションへ",  created_at: "2025-01-15" },
  { id: 5, artwork_id: "251K001", event_type: "purchase", old_price: null,   new_price: 150000, counterparty: "山本 竜",       counterparty_id: "0004", memo: "直接購入",              created_at: "2025-01-20", purchase_tax: 13636, tax_credit: 13636 },
  { id: 6, artwork_id: "251K001", event_type: "consign",  old_price: null,   new_price: 300000, counterparty: "ホテル椿山荘",  counterparty_id: "0003", memo: "ロビー展示",            created_at: "2025-03-01" },
];

const additionalArtworks = [
  {
        id: 4,
        artwork_id: "256G001",
        title: "朝の物語",
        artist: "松本 玲", artist_id: "0016",
        artist_kana: "マツモト レイ",
        medium: "パステル",
        size: "F50 (116.7×91.0cm)",
        appraisal: "日動美術財団",
        purchase_price: 350000,
        supplier: "田中アトリエ",
        supplier_id: "0006",
        announce_price: 1080000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2025-06-16",
        sold_at: null
    },
  {
        id: 5,
        artwork_id: "256A001",
        title: "夜の時間 06",
        artist: "清水 隆", artist_id: "0008",
        artist_kana: "シミズ タカシ",
        medium: "水彩",
        size: "F15 (65.2×53.0cm)",
        appraisal: "",
        purchase_price: 300000,
        supplier: "オークションハウス・セントラル",
        supplier_id: "0012",
        announce_price: 760000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 648000,
        buyer: "伊藤コレクション",
        buyer_id: null,
        status: "sold",
        purchased_at: "2025-06-10",
        sold_at: "2026-01-29"
    },
  {
        id: 6,
        artwork_id: "258S001",
        title: "深い静寂",
        artist: "山本 竜", artist_id: "0019",
        artist_kana: "ヤマモト リュウ",
        medium: "版画",
        size: "F3 (27.3×22.0cm)",
        appraisal: "",
        purchase_price: 280000,
        supplier: "田中アトリエ",
        supplier_id: "0006",
        announce_price: 890000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2025-08-28",
        sold_at: null
    },
  {
        id: 7,
        artwork_id: "258N001",
        title: "風の気配 20",
        artist: "伊藤 美咲", artist_id: "0001",
        artist_kana: "イトウ ミサキ",
        medium: "パステル",
        size: "F30 (90.9×72.7cm)",
        appraisal: "",
        purchase_price: 150000,
        supplier: "田中アトリエ",
        supplier_id: "0006",
        announce_price: 420000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2025-08-23",
        sold_at: null
    },
  {
        id: 8,
        artwork_id: "255N001",
        title: "雨の時間",
        artist: "山本 竜", artist_id: "0019",
        artist_kana: "ヤマモト リュウ",
        medium: "ミクストメディア",
        size: "F50 (116.7×91.0cm)",
        appraisal: "",
        purchase_price: 50000,
        supplier: "スペース・ムー",
        supplier_id: "0010",
        announce_price: 110000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2025-05-23",
        sold_at: null
    },
  {
        id: 9,
        artwork_id: "259P001",
        title: "空の物語 06",
        artist: "中村 葵", artist_id: "0014",
        artist_kana: "ナカムラ アオイ",
        medium: "水彩",
        size: "F50 (116.7×91.0cm)",
        appraisal: "東京美術倶楽部",
        purchase_price: 500000,
        supplier: "スペース・ムー",
        supplier_id: "0010",
        announce_price: 1220000,
        consignment_price: 1060000,
        consignee: "東京ミッドタウン",
        consignee_id: null,
        consigned_at: "2026-03-22",
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "consigned",
        purchased_at: "2025-09-25",
        sold_at: null
    },
  {
        id: 10,
        artwork_id: "2615001",
        title: "Deep Memory",
        artist: "Lucas Bernard", artist_id: "0022",
        artist_kana: "リュカ ベルナール",
        medium: "油彩",
        size: "F50 (116.7×91.0cm)",
        appraisal: "",
        purchase_price: 150000,
        supplier: "スペース・ムー",
        supplier_id: "0010",
        announce_price: 370000,
        consignment_price: 318000,
        consignee: "六本木ヒルズ",
        consignee_id: null,
        consigned_at: "2026-03-24",
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "consigned",
        purchased_at: "2026-01-05",
        sold_at: null
    },
  {
        id: 11,
        artwork_id: "256B001",
        title: "Empty Trace",
        artist: "Thomas Klein", artist_id: "0013",
        artist_kana: "トーマス クライン",
        medium: "版画",
        size: "F15 (65.2×53.0cm)",
        appraisal: "",
        purchase_price: 80000,
        supplier: "スペース・ムー",
        supplier_id: "0010",
        announce_price: 210000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2025-06-11",
        sold_at: null
    },
  {
        id: 12,
        artwork_id: "249J001",
        title: "Golden Story",
        artist: "James Carter", artist_id: "0009",
        artist_kana: "ジェームズ カーター",
        medium: "版画",
        size: "F10 (53.0×45.5cm)",
        appraisal: "",
        purchase_price: 500000,
        supplier: "ガレリア・ヴィスタ",
        supplier_id: "0008",
        announce_price: 1190000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 1134000,
        buyer: "伊藤コレクション",
        buyer_id: null,
        status: "sold",
        purchased_at: "2024-09-19",
        sold_at: "2025-06-08"
    },
  {
        id: 13,
        artwork_id: "257F001",
        title: "遠い旅",
        artist: "渡辺 健", artist_id: "0024",
        artist_kana: "ワタナベ ケン",
        medium: "シルクスクリーン",
        size: "F6 (41.0×31.8cm)",
        appraisal: "光仁会",
        purchase_price: 500000,
        supplier: "田中アトリエ",
        supplier_id: "0006",
        announce_price: 1020000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 1008000,
        buyer: "山口 恵子",
        buyer_id: null,
        status: "sold",
        purchased_at: "2025-07-15",
        sold_at: "2025-11-19"
    },
  {
        id: 14,
        artwork_id: "25BS001",
        title: "Red Space",
        artist: "Luca Ferretti", artist_id: "0023",
        artist_kana: "ルカ フェレッティ",
        medium: "版画",
        size: "F20 (72.7×60.6cm)",
        appraisal: "",
        purchase_price: 330000,
        supplier: "アートブリッジ・インターナショナル",
        supplier_id: "0011",
        announce_price: 850000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 729000,
        buyer: "鈴木 淳",
        buyer_id: null,
        status: "sold",
        purchased_at: "2025-11-28",
        sold_at: "2026-03-16"
    },
  {
        id: 15,
        artwork_id: "238A001",
        title: "青い情景",
        artist: "井上 大輔", artist_id: "0002",
        artist_kana: "イノウエ ダイスケ",
        medium: "油彩",
        size: "F30 (90.9×72.7cm)",
        appraisal: "",
        purchase_price: 250000,
        supplier: "銀座アートコレクティブ",
        supplier_id: "0009",
        announce_price: 830000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2023-08-10",
        sold_at: null
    },
  {
        id: 16,
        artwork_id: "2414001",
        title: "遠い輪郭 03",
        artist: "清水 隆", artist_id: "0008",
        artist_kana: "シミズ タカシ",
        medium: "水彩",
        size: "F3 (27.3×22.0cm)",
        appraisal: "日動美術財団",
        purchase_price: 500000,
        supplier: "アート大阪実行委員会",
        supplier_id: "0007",
        announce_price: 1000000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2024-01-04",
        sold_at: null
    },
  {
        id: 17,
        artwork_id: "24AC001",
        title: "Silent Form No.9",
        artist: "Lucas Bernard", artist_id: "0022",
        artist_kana: "リュカ ベルナール",
        medium: "水彩",
        size: "F30 (90.9×72.7cm)",
        appraisal: "",
        purchase_price: 500000,
        supplier: "アートブリッジ・インターナショナル",
        supplier_id: "0011",
        announce_price: 1190000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 1054000,
        buyer: "山口 恵子",
        buyer_id: null,
        status: "sold",
        purchased_at: "2024-10-12",
        sold_at: "2026-05-08"
    },
  {
        id: 18,
        artwork_id: "2393001",
        title: "静かな静寂 08",
        artist: "木村 咲", artist_id: "0005",
        artist_kana: "キムラ サキ",
        medium: "アクリル",
        size: "F20 (72.7×60.6cm)",
        appraisal: "",
        purchase_price: 150000,
        supplier: "アトリエ・ノルド",
        supplier_id: "0014",
        announce_price: 390000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 346000,
        buyer: "伊藤コレクション",
        buyer_id: null,
        status: "sold",
        purchased_at: "2023-09-03",
        sold_at: "2025-11-02"
    },
  {
        id: 19,
        artwork_id: "257C001",
        title: "記憶の肖像 11",
        artist: "鈴木 一郎", artist_id: "0010",
        artist_kana: "スズキ イチロウ",
        medium: "水彩",
        size: "F3 (27.3×22.0cm)",
        appraisal: "",
        purchase_price: 350000,
        supplier: "銀座アートギャラリー・壱番館",
        supplier_id: "0015",
        announce_price: 1220000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 1109000,
        buyer: "田村 一郎",
        buyer_id: "0002",
        status: "sold",
        purchased_at: "2025-07-12",
        sold_at: "2026-01-04"
    },
  {
        id: 20,
        artwork_id: "2452001",
        title: "夜の情景",
        artist: "渡辺 健", artist_id: "0024",
        artist_kana: "ワタナベ ケン",
        medium: "ミクストメディア",
        size: "F100 (162.1×130.3cm)",
        appraisal: "",
        purchase_price: 80000,
        supplier: "シンワオークション株式会社",
        supplier_id: "0013",
        announce_price: 230000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 202000,
        buyer: "鈴木 淳",
        buyer_id: null,
        status: "sold",
        purchased_at: "2024-05-02",
        sold_at: "2026-04-05"
    },
  {
        id: 21,
        artwork_id: "2544001",
        title: "Red Memory",
        artist: "James Carter", artist_id: "0009",
        artist_kana: "ジェームズ カーター",
        medium: "アクリル",
        size: "F15 (65.2×53.0cm)",
        appraisal: "",
        purchase_price: 280000,
        supplier: "アートブリッジ・インターナショナル",
        supplier_id: "0011",
        announce_price: 900000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 862000,
        buyer: "株式会社アート・ソリューションズ",
        buyer_id: "0005",
        status: "sold",
        purchased_at: "2025-04-04",
        sold_at: "2026-04-22"
    },
  {
        id: 22,
        artwork_id: "238S001",
        title: "夜の輪郭 10",
        artist: "伊藤 美咲", artist_id: "0001",
        artist_kana: "イトウ ミサキ",
        medium: "版画",
        size: "F50 (116.7×91.0cm)",
        appraisal: "",
        purchase_price: 200000,
        supplier: "ガレリア・ヴィスタ",
        supplier_id: "0008",
        announce_price: 650000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2023-08-28",
        sold_at: null
    },
  {
        id: 23,
        artwork_id: "256Q001",
        title: "Empty Memory",
        artist: "James Carter", artist_id: "0009",
        artist_kana: "ジェームズ カーター",
        medium: "水彩",
        size: "F3 (27.3×22.0cm)",
        appraisal: "",
        purchase_price: 280000,
        supplier: "アートブリッジ・インターナショナル",
        supplier_id: "0011",
        announce_price: 610000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2025-06-26",
        sold_at: null
    },
  {
        id: 24,
        artwork_id: "2424001",
        title: "静かな時間",
        artist: "中村 葵", artist_id: "0014",
        artist_kana: "ナカムラ アオイ",
        medium: "アクリル",
        size: "F20 (72.7×60.6cm)",
        appraisal: "",
        purchase_price: 96000,
        supplier: "銀座アートギャラリー・壱番館",
        supplier_id: "0015",
        announce_price: 220000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 204000,
        buyer: "山口 恵子",
        buyer_id: null,
        status: "sold",
        purchased_at: "2024-02-04",
        sold_at: "2025-11-11"
    },
  {
        id: 25,
        artwork_id: "2451001",
        title: "青い断章",
        artist: "加藤 律子", artist_id: "0004",
        artist_kana: "カトウ リツコ",
        medium: "素描",
        size: "F10 (53.0×45.5cm)",
        appraisal: "",
        purchase_price: 73000,
        supplier: "アート大阪実行委員会",
        supplier_id: "0007",
        announce_price: 210000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2024-05-01",
        sold_at: null
    },
  {
        id: 26,
        artwork_id: "239G001",
        title: "海の輪郭 06",
        artist: "小林 浩二", artist_id: "0006",
        artist_kana: "コバヤシ コウジ",
        medium: "水彩",
        size: "F15 (65.2×53.0cm)",
        appraisal: "",
        purchase_price: 332000,
        supplier: "銀座アートコレクティブ",
        supplier_id: "0009",
        announce_price: 1050000,
        consignment_price: 933000,
        consignee: "丸の内ビル",
        consignee_id: null,
        consigned_at: "2024-09-06",
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "consigned",
        purchased_at: "2023-09-16",
        sold_at: null
    },
  {
        id: 27,
        artwork_id: "2624001",
        title: "静かな旅",
        artist: "吉田 蒼", artist_id: "0021",
        artist_kana: "ヨシダ アオ",
        medium: "シルクスクリーン",
        size: "F3 (27.3×22.0cm)",
        appraisal: "",
        purchase_price: 231000,
        supplier: "ガレリア・ヴィスタ",
        supplier_id: "0008",
        announce_price: 580000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 567000,
        buyer: "伊藤コレクション",
        buyer_id: null,
        status: "sold",
        purchased_at: "2026-02-04",
        sold_at: "2026-04-04"
    },
  {
        id: 28,
        artwork_id: "261T001",
        title: "森の残像",
        artist: "井上 大輔", artist_id: "0002",
        artist_kana: "イノウエ ダイスケ",
        medium: "シルクスクリーン",
        size: "F50 (116.7×91.0cm)",
        appraisal: "",
        purchase_price: 600000,
        supplier: "銀座アートギャラリー・壱番館",
        supplier_id: "0015",
        announce_price: 1660000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2026-01-29",
        sold_at: null
    },
  {
        id: 29,
        artwork_id: "23AP001",
        title: "Night Echo",
        artist: "Elena Rossi", artist_id: "0003",
        artist_kana: "エレナ ロッシ",
        medium: "油彩",
        size: "F30 (90.9×72.7cm)",
        appraisal: "",
        purchase_price: 350000,
        supplier: "アートブリッジ・インターナショナル",
        supplier_id: "0011",
        announce_price: 860000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 773000,
        buyer: "株式会社アート・ソリューションズ",
        buyer_id: "0005",
        status: "sold",
        purchased_at: "2023-10-25",
        sold_at: "2025-06-12"
    },
  {
        id: 30,
        artwork_id: "247S001",
        title: "空の時間",
        artist: "渡辺 健", artist_id: "0024",
        artist_kana: "ワタナベ ケン",
        medium: "水彩",
        size: "F20 (72.7×60.6cm)",
        appraisal: "光仁会",
        purchase_price: 500000,
        supplier: "シンワオークション株式会社",
        supplier_id: "0013",
        announce_price: 1060000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2024-07-28",
        sold_at: null
    },
  {
        id: 31,
        artwork_id: "2538001",
        title: "青い輪郭",
        artist: "伊藤 美咲", artist_id: "0001",
        artist_kana: "イトウ ミサキ",
        medium: "シルクスクリーン",
        size: "F50 (116.7×91.0cm)",
        appraisal: "",
        purchase_price: 139000,
        supplier: "オークションハウス・セントラル",
        supplier_id: "0012",
        announce_price: 520000,
        consignment_price: 466000,
        consignee: "ホテル椿山荘",
        consignee_id: "0003",
        consigned_at: "2025-08-29",
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "consigned",
        purchased_at: "2025-03-08",
        sold_at: null
    },
  {
        id: 32,
        artwork_id: "262F001",
        title: "深い輪郭",
        artist: "中村 葵", artist_id: "0014",
        artist_kana: "ナカムラ アオイ",
        medium: "アクリル",
        size: "F6 (41.0×31.8cm)",
        appraisal: "",
        purchase_price: 100000,
        supplier: "ガレリア・ヴィスタ",
        supplier_id: "0008",
        announce_price: 220000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2026-02-15",
        sold_at: null
    },
  {
        id: 33,
        artwork_id: "24B8001",
        title: "海の輪郭",
        artist: "中村 葵", artist_id: "0014",
        artist_kana: "ナカムラ アオイ",
        medium: "油彩",
        size: "F20 (72.7×60.6cm)",
        appraisal: "日本美術鑑定協会",
        purchase_price: 573000,
        supplier: "オークションハウス・セントラル",
        supplier_id: "0012",
        announce_price: 1540000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2024-11-08",
        sold_at: null
    },
  {
        id: 34,
        artwork_id: "241O001",
        title: "風の物語",
        artist: "渡辺 健", artist_id: "0024",
        artist_kana: "ワタナベ ケン",
        medium: "水彩",
        size: "F100 (162.1×130.3cm)",
        appraisal: "",
        purchase_price: 80000,
        supplier: "銀座アートギャラリー・壱番館",
        supplier_id: "0015",
        announce_price: 270000,
        consignment_price: 256000,
        consignee: "品川インターシティ",
        consignee_id: null,
        consigned_at: "2025-08-08",
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "consigned",
        purchased_at: "2024-01-24",
        sold_at: null
    },
  {
        id: 35,
        artwork_id: "2561001",
        title: "光の季節",
        artist: "木村 咲", artist_id: "0005",
        artist_kana: "キムラ サキ",
        medium: "油彩",
        size: "F6 (41.0×31.8cm)",
        appraisal: "日動美術財団",
        purchase_price: 350000,
        supplier: "アトリエ・ノルド",
        supplier_id: "0014",
        announce_price: 1100000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2025-06-01",
        sold_at: null
    },
  {
        id: 36,
        artwork_id: "2521001",
        title: "雨の物語 14",
        artist: "山田 信夫", artist_id: "0018",
        artist_kana: "ヤマダ ノブオ",
        medium: "油彩",
        size: "F15 (65.2×53.0cm)",
        appraisal: "",
        purchase_price: 100000,
        supplier: "銀座アートギャラリー・壱番館",
        supplier_id: "0015",
        announce_price: 330000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2025-02-01",
        sold_at: null
    },
  {
        id: 37,
        artwork_id: "243P001",
        title: "Light Dream",
        artist: "Marie Dupont", artist_id: "0017",
        artist_kana: "マリー デュポン",
        medium: "油彩",
        size: "F3 (27.3×22.0cm)",
        appraisal: "",
        purchase_price: 150000,
        supplier: "アートブリッジ・インターナショナル",
        supplier_id: "0011",
        announce_price: 420000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 374000,
        buyer: "橋本 修",
        buyer_id: null,
        status: "sold",
        purchased_at: "2024-03-25",
        sold_at: "2024-09-10"
    },
  {
        id: 38,
        artwork_id: "24CV001",
        title: "白い空間 09",
        artist: "清水 隆", artist_id: "0008",
        artist_kana: "シミズ タカシ",
        medium: "版画",
        size: "F3 (27.3×22.0cm)",
        appraisal: "",
        purchase_price: 100000,
        supplier: "アトリエ・ノルド",
        supplier_id: "0014",
        announce_price: 270000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 246000,
        buyer: "橋本 修",
        buyer_id: null,
        status: "sold",
        purchased_at: "2024-12-31",
        sold_at: "2026-01-27"
    },
  {
        id: 39,
        artwork_id: "257I001",
        title: "光の輪郭",
        artist: "中村 葵", artist_id: "0014",
        artist_kana: "ナカムラ アオイ",
        medium: "ミクストメディア",
        size: "F100 (162.1×130.3cm)",
        appraisal: "日動美術財団",
        purchase_price: 500000,
        supplier: "田中アトリエ",
        supplier_id: "0006",
        announce_price: 1650000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2025-07-18",
        sold_at: null
    },
  {
        id: 40,
        artwork_id: "246R001",
        title: "白い気配",
        artist: "佐藤 花", artist_id: "0007",
        artist_kana: "サトウ ハナ",
        medium: "アクリル",
        size: "F20 (72.7×60.6cm)",
        appraisal: "",
        purchase_price: 188000,
        supplier: "ガレリア・ヴィスタ",
        supplier_id: "0008",
        announce_price: 510000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 481000,
        buyer: "山口 恵子",
        buyer_id: null,
        status: "sold",
        purchased_at: "2024-06-27",
        sold_at: "2025-12-01"
    },
  {
        id: 41,
        artwork_id: "254S001",
        title: "風の気配",
        artist: "井上 大輔", artist_id: "0002",
        artist_kana: "イノウエ ダイスケ",
        medium: "版画",
        size: "F30 (90.9×72.7cm)",
        appraisal: "",
        purchase_price: 400000,
        supplier: "アトリエ・ノルド",
        supplier_id: "0014",
        announce_price: 890000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2025-04-28",
        sold_at: null
    },
  {
        id: 42,
        artwork_id: "257L001",
        title: "赤い響き",
        artist: "井上 大輔", artist_id: "0002",
        artist_kana: "イノウエ ダイスケ",
        medium: "水彩",
        size: "F50 (116.7×91.0cm)",
        appraisal: "",
        purchase_price: 150000,
        supplier: "アート大阪実行委員会",
        supplier_id: "0007",
        announce_price: 450000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 436000,
        buyer: "鈴木 淳",
        buyer_id: null,
        status: "sold",
        purchased_at: "2025-07-21",
        sold_at: "2025-12-24"
    },
  {
        id: 43,
        artwork_id: "241C001",
        title: "遠い断章",
        artist: "渡辺 健", artist_id: "0024",
        artist_kana: "ワタナベ ケン",
        medium: "アクリル",
        size: "F50 (116.7×91.0cm)",
        appraisal: "",
        purchase_price: 600000,
        supplier: "アトリエ・ノルド",
        supplier_id: "0014",
        announce_price: 1250000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 1144000,
        buyer: "鈴木 淳",
        buyer_id: null,
        status: "sold",
        purchased_at: "2024-01-12",
        sold_at: "2024-11-05"
    },
  {
        id: 44,
        artwork_id: "253B001",
        title: "赤い響き",
        artist: "鈴木 一郎", artist_id: "0010",
        artist_kana: "スズキ イチロウ",
        medium: "版画",
        size: "F50 (116.7×91.0cm)",
        appraisal: "",
        purchase_price: 100000,
        supplier: "ガレリア・ヴィスタ",
        supplier_id: "0008",
        announce_price: 290000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 283000,
        buyer: "山口 恵子",
        buyer_id: null,
        status: "sold",
        purchased_at: "2025-03-11",
        sold_at: "2026-03-29"
    },
  {
        id: 45,
        artwork_id: "24A1001",
        title: "深い季節 04",
        artist: "木村 咲", artist_id: "0005",
        artist_kana: "キムラ サキ",
        medium: "リトグラフ",
        size: "F100 (162.1×130.3cm)",
        appraisal: "",
        purchase_price: 300000,
        supplier: "アトリエ・ノルド",
        supplier_id: "0014",
        announce_price: 610000,
        consignment_price: 557000,
        consignee: "品川インターシティ",
        consignee_id: null,
        consigned_at: "2025-11-09",
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "consigned",
        purchased_at: "2024-10-01",
        sold_at: null
    },
  {
        id: 46,
        artwork_id: "2566001",
        title: "空の物語 04",
        artist: "井上 大輔", artist_id: "0002",
        artist_kana: "イノウエ ダイスケ",
        medium: "素描",
        size: "F30 (90.9×72.7cm)",
        appraisal: "",
        purchase_price: 350000,
        supplier: "銀座アートギャラリー・壱番館",
        supplier_id: "0015",
        announce_price: 920000,
        consignment_price: 795000,
        consignee: "ホテル椿山荘",
        consignee_id: "0003",
        consigned_at: "2026-04-17",
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "consigned",
        purchased_at: "2025-06-06",
        sold_at: null
    },
  {
        id: 47,
        artwork_id: "257J001",
        title: "静かな情景",
        artist: "山本 竜", artist_id: "0019",
        artist_kana: "ヤマモト リュウ",
        medium: "アクリル",
        size: "F10 (53.0×45.5cm)",
        appraisal: "",
        purchase_price: 46000,
        supplier: "銀座アートコレクティブ",
        supplier_id: "0009",
        announce_price: 170000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2025-07-19",
        sold_at: null
    },
  {
        id: 48,
        artwork_id: "24B1001",
        title: "Light Landscape",
        artist: "Elena Rossi", artist_id: "0003",
        artist_kana: "エレナ ロッシ",
        medium: "アクリル",
        size: "F15 (65.2×53.0cm)",
        appraisal: "",
        purchase_price: 300000,
        supplier: "アートブリッジ・インターナショナル",
        supplier_id: "0011",
        announce_price: 750000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2024-11-01",
        sold_at: null
    },
  {
        id: 49,
        artwork_id: "253D001",
        title: "記憶の風景",
        artist: "山田 信夫", artist_id: "0018",
        artist_kana: "ヤマダ ノブオ",
        medium: "パステル",
        size: "F15 (65.2×53.0cm)",
        appraisal: "",
        purchase_price: 50000,
        supplier: "銀座アートコレクティブ",
        supplier_id: "0009",
        announce_price: 160000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2025-03-13",
        sold_at: null
    },
  {
        id: 50,
        artwork_id: "259P002",
        title: "白い響き",
        artist: "佐藤 花", artist_id: "0007",
        artist_kana: "サトウ ハナ",
        medium: "素描",
        size: "F20 (72.7×60.6cm)",
        appraisal: "",
        purchase_price: 500000,
        supplier: "スペース・ムー",
        supplier_id: "0010",
        announce_price: 1350000,
        consignment_price: 1261000,
        consignee: "東京ミッドタウン",
        consignee_id: null,
        consigned_at: "2025-10-12",
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "consigned",
        purchased_at: "2025-09-25",
        sold_at: null
    },
  {
        id: 51,
        artwork_id: "251U001",
        title: "夜の響き",
        artist: "中村 葵", artist_id: "0014",
        artist_kana: "ナカムラ アオイ",
        medium: "リトグラフ",
        size: "F3 (27.3×22.0cm)",
        appraisal: "",
        purchase_price: 50000,
        supplier: "オークションハウス・セントラル",
        supplier_id: "0012",
        announce_price: 170000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2025-01-30",
        sold_at: null
    },
  {
        id: 52,
        artwork_id: "2466001",
        title: "White Time No.11",
        artist: "Yuna Park", artist_id: "0020",
        artist_kana: "ユナ パク",
        medium: "油彩",
        size: "F10 (53.0×45.5cm)",
        appraisal: "",
        purchase_price: 200000,
        supplier: "アートブリッジ・インターナショナル",
        supplier_id: "0011",
        announce_price: 680000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2024-06-06",
        sold_at: null
    },
  {
        id: 53,
        artwork_id: "261U001",
        title: "夜の断章 03",
        artist: "佐藤 花", artist_id: "0007",
        artist_kana: "サトウ ハナ",
        medium: "アクリル",
        size: "F20 (72.7×60.6cm)",
        appraisal: "",
        purchase_price: 80000,
        supplier: "アート大阪実行委員会",
        supplier_id: "0007",
        announce_price: 240000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 217000,
        buyer: "山口 恵子",
        buyer_id: null,
        status: "sold",
        purchased_at: "2026-01-30",
        sold_at: "2026-03-29"
    },
  {
        id: 54,
        artwork_id: "25AS001",
        title: "遠い響き",
        artist: "井上 大輔", artist_id: "0002",
        artist_kana: "イノウエ ダイスケ",
        medium: "シルクスクリーン",
        size: "F50 (116.7×91.0cm)",
        appraisal: "東京美術倶楽部",
        purchase_price: 200000,
        supplier: "ガレリア・ヴィスタ",
        supplier_id: "0008",
        announce_price: 540000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 522000,
        buyer: "鈴木 淳",
        buyer_id: null,
        status: "sold",
        purchased_at: "2025-10-28",
        sold_at: "2026-04-24"
    },
  {
        id: 55,
        artwork_id: "249D001",
        title: "海の記憶",
        artist: "山田 信夫", artist_id: "0018",
        artist_kana: "ヤマダ ノブオ",
        medium: "油彩",
        size: "F10 (53.0×45.5cm)",
        appraisal: "光仁会",
        purchase_price: 500000,
        supplier: "スペース・ムー",
        supplier_id: "0010",
        announce_price: 1260000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2024-09-13",
        sold_at: null
    },
  {
        id: 56,
        artwork_id: "2611001",
        title: "朝の断章 06",
        artist: "松本 玲", artist_id: "0016",
        artist_kana: "マツモト レイ",
        medium: "アクリル",
        size: "F3 (27.3×22.0cm)",
        appraisal: "日本美術鑑定協会",
        purchase_price: 50000,
        supplier: "銀座アートコレクティブ",
        supplier_id: "0009",
        announce_price: 140000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2026-01-01",
        sold_at: null
    },
  {
        id: 57,
        artwork_id: "259Q001",
        title: "雨の空間 17",
        artist: "伊藤 美咲", artist_id: "0001",
        artist_kana: "イトウ ミサキ",
        medium: "素描",
        size: "F30 (90.9×72.7cm)",
        appraisal: "",
        purchase_price: 300000,
        supplier: "銀座アートコレクティブ",
        supplier_id: "0009",
        announce_price: 720000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 623000,
        buyer: "株式会社アート・ソリューションズ",
        buyer_id: "0005",
        status: "sold",
        purchased_at: "2025-09-26",
        sold_at: "2026-05-06"
    },
  {
        id: 58,
        artwork_id: "23BG001",
        title: "風の空間",
        artist: "渡辺 健", artist_id: "0024",
        artist_kana: "ワタナベ ケン",
        medium: "リトグラフ",
        size: "F15 (65.2×53.0cm)",
        appraisal: "東京美術倶楽部",
        purchase_price: 280000,
        supplier: "アート大阪実行委員会",
        supplier_id: "0007",
        announce_price: 560000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2023-11-16",
        sold_at: null
    },
  {
        id: 59,
        artwork_id: "238A002",
        title: "光の輪郭 12",
        artist: "林 雅子", artist_id: "0015",
        artist_kana: "ハヤシ マサコ",
        medium: "アクリル",
        size: "F6 (41.0×31.8cm)",
        appraisal: "東京美術倶楽部",
        purchase_price: 250000,
        supplier: "シンワオークション株式会社",
        supplier_id: "0013",
        announce_price: 560000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2023-08-10",
        sold_at: null
    },
  {
        id: 60,
        artwork_id: "24AR001",
        title: "記憶の響き 12",
        artist: "伊藤 美咲", artist_id: "0001",
        artist_kana: "イトウ ミサキ",
        medium: "素描",
        size: "F10 (53.0×45.5cm)",
        appraisal: "",
        purchase_price: 100000,
        supplier: "スペース・ムー",
        supplier_id: "0010",
        announce_price: 300000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2024-10-27",
        sold_at: null
    },
  {
        id: 61,
        artwork_id: "2449001",
        title: "雨の季節",
        artist: "鈴木 一郎", artist_id: "0010",
        artist_kana: "スズキ イチロウ",
        medium: "アクリル",
        size: "F15 (65.2×53.0cm)",
        appraisal: "",
        purchase_price: 328000,
        supplier: "銀座アートコレクティブ",
        supplier_id: "0009",
        announce_price: 910000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2024-04-09",
        sold_at: null
    },
  {
        id: 62,
        artwork_id: "23CE001",
        title: "Night Landscape No.2",
        artist: "Marie Dupont", artist_id: "0017",
        artist_kana: "マリー デュポン",
        medium: "水彩",
        size: "F10 (53.0×45.5cm)",
        appraisal: "",
        purchase_price: 383000,
        supplier: "アートブリッジ・インターナショナル",
        supplier_id: "0011",
        announce_price: 1340000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2023-12-14",
        sold_at: null
    },
  {
        id: 63,
        artwork_id: "248F001",
        title: "記憶の輪郭 09",
        artist: "木村 咲", artist_id: "0005",
        artist_kana: "キムラ サキ",
        medium: "シルクスクリーン",
        size: "F3 (27.3×22.0cm)",
        appraisal: "",
        purchase_price: 350000,
        supplier: "銀座アートギャラリー・壱番館",
        supplier_id: "0015",
        announce_price: 930000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2024-08-15",
        sold_at: null
    },
  {
        id: 64,
        artwork_id: "256U001",
        title: "夢の余白 20",
        artist: "清水 隆", artist_id: "0008",
        artist_kana: "シミズ タカシ",
        medium: "リトグラフ",
        size: "F30 (90.9×72.7cm)",
        appraisal: "",
        purchase_price: 80000,
        supplier: "アート大阪実行委員会",
        supplier_id: "0007",
        announce_price: 260000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 227000,
        buyer: "鈴木 淳",
        buyer_id: null,
        status: "sold",
        purchased_at: "2025-06-30",
        sold_at: "2025-09-03"
    },
  {
        id: 65,
        artwork_id: "247O001",
        title: "深い情景",
        artist: "伊藤 美咲", artist_id: "0001",
        artist_kana: "イトウ ミサキ",
        medium: "シルクスクリーン",
        size: "F10 (53.0×45.5cm)",
        appraisal: "",
        purchase_price: 92000,
        supplier: "田中アトリエ",
        supplier_id: "0006",
        announce_price: 300000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2024-07-24",
        sold_at: null
    },
  {
        id: 66,
        artwork_id: "252P001",
        title: "夢の残像",
        artist: "井上 大輔", artist_id: "0002",
        artist_kana: "イノウエ ダイスケ",
        medium: "ミクストメディア",
        size: "F30 (90.9×72.7cm)",
        appraisal: "日動美術財団",
        purchase_price: 300000,
        supplier: "オークションハウス・セントラル",
        supplier_id: "0012",
        announce_price: 1030000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 978000,
        buyer: "株式会社アート・ソリューションズ",
        buyer_id: "0005",
        status: "sold",
        purchased_at: "2025-02-25",
        sold_at: "2025-07-12"
    },
  {
        id: 67,
        artwork_id: "249R001",
        title: "海の旅",
        artist: "林 雅子", artist_id: "0015",
        artist_kana: "ハヤシ マサコ",
        medium: "シルクスクリーン",
        size: "F6 (41.0×31.8cm)",
        appraisal: "",
        purchase_price: 200000,
        supplier: "ガレリア・ヴィスタ",
        supplier_id: "0008",
        announce_price: 530000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 510000,
        buyer: "伊藤コレクション",
        buyer_id: null,
        status: "sold",
        purchased_at: "2024-09-27",
        sold_at: "2025-09-03"
    },
  {
        id: 68,
        artwork_id: "2365001",
        title: "青い物語 09",
        artist: "吉田 蒼", artist_id: "0021",
        artist_kana: "ヨシダ アオ",
        medium: "ミクストメディア",
        size: "F3 (27.3×22.0cm)",
        appraisal: "",
        purchase_price: 350000,
        supplier: "シンワオークション株式会社",
        supplier_id: "0013",
        announce_price: 740000,
        consignment_price: 687000,
        consignee: "六本木ヒルズ",
        consignee_id: null,
        consigned_at: "2025-07-19",
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "consigned",
        purchased_at: "2023-06-05",
        sold_at: null
    },
  {
        id: 69,
        artwork_id: "258C001",
        title: "朝の旅",
        artist: "伊藤 美咲", artist_id: "0001",
        artist_kana: "イトウ ミサキ",
        medium: "アクリル",
        size: "F10 (53.0×45.5cm)",
        appraisal: "",
        purchase_price: 280000,
        supplier: "銀座アートギャラリー・壱番館",
        supplier_id: "0015",
        announce_price: 680000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 637000,
        buyer: "橋本 修",
        buyer_id: null,
        status: "sold",
        purchased_at: "2025-08-12",
        sold_at: "2026-03-28"
    },
  {
        id: 70,
        artwork_id: "248T001",
        title: "白い余白",
        artist: "井上 大輔", artist_id: "0002",
        artist_kana: "イノウエ ダイスケ",
        medium: "リトグラフ",
        size: "F3 (27.3×22.0cm)",
        appraisal: "",
        purchase_price: 80000,
        supplier: "田中アトリエ",
        supplier_id: "0006",
        announce_price: 240000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2024-08-29",
        sold_at: null
    },
  {
        id: 71,
        artwork_id: "255E001",
        title: "深い空間 19",
        artist: "中村 葵", artist_id: "0014",
        artist_kana: "ナカムラ アオイ",
        medium: "水彩",
        size: "F10 (53.0×45.5cm)",
        appraisal: "",
        purchase_price: 300000,
        supplier: "スペース・ムー",
        supplier_id: "0010",
        announce_price: 950000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2025-05-14",
        sold_at: null
    },
  {
        id: 72,
        artwork_id: "255S001",
        title: "風の時間",
        artist: "渡辺 健", artist_id: "0024",
        artist_kana: "ワタナベ ケン",
        medium: "リトグラフ",
        size: "F20 (72.7×60.6cm)",
        appraisal: "",
        purchase_price: 80000,
        supplier: "ガレリア・ヴィスタ",
        supplier_id: "0008",
        announce_price: 170000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 148000,
        buyer: "鈴木 淳",
        buyer_id: null,
        status: "sold",
        purchased_at: "2025-05-28",
        sold_at: "2026-05-12"
    },
  {
        id: 73,
        artwork_id: "259G001",
        title: "遠い旅",
        artist: "伊藤 美咲", artist_id: "0001",
        artist_kana: "イトウ ミサキ",
        medium: "ミクストメディア",
        size: "F6 (41.0×31.8cm)",
        appraisal: "東京美術倶楽部",
        purchase_price: 350000,
        supplier: "アート大阪実行委員会",
        supplier_id: "0007",
        announce_price: 1180000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 1086000,
        buyer: "伊藤コレクション",
        buyer_id: null,
        status: "sold",
        purchased_at: "2025-09-16",
        sold_at: "2025-12-29"
    },
  {
        id: 74,
        artwork_id: "251T001",
        title: "遠い時間",
        artist: "清水 隆", artist_id: "0008",
        artist_kana: "シミズ タカシ",
        medium: "パステル",
        size: "F50 (116.7×91.0cm)",
        appraisal: "",
        purchase_price: 600000,
        supplier: "シンワオークション株式会社",
        supplier_id: "0013",
        announce_price: 1400000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2025-01-29",
        sold_at: null
    },
  {
        id: 75,
        artwork_id: "245F001",
        title: "夜の記憶",
        artist: "加藤 律子", artist_id: "0004",
        artist_kana: "カトウ リツコ",
        medium: "ミクストメディア",
        size: "F30 (90.9×72.7cm)",
        appraisal: "",
        purchase_price: 350000,
        supplier: "田中アトリエ",
        supplier_id: "0006",
        announce_price: 1050000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 901000,
        buyer: "橋本 修",
        buyer_id: null,
        status: "sold",
        purchased_at: "2024-05-15",
        sold_at: "2025-12-10"
    },
  {
        id: 76,
        artwork_id: "252L001",
        title: "赤い旅",
        artist: "松本 玲", artist_id: "0016",
        artist_kana: "マツモト レイ",
        medium: "水彩",
        size: "F100 (162.1×130.3cm)",
        appraisal: "",
        purchase_price: 150000,
        supplier: "銀座アートギャラリー・壱番館",
        supplier_id: "0015",
        announce_price: 310000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2025-02-21",
        sold_at: null
    },
  {
        id: 77,
        artwork_id: "253G001",
        title: "Morning Time",
        artist: "Thomas Klein", artist_id: "0013",
        artist_kana: "トーマス クライン",
        medium: "版画",
        size: "F10 (53.0×45.5cm)",
        appraisal: "",
        purchase_price: 600000,
        supplier: "ガレリア・ヴィスタ",
        supplier_id: "0008",
        announce_price: 1790000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2025-03-16",
        sold_at: null
    },
  {
        id: 78,
        artwork_id: "247H001",
        title: "青い物語",
        artist: "鈴木 一郎", artist_id: "0010",
        artist_kana: "スズキ イチロウ",
        medium: "リトグラフ",
        size: "F3 (27.3×22.0cm)",
        appraisal: "",
        purchase_price: 250000,
        supplier: "銀座アートコレクティブ",
        supplier_id: "0009",
        announce_price: 700000,
        consignment_price: 617000,
        consignee: "ホテル椿山荘",
        consignee_id: "0003",
        consigned_at: "2025-05-29",
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "consigned",
        purchased_at: "2024-07-17",
        sold_at: null
    },
  {
        id: 79,
        artwork_id: "246P001",
        title: "森の情景",
        artist: "山本 竜", artist_id: "0019",
        artist_kana: "ヤマモト リュウ",
        medium: "リトグラフ",
        size: "F30 (90.9×72.7cm)",
        appraisal: "",
        purchase_price: 400000,
        supplier: "銀座アートギャラリー・壱番館",
        supplier_id: "0015",
        announce_price: 1100000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 1017000,
        buyer: "鈴木 淳",
        buyer_id: null,
        status: "sold",
        purchased_at: "2024-06-25",
        sold_at: "2025-06-15"
    },
  {
        id: 80,
        artwork_id: "249G001",
        title: "Night Landscape No.11",
        artist: "Marie Dupont", artist_id: "0017",
        artist_kana: "マリー デュポン",
        medium: "油彩",
        size: "F3 (27.3×22.0cm)",
        appraisal: "",
        purchase_price: 280000,
        supplier: "スペース・ムー",
        supplier_id: "0010",
        announce_price: 690000,
        consignment_price: 629000,
        consignee: "六本木ヒルズ",
        consignee_id: null,
        consigned_at: "2026-05-16",
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "consigned",
        purchased_at: "2024-09-16",
        sold_at: null
    },
  {
        id: 81,
        artwork_id: "24AD001",
        title: "海の空間",
        artist: "佐藤 花", artist_id: "0007",
        artist_kana: "サトウ ハナ",
        medium: "素描",
        size: "F3 (27.3×22.0cm)",
        appraisal: "東京美術倶楽部",
        purchase_price: 300000,
        supplier: "アトリエ・ノルド",
        supplier_id: "0014",
        announce_price: 740000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2024-10-13",
        sold_at: null
    },
  {
        id: 82,
        artwork_id: "237K001",
        title: "Distant Landscape",
        artist: "Thomas Klein", artist_id: "0013",
        artist_kana: "トーマス クライン",
        medium: "リトグラフ",
        size: "F10 (53.0×45.5cm)",
        appraisal: "",
        purchase_price: 150000,
        supplier: "スペース・ムー",
        supplier_id: "0010",
        announce_price: 350000,
        consignment_price: 309000,
        consignee: "ホテル椿山荘",
        consignee_id: "0003",
        consigned_at: "2025-07-14",
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "consigned",
        purchased_at: "2023-07-20",
        sold_at: null
    },
  {
        id: 83,
        artwork_id: "24CM001",
        title: "深い風景",
        artist: "中村 葵", artist_id: "0014",
        artist_kana: "ナカムラ アオイ",
        medium: "リトグラフ",
        size: "F15 (65.2×53.0cm)",
        appraisal: "",
        purchase_price: 500000,
        supplier: "田中アトリエ",
        supplier_id: "0006",
        announce_price: 1690000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 1642000,
        buyer: "株式会社アート・ソリューションズ",
        buyer_id: "0005",
        status: "sold",
        purchased_at: "2024-12-22",
        sold_at: "2025-12-17"
    },
  {
        id: 84,
        artwork_id: "235U001",
        title: "遠い肖像 13",
        artist: "佐藤 花", artist_id: "0007",
        artist_kana: "サトウ ハナ",
        medium: "油彩",
        size: "F10 (53.0×45.5cm)",
        appraisal: "",
        purchase_price: 600000,
        supplier: "オークションハウス・セントラル",
        supplier_id: "0012",
        announce_price: 2000000,
        consignment_price: 1789000,
        consignee: "ホテル椿山荘",
        consignee_id: "0003",
        consigned_at: "2024-05-14",
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "consigned",
        purchased_at: "2023-05-30",
        sold_at: null
    },
  {
        id: 85,
        artwork_id: "24BU001",
        title: "白い気配",
        artist: "中村 葵", artist_id: "0014",
        artist_kana: "ナカムラ アオイ",
        medium: "版画",
        size: "F6 (41.0×31.8cm)",
        appraisal: "",
        purchase_price: 572000,
        supplier: "スペース・ムー",
        supplier_id: "0010",
        announce_price: 2040000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2024-11-30",
        sold_at: null
    },
  {
        id: 86,
        artwork_id: "2529001",
        title: "赤い風景",
        artist: "木村 咲", artist_id: "0005",
        artist_kana: "キムラ サキ",
        medium: "油彩",
        size: "F20 (72.7×60.6cm)",
        appraisal: "東京美術倶楽部",
        purchase_price: 80000,
        supplier: "アトリエ・ノルド",
        supplier_id: "0014",
        announce_price: 260000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2025-02-09",
        sold_at: null
    },
  {
        id: 87,
        artwork_id: "254O001",
        title: "Wind Time No.5",
        artist: "Luca Ferretti", artist_id: "0023",
        artist_kana: "ルカ フェレッティ",
        medium: "版画",
        size: "F30 (90.9×72.7cm)",
        appraisal: "",
        purchase_price: 280000,
        supplier: "アトリエ・ノルド",
        supplier_id: "0014",
        announce_price: 580000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2025-04-24",
        sold_at: null
    },
  {
        id: 88,
        artwork_id: "25BI001",
        title: "Deep Dream",
        artist: "Sofia Andersson", artist_id: "0011",
        artist_kana: "ソフィア アンデルション",
        medium: "パステル",
        size: "F20 (72.7×60.6cm)",
        appraisal: "",
        purchase_price: 48000,
        supplier: "ガレリア・ヴィスタ",
        supplier_id: "0008",
        announce_price: 110000,
        consignment_price: 101000,
        consignee: "東京ミッドタウン",
        consignee_id: null,
        consigned_at: "2026-05-01",
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "consigned",
        purchased_at: "2025-11-18",
        sold_at: null
    },
  {
        id: 89,
        artwork_id: "251T002",
        title: "遠い静寂 15",
        artist: "加藤 律子", artist_id: "0004",
        artist_kana: "カトウ リツコ",
        medium: "素描",
        size: "F100 (162.1×130.3cm)",
        appraisal: "日本美術鑑定協会",
        purchase_price: 80000,
        supplier: "田中アトリエ",
        supplier_id: "0006",
        announce_price: 160000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 143000,
        buyer: "山口 恵子",
        buyer_id: null,
        status: "sold",
        purchased_at: "2025-01-29",
        sold_at: "2025-06-30"
    },
  {
        id: 90,
        artwork_id: "2382001",
        title: "White Passage",
        artist: "Sofia Andersson", artist_id: "0011",
        artist_kana: "ソフィア アンデルション",
        medium: "版画",
        size: "F3 (27.3×22.0cm)",
        appraisal: "",
        purchase_price: 150000,
        supplier: "アトリエ・ノルド",
        supplier_id: "0014",
        announce_price: 340000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 318000,
        buyer: "株式会社アート・ソリューションズ",
        buyer_id: "0005",
        status: "sold",
        purchased_at: "2023-08-02",
        sold_at: "2023-10-20"
    },
  {
        id: 91,
        artwork_id: "248M001",
        title: "静かな残像",
        artist: "伊藤 美咲", artist_id: "0001",
        artist_kana: "イトウ ミサキ",
        medium: "油彩",
        size: "F30 (90.9×72.7cm)",
        appraisal: "日本美術鑑定協会",
        purchase_price: 150000,
        supplier: "銀座アートコレクティブ",
        supplier_id: "0009",
        announce_price: 470000,
        consignment_price: 416000,
        consignee: "六本木ヒルズ",
        consignee_id: null,
        consigned_at: "2025-05-02",
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "consigned",
        purchased_at: "2024-08-22",
        sold_at: null
    },
  {
        id: 92,
        artwork_id: "235N001",
        title: "夜の断章 20",
        artist: "田中 誠", artist_id: "0012",
        artist_kana: "タナカ マコト",
        medium: "水彩",
        size: "F30 (90.9×72.7cm)",
        appraisal: "",
        purchase_price: 50000,
        supplier: "シンワオークション株式会社",
        supplier_id: "0013",
        announce_price: 160000,
        consignment_price: 147000,
        consignee: "六本木ヒルズ",
        consignee_id: null,
        consigned_at: "2023-12-02",
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "consigned",
        purchased_at: "2023-05-23",
        sold_at: null
    },
  {
        id: 93,
        artwork_id: "2515001",
        title: "赤い物語",
        artist: "田中 誠", artist_id: "0012",
        artist_kana: "タナカ マコト",
        medium: "アクリル",
        size: "F30 (90.9×72.7cm)",
        appraisal: "",
        purchase_price: 150000,
        supplier: "シンワオークション株式会社",
        supplier_id: "0013",
        announce_price: 400000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 369000,
        buyer: "山口 恵子",
        buyer_id: null,
        status: "sold",
        purchased_at: "2025-01-05",
        sold_at: "2025-08-01"
    },
  {
        id: 94,
        artwork_id: "2568001",
        title: "Deep Vision No.3",
        artist: "Marie Dupont", artist_id: "0017",
        artist_kana: "マリー デュポン",
        medium: "シルクスクリーン",
        size: "F15 (65.2×53.0cm)",
        appraisal: "",
        purchase_price: 250000,
        supplier: "アトリエ・ノルド",
        supplier_id: "0014",
        announce_price: 580000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 538000,
        buyer: "山口 恵子",
        buyer_id: null,
        status: "sold",
        purchased_at: "2025-06-08",
        sold_at: "2026-02-18"
    },
  {
        id: 95,
        artwork_id: "23CF001",
        title: "Blue Landscape",
        artist: "Sofia Andersson", artist_id: "0011",
        artist_kana: "ソフィア アンデルション",
        medium: "ミクストメディア",
        size: "F30 (90.9×72.7cm)",
        appraisal: "",
        purchase_price: 200000,
        supplier: "アトリエ・ノルド",
        supplier_id: "0014",
        announce_price: 410000,
        consignment_price: 389000,
        consignee: "丸の内ビル",
        consignee_id: null,
        consigned_at: "2026-05-09",
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "consigned",
        purchased_at: "2023-12-15",
        sold_at: null
    },
  {
        id: 96,
        artwork_id: "2495001",
        title: "記憶の余白",
        artist: "小林 浩二", artist_id: "0006",
        artist_kana: "コバヤシ コウジ",
        medium: "水彩",
        size: "F50 (116.7×91.0cm)",
        appraisal: "東京美術倶楽部",
        purchase_price: 350000,
        supplier: "銀座アートギャラリー・壱番館",
        supplier_id: "0015",
        announce_price: 950000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: 862000,
        buyer: "伊藤コレクション",
        buyer_id: null,
        status: "sold",
        purchased_at: "2024-09-05",
        sold_at: "2025-05-15"
    },
  {
        id: 97,
        artwork_id: "255A001",
        title: "遠い気配",
        artist: "山本 竜", artist_id: "0019",
        artist_kana: "ヤマモト リュウ",
        medium: "ミクストメディア",
        size: "F15 (65.2×53.0cm)",
        appraisal: "",
        purchase_price: 80000,
        supplier: "銀座アートコレクティブ",
        supplier_id: "0009",
        announce_price: 210000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2025-05-10",
        sold_at: null
    },
  {
        id: 98,
        artwork_id: "25AJ001",
        title: "空の残像",
        artist: "林 雅子", artist_id: "0015",
        artist_kana: "ハヤシ マサコ",
        medium: "油彩",
        size: "F10 (53.0×45.5cm)",
        appraisal: "",
        purchase_price: 100000,
        supplier: "田中アトリエ",
        supplier_id: "0006",
        announce_price: 320000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2025-10-19",
        sold_at: null
    },
  {
        id: 99,
        artwork_id: "245S001",
        title: "深い気配 07",
        artist: "松本 玲", artist_id: "0016",
        artist_kana: "マツモト レイ",
        medium: "ミクストメディア",
        size: "F6 (41.0×31.8cm)",
        appraisal: "",
        purchase_price: 250000,
        supplier: "スペース・ムー",
        supplier_id: "0010",
        announce_price: 600000,
        consignment_price: 554000,
        consignee: "ホテル椿山荘",
        consignee_id: "0003",
        consigned_at: "2026-04-01",
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "consigned",
        purchased_at: "2024-05-28",
        sold_at: null
    },
  {
        id: 100,
        artwork_id: "24AE001",
        title: "朝の残像",
        artist: "田中 誠", artist_id: "0012",
        artist_kana: "タナカ マコト",
        medium: "水彩",
        size: "F30 (90.9×72.7cm)",
        appraisal: "",
        purchase_price: 280000,
        supplier: "アート大阪実行委員会",
        supplier_id: "0007",
        announce_price: 750000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2024-10-14",
        sold_at: null
    },
  {
        id: 101,
        artwork_id: "248P001",
        title: "赤い空間",
        artist: "山本 竜", artist_id: "0019",
        artist_kana: "ヤマモト リュウ",
        medium: "リトグラフ",
        size: "F100 (162.1×130.3cm)",
        appraisal: "",
        purchase_price: 200000,
        supplier: "アート大阪実行委員会",
        supplier_id: "0007",
        announce_price: 430000,
        consignment_price: null,
        consignee: null,
        consignee_id: null,
        consigned_at: null,
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "in_stock",
        purchased_at: "2024-08-25",
        sold_at: null
    },
  {
        id: 102,
        artwork_id: "243I001",
        title: "森の季節",
        artist: "林 雅子", artist_id: "0015",
        artist_kana: "ハヤシ マサコ",
        medium: "版画",
        size: "F100 (162.1×130.3cm)",
        appraisal: "",
        purchase_price: 75000,
        supplier: "スペース・ムー",
        supplier_id: "0010",
        announce_price: 160000,
        consignment_price: 144000,
        consignee: "ホテル椿山荘",
        consignee_id: "0003",
        consigned_at: "2025-02-11",
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "consigned",
        purchased_at: "2024-03-18",
        sold_at: null
    },
  {
        id: 103,
        artwork_id: "248E001",
        title: "朝の肖像",
        artist: "山本 竜", artist_id: "0019",
        artist_kana: "ヤマモト リュウ",
        medium: "パステル",
        size: "F50 (116.7×91.0cm)",
        appraisal: "日動美術財団",
        purchase_price: 97000,
        supplier: "アトリエ・ノルド",
        supplier_id: "0014",
        announce_price: 300000,
        consignment_price: 256000,
        consignee: "ホテル椿山荘",
        consignee_id: "0003",
        consigned_at: "2025-02-23",
        sold_price: null,
        buyer: null,
        buyer_id: null,
        status: "consigned",
        purchased_at: "2024-08-14",
        sold_at: null
    },
];

const additionalHistory = [
  {
        id: 7,
        artwork_id: "256G001",
        event_type: "purchase",
        old_price: null,
        new_price: 350000,
        counterparty: "田中アトリエ",
        counterparty_id: "0006",
        memo: "仕入",
        created_at: "2025-06-16",
        purchase_tax: 31818, tax_credit: 31818
    },
  {
        id: 8,
        artwork_id: "256A001",
        event_type: "purchase",
        old_price: null,
        new_price: 300000,
        counterparty: "オークションハウス・セントラル",
        counterparty_id: "0012",
        memo: "仕入",
        created_at: "2025-06-10",
        purchase_tax: 27272, tax_credit: 21817
    },
  {
        id: 9,
        artwork_id: "256A001",
        event_type: "sold",
        old_price: null,
        new_price: 648000,
        counterparty: "伊藤コレクション",
        counterparty_id: null,
        memo: "成約",
        created_at: "2026-01-29",
        purchase_tax: 54545, tax_credit: 54545
    },
  {
        id: 10,
        artwork_id: "258S001",
        event_type: "purchase",
        old_price: null,
        new_price: 280000,
        counterparty: "田中アトリエ",
        counterparty_id: "0006",
        memo: "仕入",
        created_at: "2025-08-28",
        purchase_tax: 25454, tax_credit: 25454
    },
  {
        id: 11,
        artwork_id: "258N001",
        event_type: "purchase",
        old_price: null,
        new_price: 150000,
        counterparty: "田中アトリエ",
        counterparty_id: "0006",
        memo: "仕入",
        created_at: "2025-08-23",
        purchase_tax: 13636, tax_credit: 13636
    },
  {
        id: 12,
        artwork_id: "255N001",
        event_type: "purchase",
        old_price: null,
        new_price: 50000,
        counterparty: "スペース・ムー",
        counterparty_id: "0010",
        memo: "仕入",
        created_at: "2025-05-23",
        purchase_tax: 4545, tax_credit: 3636
    },
  {
        id: 13,
        artwork_id: "259P001",
        event_type: "purchase",
        old_price: null,
        new_price: 500000,
        counterparty: "スペース・ムー",
        counterparty_id: "0010",
        memo: "仕入",
        created_at: "2025-09-25",
        purchase_tax: 45454, tax_credit: 36363
    },
  {
        id: 14,
        artwork_id: "259P001",
        event_type: "consign",
        old_price: null,
        new_price: 1060000,
        counterparty: "東京ミッドタウン",
        counterparty_id: null,
        memo: "委託",
        created_at: "2026-03-22"
    },
  {
        id: 15,
        artwork_id: "2615001",
        event_type: "purchase",
        old_price: null,
        new_price: 150000,
        counterparty: "スペース・ムー",
        counterparty_id: "0010",
        memo: "仕入",
        created_at: "2026-01-05",
        purchase_tax: 13636, tax_credit: 10908
    },
  {
        id: 16,
        artwork_id: "2615001",
        event_type: "consign",
        old_price: null,
        new_price: 318000,
        counterparty: "六本木ヒルズ",
        counterparty_id: null,
        memo: "委託",
        created_at: "2026-03-24"
    },
  {
        id: 17,
        artwork_id: "256B001",
        event_type: "purchase",
        old_price: null,
        new_price: 80000,
        counterparty: "スペース・ムー",
        counterparty_id: "0010",
        memo: "仕入",
        created_at: "2025-06-11",
        purchase_tax: 7272, tax_credit: 5817
    },
  {
        id: 18,
        artwork_id: "249J001",
        event_type: "purchase",
        old_price: null,
        new_price: 500000,
        counterparty: "ガレリア・ヴィスタ",
        counterparty_id: "0008",
        memo: "仕入",
        created_at: "2024-09-19",
        purchase_tax: 45454, tax_credit: 45454
    },
  {
        id: 19,
        artwork_id: "249J001",
        event_type: "sold",
        old_price: null,
        new_price: 1134000,
        counterparty: "伊藤コレクション",
        counterparty_id: null,
        memo: "成約",
        created_at: "2025-06-08",
        purchase_tax: 22727, tax_credit: 18181
    },
  {
        id: 20,
        artwork_id: "257F001",
        event_type: "purchase",
        old_price: null,
        new_price: 500000,
        counterparty: "田中アトリエ",
        counterparty_id: "0006",
        memo: "仕入",
        created_at: "2025-07-15",
        purchase_tax: 45454, tax_credit: 45454
    },
  {
        id: 21,
        artwork_id: "257F001",
        event_type: "sold",
        old_price: null,
        new_price: 1008000,
        counterparty: "山口 恵子",
        counterparty_id: null,
        memo: "成約",
        created_at: "2025-11-19"
    },
  {
        id: 22,
        artwork_id: "25BS001",
        event_type: "purchase",
        old_price: null,
        new_price: 350000,
        counterparty: "アートブリッジ・インターナショナル",
        counterparty_id: "0011",
        memo: "仕入",
        created_at: "2025-11-28",
        purchase_tax: 31818, tax_credit: 31818
    },
  {
        id: 23,
        artwork_id: "25BS001",
        event_type: "purchase_discount",
        old_price: 350000,
        new_price: 330000,
        counterparty: "アートブリッジ・インターナショナル",
        counterparty_id: "0011",
        memo: "仕入値引き（仕入日より29日後）",
        created_at: "2025-12-27"
    },
  {
        id: 24,
        artwork_id: "25BS001",
        event_type: "sold_discount",
        old_price: 850000,
        new_price: 729000,
        counterparty: "鈴木 淳",
        counterparty_id: null,
        memo: "値引き交渉（成約1日前）",
        created_at: "2026-03-15"
    },
  {
        id: 25,
        artwork_id: "25BS001",
        event_type: "sold",
        old_price: null,
        new_price: 729000,
        counterparty: "鈴木 淳",
        counterparty_id: null,
        memo: "成約",
        created_at: "2026-03-16"
    },
  {
        id: 26,
        artwork_id: "238A001",
        event_type: "purchase",
        old_price: null,
        new_price: 250000,
        counterparty: "銀座アートコレクティブ",
        counterparty_id: "0009",
        memo: "仕入",
        created_at: "2023-08-10",
        purchase_tax: 22727, tax_credit: 22727
    },
  {
        id: 27,
        artwork_id: "2414001",
        event_type: "purchase",
        old_price: null,
        new_price: 500000,
        counterparty: "アート大阪実行委員会",
        counterparty_id: "0007",
        memo: "仕入",
        created_at: "2024-01-04",
        purchase_tax: 45454, tax_credit: 45454
    },
  {
        id: 28,
        artwork_id: "24AC001",
        event_type: "purchase",
        old_price: null,
        new_price: 500000,
        counterparty: "アートブリッジ・インターナショナル",
        counterparty_id: "0011",
        memo: "仕入",
        created_at: "2024-10-12",
        purchase_tax: 45454, tax_credit: 45454
    },
  {
        id: 29,
        artwork_id: "24AC001",
        event_type: "sold",
        old_price: null,
        new_price: 1054000,
        counterparty: "山口 恵子",
        counterparty_id: null,
        memo: "成約",
        created_at: "2026-05-08"
    },
  {
        id: 30,
        artwork_id: "2393001",
        event_type: "purchase",
        old_price: null,
        new_price: 150000,
        counterparty: "アトリエ・ノルド",
        counterparty_id: "0014",
        memo: "仕入",
        created_at: "2023-09-03",
        purchase_tax: 13636, tax_credit: 13636
    },
  {
        id: 31,
        artwork_id: "2393001",
        event_type: "sold",
        old_price: null,
        new_price: 346000,
        counterparty: "伊藤コレクション",
        counterparty_id: null,
        memo: "成約",
        created_at: "2025-11-02"
    },
  {
        id: 32,
        artwork_id: "257C001",
        event_type: "purchase",
        old_price: null,
        new_price: 350000,
        counterparty: "銀座アートギャラリー・壱番館",
        counterparty_id: "0015",
        memo: "仕入",
        created_at: "2025-07-12",
        purchase_tax: 31818, tax_credit: 31818
    },
  {
        id: 33,
        artwork_id: "257C001",
        event_type: "sold",
        old_price: null,
        new_price: 1109000,
        counterparty: "田村 一郎",
        counterparty_id: "0002",
        memo: "成約",
        created_at: "2026-01-04"
    },
  {
        id: 34,
        artwork_id: "2452001",
        event_type: "purchase",
        old_price: null,
        new_price: 80000,
        counterparty: "シンワオークション株式会社",
        counterparty_id: "0013",
        memo: "仕入",
        created_at: "2024-05-02",
        purchase_tax: 7272, tax_credit: 7272
    },
  {
        id: 35,
        artwork_id: "2452001",
        event_type: "sold_discount",
        old_price: 230000,
        new_price: 202000,
        counterparty: "鈴木 淳",
        counterparty_id: null,
        memo: "値引き交渉（成約2日前）",
        created_at: "2026-04-03"
    },
  {
        id: 36,
        artwork_id: "2452001",
        event_type: "sold",
        old_price: null,
        new_price: 202000,
        counterparty: "鈴木 淳",
        counterparty_id: null,
        memo: "成約",
        created_at: "2026-04-05"
    },
  {
        id: 37,
        artwork_id: "2544001",
        event_type: "purchase",
        old_price: null,
        new_price: 280000,
        counterparty: "アートブリッジ・インターナショナル",
        counterparty_id: "0011",
        memo: "仕入",
        created_at: "2025-04-04",
        purchase_tax: 25454, tax_credit: 25454
    },
  {
        id: 38,
        artwork_id: "2544001",
        event_type: "sold_discount",
        old_price: 900000,
        new_price: 862000,
        counterparty: "株式会社アート・ソリューションズ",
        counterparty_id: "0005",
        memo: "値引き交渉（成約7日前）",
        created_at: "2026-04-15"
    },
  {
        id: 39,
        artwork_id: "2544001",
        event_type: "sold",
        old_price: null,
        new_price: 862000,
        counterparty: "株式会社アート・ソリューションズ",
        counterparty_id: "0005",
        memo: "成約",
        created_at: "2026-04-22"
    },
  {
        id: 40,
        artwork_id: "238S001",
        event_type: "purchase",
        old_price: null,
        new_price: 200000,
        counterparty: "ガレリア・ヴィスタ",
        counterparty_id: "0008",
        memo: "仕入",
        created_at: "2023-08-28",
        purchase_tax: 18181, tax_credit: 18181
    },
  {
        id: 41,
        artwork_id: "256Q001",
        event_type: "purchase",
        old_price: null,
        new_price: 280000,
        counterparty: "アートブリッジ・インターナショナル",
        counterparty_id: "0011",
        memo: "仕入",
        created_at: "2025-06-26",
        purchase_tax: 25454, tax_credit: 25454
    },
  {
        id: 42,
        artwork_id: "2424001",
        event_type: "purchase",
        old_price: null,
        new_price: 100000,
        counterparty: "銀座アートギャラリー・壱番館",
        counterparty_id: "0015",
        memo: "仕入",
        created_at: "2024-02-04",
        purchase_tax: 9090, tax_credit: 9090
    },
  {
        id: 43,
        artwork_id: "2424001",
        event_type: "purchase_discount",
        old_price: 100000,
        new_price: 96000,
        counterparty: "銀座アートギャラリー・壱番館",
        counterparty_id: "0015",
        memo: "仕入値引き（仕入日より39日後）",
        created_at: "2024-03-14"
    },
  {
        id: 44,
        artwork_id: "2424001",
        event_type: "sold",
        old_price: null,
        new_price: 204000,
        counterparty: "山口 恵子",
        counterparty_id: null,
        memo: "成約",
        created_at: "2025-11-11"
    },
  {
        id: 45,
        artwork_id: "2451001",
        event_type: "purchase",
        old_price: null,
        new_price: 80000,
        counterparty: "アート大阪実行委員会",
        counterparty_id: "0007",
        memo: "仕入",
        created_at: "2024-05-01",
        purchase_tax: 7272, tax_credit: 7272
    },
  {
        id: 46,
        artwork_id: "2451001",
        event_type: "purchase_discount",
        old_price: 80000,
        new_price: 73000,
        counterparty: "アート大阪実行委員会",
        counterparty_id: "0007",
        memo: "仕入値引き（仕入日より19日後）",
        created_at: "2024-05-20"
    },
  {
        id: 47,
        artwork_id: "239G001",
        event_type: "purchase",
        old_price: null,
        new_price: 350000,
        counterparty: "銀座アートコレクティブ",
        counterparty_id: "0009",
        memo: "仕入",
        created_at: "2023-09-16",
        purchase_tax: 31818, tax_credit: 31818
    },
  {
        id: 48,
        artwork_id: "239G001",
        event_type: "purchase_discount",
        old_price: 350000,
        new_price: 332000,
        counterparty: "銀座アートコレクティブ",
        counterparty_id: "0009",
        memo: "仕入値引き（仕入日より14日後）",
        created_at: "2023-09-30"
    },
  {
        id: 49,
        artwork_id: "239G001",
        event_type: "consign",
        old_price: null,
        new_price: 933000,
        counterparty: "丸の内ビル",
        counterparty_id: null,
        memo: "委託",
        created_at: "2024-09-06"
    },
  {
        id: 50,
        artwork_id: "2624001",
        event_type: "purchase",
        old_price: null,
        new_price: 250000,
        counterparty: "ガレリア・ヴィスタ",
        counterparty_id: "0008",
        memo: "仕入",
        created_at: "2026-02-04",
        purchase_tax: 22727, tax_credit: 22727
    },
  {
        id: 51,
        artwork_id: "2624001",
        event_type: "purchase_discount",
        old_price: 250000,
        new_price: 231000,
        counterparty: "ガレリア・ヴィスタ",
        counterparty_id: "0008",
        memo: "仕入値引き（仕入日より27日後）",
        created_at: "2026-03-03"
    },
  {
        id: 52,
        artwork_id: "2624001",
        event_type: "sold",
        old_price: null,
        new_price: 567000,
        counterparty: "伊藤コレクション",
        counterparty_id: null,
        memo: "成約",
        created_at: "2026-04-04"
    },
  {
        id: 53,
        artwork_id: "261T001",
        event_type: "purchase",
        old_price: null,
        new_price: 600000,
        counterparty: "銀座アートギャラリー・壱番館",
        counterparty_id: "0015",
        memo: "仕入",
        created_at: "2026-01-29",
        purchase_tax: 54545, tax_credit: 54545
    },
  {
        id: 54,
        artwork_id: "23AP001",
        event_type: "purchase",
        old_price: null,
        new_price: 350000,
        counterparty: "アートブリッジ・インターナショナル",
        counterparty_id: "0011",
        memo: "仕入",
        created_at: "2023-10-25",
        purchase_tax: 31818, tax_credit: 31818
    },
  {
        id: 55,
        artwork_id: "23AP001",
        event_type: "sold",
        old_price: null,
        new_price: 773000,
        counterparty: "株式会社アート・ソリューションズ",
        counterparty_id: "0005",
        memo: "成約",
        created_at: "2025-06-12"
    },
  {
        id: 56,
        artwork_id: "247S001",
        event_type: "purchase",
        old_price: null,
        new_price: 500000,
        counterparty: "シンワオークション株式会社",
        counterparty_id: "0013",
        memo: "仕入",
        created_at: "2024-07-28",
        purchase_tax: 45454, tax_credit: 45454
    },
  {
        id: 57,
        artwork_id: "2538001",
        event_type: "purchase",
        old_price: null,
        new_price: 150000,
        counterparty: "オークションハウス・セントラル",
        counterparty_id: "0012",
        memo: "仕入",
        created_at: "2025-03-08",
        purchase_tax: 13636, tax_credit: 10908
    },
  {
        id: 58,
        artwork_id: "2538001",
        event_type: "purchase_discount",
        old_price: 150000,
        new_price: 139000,
        counterparty: "オークションハウス・セントラル",
        counterparty_id: "0012",
        memo: "仕入値引き（仕入日より23日後）",
        created_at: "2025-03-31"
    },
  {
        id: 59,
        artwork_id: "2538001",
        event_type: "consign",
        old_price: null,
        new_price: 466000,
        counterparty: "ホテル椿山荘",
        counterparty_id: "0003",
        memo: "委託",
        created_at: "2025-08-29"
    },
  {
        id: 60,
        artwork_id: "262F001",
        event_type: "purchase",
        old_price: null,
        new_price: 100000,
        counterparty: "ガレリア・ヴィスタ",
        counterparty_id: "0008",
        memo: "仕入",
        created_at: "2026-02-15",
        purchase_tax: 9090, tax_credit: 9090
    },
  {
        id: 61,
        artwork_id: "24B8001",
        event_type: "purchase",
        old_price: null,
        new_price: 600000,
        counterparty: "オークションハウス・セントラル",
        counterparty_id: "0012",
        memo: "仕入",
        created_at: "2024-11-08",
        purchase_tax: 54545, tax_credit: 43636
    },
  {
        id: 62,
        artwork_id: "24B8001",
        event_type: "purchase_discount",
        old_price: 600000,
        new_price: 573000,
        counterparty: "オークションハウス・セントラル",
        counterparty_id: "0012",
        memo: "仕入値引き（仕入日より38日後）",
        created_at: "2024-12-16"
    },
  {
        id: 63,
        artwork_id: "241O001",
        event_type: "purchase",
        old_price: null,
        new_price: 80000,
        counterparty: "銀座アートギャラリー・壱番館",
        counterparty_id: "0015",
        memo: "仕入",
        created_at: "2024-01-24",
        purchase_tax: 7272, tax_credit: 7272
    },
  {
        id: 64,
        artwork_id: "241O001",
        event_type: "consign",
        old_price: null,
        new_price: 256000,
        counterparty: "品川インターシティ",
        counterparty_id: null,
        memo: "委託",
        created_at: "2025-08-08"
    },
  {
        id: 65,
        artwork_id: "2561001",
        event_type: "purchase",
        old_price: null,
        new_price: 350000,
        counterparty: "アトリエ・ノルド",
        counterparty_id: "0014",
        memo: "仕入",
        created_at: "2025-06-01",
        purchase_tax: 31818, tax_credit: 25454
    },
  {
        id: 66,
        artwork_id: "2521001",
        event_type: "purchase",
        old_price: null,
        new_price: 100000,
        counterparty: "銀座アートギャラリー・壱番館",
        counterparty_id: "0015",
        memo: "仕入",
        created_at: "2025-02-01",
        purchase_tax: 9090, tax_credit: 9090
    },
  {
        id: 67,
        artwork_id: "243P001",
        event_type: "purchase",
        old_price: null,
        new_price: 150000,
        counterparty: "アートブリッジ・インターナショナル",
        counterparty_id: "0011",
        memo: "仕入",
        created_at: "2024-03-25",
        purchase_tax: 13636, tax_credit: 13636
    },
  {
        id: 68,
        artwork_id: "243P001",
        event_type: "sold",
        old_price: null,
        new_price: 374000,
        counterparty: "橋本 修",
        counterparty_id: null,
        memo: "成約",
        created_at: "2024-09-10"
    },
  {
        id: 69,
        artwork_id: "24CV001",
        event_type: "purchase",
        old_price: null,
        new_price: 100000,
        counterparty: "アトリエ・ノルド",
        counterparty_id: "0014",
        memo: "仕入",
        created_at: "2024-12-31",
        purchase_tax: 9090, tax_credit: 7272
    },
  {
        id: 70,
        artwork_id: "24CV001",
        event_type: "sold",
        old_price: null,
        new_price: 246000,
        counterparty: "橋本 修",
        counterparty_id: null,
        memo: "成約",
        created_at: "2026-01-27"
    },
  {
        id: 71,
        artwork_id: "257I001",
        event_type: "purchase",
        old_price: null,
        new_price: 500000,
        counterparty: "田中アトリエ",
        counterparty_id: "0006",
        memo: "仕入",
        created_at: "2025-07-18",
        purchase_tax: 45454, tax_credit: 45454
    },
  {
        id: 72,
        artwork_id: "246R001",
        event_type: "purchase",
        old_price: null,
        new_price: 200000,
        counterparty: "ガレリア・ヴィスタ",
        counterparty_id: "0008",
        memo: "仕入",
        created_at: "2024-06-27",
        purchase_tax: 18181, tax_credit: 18181
    },
  {
        id: 73,
        artwork_id: "246R001",
        event_type: "purchase_discount",
        old_price: 200000,
        new_price: 188000,
        counterparty: "ガレリア・ヴィスタ",
        counterparty_id: "0008",
        memo: "仕入値引き（仕入日より42日後）",
        created_at: "2024-08-08"
    },
  {
        id: 74,
        artwork_id: "246R001",
        event_type: "sold",
        old_price: null,
        new_price: 481000,
        counterparty: "山口 恵子",
        counterparty_id: null,
        memo: "成約",
        created_at: "2025-12-01"
    },
  {
        id: 75,
        artwork_id: "254S001",
        event_type: "purchase",
        old_price: null,
        new_price: 400000,
        counterparty: "アトリエ・ノルド",
        counterparty_id: "0014",
        memo: "仕入",
        created_at: "2025-04-28",
        purchase_tax: 36363, tax_credit: 29090
    },
  {
        id: 76,
        artwork_id: "257L001",
        event_type: "purchase",
        old_price: null,
        new_price: 150000,
        counterparty: "アート大阪実行委員会",
        counterparty_id: "0007",
        memo: "仕入",
        created_at: "2025-07-21",
        purchase_tax: 13636, tax_credit: 13636
    },
  {
        id: 77,
        artwork_id: "257L001",
        event_type: "sold",
        old_price: null,
        new_price: 436000,
        counterparty: "鈴木 淳",
        counterparty_id: null,
        memo: "成約",
        created_at: "2025-12-24"
    },
  {
        id: 78,
        artwork_id: "241C001",
        event_type: "purchase",
        old_price: null,
        new_price: 600000,
        counterparty: "アトリエ・ノルド",
        counterparty_id: "0014",
        memo: "仕入",
        created_at: "2024-01-12",
        purchase_tax: 54545, tax_credit: 43636
    },
  {
        id: 79,
        artwork_id: "241C001",
        event_type: "sold",
        old_price: null,
        new_price: 1144000,
        counterparty: "鈴木 淳",
        counterparty_id: null,
        memo: "成約",
        created_at: "2024-11-05"
    },
  {
        id: 80,
        artwork_id: "253B001",
        event_type: "purchase",
        old_price: null,
        new_price: 100000,
        counterparty: "ガレリア・ヴィスタ",
        counterparty_id: "0008",
        memo: "仕入",
        created_at: "2025-03-11",
        purchase_tax: 9090, tax_credit: 9090
    },
  {
        id: 81,
        artwork_id: "253B001",
        event_type: "sold",
        old_price: null,
        new_price: 283000,
        counterparty: "山口 恵子",
        counterparty_id: null,
        memo: "成約",
        created_at: "2026-03-29"
    },
  {
        id: 82,
        artwork_id: "24A1001",
        event_type: "purchase",
        old_price: null,
        new_price: 300000,
        counterparty: "アトリエ・ノルド",
        counterparty_id: "0014",
        memo: "仕入",
        created_at: "2024-10-01",
        purchase_tax: 27272, tax_credit: 21817
    },
  {
        id: 83,
        artwork_id: "24A1001",
        event_type: "consign",
        old_price: null,
        new_price: 557000,
        counterparty: "品川インターシティ",
        counterparty_id: null,
        memo: "委託",
        created_at: "2025-11-09"
    },
  {
        id: 84,
        artwork_id: "2566001",
        event_type: "purchase",
        old_price: null,
        new_price: 350000,
        counterparty: "銀座アートギャラリー・壱番館",
        counterparty_id: "0015",
        memo: "仕入",
        created_at: "2025-06-06",
        purchase_tax: 31818, tax_credit: 31818
    },
  {
        id: 85,
        artwork_id: "2566001",
        event_type: "consign",
        old_price: null,
        new_price: 795000,
        counterparty: "ホテル椿山荘",
        counterparty_id: "0003",
        memo: "委託",
        created_at: "2026-04-17"
    },
  {
        id: 86,
        artwork_id: "257J001",
        event_type: "purchase",
        old_price: null,
        new_price: 50000,
        counterparty: "銀座アートコレクティブ",
        counterparty_id: "0009",
        memo: "仕入",
        created_at: "2025-07-19",
        purchase_tax: 4545, tax_credit: 3636
    },
  {
        id: 87,
        artwork_id: "257J001",
        event_type: "purchase_discount",
        old_price: 50000,
        new_price: 46000,
        counterparty: "銀座アートコレクティブ",
        counterparty_id: "0009",
        memo: "仕入値引き（仕入日より21日後）",
        created_at: "2025-08-09"
    },
  {
        id: 88,
        artwork_id: "24B1001",
        event_type: "purchase",
        old_price: null,
        new_price: 300000,
        counterparty: "アートブリッジ・インターナショナル",
        counterparty_id: "0011",
        memo: "仕入",
        created_at: "2024-11-01",
        purchase_tax: 27272, tax_credit: 27272
    },
  {
        id: 89,
        artwork_id: "253D001",
        event_type: "purchase",
        old_price: null,
        new_price: 50000,
        counterparty: "銀座アートコレクティブ",
        counterparty_id: "0009",
        memo: "仕入",
        created_at: "2025-03-13",
        purchase_tax: 4545, tax_credit: 3636
    },
  {
        id: 90,
        artwork_id: "259P002",
        event_type: "purchase",
        old_price: null,
        new_price: 500000,
        counterparty: "スペース・ムー",
        counterparty_id: "0010",
        memo: "仕入",
        created_at: "2025-09-25",
        purchase_tax: 45454, tax_credit: 36363
    },
  {
        id: 91,
        artwork_id: "259P002",
        event_type: "consign",
        old_price: null,
        new_price: 1261000,
        counterparty: "東京ミッドタウン",
        counterparty_id: null,
        memo: "委託",
        created_at: "2025-10-12"
    },
  {
        id: 92,
        artwork_id: "251U001",
        event_type: "purchase",
        old_price: null,
        new_price: 50000,
        counterparty: "オークションハウス・セントラル",
        counterparty_id: "0012",
        memo: "仕入",
        created_at: "2025-01-30",
        purchase_tax: 4545, tax_credit: 3636
    },
  {
        id: 93,
        artwork_id: "2466001",
        event_type: "purchase",
        old_price: null,
        new_price: 200000,
        counterparty: "アートブリッジ・インターナショナル",
        counterparty_id: "0011",
        memo: "仕入",
        created_at: "2024-06-06",
        purchase_tax: 18181, tax_credit: 18181
    },
  {
        id: 94,
        artwork_id: "261U001",
        event_type: "purchase",
        old_price: null,
        new_price: 80000,
        counterparty: "アート大阪実行委員会",
        counterparty_id: "0007",
        memo: "仕入",
        created_at: "2026-01-30",
        purchase_tax: 7272, tax_credit: 7272
    },
  {
        id: 95,
        artwork_id: "261U001",
        event_type: "sold_discount",
        old_price: 240000,
        new_price: 217000,
        counterparty: "山口 恵子",
        counterparty_id: null,
        memo: "値引き交渉（成約3日前）",
        created_at: "2026-03-26"
    },
  {
        id: 96,
        artwork_id: "261U001",
        event_type: "sold",
        old_price: null,
        new_price: 217000,
        counterparty: "山口 恵子",
        counterparty_id: null,
        memo: "成約",
        created_at: "2026-03-29"
    },
  {
        id: 97,
        artwork_id: "25AS001",
        event_type: "purchase",
        old_price: null,
        new_price: 200000,
        counterparty: "ガレリア・ヴィスタ",
        counterparty_id: "0008",
        memo: "仕入",
        created_at: "2025-10-28",
        purchase_tax: 18181, tax_credit: 18181
    },
  {
        id: 98,
        artwork_id: "25AS001",
        event_type: "sold",
        old_price: null,
        new_price: 522000,
        counterparty: "鈴木 淳",
        counterparty_id: null,
        memo: "成約",
        created_at: "2026-04-24"
    },
  {
        id: 99,
        artwork_id: "249D001",
        event_type: "purchase",
        old_price: null,
        new_price: 500000,
        counterparty: "スペース・ムー",
        counterparty_id: "0010",
        memo: "仕入",
        created_at: "2024-09-13",
        purchase_tax: 45454, tax_credit: 36363
    },
  {
        id: 100,
        artwork_id: "2611001",
        event_type: "purchase",
        old_price: null,
        new_price: 50000,
        counterparty: "銀座アートコレクティブ",
        counterparty_id: "0009",
        memo: "仕入",
        created_at: "2026-01-01",
        purchase_tax: 4545, tax_credit: 3636
    },
  {
        id: 101,
        artwork_id: "259Q001",
        event_type: "purchase",
        old_price: null,
        new_price: 300000,
        counterparty: "銀座アートコレクティブ",
        counterparty_id: "0009",
        memo: "仕入",
        created_at: "2025-09-26",
        purchase_tax: 27272, tax_credit: 21817
    },
  {
        id: 102,
        artwork_id: "259Q001",
        event_type: "sold_discount",
        old_price: 720000,
        new_price: 623000,
        counterparty: "株式会社アート・ソリューションズ",
        counterparty_id: "0005",
        memo: "値引き交渉（成約4日前）",
        created_at: "2026-05-02"
    },
  {
        id: 103,
        artwork_id: "259Q001",
        event_type: "sold",
        old_price: null,
        new_price: 623000,
        counterparty: "株式会社アート・ソリューションズ",
        counterparty_id: "0005",
        memo: "成約",
        created_at: "2026-05-06"
    },
  {
        id: 104,
        artwork_id: "23BG001",
        event_type: "purchase",
        old_price: null,
        new_price: 280000,
        counterparty: "アート大阪実行委員会",
        counterparty_id: "0007",
        memo: "仕入",
        created_at: "2023-11-16",
        purchase_tax: 25454, tax_credit: 25454
    },
  {
        id: 105,
        artwork_id: "238A002",
        event_type: "purchase",
        old_price: null,
        new_price: 250000,
        counterparty: "シンワオークション株式会社",
        counterparty_id: "0013",
        memo: "仕入",
        created_at: "2023-08-10",
        purchase_tax: 22727, tax_credit: 22727
    },
  {
        id: 106,
        artwork_id: "24AR001",
        event_type: "purchase",
        old_price: null,
        new_price: 100000,
        counterparty: "スペース・ムー",
        counterparty_id: "0010",
        memo: "仕入",
        created_at: "2024-10-27",
        purchase_tax: 9090, tax_credit: 7272
    },
  {
        id: 107,
        artwork_id: "2449001",
        event_type: "purchase",
        old_price: null,
        new_price: 350000,
        counterparty: "銀座アートコレクティブ",
        counterparty_id: "0009",
        memo: "仕入",
        created_at: "2024-04-09",
        purchase_tax: 31818, tax_credit: 25454
    },
  {
        id: 108,
        artwork_id: "2449001",
        event_type: "purchase_discount",
        old_price: 350000,
        new_price: 328000,
        counterparty: "銀座アートコレクティブ",
        counterparty_id: "0009",
        memo: "仕入値引き（仕入日より17日後）",
        created_at: "2024-04-26"
    },
  {
        id: 109,
        artwork_id: "23CE001",
        event_type: "purchase",
        old_price: null,
        new_price: 400000,
        counterparty: "アートブリッジ・インターナショナル",
        counterparty_id: "0011",
        memo: "仕入",
        created_at: "2023-12-14",
        purchase_tax: 36363, tax_credit: 36363
    },
  {
        id: 110,
        artwork_id: "23CE001",
        event_type: "purchase_discount",
        old_price: 400000,
        new_price: 383000,
        counterparty: "アートブリッジ・インターナショナル",
        counterparty_id: "0011",
        memo: "仕入値引き（仕入日より22日後）",
        created_at: "2024-01-05"
    },
  {
        id: 111,
        artwork_id: "248F001",
        event_type: "purchase",
        old_price: null,
        new_price: 350000,
        counterparty: "銀座アートギャラリー・壱番館",
        counterparty_id: "0015",
        memo: "仕入",
        created_at: "2024-08-15",
        purchase_tax: 31818, tax_credit: 31818
    },
  {
        id: 112,
        artwork_id: "256U001",
        event_type: "purchase",
        old_price: null,
        new_price: 80000,
        counterparty: "アート大阪実行委員会",
        counterparty_id: "0007",
        memo: "仕入",
        created_at: "2025-06-30",
        purchase_tax: 7272, tax_credit: 7272
    },
  {
        id: 113,
        artwork_id: "256U001",
        event_type: "sold",
        old_price: null,
        new_price: 227000,
        counterparty: "鈴木 淳",
        counterparty_id: null,
        memo: "成約",
        created_at: "2025-09-03"
    },
  {
        id: 114,
        artwork_id: "247O001",
        event_type: "purchase",
        old_price: null,
        new_price: 100000,
        counterparty: "田中アトリエ",
        counterparty_id: "0006",
        memo: "仕入",
        created_at: "2024-07-24",
        purchase_tax: 9090, tax_credit: 9090
    },
  {
        id: 115,
        artwork_id: "247O001",
        event_type: "purchase_discount",
        old_price: 100000,
        new_price: 92000,
        counterparty: "田中アトリエ",
        counterparty_id: "0006",
        memo: "仕入値引き（仕入日より19日後）",
        created_at: "2024-08-12"
    },
  {
        id: 116,
        artwork_id: "252P001",
        event_type: "purchase",
        old_price: null,
        new_price: 300000,
        counterparty: "オークションハウス・セントラル",
        counterparty_id: "0012",
        memo: "仕入",
        created_at: "2025-02-25",
        purchase_tax: 27272, tax_credit: 21817
    },
  {
        id: 117,
        artwork_id: "252P001",
        event_type: "sold",
        old_price: null,
        new_price: 978000,
        counterparty: "株式会社アート・ソリューションズ",
        counterparty_id: "0005",
        memo: "成約",
        created_at: "2025-07-12"
    },
  {
        id: 118,
        artwork_id: "249R001",
        event_type: "purchase",
        old_price: null,
        new_price: 200000,
        counterparty: "ガレリア・ヴィスタ",
        counterparty_id: "0008",
        memo: "仕入",
        created_at: "2024-09-27",
        purchase_tax: 18181, tax_credit: 18181
    },
  {
        id: 119,
        artwork_id: "249R001",
        event_type: "sold",
        old_price: null,
        new_price: 510000,
        counterparty: "伊藤コレクション",
        counterparty_id: null,
        memo: "成約",
        created_at: "2025-09-03"
    },
  {
        id: 120,
        artwork_id: "2365001",
        event_type: "purchase",
        old_price: null,
        new_price: 350000,
        counterparty: "シンワオークション株式会社",
        counterparty_id: "0013",
        memo: "仕入",
        created_at: "2023-06-05",
        purchase_tax: 31818, tax_credit: 31818
    },
  {
        id: 121,
        artwork_id: "2365001",
        event_type: "consign",
        old_price: null,
        new_price: 687000,
        counterparty: "六本木ヒルズ",
        counterparty_id: null,
        memo: "委託",
        created_at: "2025-07-19"
    },
  {
        id: 122,
        artwork_id: "258C001",
        event_type: "purchase",
        old_price: null,
        new_price: 280000,
        counterparty: "銀座アートギャラリー・壱番館",
        counterparty_id: "0015",
        memo: "仕入",
        created_at: "2025-08-12",
        purchase_tax: 25454, tax_credit: 25454
    },
  {
        id: 123,
        artwork_id: "258C001",
        event_type: "sold",
        old_price: null,
        new_price: 637000,
        counterparty: "橋本 修",
        counterparty_id: null,
        memo: "成約",
        created_at: "2026-03-28"
    },
  {
        id: 124,
        artwork_id: "248T001",
        event_type: "purchase",
        old_price: null,
        new_price: 80000,
        counterparty: "田中アトリエ",
        counterparty_id: "0006",
        memo: "仕入",
        created_at: "2024-08-29",
        purchase_tax: 7272, tax_credit: 7272
    },
  {
        id: 125,
        artwork_id: "255E001",
        event_type: "purchase",
        old_price: null,
        new_price: 300000,
        counterparty: "スペース・ムー",
        counterparty_id: "0010",
        memo: "仕入",
        created_at: "2025-05-14",
        purchase_tax: 27272, tax_credit: 21817
    },
  {
        id: 126,
        artwork_id: "255S001",
        event_type: "purchase",
        old_price: null,
        new_price: 80000,
        counterparty: "ガレリア・ヴィスタ",
        counterparty_id: "0008",
        memo: "仕入",
        created_at: "2025-05-28",
        purchase_tax: 7272, tax_credit: 7272
    },
  {
        id: 127,
        artwork_id: "255S001",
        event_type: "sold",
        old_price: null,
        new_price: 148000,
        counterparty: "鈴木 淳",
        counterparty_id: null,
        memo: "成約",
        created_at: "2026-05-12"
    },
  {
        id: 128,
        artwork_id: "259G001",
        event_type: "purchase",
        old_price: null,
        new_price: 350000,
        counterparty: "アート大阪実行委員会",
        counterparty_id: "0007",
        memo: "仕入",
        created_at: "2025-09-16",
        purchase_tax: 31818, tax_credit: 31818
    },
  {
        id: 129,
        artwork_id: "259G001",
        event_type: "sold",
        old_price: null,
        new_price: 1086000,
        counterparty: "伊藤コレクション",
        counterparty_id: null,
        memo: "成約",
        created_at: "2025-12-29"
    },
  {
        id: 130,
        artwork_id: "251T001",
        event_type: "purchase",
        old_price: null,
        new_price: 600000,
        counterparty: "シンワオークション株式会社",
        counterparty_id: "0013",
        memo: "仕入",
        created_at: "2025-01-29",
        purchase_tax: 54545, tax_credit: 54545
    },
  {
        id: 131,
        artwork_id: "245F001",
        event_type: "purchase",
        old_price: null,
        new_price: 350000,
        counterparty: "田中アトリエ",
        counterparty_id: "0006",
        memo: "仕入",
        created_at: "2024-05-15",
        purchase_tax: 31818, tax_credit: 31818
    },
  {
        id: 132,
        artwork_id: "245F001",
        event_type: "sold",
        old_price: null,
        new_price: 901000,
        counterparty: "橋本 修",
        counterparty_id: null,
        memo: "成約",
        created_at: "2025-12-10"
    },
  {
        id: 133,
        artwork_id: "252L001",
        event_type: "purchase",
        old_price: null,
        new_price: 150000,
        counterparty: "銀座アートギャラリー・壱番館",
        counterparty_id: "0015",
        memo: "仕入",
        created_at: "2025-02-21",
        purchase_tax: 13636, tax_credit: 13636
    },
  {
        id: 134,
        artwork_id: "253G001",
        event_type: "purchase",
        old_price: null,
        new_price: 600000,
        counterparty: "ガレリア・ヴィスタ",
        counterparty_id: "0008",
        memo: "仕入",
        created_at: "2025-03-16",
        purchase_tax: 54545, tax_credit: 54545
    },
  {
        id: 135,
        artwork_id: "247H001",
        event_type: "purchase",
        old_price: null,
        new_price: 250000,
        counterparty: "銀座アートコレクティブ",
        counterparty_id: "0009",
        memo: "仕入",
        created_at: "2024-07-17",
        purchase_tax: 22727, tax_credit: 18181
    },
  {
        id: 136,
        artwork_id: "247H001",
        event_type: "consign",
        old_price: null,
        new_price: 617000,
        counterparty: "ホテル椿山荘",
        counterparty_id: "0003",
        memo: "委託",
        created_at: "2025-05-29"
    },
  {
        id: 137,
        artwork_id: "246P001",
        event_type: "purchase",
        old_price: null,
        new_price: 400000,
        counterparty: "銀座アートギャラリー・壱番館",
        counterparty_id: "0015",
        memo: "仕入",
        created_at: "2024-06-25",
        purchase_tax: 36363, tax_credit: 36363
    },
  {
        id: 138,
        artwork_id: "246P001",
        event_type: "sold",
        old_price: null,
        new_price: 1017000,
        counterparty: "鈴木 淳",
        counterparty_id: null,
        memo: "成約",
        created_at: "2025-06-15"
    },
  {
        id: 139,
        artwork_id: "249G001",
        event_type: "purchase",
        old_price: null,
        new_price: 280000,
        counterparty: "スペース・ムー",
        counterparty_id: "0010",
        memo: "仕入",
        created_at: "2024-09-16",
        purchase_tax: 25454, tax_credit: 20363
    },
  {
        id: 140,
        artwork_id: "249G001",
        event_type: "consign",
        old_price: null,
        new_price: 629000,
        counterparty: "六本木ヒルズ",
        counterparty_id: null,
        memo: "委託",
        created_at: "2026-05-16"
    },
  {
        id: 141,
        artwork_id: "24AD001",
        event_type: "purchase",
        old_price: null,
        new_price: 300000,
        counterparty: "アトリエ・ノルド",
        counterparty_id: "0014",
        memo: "仕入",
        created_at: "2024-10-13",
        purchase_tax: 27272, tax_credit: 21817
    },
  {
        id: 142,
        artwork_id: "237K001",
        event_type: "purchase",
        old_price: null,
        new_price: 150000,
        counterparty: "スペース・ムー",
        counterparty_id: "0010",
        memo: "仕入",
        created_at: "2023-07-20",
        purchase_tax: 13636, tax_credit: 13636
    },
  {
        id: 143,
        artwork_id: "237K001",
        event_type: "consign",
        old_price: null,
        new_price: 309000,
        counterparty: "ホテル椿山荘",
        counterparty_id: "0003",
        memo: "委託",
        created_at: "2025-07-14"
    },
  {
        id: 144,
        artwork_id: "24CM001",
        event_type: "purchase",
        old_price: null,
        new_price: 500000,
        counterparty: "田中アトリエ",
        counterparty_id: "0006",
        memo: "仕入",
        created_at: "2024-12-22",
        purchase_tax: 45454, tax_credit: 45454
    },
  {
        id: 145,
        artwork_id: "24CM001",
        event_type: "sold",
        old_price: null,
        new_price: 1642000,
        counterparty: "株式会社アート・ソリューションズ",
        counterparty_id: "0005",
        memo: "成約",
        created_at: "2025-12-17"
    },
  {
        id: 146,
        artwork_id: "235U001",
        event_type: "purchase",
        old_price: null,
        new_price: 600000,
        counterparty: "オークションハウス・セントラル",
        counterparty_id: "0012",
        memo: "仕入",
        created_at: "2023-05-30",
        purchase_tax: 54545, tax_credit: 54545
    },
  {
        id: 147,
        artwork_id: "235U001",
        event_type: "consign",
        old_price: null,
        new_price: 1789000,
        counterparty: "ホテル椿山荘",
        counterparty_id: "0003",
        memo: "委託",
        created_at: "2024-05-14"
    },
  {
        id: 148,
        artwork_id: "24BU001",
        event_type: "purchase",
        old_price: null,
        new_price: 600000,
        counterparty: "スペース・ムー",
        counterparty_id: "0010",
        memo: "仕入",
        created_at: "2024-11-30",
        purchase_tax: 54545, tax_credit: 43636
    },
  {
        id: 149,
        artwork_id: "24BU001",
        event_type: "purchase_discount",
        old_price: 600000,
        new_price: 572000,
        counterparty: "スペース・ムー",
        counterparty_id: "0010",
        memo: "仕入値引き（仕入日より11日後）",
        created_at: "2024-12-11"
    },
  {
        id: 150,
        artwork_id: "2529001",
        event_type: "purchase",
        old_price: null,
        new_price: 80000,
        counterparty: "アトリエ・ノルド",
        counterparty_id: "0014",
        memo: "仕入",
        created_at: "2025-02-09",
        purchase_tax: 7272, tax_credit: 5817
    },
  {
        id: 151,
        artwork_id: "254O001",
        event_type: "purchase",
        old_price: null,
        new_price: 280000,
        counterparty: "アトリエ・ノルド",
        counterparty_id: "0014",
        memo: "仕入",
        created_at: "2025-04-24",
        purchase_tax: 25454, tax_credit: 20363
    },
  {
        id: 152,
        artwork_id: "25BI001",
        event_type: "purchase",
        old_price: null,
        new_price: 50000,
        counterparty: "ガレリア・ヴィスタ",
        counterparty_id: "0008",
        memo: "仕入",
        created_at: "2025-11-18",
        purchase_tax: 4545, tax_credit: 4545
    },
  {
        id: 153,
        artwork_id: "25BI001",
        event_type: "purchase_discount",
        old_price: 50000,
        new_price: 48000,
        counterparty: "ガレリア・ヴィスタ",
        counterparty_id: "0008",
        memo: "仕入値引き（仕入日より21日後）",
        created_at: "2025-12-09"
    },
  {
        id: 154,
        artwork_id: "25BI001",
        event_type: "consign",
        old_price: null,
        new_price: 101000,
        counterparty: "東京ミッドタウン",
        counterparty_id: null,
        memo: "委託",
        created_at: "2026-05-01"
    },
  {
        id: 155,
        artwork_id: "251T002",
        event_type: "purchase",
        old_price: null,
        new_price: 80000,
        counterparty: "田中アトリエ",
        counterparty_id: "0006",
        memo: "仕入",
        created_at: "2025-01-29",
        purchase_tax: 7272, tax_credit: 7272
    },
  {
        id: 156,
        artwork_id: "251T002",
        event_type: "sold",
        old_price: null,
        new_price: 143000,
        counterparty: "山口 恵子",
        counterparty_id: null,
        memo: "成約",
        created_at: "2025-06-30"
    },
  {
        id: 157,
        artwork_id: "2382001",
        event_type: "purchase",
        old_price: null,
        new_price: 150000,
        counterparty: "アトリエ・ノルド",
        counterparty_id: "0014",
        memo: "仕入",
        created_at: "2023-08-02",
        purchase_tax: 13636, tax_credit: 13636
    },
  {
        id: 158,
        artwork_id: "2382001",
        event_type: "sold",
        old_price: null,
        new_price: 318000,
        counterparty: "株式会社アート・ソリューションズ",
        counterparty_id: "0005",
        memo: "成約",
        created_at: "2023-10-20"
    },
  {
        id: 159,
        artwork_id: "248M001",
        event_type: "purchase",
        old_price: null,
        new_price: 150000,
        counterparty: "銀座アートコレクティブ",
        counterparty_id: "0009",
        memo: "仕入",
        created_at: "2024-08-22",
        purchase_tax: 13636, tax_credit: 10908
    },
  {
        id: 160,
        artwork_id: "248M001",
        event_type: "consign",
        old_price: null,
        new_price: 416000,
        counterparty: "六本木ヒルズ",
        counterparty_id: null,
        memo: "委託",
        created_at: "2025-05-02"
    },
  {
        id: 161,
        artwork_id: "235N001",
        event_type: "purchase",
        old_price: null,
        new_price: 50000,
        counterparty: "シンワオークション株式会社",
        counterparty_id: "0013",
        memo: "仕入",
        created_at: "2023-05-23",
        purchase_tax: 4545, tax_credit: 4545
    },
  {
        id: 162,
        artwork_id: "235N001",
        event_type: "consign",
        old_price: null,
        new_price: 147000,
        counterparty: "六本木ヒルズ",
        counterparty_id: null,
        memo: "委託",
        created_at: "2023-12-02"
    },
  {
        id: 163,
        artwork_id: "2515001",
        event_type: "purchase",
        old_price: null,
        new_price: 150000,
        counterparty: "シンワオークション株式会社",
        counterparty_id: "0013",
        memo: "仕入",
        created_at: "2025-01-05",
        purchase_tax: 13636, tax_credit: 13636
    },
  {
        id: 164,
        artwork_id: "2515001",
        event_type: "sold",
        old_price: null,
        new_price: 369000,
        counterparty: "山口 恵子",
        counterparty_id: null,
        memo: "成約",
        created_at: "2025-08-01"
    },
  {
        id: 165,
        artwork_id: "2568001",
        event_type: "purchase",
        old_price: null,
        new_price: 250000,
        counterparty: "アトリエ・ノルド",
        counterparty_id: "0014",
        memo: "仕入",
        created_at: "2025-06-08",
        purchase_tax: 22727, tax_credit: 18181
    },
  {
        id: 166,
        artwork_id: "2568001",
        event_type: "sold",
        old_price: null,
        new_price: 538000,
        counterparty: "山口 恵子",
        counterparty_id: null,
        memo: "成約",
        created_at: "2026-02-18"
    },
  {
        id: 167,
        artwork_id: "23CF001",
        event_type: "purchase",
        old_price: null,
        new_price: 200000,
        counterparty: "アトリエ・ノルド",
        counterparty_id: "0014",
        memo: "仕入",
        created_at: "2023-12-15",
        purchase_tax: 18181, tax_credit: 14544
    },
  {
        id: 168,
        artwork_id: "23CF001",
        event_type: "consign",
        old_price: null,
        new_price: 389000,
        counterparty: "丸の内ビル",
        counterparty_id: null,
        memo: "委託",
        created_at: "2026-05-09"
    },
  {
        id: 169,
        artwork_id: "2495001",
        event_type: "purchase",
        old_price: null,
        new_price: 350000,
        counterparty: "銀座アートギャラリー・壱番館",
        counterparty_id: "0015",
        memo: "仕入",
        created_at: "2024-09-05",
        purchase_tax: 31818, tax_credit: 31818
    },
  {
        id: 170,
        artwork_id: "2495001",
        event_type: "sold_discount",
        old_price: 950000,
        new_price: 862000,
        counterparty: "伊藤コレクション",
        counterparty_id: null,
        memo: "値引き交渉（成約8日前）",
        created_at: "2025-05-07"
    },
  {
        id: 171,
        artwork_id: "2495001",
        event_type: "sold",
        old_price: null,
        new_price: 862000,
        counterparty: "伊藤コレクション",
        counterparty_id: null,
        memo: "成約",
        created_at: "2025-05-15"
    },
  {
        id: 172,
        artwork_id: "255A001",
        event_type: "purchase",
        old_price: null,
        new_price: 80000,
        counterparty: "銀座アートコレクティブ",
        counterparty_id: "0009",
        memo: "仕入",
        created_at: "2025-05-10",
        purchase_tax: 7272, tax_credit: 5817
    },
  {
        id: 173,
        artwork_id: "25AJ001",
        event_type: "purchase",
        old_price: null,
        new_price: 100000,
        counterparty: "田中アトリエ",
        counterparty_id: "0006",
        memo: "仕入",
        created_at: "2025-10-19",
        purchase_tax: 9090, tax_credit: 9090
    },
  {
        id: 174,
        artwork_id: "245S001",
        event_type: "purchase",
        old_price: null,
        new_price: 250000,
        counterparty: "スペース・ムー",
        counterparty_id: "0010",
        memo: "仕入",
        created_at: "2024-05-28",
        purchase_tax: 22727, tax_credit: 18181
    },
  {
        id: 175,
        artwork_id: "245S001",
        event_type: "consign",
        old_price: null,
        new_price: 554000,
        counterparty: "ホテル椿山荘",
        counterparty_id: "0003",
        memo: "委託",
        created_at: "2026-04-01"
    },
  {
        id: 176,
        artwork_id: "24AE001",
        event_type: "purchase",
        old_price: null,
        new_price: 280000,
        counterparty: "アート大阪実行委員会",
        counterparty_id: "0007",
        memo: "仕入",
        created_at: "2024-10-14",
        purchase_tax: 25454, tax_credit: 25454
    },
  {
        id: 177,
        artwork_id: "248P001",
        event_type: "purchase",
        old_price: null,
        new_price: 200000,
        counterparty: "アート大阪実行委員会",
        counterparty_id: "0007",
        memo: "仕入",
        created_at: "2024-08-25",
        purchase_tax: 18181, tax_credit: 18181
    },
  {
        id: 178,
        artwork_id: "243I001",
        event_type: "purchase",
        old_price: null,
        new_price: 80000,
        counterparty: "スペース・ムー",
        counterparty_id: "0010",
        memo: "仕入",
        created_at: "2024-03-18",
        purchase_tax: 7272, tax_credit: 5817
    },
  {
        id: 179,
        artwork_id: "243I001",
        event_type: "purchase_discount",
        old_price: 80000,
        new_price: 75000,
        counterparty: "スペース・ムー",
        counterparty_id: "0010",
        memo: "仕入値引き（仕入日より11日後）",
        created_at: "2024-03-29"
    },
  {
        id: 180,
        artwork_id: "243I001",
        event_type: "consign",
        old_price: null,
        new_price: 144000,
        counterparty: "ホテル椿山荘",
        counterparty_id: "0003",
        memo: "委託",
        created_at: "2025-02-11"
    },
  {
        id: 181,
        artwork_id: "248E001",
        event_type: "purchase",
        old_price: null,
        new_price: 100000,
        counterparty: "アトリエ・ノルド",
        counterparty_id: "0014",
        memo: "仕入",
        created_at: "2024-08-14",
        purchase_tax: 9090, tax_credit: 7272
    },
  {
        id: 182,
        artwork_id: "248E001",
        event_type: "purchase_discount",
        old_price: 100000,
        new_price: 97000,
        counterparty: "アトリエ・ノルド",
        counterparty_id: "0014",
        memo: "仕入値引き（仕入日より23日後）",
        created_at: "2024-09-06"
    },
  {
        id: 183,
        artwork_id: "248E001",
        event_type: "consign",
        old_price: null,
        new_price: 256000,
        counterparty: "ホテル椿山荘",
        counterparty_id: "0003",
        memo: "委託",
        created_at: "2025-02-23"
    },
  { id: 184, artwork_id: "256G001", event_type: "purchase_increase", old_price: 350000, new_price: 375000, counterparty: "田中アトリエ", counterparty_id: "0006", memo: "仕入値上げ", created_at: "2025-06-28" },
  { id: 185, artwork_id: "258N001", event_type: "purchase_increase", old_price: 150000, new_price: 165000, counterparty: "田中アトリエ", counterparty_id: "0006", memo: "仕入値上げ", created_at: "2025-09-12" },
  { id: 186, artwork_id: "255N001", event_type: "purchase_increase", old_price: 50000, new_price: 58000, counterparty: "スペース・ムー", counterparty_id: "0010", memo: "仕入値上げ", created_at: "2025-06-27" },
  { id: 187, artwork_id: "249J001", event_type: "sold_increase", old_price: 1134000, new_price: 1200000, counterparty: "伊藤コレクション", counterparty_id: null, memo: "売上値上げ（交渉成立）", created_at: "2025-06-13" },
  { id: 188, artwork_id: "257F001", event_type: "sold_increase", old_price: 1008000, new_price: 1050000, counterparty: "山口 恵子", counterparty_id: null, memo: "売上値上げ（交渉成立）", created_at: "2025-11-22" },
  { id: 189, artwork_id: "24AC001", event_type: "sold_increase", old_price: 1054000, new_price: 1110000, counterparty: "山口 恵子", counterparty_id: null, memo: "売上値上げ（交渉成立）", created_at: "2026-05-15" },
];

// ─── ユーティリティ ───────────────────────────────────────
const fmt   = (n) => n != null && n !== "" ? `¥${Number(n).toLocaleString()}` : "—";
const getLatestTx = (a) => {
  if (a.status === "sold")      return { type:"sold",      price:a.sold_price,        date:a.sold_at,      cpName:a.buyer,     cpId:a.buyer_id,     color:"#22c55e" };
  if (a.status === "consigned") return { type:"consigned", price:a.consignment_price, date:a.consigned_at, cpName:a.consignee, cpId:a.consignee_id, color:"#38bdf8" };
  return                              { type:"purchase",   price:a.purchase_price,    date:a.purchased_at, cpName:a.supplier,  cpId:a.supplier_id,  color:"#5A57A6" };
};
const today = () => new Date().toISOString().slice(0, 10);

// 月を12進数（1-9, A-C）に変換
const monthToBase12 = (m) => m <= 9 ? String(m) : String.fromCharCode(55 + m); // 10→A, 11→B, 12→C

// 日を31進数（1-9, A-V）に変換
const dayToBase31 = (d) => d <= 9 ? String(d) : String.fromCharCode(55 + d); // 10→A ... 31→V

// 仕入日と既存作品リストからIDを生成
const generateArtworkId = (dateStr, artworks) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const yy  = String(d.getFullYear()).slice(-2);
  const mm  = monthToBase12(d.getMonth() + 1);
  const dd  = dayToBase31(d.getDate());
  const prefix = `${yy}${mm}${dd}`;
  // 同日の仕入れ数をカウント
  const sameDay = artworks.filter(a => a.purchased_at === dateStr).length;
  const seq = String(sameDay + 1).padStart(3, "0");
  return `${prefix}${seq}`;
};
const cpDisplayName = (cp) => cp ? (cp.name || cp.company || "—") : "—";
// 種別ID→カテゴリ（"individual"=氏名を主名称 / "corporate"=会社名を主名称）を引く
const cpTypeCategory = (typeId, types) => types.find(t=>t.id===typeId)?.category || "individual";
const cpTypeLabel    = (typeId, types) => types.find(t=>t.id===typeId)?.name || "未分類";
const cpFullName     = (cp, types) => {
  if (!cp) return "—";
  if (cpTypeCategory(cp.type_id, types) === "individual") {
    return cp.company ? `${cp.name}（${cp.company}）` : cp.name || "—";
  }
  return cp.department ? `${cp.company} ${cp.department}` : cp.company || "—";
};

// ─── メインコンポーネント ─────────────────────────────────
export default function GalleryApp() {
  // ── LocalStorage からデータを読み込む（なければサンプルデータで初期化） ──
  const loadLS = <T,>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch {}
    return fallback;
  };

  const [artworks, setArtworks] = useState<any[]>(() =>
    loadLS("gallery_artworks", [...initialArtworks, ...additionalArtworks])
  );
  const [history,  setHistory]  = useState<any[]>(() =>
    loadLS("gallery_history", [...initialHistory, ...additionalHistory])
  );
  const [counterparties, setCounterparties] = useState<any[]>(() =>
    loadLS("gallery_counterparties", initialCounterparties).map(migrateCpType)
  );
  const [view,      setView]     = useState("inventory");
  const [prevView,   setPrevView]  = useState(null);
  const [selectedId,    setSelectedId]    = useState(null);
  const [selectedCpId,  setSelectedCpId]  = useState(null);
  const [search,    setSearch]   = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cpSearch,  setCpSearch] = useState("");
  const [cpTypeFilter, setCpTypeFilter] = useState("all");
  const [nextHid,   setNextHid]  = useState(() => loadLS("gallery_nextHid", 190));
  const [nextCpId,  setNextCpId] = useState(() => loadLS("gallery_nextCpId", 20));
  const [nextArtworkInternalId, setNextArtworkInternalId] = useState(() => loadLS("gallery_nextArtworkInternalId", 104));
  const [taxSettings, setTaxSettings] = useState(() => loadLS("gallery_taxSettings", DEFAULT_TAX_SETTINGS));
  const [artists, setArtists] = useState<any[]>(() => loadLS("gallery_artists", initialArtists));
  const [nextArtistId, setNextArtistId] = useState(() => loadLS("gallery_nextArtistId", 25));
  const [editingArtistId, setEditingArtistId] = useState<number|null>(null);
  const [artworkGroups, setArtworkGroups] = useState<any[]>(() => loadLS("gallery_artworkGroups", initialArtworkGroups));
  const [nextGroupId, setNextGroupId] = useState(() => loadLS("gallery_nextGroupId", 2));
  const [counterpartyTypes, setCounterpartyTypes] = useState<any[]>(() => loadLS("gallery_counterpartyTypes", initialCounterpartyTypes));
  const [nextCpTypeId, setNextCpTypeId] = useState(() => loadLS("gallery_nextCpTypeId", 5));

  // 画廊情報
  const [galleryInfo, setGalleryInfo] = useState(() => loadLS("gallery_galleryInfo", {
    name: "", zip: "", address: "", building: "", tel: "", email: "", fax: "",
    fiscalStartMonth: 9,
    fiscalOriginYear: 1970,
  }));

  // 社員
  const [staffList, setStaffList] = useState<any[]>(() => loadLS("gallery_staffList", [
    { id: 1, name: "山田 太郎" },
    { id: 2, name: "鈴木 花子" },
  ]));
  const [nextStaffId, setNextStaffId] = useState(() => loadLS("gallery_nextStaffId", 3));

  // 委託案件
  const [consignments, setConsignments] = useState<any[]>(() =>
    loadLS("gallery_consignments", initialConsignments)
  );
  const [editingConsignmentId, setEditingConsignmentId] = useState(null);
  const [nextConsignmentId, setNextConsignmentId] = useState(() => loadLS("gallery_nextConsignmentId", 6));
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const mainRef = useRef<HTMLElement>(null);
  const [saleFormKey, setSaleFormKey] = useState(0);
  const navigateTo = (v: string) => {
    // 仕入・売上登録フォームから離れる場合は入力内容をリセット
    if (view === "add_artwork") setArtworkForm(emptyArtwork);
    if (view === "add_sale") setSaleFormKey(k => k + 1);
    setView(v);
    setTimeout(() => { mainRef.current?.scrollTo(0, 0); }, 0);
  };
  const [registerMenuOpen, setRegisterMenuOpen] = useState(false);
  // アクティブタブ判定
  const activeNav = view==="inventory" ? "inventory"
    : view==="list"||view==="detail" ? "list"
    : view==="daily" ? "daily"
    : view==="consignment"||view==="consignment_new"||view==="consignment_edit" ? "consignment"
    : view==="cp_list"||view==="cp_detail" ? "cp_list"
    : view==="add_sale" ? null
    : view==="settings"||view==="tax_settings"||view==="gallery_settings"||view==="staff_settings"||view==="artist_settings"||view==="artist_list"||view==="artist_form"||view==="cp_type_settings"||view==="data_settings" ? "settings"
    : null;
  const navBarRef = useRef<HTMLElement>(null);
  const navItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [navSlider, setNavSlider] = useState<{left:number,width:number,visible:boolean}>({left:0,width:0,visible:false});
  useEffect(() => {
    const updateSlider = () => {
      const btn = activeNav ? navItemRefs.current[activeNav] : null;
      const bar = navBarRef.current;
      if (btn && bar) {
        const barRect = bar.getBoundingClientRect();
        const btnRect = btn.getBoundingClientRect();
        setNavSlider({ left: btnRect.left - barRect.left, width: btnRect.width, visible: true });
      } else {
        setNavSlider(s => ({ ...s, visible: false }));
      }
    };
    updateSlider();
    window.addEventListener("resize", updateSlider);
    return () => window.removeEventListener("resize", updateSlider);
  }, [activeNav, isMobile]);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    // Google Fonts読み込み
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
    const link2 = document.createElement("link");
    link2.rel = "stylesheet";
    link2.href = "https://fonts.googleapis.com/icon?family=Material+Icons";
    document.head.appendChild(link2);
  }, []);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #F9F9F7; }
      #root { width: 100%; height: 100%; }
      button:focus { outline: none !important; border-color: inherit !important; box-shadow: none !important; }
      button:focus-visible { outline: none !important; }
      button:active { box-shadow: none !important; }
      input[type=number]::-webkit-inner-spin-button,
      input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      input[type=number] { -moz-appearance: textfield; }
      input::placeholder, textarea::placeholder { color: #5E6367 !important; opacity: 1; }
      input::-webkit-input-placeholder, textarea::-webkit-input-placeholder { color: #5E6367 !important; }
      input::-moz-placeholder, textarea::-moz-placeholder { color: #5E6367 !important; opacity: 1; }
      @keyframes registerCardRise {
        from { transform: translateY(40px) scale(0.9); opacity: 0; }
        to   { transform: translateY(0) scale(1); opacity: 1; }
      }
      .registerCard { animation: registerCardRise 0.25s cubic-bezier(0.2,0.8,0.3,1) both; transform-origin: bottom center; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // ── LocalStorage 自動保存 ──
  useEffect(() => { localStorage.setItem("gallery_artworks",                JSON.stringify(artworks)); }, [artworks]);
  useEffect(() => { localStorage.setItem("gallery_history",                 JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem("gallery_counterparties",          JSON.stringify(counterparties)); }, [counterparties]);
  useEffect(() => { localStorage.setItem("gallery_taxSettings",             JSON.stringify(taxSettings)); }, [taxSettings]);
  useEffect(() => { localStorage.setItem("gallery_artists",                 JSON.stringify(artists)); }, [artists]);
  useEffect(() => { localStorage.setItem("gallery_artworkGroups",           JSON.stringify(artworkGroups)); }, [artworkGroups]);
  useEffect(() => { localStorage.setItem("gallery_counterpartyTypes",       JSON.stringify(counterpartyTypes)); }, [counterpartyTypes]);
  useEffect(() => { localStorage.setItem("gallery_nextCpTypeId",            JSON.stringify(nextCpTypeId)); }, [nextCpTypeId]);
  useEffect(() => { localStorage.setItem("gallery_galleryInfo",             JSON.stringify(galleryInfo)); }, [galleryInfo]);
  useEffect(() => { localStorage.setItem("gallery_staffList",               JSON.stringify(staffList)); }, [staffList]);
  useEffect(() => { localStorage.setItem("gallery_consignments",            JSON.stringify(consignments)); }, [consignments]);
  useEffect(() => { localStorage.setItem("gallery_nextHid",                 JSON.stringify(nextHid)); }, [nextHid]);
  useEffect(() => { localStorage.setItem("gallery_nextCpId",                JSON.stringify(nextCpId)); }, [nextCpId]);
  useEffect(() => { localStorage.setItem("gallery_nextArtworkInternalId",   JSON.stringify(nextArtworkInternalId)); }, [nextArtworkInternalId]);
  useEffect(() => { localStorage.setItem("gallery_nextArtistId",            JSON.stringify(nextArtistId)); }, [nextArtistId]);
  useEffect(() => { localStorage.setItem("gallery_nextGroupId",             JSON.stringify(nextGroupId)); }, [nextGroupId]);
  useEffect(() => { localStorage.setItem("gallery_nextStaffId",             JSON.stringify(nextStaffId)); }, [nextStaffId]);
  useEffect(() => { localStorage.setItem("gallery_nextConsignmentId",       JSON.stringify(nextConsignmentId)); }, [nextConsignmentId]);

  // ── データエクスポート ──
  const exportData = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      artworks, history, counterparties, artists, artworkGroups,
      counterpartyTypes, consignments, staffList, taxSettings, galleryInfo,
      nextHid, nextCpId, nextArtworkInternalId, nextArtistId,
      nextGroupId, nextCpTypeId, nextStaffId, nextConsignmentId,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `gallery-data-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── データインポート ──
  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data.artworks || !data.history) {
          alert("このファイルは正しい形式ではありません。");
          return;
        }
        if (!window.confirm("現在のデータをすべて上書きします。よろしいですか？")) return;
        setArtworks(data.artworks);
        setHistory(data.history);
        setCounterparties((data.counterparties ?? []).map(migrateCpType));
        setArtists(data.artists ?? []);
        setArtworkGroups(data.artworkGroups ?? [{ id:1, name:"外国作家" }]);
        setCounterpartyTypes(data.counterpartyTypes ?? initialCounterpartyTypes);
        setConsignments(data.consignments ?? []);
        setStaffList(data.staffList ?? []);
        setTaxSettings(data.taxSettings ?? DEFAULT_TAX_SETTINGS);
        setGalleryInfo(data.galleryInfo ?? { name:"", zip:"", address:"", building:"", tel:"", email:"", fax:"", fiscalStartMonth:9, fiscalOriginYear:1970 });
        setNextHid(data.nextHid ?? 1);
        setNextCpId(data.nextCpId ?? 1);
        setNextArtworkInternalId(data.nextArtworkInternalId ?? 1);
        setNextArtistId(data.nextArtistId ?? 1);
        setNextGroupId(data.nextGroupId ?? 2);
        setNextCpTypeId(data.nextCpTypeId ?? 5);
        setNextStaffId(data.nextStaffId ?? 1);
        setNextConsignmentId(data.nextConsignmentId ?? 1);
        alert("インポートが完了しました。");
      } catch {
        alert("ファイルの読み込みに失敗しました。JSONファイルを確認してください。");
      }
    };
    reader.readAsText(file);
  };

  // ── フォーム状態 ──
  const emptyArtwork = { title:"", artist:"", artist_id:null, artist_kana:"", medium:"", size:"", appraisal:"", purchase_price:"", supplier:"", supplier_id:null, announce_price:"", purchased_at:"", memo:"", tax_credit:"", purchase_tax:"", creditRate:1.0 };
  const [artworkForm, setArtworkForm] = useState(emptyArtwork);
  const setAF = (k,v) => setArtworkForm(p=>({...p,[k]:v}));

  const emptyEvent = { event_type:"purchase", new_price:"", counterparty:"", counterparty_id:null, memo:"", created_at:"" };
  const [editingHistoryId, setEditingHistoryId] = useState(null);
  const [editingDetailField, setEditingDetailField] = useState<string|null>(null);
  const [detailEditForm, setDetailEditForm] = useState<any>({});
  const [eventForm, setEventForm] = useState(emptyEvent);
  const setEF = (k,v) => setEventForm(p=>({...p,[k]:v}));

  const emptyCp = { type_id:1, name:"", name_kana:"", company:"", department:"", invoice_no:"", invoice_from:"", invoice_to:"", email:"", phone:"", zip:"", address:"", building:"", note:"" };
  const [cpForm, setCpForm] = useState(emptyCp);
  const setCF = (k,v) => setCpForm(p=>({...p,[k]:v}));
  const [cpEditId, setCpEditId] = useState(null);

  // ── 派生データ ──
  const selected   = artworks.find(a => a.artwork_id === selectedId);
  const selectedCp = counterparties.find(c => c.cp_id === selectedCpId);
  const selectedHistory = history
    .filter(h => h.artwork_id === selectedId)
    .sort((a,b) => a.created_at.localeCompare(b.created_at));

  // 取引先の取引実績
  const cpArtworks = useMemo(() => {
    if (!selectedCpId) return [];
    return artworks.filter(a =>
      a.supplier_id === selectedCpId ||
      a.buyer_id    === selectedCpId ||
      a.consignee_id === selectedCpId
    );
  }, [artworks, selectedCpId]);

  // ── フィルタリング ──

  const filteredArtworks = useMemo(() => artworks.filter(a => {
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    const q = search.toLowerCase();
    const mt = !q || [a.title,a.artist,a.supplier,a.consignee,a.buyer].some(s=>(s||"").toLowerCase().includes(q));
    return matchStatus && mt;
  }).sort((a,b) => (getLatestTx(b).date||"").localeCompare(getLatestTx(a).date||"")), [artworks, search, statusFilter]);

  const filteredCps = useMemo(() => counterparties.filter(c => {
    const mt = cpTypeFilter === "all" || (cpTypeFilter === "unclassified" ? c.type_id == null : c.type_id === cpTypeFilter);
    const q  = hiraToKata(cpSearch).toLowerCase().replace(/[\s\u3000]+/g,"");
    const ms = !q || [c.name,c.name_kana,c.company,c.department,c.email,c.phone,c.address]
      .some(s=>(s||"").toLowerCase().replace(/[\s\u3000]+/g,"").includes(q));
    return mt && ms;
  }), [counterparties, cpSearch, cpTypeFilter]);

  // ── 統計 ──
  const stats = useMemo(() => {
    const now=new Date(), y=now.getFullYear(), m=now.getMonth();
    const thisMonthRevenue = artworks
      .filter(a=>a.sold_price&&a.sold_at)
      .filter(a=>{ const d=new Date(a.sold_at); return d.getFullYear()===y&&d.getMonth()===m; })
      .reduce((s,a)=>s+a.sold_price,0);
    const sm = (galleryInfo.fiscalStartMonth || 9) - 1; // 0-indexed
    const fiscalStart = new Date(m>=sm?y:y-1, sm, 1);
    const thisFiscalRevenue = artworks
      .filter(a=>a.sold_price&&a.sold_at&&new Date(a.sold_at)>=fiscalStart)
      .reduce((s,a)=>s+a.sold_price,0);
    return {
      total:    artworks.length,
      in_stock: artworks.filter(a=>a.status==="in_stock").length,
      consigned:artworks.filter(a=>a.status==="consigned").length,
      sold:     artworks.filter(a=>a.status==="sold").length,
      thisMonthRevenue, thisFiscalRevenue,
    };
  }, [artworks, galleryInfo]);

  // ── 取引先選択ヘルパー（フォーム内） ──
  const selectCpInForm = (cp, formSetter, nameKey, idKey) => {
    formSetter(p=>({...p, [nameKey]: cpDisplayName(cp), [idKey]: cp.cp_id }));
  };

  // ── 作品登録 ──
  const addArtwork = () => {
    const pp=Number(artworkForm.purchase_price), ap=Number(artworkForm.announce_price);
    const dt=artworkForm.purchased_at||today();
    const artwork_id=generateArtworkId(dt, artworks);
    const internalId=nextArtworkInternalId;
    setNextArtworkInternalId(p=>p+1);
    const nw = {
      id: internalId, artwork_id, title:artworkForm.title, artist:artworkForm.artist, artist_id:artworkForm.artist_id, artist_kana:artworkForm.artist_kana,
      medium:artworkForm.medium, size:artworkForm.size, appraisal:artworkForm.appraisal,
      purchase_price:pp, supplier:artworkForm.supplier, supplier_id:artworkForm.supplier_id,
      announce_price:ap,
      consignment_price:null, consignee:null, consignee_id:null, consigned_at:null,
      sold_price:null, buyer:null, buyer_id:null,
      status:"in_stock", purchased_at:dt, sold_at:null,
    };
    const ev = { id:nextHid, artwork_id:artwork_id, event_type:"purchase", old_price:null, new_price:pp,
      counterparty:artworkForm.supplier, counterparty_id:artworkForm.supplier_id,
      memo:artworkForm.memo||"", created_at:dt,
      purchase_tax: artworkForm.purchase_tax!=="" ? Number(artworkForm.purchase_tax) : null,
      tax_credit: artworkForm.tax_credit!=="" ? Number(artworkForm.tax_credit) : null };
    setArtworks(p=>[...p,nw]); setHistory(p=>[...p,ev]);
    setNextHid(p=>p+1);
    setArtworkForm(emptyArtwork); setSelectedId(artwork_id); setView("detail");
  };

  // ── 取引記録追加 ──
  const addEvent = () => {
    const artwork=artworks.find(a=>a.artwork_id===selectedId);
    const np=eventForm.new_price!==""?Number(eventForm.new_price):null;
    const cp=eventForm.counterparty||null, cpId=eventForm.counterparty_id||null;
    const dt = eventForm.created_at || today();
    const ev={ id:nextHid, artwork_id:selectedId, event_type:eventForm.event_type,
      old_price:null, new_price:np, counterparty:cp, counterparty_id:cpId,
      memo:eventForm.memo, created_at:dt };
    let updates={};
    if (eventForm.event_type==="purchase") {
      ev.old_price=artwork.purchase_price;
      updates={ purchase_price:np, supplier:cp, supplier_id:cpId };
    } else if (eventForm.event_type==="purchase_discount") {
      const discounted = (artwork.purchase_price||0) - (np||0);
      ev.old_price=artwork.purchase_price;
      ev.new_price=discounted;
      updates={ purchase_price:discounted };
    } else if (eventForm.event_type==="consign") {
      ev.old_price=artwork.consignment_price;
      updates={ status:"consigned", consignee:cp, consignee_id:cpId, consigned_at:dt, consignment_price:np };
    } else if (eventForm.event_type==="return") {
      updates={ status:"in_stock", consignee:null, consignee_id:null, consigned_at:null, consignment_price:null };
    } else if (eventForm.event_type==="sold") {
      ev.old_price=artwork.sold_price;
      updates={ sold_price:np, buyer:cp, buyer_id:cpId, status:"sold", sold_at:dt,
        ...(artwork.status==="consigned"?{consignee:null,consignee_id:null,consigned_at:null,consignment_price:null}:{}) };
    } else if (eventForm.event_type==="sold_discount") {
      const discounted = (artwork.sold_price||0) - (np||0);
      ev.old_price=artwork.sold_price;
      ev.new_price=discounted;
      updates={ sold_price:discounted };
    } else if (eventForm.event_type==="purchase_increase") {
      const increased = (artwork.purchase_price||0) + (np||0);
      ev.old_price=artwork.purchase_price;
      ev.new_price=increased;
      updates={ purchase_price:increased };
    } else if (eventForm.event_type==="sold_increase") {
      const increased = (artwork.sold_price||0) + (np||0);
      ev.old_price=artwork.sold_price;
      ev.new_price=increased;
      updates={ sold_price:increased };
    }
    if (editingHistoryId) {
      // 編集：既存レコードを直接上書き（新規追加なし）
      setHistory(p=>p.map(e=>e.id===editingHistoryId
        ? { ...e, event_type:eventForm.event_type, new_price:ev.new_price,
            old_price:ev.old_price, counterparty:cp, counterparty_id:cpId,
            memo:eventForm.memo, created_at:ev.created_at }
        : e
      ));
      setArtworks(p=>p.map(a=>a.artwork_id===selectedId?{...a,...updates}:a));
      setEditingHistoryId(null);
    } else {
      // 新規追加
      setHistory(p=>[...p,ev]);
      setArtworks(p=>p.map(a=>a.artwork_id===selectedId?{...a,...updates}:a));
      setNextHid(p=>p+1);
    }
    setEventForm(emptyEvent); setView("detail");
  };

  // ── 取引先保存（新規・編集） ──
  const saveCp = () => {
    if (cpEditId) {
      setCounterparties(p=>p.map(c=>c.cp_id===cpEditId?{...c,...cpForm}:c));
    } else {
      const id=nextCpId;
      const cp_id=String(id).padStart(4,"0");
      setCounterparties(p=>[...p,{id,cp_id,...cpForm}]);
      setNextCpId(id+1);
    }
    setCpForm(emptyCp); setCpEditId(null); setView("cp_list");
  };

  const editCp = (cp) => {
    setCpForm({ type_id:cp.type_id, name:cp.name||"", name_kana:cp.name_kana||"",
      company:cp.company||"", department:cp.department||"",
      invoice_no:cp.invoice_no||"", invoice_from:cp.invoice_from||"", invoice_to:cp.invoice_to||"",
      email:cp.email||"", phone:cp.phone||"",
      zip:cp.zip||"", address:cp.address||"", building:cp.building||"", note:cp.note||"" });
    setCpEditId(cp.cp_id); setView("cp_form");
  };

  // ── 簡易作家登録 ──
  const quickRegisterArtist = (form, callback) => {
    const id = nextArtistId;
    const artist_id = String(id).padStart(4, "0");
    const newArtist = { id, artist_id, name: form.name, name_kana: form.name_kana, group_id: null };
    setArtists(p => [...p, newArtist]);
    setNextArtistId(id + 1);
    callback(newArtist);
  };

  // ── 簡易取引先登録 ──
  const quickRegisterCp = (quickForm, callback) => {
    const id = nextCpId;
    const isPerson = isPersonType(quickForm.type_id);
    const cp_id = String(id).padStart(4, "0");
    const newCp = {
      id, cp_id,
      type_id: quickForm.type_id,
      name: isPerson ? quickForm.name : null,
      name_kana: quickForm.name_kana || "",
      company: isPerson ? quickForm.company || null : quickForm.company,
      department: null,
      email: "", phone: "",
      zip: "", address: "", building: "",
      note: "",
    };
    setCounterparties(p => [...p, newCp]);
    setNextCpId(id + 1);
    callback(newCp);
  };

  const cpLabel  = (t) => t==="purchase"||t==="purchase_discount"?"仕入先":t==="sold"||t==="sold_discount"?"売却先":t==="consign"?"委託先":t==="return"?"返却元":"取引先（任意）";
  const cpHolder = (t) => t==="purchase"||t==="purchase_discount"?"例：田中 誠アトリエ":t==="sold"||t==="sold_discount"?"例：山田 太郎 様":t==="consign"?"例：ホテル椿山荘":"";

  // 種別IDから「氏名を主名称にする種別（個人系）」かどうかを判定
  const isPersonType = (typeId) => cpTypeCategory(typeId, counterpartyTypes) === "individual";

  // ─── レンダリング ─────────────────────────────────────
  return (
    <div style={{...S.root,...(isMobile?{flexDirection:"column"}:{})}}>

      {/* ══ PC：サイドバー ══ */}
      {!isMobile && (
        <aside style={S.sidebar}>
          <div style={S.logo}>
            <span style={S.logoMark}>◈</span>
            <div><div style={S.logoTitle}>GALERIE</div><div style={S.logoSub}>在庫管理システム</div></div>
          </div>
          <nav style={S.nav}>
            {[
              { key:"inventory",   icon:"", label:"在庫" },
              { key:"daily",       icon:"", label:"日計" },
              { key:"consignment", icon:"", label:"委託" },
              { key:"list",        icon:"", label:"作品一覧" },
              { key:"cp_list",     icon:"", label:"取引先" },
              { key:"settings",    icon:"", label:"設定" },
            ].map(({key,icon,label})=>(
              <button key={key}
                style={{...S.navItem,...(activeNav===key?S.navActive:{}),position:"relative",overflow:"hidden"}}
                onClick={()=>{navigateTo(key);setSelectedId(null);setSelectedCpId(null);}}
                onMouseEnter={e=>{ if(activeNav!==key) e.currentTarget.style.background="#efeeeb"; }}
                onMouseLeave={e=>{ e.currentTarget.style.background=""; }}>
                {activeNav===key && <span style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:"#5A57A6",borderRadius:"0 2px 2px 0"}}/>}
                <span style={S.navIcon}><span className="material-icons" style={{fontSize:16,lineHeight:1,verticalAlign:"middle"}}>{icon}</span></span>{label}
              </button>
            ))}
            <div style={S.navDivider}/>
            <button style={{...S.navItem,...S.navAdd}} onClick={()=>navigateTo("add_artwork")}
              onMouseEnter={e=>{ e.currentTarget.style.background="#efeeeb"; e.currentTarget.style.borderColor="#efeeeb"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="#F9F9F7"; e.currentTarget.style.borderColor="#C6C6C8"; }}>
              <span style={S.navIcon}>＋</span>仕入を登録
            </button>
            <button style={{...S.navItem,...S.navAdd2}} onClick={()=>navigateTo("add_sale")}
              onMouseEnter={e=>{ e.currentTarget.style.background="#efeeeb"; e.currentTarget.style.borderColor="#efeeeb"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="#F9F9F7"; e.currentTarget.style.borderColor="#C6C6C8"; }}>
              <span style={S.navIcon}>＋</span>売上を登録
            </button>
          </nav>
          <div style={S.sideStats}>
            <div style={S.statItem}><span style={{...S.statNum,fontSize:13,color:"#22c55e"}}>{fmt(stats.thisMonthRevenue)}</span><span style={S.statLab}>今月の売上</span></div>
            <div style={S.statItem}><span style={{...S.statNum,fontSize:13,color:"#22c55e"}}>{fmt(stats.thisFiscalRevenue)}</span><span style={S.statLab}>今期の売上</span></div>
          </div>
        </aside>
      )}

      {/* ── メインエリア ── */}
      <main ref={mainRef} style={{...S.main,...(isMobile?{paddingBottom:"calc(90px + env(safe-area-inset-bottom))"}:{})}}>

                {/* ══ 作品一覧 ══ */}
        {view==="list" && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <div style={S.pageHeader}><h1 style={S.pageTitle}>作品一覧</h1></div>
            <div style={S.toolbar}>
              <input style={S.search} placeholder="作品名・作家・取引先で検索…" value={search} onChange={e=>setSearch(e.target.value)}/>
              <div style={S.filterGroup}>
                {[["all","すべて"],["in_stock","在庫あり"],["consigned","委託中"],["sold","売却済み"]].map(([k,l])=>(
                  <button key={k} style={{...S.filterBtn,...(statusFilter===k?S.filterActive:{})}} onClick={()=>setStatusFilter(k)}
                    onMouseEnter={e=>{ if(statusFilter!==k){ e.currentTarget.style.background="#efeeeb"; e.currentTarget.style.borderColor="#efeeeb"; } }}
                    onMouseLeave={e=>{ if(statusFilter!==k){ e.currentTarget.style.background="#F9F9F7"; e.currentTarget.style.borderColor="#C6C6C8"; } }}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{fontSize:12,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",margin:"0 0 12px",textAlign:"right"}}>{filteredArtworks.length}件</div>

            {/* カード表示（PC・スマホ共通） */}
            <div style={{display:"flex",flexDirection:"column",gap:1}}>
                {filteredArtworks.map((a,i)=>(
                  <div key={a.id}
                    style={{...MC.card,...(i%2===0?{}:{background:"#F9F9F7"})}}
                    onClick={()=>{setSelectedId(a.artwork_id);setView("detail");}}
                    onMouseEnter={e=>e.currentTarget.style.background="#efeeeb"}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"transparent":"#F9F9F7"}>
                    <div style={MC.left}>
                      <div style={MC.artworkId}>{a.artwork_id}</div>
                    </div>
                    <div style={MC.main}>
                      <div style={MC.title}>{a.title}</div>
                      <div style={MC.artist}>{a.artist}</div>
                      <div style={MC.chips}>
                        {a.medium&&<span style={MC.plainText}>{a.medium}</span>}
                      </div>
                    </div>
                    <div style={MC.right}>
                      <span style={{...MC.statusBadge,background:STATUSES[a.status]?.color+"22",color:STATUSES[a.status]?.color,border:`1px solid ${STATUSES[a.status]?.color}44`}}>
                        {STATUSES[a.status]?.label}
                      </span>
                      <div style={{...MC.price,fontSize:14,fontWeight:700}}>
                        {fmt(getLatestTx(a).price)}
                      </div>
                      <div style={MC.date}>{getLatestTx(a).date||"—"}</div>
                    </div>
                  </div>
                ))}
                {filteredArtworks.length===0&&<div style={S.empty}>該当する作品がありません</div>}
            </div>
          </div>
        )}

        {/* ══ 作品詳細 ══ */}
        {view==="detail" && selected && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <button style={S.backBtn} onClick={()=>{setView(prevView||"list");setPrevView(null);}}>← {prevView==="consignment"?"委託に戻る":"一覧に戻る"}</button>
            <div style={{...S.detailGrid,...(isMobile?S.detailGridMobile:{})}}>
              <div style={S.detailCard}>
                <div style={S.detailInfo}>
                  <div style={S.detailStatusRow}>
                    <span style={{...S.statusBadge,background:STATUSES[selected.status]?.color+"22",color:STATUSES[selected.status]?.color,border:`1px solid ${STATUSES[selected.status]?.color}44`}}>
                      {STATUSES[selected.status]?.label}
                    </span>
                  </div>
                  <h2 style={S.detailTitle}>{selected.title}</h2>
                  {selected.artwork_id&&<div style={{fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",fontSize:12,color:"#1a1919",letterSpacing:"0.08em",marginBottom:4}}>{selected.artwork_id}</div>}
                  <p style={S.detailArtist}>{selected.artist}</p>
                  <div style={S.detailMeta}>
                    {selected.medium&&<span style={S.metaTagPlain}>{selected.medium}</span>}
                    {selected.medium&&selected.size&&<span style={{color:"#5E6367",fontSize:12}}>·</span>}
                    {selected.size&&<span style={{...S.metaTagPlain,color:"#5E6367"}}>{selected.size}</span>}
                    {selected.appraisal&&<span style={{...S.metaTag,color:"#8D2728",borderColor:"#D0D0CE",background:"#EEEEEC",borderRadius:999,padding:"3px 10px",fontSize:11}}>鑑定：{selected.appraisal}</span>}
                  </div>
                  {/* 作品情報編集 */}
                  {editingDetailField==="info" ? (
                    <div style={{background:"#FFFFFF",border:"1px solid #C6C6C8",borderRadius:8,padding:14,marginBottom:12}}>
                      <div style={{fontSize:12,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginBottom:10,fontWeight:600}}>作品情報を編集</div>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        <div><div style={{fontSize:11,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginBottom:3}}>作品名</div>
                          <input style={S.formInput} value={detailEditForm.title} onChange={e=>setDetailEditForm(p=>({...p,title:e.target.value}))}/></div>
                        <div><div style={{fontSize:11,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginBottom:3}}>作家名</div>
                          <ArtistSelect value={detailEditForm.artist} artistId={detailEditForm.artist_id} artists={artists}
                            onChange={(name,id,kana)=>setDetailEditForm(p=>({...p,artist:name,artist_id:id,artist_kana:kana}))}
                            onQuickRegister={quickRegisterArtist}/></div>
                        <div><div style={{fontSize:11,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginBottom:3}}>技法・素材</div>
                          <input style={S.formInput} value={detailEditForm.medium} onChange={e=>setDetailEditForm(p=>({...p,medium:e.target.value}))}/></div>
                        <div><div style={{fontSize:11,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginBottom:3}}>サイズ</div>
                          <input style={S.formInput} value={detailEditForm.size} onChange={e=>setDetailEditForm(p=>({...p,size:e.target.value}))}/></div>
                        <div><div style={{fontSize:11,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginBottom:3}}>鑑定</div>
                          <input style={S.formInput} value={detailEditForm.appraisal} onChange={e=>setDetailEditForm(p=>({...p,appraisal:e.target.value}))}/></div>
                      </div>
                      <div style={{display:"flex",gap:8,marginTop:12}}>
                        <button style={{...S.submitBtn,marginTop:0,padding:"7px 18px",fontSize:12}} onClick={()=>{
                          setArtworks(p=>p.map(a=>a.artwork_id===selected.artwork_id?{...a,...detailEditForm}:a));
                          setEditingDetailField(null);
                        }}>保存</button>
                        <button style={{...S.addEventBtn,padding:"7px 14px"}} onClick={()=>setEditingDetailField(null)}>キャンセル</button>
                      </div>
                    </div>
                  ) : (
                    <button style={{...S.addEventBtn,fontSize:11,padding:"3px 10px",marginBottom:10,color:"#1a1919",background:"#EFEFEF",borderColor:"#C6C6C8"}}
                      onClick={()=>{setDetailEditForm({title:selected.title||"",artist:selected.artist||"",artist_id:selected.artist_id||"",artist_kana:selected.artist_kana||"",medium:selected.medium||"",size:selected.size||"",appraisal:selected.appraisal||""});setEditingDetailField("info");}}>
                      <span className="material-icons" style={{fontSize:14,verticalAlign:"middle",marginRight:4}}>{"\ue3c9"}</span> 作品情報を編集
                    </button>
                  )}
                  <TxBlock color="#60a5fa" title="仕入">{(() => {
                    const ph = history.filter(h=>h.artwork_id===selected.artwork_id&&h.event_type==="purchase").slice(-1)[0];
                    return (<>
                      <TxRow label="仕入日"   val={selected.purchased_at} />
                      <TxRow label="仕入先" val={selected.supplier_id
                        ? <button style={{...S.cpLink,color:"#5E6367"}} onClick={()=>{setSelectedCpId(selected.supplier_id);setView("cp_detail");}}>{selected.supplier}</button>
                        : selected.supplier} />
                      <TxRow label="仕入価格" val={fmt(selected.purchase_price)} color="#60a5fa" />
                      {ph?.purchase_tax!=null && <TxRow label="消費税額" val={fmt(ph.purchase_tax)} />}
                      {ph?.tax_credit!=null && <TxRow label="控除税額" val={fmt(ph.tax_credit)} />}
                    </>);
                  })()}</TxBlock>
                  <TxBlock color="#fb923c" title="発表価格">
                    {editingDetailField==="price" ? (
                      <div style={{display:"flex",gap:8,alignItems:"center",marginTop:4}}>
                        <input style={{...S.formInput,width:140}} type="number"
                          value={detailEditForm.announce_price}
                          onChange={e=>setDetailEditForm(p=>({...p,announce_price:e.target.value}))}/>
                        <span style={{fontSize:12,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}>円</span>
                        <button style={{...S.submitBtn,marginTop:0,padding:"6px 14px",fontSize:12}} onClick={()=>{
                          setArtworks(p=>p.map(a=>a.artwork_id===selected.artwork_id?{...a,announce_price:Number(detailEditForm.announce_price)||0}:a));
                          setEditingDetailField(null);
                        }}>保存</button>
                        <button style={{...S.addEventBtn,padding:"6px 10px",fontSize:12}} onClick={()=>setEditingDetailField(null)}>✕</button>
                      </div>
                    ) : (
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <TxRow label="現在の発表価格" val={fmt(selected.announce_price)} color="#fb923c" large />
                        <button style={{...S.addEventBtn,fontSize:11,padding:"3px 10px",color:"#1a1919",background:"#EFEFEF",borderColor:"#C6C6C8"}}
                          onClick={()=>{setDetailEditForm(p=>({...p,announce_price:selected.announce_price||0}));setEditingDetailField("price");}}><span className="material-icons" style={{fontSize:14,verticalAlign:"middle"}}>{"\ue3c9"}</span></button>
                      </div>
                    )}
                  </TxBlock>
                  <TxBlock color="#5A57A6" title="委託">
                    <TxRow label="委託先" val={selected.consignee_id
                      ? <button style={{...S.cpLink,color:"#5E6367"}} onClick={()=>{setSelectedCpId(selected.consignee_id);setView("cp_detail");}}>{selected.consignee}</button>
                      : selected.consignee} />
                    <TxRow label="委託価格" val={fmt(selected.consignment_price)} color="#5A57A6" />
                    <TxRow label="委託日"   val={selected.consigned_at} />
                  </TxBlock>
                  <TxBlock color="#22c55e" title="売却">
                    <TxRow label="売却先" val={selected.buyer_id
                      ? <button style={{...S.cpLink,color:"#5E6367"}} onClick={()=>{setSelectedCpId(selected.buyer_id);setView("cp_detail");}}>{selected.buyer}</button>
                      : selected.buyer} />
                    <TxRow label="成約価格" val={fmt(selected.sold_price)} color="#22c55e" large />
                    <TxRow label="売却日"   val={selected.sold_at} />
                  </TxBlock>
                </div>
              </div>
              <div style={S.historyPanel}>
                <div style={S.historyHeader}>
                  <h3 style={S.historyTitle}>取引履歴</h3>
                  <button style={{...S.addEventBtn,color:"#1a1919",background:"#EFEFEF",borderColor:"#C6C6C8"}} onClick={()=>{
                    const latestType = selectedHistory[selectedHistory.length-1]?.event_type;
                    setEventForm(latestType==="consign"
                      ? {...emptyEvent, event_type:"sold", counterparty:selected.consignee||"", counterparty_id:selected.consignee_id||null}
                      : emptyEvent);
                    setView("add_history");
                  }}>＋ 記録を追加</button>
                </div>
                <div style={S.timeline}>
                  {selectedHistory.map((h,i)=>(
                    <div key={h.id} style={S.timelineItem}>
                      <div style={S.timelineLine}>
                        <div style={{...S.timelineDot,background:EVENT_COLORS[h.event_type]}}/>
                        {i<selectedHistory.length-1&&<div style={S.timelineConnector}/>}
                      </div>
                      <div style={S.timelineBody}>
                        <div style={S.timelineTop}>
                          <span style={{...S.eventTag,background:EVENT_COLORS[h.event_type]+"22",color:EVENT_COLORS[h.event_type],border:`1px solid ${EVENT_COLORS[h.event_type]}44`}}>
                            {EVENT_LABELS[h.event_type]}
                          </span>
                          <span style={S.timelineDate}>{h.created_at}</span>
                          <div style={{display:"flex",gap:6,marginLeft:"auto",alignItems:"center"}}>
                            {["consign","return"].includes(h.event_type)&&(
                              <span style={{fontSize:11,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",fontStyle:"italic"}}>委託ページから編集</span>
                            )}
                            {!["consign","return"].includes(h.event_type)&&(
                            <button style={{...S.addEventBtn,fontSize:11,padding:"2px 8px",color:"#1a1919",background:"#EFEFEF",borderColor:"#C6C6C8"}}
                              onClick={()=>{
                                setEditingHistoryId(h.id);
                                setEventForm({
                                  event_type: h.event_type,
                                  new_price:  h.new_price ?? "",
                                  counterparty: h.counterparty || "",
                                  counterparty_id: h.counterparty_id || null,
                                  memo: h.memo || "",
                                  created_at: h.created_at || "",
                                });
                                setView("add_history");
                              }}><span className="material-icons" style={{fontSize:12,verticalAlign:"middle",marginRight:2}}>{"\ue3c9"}</span>編集</button>
                            )}
                            {!["consign","return"].includes(h.event_type)&&(
                            <button style={{...S.addEventBtn,fontSize:11,padding:"2px 8px",color:"#1a1919",background:"#EFEFEF",borderColor:"#C6C6C8"}}
                              onClick={()=>{
                                if (!window.confirm("この記録を削除しますか？")) return;
                                // 売上削除→在庫に戻す
                                if (h.event_type==="sold") {
                                  setArtworks(p=>p.map(a=>a.artwork_id===selected.artwork_id
                                    ?{...a,status:"in_stock",sold_price:null,buyer:null,buyer_id:null,sold_at:null}
                                    :a));
                                }
                                // 仕入削除→purchase_price をクリア
                                if (h.event_type==="purchase") {
                                  setArtworks(p=>p.map(a=>a.artwork_id===selected.artwork_id
                                    ?{...a,purchase_price:null,supplier:null,supplier_id:null}
                                    :a));
                                }
                                // 委託削除→in_stockに戻す
                                if (h.event_type==="consign") {
                                  setArtworks(p=>p.map(a=>a.artwork_id===selected.artwork_id
                                    ?{...a,status:"in_stock",consignee:null,consignee_id:null,consignment_price:null,consigned_at:null}
                                    :a));
                                }
                                setHistory(p=>p.filter(ev=>ev.id!==h.id));
                              }}>削除</button>
                            )}
                          </div>
                        </div>
                        {h.counterparty&&(
                          <div style={S.timelineCp}>
                            {h.counterparty_id
                              ? <button style={{...S.cpLink,color:"#5E6367"}} onClick={()=>{setSelectedCpId(h.counterparty_id);setView("cp_detail");}}>{h.counterparty}</button>
                              : h.counterparty}
                          </div>
                        )}
                        {h.new_price!=null&&(
                          <div style={S.timelinePrices}>
                            {(h.event_type==="purchase_discount"||h.event_type==="sold_discount"||h.event_type==="purchase_increase"||h.event_type==="sold_increase")&&h.old_price!=null&&(
                              <><span style={S.oldPrice}>{fmt(h.old_price)}</span><span style={S.arrow}>→</span></>
                            )}
                            <span style={{...S.newPrice,color:EVENT_COLORS[h.event_type]}}>{fmt(h.new_price)}</span>
                            {(h.event_type==="purchase_discount"||h.event_type==="sold_discount")&&h.old_price!=null&&(
                              <span style={{fontSize:11,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginLeft:8}}>（値引き {fmt(h.old_price-h.new_price)}）</span>
                            )}
                            {(h.event_type==="purchase_increase"||h.event_type==="sold_increase")&&h.old_price!=null&&(
                              <span style={{fontSize:11,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginLeft:8}}>（値上げ {fmt(h.new_price-h.old_price)}）</span>
                            )}
                          </div>
                        )}
                        {h.memo&&<div style={S.timelineMemo}>{h.memo}</div>}
                      </div>
                    </div>
                  ))}
                  {selectedHistory.length===0&&<div style={{color:"#5E6367",fontSize:13,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",padding:"20px 0"}}>履歴はまだありません</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ 取引先一覧 ══ */}
        {view==="cp_list" && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <div style={S.pageHeader}>
              <h1 style={S.pageTitle}>取引先</h1>
              <button style={{...S.addEventBtn,color:"#1a1919",background:"#EFEFEF",borderColor:"#C6C6C8"}} onClick={()=>{setCpForm(emptyCp);setCpEditId(null);setView("cp_form");}}>＋ 取引先を登録</button>
            </div>
            <div style={{...S.toolbar,...(isMobile?{flexDirection:"column",alignItems:"stretch"}:{})}}>
              <input style={S.search} placeholder="名前・会社名・メール・住所で検索…" value={cpSearch} onChange={e=>setCpSearch(e.target.value)}/>
              <div style={S.filterGroup}>
                {[["all","すべて"],...counterpartyTypes.map(t=>[t.id,t.name]),["unclassified","未分類"]].map(([k,l])=>(
                  <button key={k} style={{...S.filterBtn,...(cpTypeFilter===k?S.filterActive:{})}} onClick={()=>setCpTypeFilter(k)}
                    onMouseEnter={e=>{ if(cpTypeFilter!==k){ e.currentTarget.style.background="#efeeeb"; e.currentTarget.style.borderColor="#efeeeb"; } }}
                    onMouseLeave={e=>{ if(cpTypeFilter!==k){ e.currentTarget.style.background="#F9F9F7"; e.currentTarget.style.borderColor="#C6C6C8"; } }}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{fontSize:12,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",margin:"0 0 12px",textAlign:"right"}}>{filteredCps.length}件</div>

            {/* PC：テーブル表示 */}
            {!isMobile && (
              <div style={S.tableOuter}>
              <div style={S.tableWrap}>
                <table style={{...S.table,minWidth:0}}>
                  <thead><tr>{["番号","取引先名","種類",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredCps.map(cp=>(
                      <tr key={cp.id} style={S.tr}
                        onClick={()=>{setSelectedCpId(cp.cp_id);setView("cp_detail");}}
                        onMouseEnter={e=>e.currentTarget.style.background="#efeeeb"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{...S.td,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",fontSize:12,color:"#1a1919"}}>{cp.cp_id||"—"}</td>
                        <td style={{...S.td,fontWeight:600,color:"#1a1919"}}>{cpDisplayName(cp)}</td>
                        <td style={S.td}>
                          <span style={{...S.cpTypeBadge,background:CP_TYPE_BADGE_BG,color:CP_TYPE_BADGE_TEXT,border:`1px solid ${CP_TYPE_BADGE_BORDER}`}}>
                            {cpTypeLabel(cp.type_id, counterpartyTypes)}
                          </span>
                        </td>
                        <td style={S.td}><span style={S.arrowBtn}>→</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredCps.length===0&&<div style={S.empty}>該当する取引先がありません</div>}
              </div>
              </div>
            )}

            {/* スマホ：カード表示 */}
            {isMobile && (
              <div style={{display:"flex",flexDirection:"column",gap:1}}>
                {filteredCps.map((cp,i)=>(
                  <div key={cp.id}
                    style={{...MC.card,...(i%2===0?{}:{background:"#F9F9F7"})}}
                    onClick={()=>{setSelectedCpId(cp.cp_id);setView("cp_detail");}}
                    onMouseEnter={e=>e.currentTarget.style.background="#efeeeb"}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"transparent":"#F9F9F7"}>
                    <div style={MC.left}>
                      <div style={MC.artworkId}>{cp.cp_id}</div>
                    </div>
                    <div style={{...MC.main,overflow:"visible"}}>
                      <div style={{...MC.title,whiteSpace:"normal",overflow:"visible",textOverflow:"clip"}}>{cpDisplayName(cp)}</div>
                      <div style={MC.chips}>
                        <span style={{...MC.chip,background:CP_TYPE_BADGE_BG,color:CP_TYPE_BADGE_TEXT,borderColor:CP_TYPE_BADGE_BORDER}}>
                          {cpTypeLabel(cp.type_id, counterpartyTypes)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredCps.length===0&&<div style={S.empty}>該当する取引先がありません</div>}
              </div>
            )}
          </div>
        )}

        {/* ══ 取引先詳細 ══ */}
        {view==="cp_detail" && selectedCp && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <button style={S.backBtn} onClick={()=>setView("cp_list")}>← 取引先一覧に戻る</button>
            <div style={{...S.detailGrid,...(isMobile?S.detailGridMobile:{})}}>
              <div style={S.detailCard}>

                <div style={S.detailInfo}>
                  <div style={{marginBottom:10}}>
                    <span style={{...S.cpTypeBadge,background:CP_TYPE_BADGE_BG,color:CP_TYPE_BADGE_TEXT,border:`1px solid ${CP_TYPE_BADGE_BORDER}`}}>
                      {cpTypeLabel(selectedCp.type_id, counterpartyTypes)}
                    </span>
                  </div>
                  <h2 style={S.detailTitle}>{cpDisplayName(selectedCp)}</h2>
                  {selectedCp.cp_id&&<div style={{fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",fontSize:12,color:"#1a1919",letterSpacing:"0.08em",marginBottom:4}}>{selectedCp.cp_id}</div>}
                  {selectedCp.name_kana&&<p style={{...S.detailArtist,fontSize:12,color:"#5E6367"}}>{selectedCp.name_kana}</p>}
                  {selectedCp.company&&isPersonType(selectedCp.type_id)&&<p style={S.detailArtist}>{selectedCp.company}</p>}
                  {selectedCp.department&&<p style={{...S.detailArtist,color:"#94a3b8"}}>{selectedCp.department}</p>}

                  {(selectedCp.invoice_no) && (
                    <TxBlock color="#f59e0b" title="インボイス">
                      <TxRow label="登録番号" val={selectedCp.invoice_no} color="#f59e0b" />
                      <TxRow label="登録開始" val={selectedCp.invoice_from} />
                      <TxRow label="登録終了" val={selectedCp.invoice_to} />
                    </TxBlock>
                  )}
                  {!selectedCp.invoice_no && (
                    <div style={{fontSize:12,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",color:"#f87171",background:"#f8717111",border:"1px solid #f8717133",borderRadius:6,padding:"6px 10px",marginBottom:8}}>
                      ⚠ インボイス未登録（仕入税額控除に経過措置が適用されます）
                    </div>
                  )}
                  <TxBlock color="#5A57A6" title="基本情報">
                    <TxRow label="部署"   val={selectedCp.department} />
                    <TxRow label="メール" val={selectedCp.email} />
                    <TxRow label="電話"   val={selectedCp.phone} />
                    <TxRow label="郵便番号" val={selectedCp.zip} />
                    <TxRow label="住所"     val={selectedCp.address} />
                    <TxRow label="建物名以下" val={selectedCp.building} />
                  </TxBlock>
                  {selectedCp.note&&(
                    <TxBlock color="#64748b" title="メモ">
                      <p style={{fontSize:13,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",color:"#5E6367",margin:0,lineHeight:1.7}}>{selectedCp.note}</p>
                    </TxBlock>
                  )}
                  <button style={{...S.submitBtn,marginTop:16,padding:"8px 20px",fontSize:13}}
                    onClick={()=>editCp(selectedCp)}>
                    編集
                  </button>
                </div>
              </div>

              {/* 右：取引実績 */}
              <div style={S.historyPanel}>
                <h3 style={{...S.historyTitle,marginBottom:20}}>取引実績</h3>
                {cpArtworks.length===0
                  ? <div style={{color:"#5E6367",fontSize:13,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}>取引実績はまだありません</div>
                  : [...cpArtworks].sort((a,b)=>{
                      const da = a.sold_at||a.consigned_at||a.purchased_at||"";
                      const db = b.sold_at||b.consigned_at||b.purchased_at||"";
                      return db.localeCompare(da);
                    }).map(a=>(
                    <div key={a.id} style={S.cpArtworkItem}
                      onClick={()=>{setSelectedId(a.artwork_id);setView("detail");}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,marginBottom:2}}>{a.title}</div>
                        <div style={{fontSize:12,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}>{a.artist} · {a.medium}</div>
                        <div style={{marginTop:6,display:"flex",gap:8,flexWrap:"wrap"}}>
                          {a.supplier_id===selectedCp.cp_id&&<span style={{...S.eventTag,background:"#60a5fa22",color:"#60a5fa",border:"1px solid #60a5fa44",fontSize:12}}>仕入先</span>}
                          {a.consignee_id===selectedCp.cp_id&&<span style={{...S.eventTag,background:"#38bdf822",color:"#38bdf8",border:"1px solid #38bdf844",fontSize:12}}>委託先</span>}
                          {a.buyer_id===selectedCp.cp_id&&<span style={{...S.eventTag,background:"#22c55e22",color:"#22c55e",border:"1px solid #22c55e44",fontSize:12}}>購入者</span>}
                        </div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <span style={{...S.statusBadge,background:STATUSES[a.status]?.color+"22",color:STATUSES[a.status]?.color,border:`1px solid ${STATUSES[a.status]?.color}44`}}>
                          {STATUSES[a.status]?.label}
                        </span>
                        <div style={{...S.price,fontSize:14,marginTop:6,color:"#22c55e"}}>{a.sold_price?fmt(a.sold_price):fmt(a.announce_price)}</div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}

        {/* ══ 取引一覧 ══ */}
        {view==="txn_list" && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <div style={S.pageHeader}><h1 style={S.pageTitle}>取引一覧</h1></div>
            <TransactionList history={history} artworks={artworks} counterparties={counterparties}
              onSelectArtwork={(id)=>{setSelectedId(id);setView("detail");}}
              onSelectCp={(id)=>{setSelectedCpId(id);setView("cp_detail");}}
            />
          </div>
        )}

        {/* ══ 日計 ══ */}
        {view==="daily" && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <div style={S.pageHeader}><h1 style={S.pageTitle}>日計</h1></div>
            <DailyReport
              artworks={artworks}
              history={history}
              counterparties={counterparties}
              taxSettings={taxSettings}
              galleryInfo={galleryInfo}
              isMobile={isMobile}
              onSelectArtwork={(id)=>{setSelectedId(id);setView("detail");}}
            />
          </div>
        )}

        {/* ══ 設定 ══ */}
        {view==="settings" && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <div style={S.pageHeader}><h1 style={S.pageTitle}>設定</h1></div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:24}}>
              {[
                { key:"gallery_settings", label:"画廊情報",  desc:"名称・住所・連絡先",             icon:"◈" },
                { key:"artist_settings",  label:"作家",       desc:"作家マスターの管理",             icon:"✦" },
                { key:"cp_type_settings", label:"取引先種別", desc:"取引先の種別の管理",             icon:"▣" },
                { key:"staff_settings",   label:"社員",       desc:"委託納品書の担当者一覧",          icon:"◎" },
                { key:"tax_settings",     label:"消費税",     desc:"税率・インボイス経過措置の設定",  icon:"%" },
                { key:"data_settings",    label:"データ管理", desc:"バックアップ・復元",              icon:"⬡" },
              ].map(({key,label,desc,icon})=>(
                <button key={key}
                  style={{display:"flex",alignItems:"center",gap:16,padding:"14px 16px",background:"#FFFFFF",border:"1px solid #C6C6C8",borderRadius:10,cursor:"pointer",textAlign:"left",width:"100%"}}
                  onClick={()=>setView(key)}>
                  <div>
                    <div style={{fontSize:14,color:"#1a1919",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",fontWeight:600,marginBottom:2}}>{label}</div>
                    <div style={{fontSize:12,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}>{desc}</div>
                  </div>
                  <span style={{marginLeft:"auto",color:"#5E6367"}}>→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══ 画廊情報設定 ══ */}
        {view==="gallery_settings" && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <button style={S.backBtn} onClick={()=>setView("settings")}>← 設定に戻る</button>
            <h1 style={S.pageTitle}>画廊情報</h1>
            <GallerySettings galleryInfo={galleryInfo} onSave={setGalleryInfo} isMobile={isMobile} />
          </div>
        )}

        {/* ══ 作家設定 ══ */}
        {view==="artist_settings" && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <button style={S.backBtn} onClick={()=>setView("settings")}>← 設定に戻る</button>
            <div style={S.pageHeader}>
              <h1 style={S.pageTitle}>作家</h1>
              <button style={{...S.addEventBtn,color:"#1a1919",background:"#EFEFEF",borderColor:"#C6C6C8"}} onClick={()=>{ setEditingArtistId(null); setView("artist_form"); }}>＋ 作家を登録</button>
            </div>
            <ArtistSettings
              artists={artists}
              artworks={artworks}
              artworkGroups={artworkGroups}
              onSaveArtists={setArtists}
              onSaveGroups={setArtworkGroups}
              nextGroupId={nextGroupId}
              onNextGroupId={setNextGroupId}
              nextId={nextArtistId}
              onNextId={setNextArtistId}
              onEdit={(id)=>{ setEditingArtistId(id); setView("artist_form"); }}
            />
          </div>
        )}

        {/* ══ 作家登録・編集フォーム ══ */}
        {view==="artist_form" && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <button style={S.backBtn} onClick={()=>setView("artist_settings")}>← 作家一覧に戻る</button>
            <h1 style={{...S.pageTitle,marginBottom:24}}>{editingArtistId ? "作家を編集" : "作家を登録"}</h1>
            <ArtistForm
              artists={artists}
              artworkGroups={artworkGroups}
              editId={editingArtistId}
              onSave={setArtists}
              nextId={nextArtistId}
              onNextId={setNextArtistId}
              onDone={()=>{ setEditingArtistId(null); setView("artist_settings"); }}
              isMobile={isMobile}
            />
          </div>
        )}

        {/* ══ 取引先種別設定 ══ */}
        {view==="cp_type_settings" && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <button style={S.backBtn} onClick={()=>setView("settings")}>← 設定に戻る</button>
            <h1 style={S.pageTitle}>取引先種別</h1>
            <CpTypeSettings
              counterpartyTypes={counterpartyTypes}
              counterparties={counterparties}
              onSaveTypes={setCounterpartyTypes}
              onSaveCounterparties={setCounterparties}
              nextId={nextCpTypeId}
              onNextId={setNextCpTypeId}
            />
          </div>
        )}

        {/* ══ 社員設定 ══ */}
        {view==="staff_settings" && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <button style={S.backBtn} onClick={()=>setView("settings")}>← 設定に戻る</button>
            <h1 style={S.pageTitle}>社員</h1>
            <StaffSettings
              staffList={staffList}
              onSave={setStaffList}
              nextId={nextStaffId}
              onNextId={setNextStaffId}
            />
          </div>
        )}

        {/* ══ 消費税設定 ══ */}
        {view==="tax_settings" && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <button style={S.backBtn} onClick={()=>setView("settings")}>← 設定に戻る</button>
            <h1 style={S.pageTitle}>消費税設定</h1>
            <TaxSettings taxSettings={taxSettings} onSave={setTaxSettings} isMobile={isMobile} />
          </div>
        )}

        {/* ══ データ管理 ══ */}
        {view==="data_settings" && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <button style={S.backBtn} onClick={()=>setView("settings")}>← 設定に戻る</button>
            <h1 style={S.pageTitle}>データ管理</h1>
            <div style={{display:"flex",flexDirection:"column",gap:16,maxWidth:480}}>

              {/* エクスポート */}
              <div style={{background:"#FFFFFF",border:"1px solid #C6C6C8",borderRadius:10,padding:"20px 20px"}}>
                <div style={{fontSize:14,fontWeight:600,color:"#1a1919",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginBottom:6}}>バックアップ（エクスポート）</div>
                <div style={{fontSize:12,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",lineHeight:1.7,marginBottom:14}}>
                  現在のデータをJSONファイルとして書き出します。<br/>別のPCへの移行やバックアップに使用してください。
                </div>
                <button style={{...S.submitBtn,marginTop:0,padding:"9px 22px",fontSize:13}}
                  onClick={exportData}>
                  ⬇ JSONをダウンロード
                </button>
              </div>

              {/* インポート */}
              <div style={{background:"#FFFFFF",border:"1px solid #C6C6C8",borderRadius:10,padding:"20px 20px"}}>
                <div style={{fontSize:14,fontWeight:600,color:"#1a1919",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginBottom:6}}>復元（インポート）</div>
                <div style={{fontSize:12,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",lineHeight:1.7,marginBottom:14}}>
                  バックアップしたJSONファイルを読み込みます。<br/>
                  <span style={{color:"#f87171"}}>⚠ 現在のデータはすべて上書きされます。</span>
                </div>
                <label style={{...S.submitBtn,marginTop:0,padding:"9px 22px",fontSize:13,cursor:"pointer",display:"inline-block",background:"#EAF2FE",color:"#60a5fa",border:"1px solid #60a5fa44"}}>
                  ⬆ JSONを読み込む
                  <input type="file" accept=".json" style={{display:"none"}}
                    onChange={e=>{ const f=e.target.files?.[0]; if(f) importData(f); e.target.value=""; }}/>
                </label>
              </div>

            </div>
          </div>
        )}

        {/* ══ 委託一覧 ══ */}
        {view==="consignment" && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <div style={S.pageHeader}>
              <h1 style={S.pageTitle}>委託</h1>
              <button style={{...S.addEventBtn,color:"#1a1919",background:"#EFEFEF",borderColor:"#C6C6C8"}} onClick={()=>setView("consignment_new")}>＋ 新規委託</button>
            </div>
            <ConsignmentList
              taxSettings={taxSettings}
              consignments={consignments}
              counterparties={counterparties}
              galleryInfo={galleryInfo}
              staffList={staffList}
              artworks={artworks}
              onEdit={(id)=>{setEditingConsignmentId(id);setView("consignment_edit");}}
              onReturn={(consignment_id, artwork_ids) => {
                const dt = new Date().toISOString().slice(0,10);
                artwork_ids.forEach(artwork_id => {
                  setArtworks(p => p.map(a => a.artwork_id === artwork_id
                    ? { ...a, status:"in_stock", consignee:null, consignee_id:null,
                        consignment_price:null, consigned_at:null }
                    : a
                  ));
                  setHistory(p => [...p, {
                    id: Date.now() + Math.random(),
                    artwork_id,
                    event_type: "return",
                    old_price: null, new_price: null,
                    counterparty: consignments.find(c=>c.id===consignment_id)?.consignee_name || "",
                    counterparty_id: consignments.find(c=>c.id===consignment_id)?.consignee_id || null,
                    memo: "委託戻り",
                    created_at: dt,
                  }]);
                });
              }}
              onSelectArtwork={(artwork_id)=>{setSelectedId(artwork_id);setPrevView("consignment");setView("detail");}}
              onSale={({ artwork_id, sold_price, buyer_name, buyer_id, sold_date }) => {
                const dt = sold_date || new Date().toISOString().slice(0,10);
                setArtworks(p => p.map(a => a.artwork_id === artwork_id
                  ? { ...a, status:"sold", sold_price, buyer:buyer_name, buyer_id,
                      sold_at:dt, consignee:null, consignee_id:null,
                      consignment_price:null, consigned_at:null }
                  : a
                ));
                setHistory(p => [...p, {
                  id: Date.now() + Math.random(),
                  artwork_id,
                  event_type: "sold",
                  old_price: null, new_price: sold_price,
                  counterparty: buyer_name,
                  counterparty_id: buyer_id,
                  memo: "委託先より売上",
                  created_at: dt,
                }]);
                setNextHid(p => p+1);
              }}
            />
          </div>
        )}

        {/* ══ 委託編集 ══ */}
        {view==="consignment_edit" && editingConsignmentId && (() => {
          const target = consignments.find(c => c.id === editingConsignmentId);
          if (!target) return null;
          return (
            <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
              <button style={S.backBtn} onClick={()=>setView("consignment")}>← 委託一覧に戻る</button>
              <h1 style={{...S.pageTitle,marginBottom:24}}>委託を編集</h1>
              <ConsignmentForm
                artworks={artworks}
                counterparties={counterparties}
                staffList={staffList}
                galleryInfo={galleryInfo}
                nextId={null}
                editTarget={target}
                isMobile={isMobile}
                onSave={(updated) => {
                  setConsignments(p => p.map(c => c.id === editingConsignmentId ? updated : c));
                  // 作品ステータス更新：旧itemsと新itemsを比較
                  const oldIds = target.items.map(i=>i.artwork_id).filter(Boolean);
                  const newIds = updated.items.map(i=>i.artwork_id).filter(Boolean);
                  // 新たに追加された作品を委託中に
                  newIds.filter(id=>!oldIds.includes(id)).forEach(id=>{
                    const artwork = artworks.find(a=>a.artwork_id===id);
                    const item    = updated.items.find(i=>i.artwork_id===id);
                    setArtworks(p=>p.map(a=>a.artwork_id===id
                      ?{...a,status:"consigned",consignee:updated.consignee_name,consignee_id:updated.consignee_id,consignment_price:item.price,consigned_at:updated.date}
                      :a));
                  });
                  // 削除された作品を在庫に戻す
                  oldIds.filter(id=>!newIds.includes(id)).forEach(id=>{
                    setArtworks(p=>p.map(a=>a.artwork_id===id
                      ?{...a,status:"in_stock",consignee:null,consignee_id:null,consignment_price:null,consigned_at:null}
                      :a));
                  });
                  // 価格変更を反映
                  newIds.filter(id=>oldIds.includes(id)).forEach(id=>{
                    const item = updated.items.find(i=>i.artwork_id===id);
                    setArtworks(p=>p.map(a=>a.artwork_id===id
                      ?{...a,consignment_price:item.price,announce_price:item.announce_price||a.announce_price,consignee:updated.consignee_name,consignee_id:updated.consignee_id}
                      :a));
                  });
                  setEditingConsignmentId(null);
                  setView("consignment");
                }}
              />
            </div>
          );
        })()}

        {/* ══ 新規委託 ══ */}
        {view==="consignment_new" && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <button style={S.backBtn} onClick={()=>setView("consignment")}>← 委託一覧に戻る</button>
            <h1 style={{...S.pageTitle,marginBottom:24}}>新規委託</h1>
            <ConsignmentForm
              artworks={artworks}
              counterparties={counterparties}
              staffList={staffList}
              galleryInfo={galleryInfo}
              nextId={nextConsignmentId}
              isMobile={isMobile}
              onSave={(c) => {
                setConsignments(p => [...p, c]);
                setNextConsignmentId(p => p + 1);
                // 作品ステータスを委託中に更新
                c.items.forEach(item => {
                  if (item.artwork_id) {
                    setArtworks(p => p.map(a => a.artwork_id === item.artwork_id
                      ? { ...a, status:"consigned", consignee:c.consignee_name,
                          consignee_id: c.consignee_id,
                          consignment_price: item.price,
                          announce_price: item.announce_price || a.announce_price,
                          consigned_at: c.date }
                      : a
                    ));
                    setHistory(p => [...p, {
                      id: Date.now() + Math.random(),
                      artwork_id: item.artwork_id,
                      event_type: "consign",
                      old_price: null,
                      new_price: item.price,
                      counterparty: c.consignee_name,
                      counterparty_id: c.consignee_id,
                      memo: `委託 #${c.id}`,
                      created_at: c.date,
                    }]);
                  }
                });
                setView("consignment");
              }}
            />
          </div>
        )}

        {/* ══ 在庫 ══ */}
        {view==="inventory" && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <div style={S.pageHeader}>
              <h1 style={S.pageTitle}>在庫</h1>
            </div>
            <InventoryList
              artworks={artworks}
              counterparties={counterparties}
              artists={artists}
              artworkGroups={artworkGroups}
              isMobile={isMobile}
              onSelect={(artwork_id)=>{setSelectedId(artwork_id);setView("detail");}}
            />
          </div>
        )}

        {/* ══ 売上登録 ══ */}
        {view==="add_sale" && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <button style={S.backBtn} onClick={()=>navigateTo("inventory")}>← 戻る</button>
            <h1 style={{...S.pageTitle,marginBottom:24}}>売上を登録</h1>
            <SaleForm
              key={saleFormKey}
              artworks={artworks}
              counterparties={counterparties}
              artists={artists}
              artworkGroups={artworkGroups}
              taxSettings={taxSettings}
              isMobile={isMobile}
              onSave={(items) => {
                let hid = nextHid;
                items.forEach(({ artwork_id, sold_price, buyer_name, buyer_id, sold_date, memo }) => {
                  const dt = sold_date || today();
                  setArtworks(p => p.map(a => a.artwork_id === artwork_id
                    ? { ...a, status:"sold", sold_price, buyer:buyer_name, buyer_id, sold_at:dt,
                        ...(a.status==="consigned"?{consignee:null,consignee_id:null,consigned_at:null,consignment_price:null}:{}) }
                    : a
                  ));
                  setHistory(p => [...p, {
                    id: hid++,
                    artwork_id,
                    event_type: "sold",
                    old_price: null,
                    new_price: sold_price,
                    counterparty: buyer_name,
                    counterparty_id: buyer_id,
                    memo: memo || "",
                    created_at: dt,
                  }]);
                });
                setNextHid(hid);
                setView("inventory");
              }}
            />
          </div>
        )}

        {/* ══ 作品登録フォーム ══ */}
        {view==="add_artwork" && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <button style={S.backBtn} onClick={()=>navigateTo("list")}>← 戻る</button>
            <h1 style={{...S.pageTitle,marginBottom:24}}>仕入を登録</h1>
            <div style={S.formCard}>
              <div style={S.formSectionTitle}>作品情報</div>
              <div style={{...S.formGrid,...(isMobile?{gridTemplateColumns:"1fr"}:{})}}>
                <Field label="作品名" required><input style={S.formInput} value={artworkForm.title}  onChange={e=>setAF("title",e.target.value)}/></Field>
                <Field label="作家名" required>
                  <ArtistSelect
                    value={artworkForm.artist}
                    artistId={artworkForm.artist_id}
                    artists={artists}
                    onChange={(name, id, kana)=>setArtworkForm(p=>({...p, artist:name, artist_id:id, artist_kana:kana}))}
                    onQuickRegister={quickRegisterArtist}
                  />
                </Field>
                <Field label="技法・素材"><input style={S.formInput} placeholder="油彩、水彩、版画…" value={artworkForm.medium} onChange={e=>setAF("medium",e.target.value)}/></Field>
                <Field label="サイズ"><input style={S.formInput} placeholder="F30 (90.9×72.7cm)" value={artworkForm.size} onChange={e=>setAF("size",e.target.value)}/></Field>
                <Field label="鑑定"><input style={S.formInput} placeholder="例：東京美術倶楽部、日動美術財団" value={artworkForm.appraisal} onChange={e=>setAF("appraisal",e.target.value)}/></Field>
              </div>
              <div style={{...S.formSectionTitle,marginTop:20}}>仕入情報</div>
              <div style={{...S.formGrid,...(isMobile?{gridTemplateColumns:"1fr"}:{})}}>
                <Field label="仕入日" fullWidth required>
                  <SplitDateInput value={artworkForm.purchased_at} onChange={(val)=>{
                    setAF("purchased_at",val);
                    const sup = counterparties.find(c=>c.cp_id===artworkForm.supplier_id);
                    const checkDate = val || new Date().toISOString().slice(0,10);
                    const inv = sup?.invoice_no
                      ? (checkDate>=sup.invoice_from && (!sup.invoice_to||checkDate<=sup.invoice_to))
                      : false;
                    const rate = getTaxRate(checkDate, taxSettings.rates);
                    const creditRate = getPurchaseCreditRate(checkDate, inv, taxSettings);
                    const rnd = roundFn(taxSettings.rounding||"floor");
                    const p = Number(artworkForm.purchase_price)||0;
                    const tax = rnd(p - p/(1+rate));
                    const taxAfterCredit = rnd(tax*creditRate);
                    setArtworkForm(prev=>({...prev, purchase_tax: taxAfterCredit, tax_credit: taxAfterCredit, creditRate }));
                  }}/>
                </Field>
                <Field label="仕入先" fullWidth required badge={
                  artworkForm.supplier_id && artworkForm.creditRate != null && artworkForm.creditRate < 1 ? (
                    <span style={{fontSize:11,color:"#f87171",background:"rgba(248,113,113,0.12)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:4,padding:"2px 6px",whiteSpace:"nowrap",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}>
                      免税事業者
                    </span>
                  ) : undefined
                }>
                  <CpSelect
                    value={artworkForm.supplier} cpId={artworkForm.supplier_id}
                    counterparties={counterparties}
                    onChange={(name,id)=>{
                      // 仕入先変更時に控除税額を再計算
                      const sup = counterparties.find(c=>c.cp_id===id);
                      const checkDate = artworkForm.purchased_at || new Date().toISOString().slice(0,10);
                      const inv = sup?.invoice_no
                        ? (checkDate>=sup.invoice_from && (!sup.invoice_to||checkDate<=sup.invoice_to))
                        : false;
                      const rate = getTaxRate(checkDate, taxSettings.rates);
                      const creditRate = getPurchaseCreditRate(checkDate, inv, taxSettings);
                      const rnd = roundFn(taxSettings.rounding||"floor");
                      const p = Number(artworkForm.purchase_price)||0;
                      const tax = rnd(p - p/(1+rate));
                      const taxAfterCredit = rnd(tax*creditRate);
                      setArtworkForm(prev=>({...prev, supplier:name, supplier_id:id, purchase_tax: taxAfterCredit, tax_credit: taxAfterCredit, creditRate }));
                    }}
                    onQuickRegister={quickRegisterCp}
                  />
                </Field>
                <Field label="仕入価格 (円)" required><PriceInput value={artworkForm.purchase_price} onChange={v=>{
                  const sup = counterparties.find(c=>c.cp_id===artworkForm.supplier_id);
                  const checkDate = artworkForm.purchased_at || new Date().toISOString().slice(0,10);
                  const inv = sup?.invoice_no
                    ? (checkDate>=sup.invoice_from && (!sup.invoice_to||checkDate<=sup.invoice_to))
                    : false;
                  const rate = getTaxRate(checkDate, taxSettings.rates);
                  const creditRate = getPurchaseCreditRate(checkDate, inv, taxSettings);
                  const rnd = roundFn(taxSettings.rounding||"floor");
                  const tax = rnd(v - v/(1+rate));
                  const taxAfterCredit = rnd(tax*creditRate);
                  setArtworkForm(prev=>({...prev, purchase_price:v, purchase_tax: taxAfterCredit, tax_credit: taxAfterCredit, creditRate }));
                }}/></Field>
                <Field label="消費税額 (円)" badge={
                  artworkForm.creditRate != null && artworkForm.creditRate < 1 ? (
                    <span style={{fontSize:11,color:"#38bdf8",background:"rgba(56,189,248,0.12)",border:"1px solid rgba(56,189,248,0.3)",borderRadius:4,padding:"2px 6px",whiteSpace:"nowrap",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}>
                      控{Math.round((artworkForm.creditRate??1)*100)}
                    </span>
                  ) : undefined
                }>
                  <PriceInput value={artworkForm.purchase_tax??""} onChange={v=>setAF("purchase_tax",v)} placeholder="自動計算（手修正可）"/>
                </Field>
                <Field label="発表価格 (円)"><PriceInput value={artworkForm.announce_price} onChange={v=>setAF("announce_price",v)}/></Field>
                <Field label="仕入メモ" fullWidth><input style={S.formInput} placeholder="経緯・備考など" value={artworkForm.memo} onChange={e=>setAF("memo",e.target.value)}/></Field>
              </div>
              <button style={{...S.submitBtn,...((!artworkForm.title||!artworkForm.artist||!isRealDate(artworkForm.purchased_at)||!artworkForm.purchase_price||!artworkForm.supplier)?S.submitDisabled:{})}}
                onClick={addArtwork} disabled={!artworkForm.title||!artworkForm.artist||!isRealDate(artworkForm.purchased_at)||!artworkForm.purchase_price||!artworkForm.supplier}>登録する</button>
            </div>
          </div>
        )}

        {/* ══ 取引記録追加フォーム ══ */}
        {view==="add_history" && selected && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <button style={S.backBtn} onClick={()=>{setView("detail");setEditingHistoryId(null);}}>← 戻る</button>
            <h1 style={{...S.pageTitle,marginBottom:12}}>{editingHistoryId?"取引記録を編集":"取引記録を追加"}</h1>
            <p style={S.formSub}>対象：<strong style={{color:"#1a1919"}}>{selected.title}</strong> <span style={{color:"#5E6367"}}>（{selected.artist}）</span></p>
            <div style={S.formCard}>
              <div style={{...S.formGrid,...(isMobile?{gridTemplateColumns:"1fr"}:{})}}>
                <Field label="日付">
                  <SplitDateInput value={eventForm.created_at||""} onChange={(val)=>setEF("created_at",val)}/>
                </Field>
                <Field label="種別">
                  <select style={S.formInput} value={eventForm.event_type}
                    disabled={editingHistoryId!=null && selectedHistory[0]?.id===editingHistoryId}
                    onChange={e=>{
                    const t = e.target.value;
                    setEF("event_type", t);
                    // 仕入値引き：直近の仕入記録から仕入先を自動入力
                    if (t === "purchase_increase") {
                      const lastPurchase = [...history]
                        .filter(h => h.artwork_id === selectedId && h.event_type === "purchase")
                        .sort((a,b) => b.created_at.localeCompare(a.created_at))[0];
                      if (lastPurchase) {
                        setEventForm(p=>({...p, event_type:t,
                          counterparty: lastPurchase.counterparty || "",
                          counterparty_id: lastPurchase.counterparty_id || null
                        }));
                      }
                    } else if (t === "sold_increase") {
                      const lastSold = [...history]
                        .filter(h => h.artwork_id === selectedId && h.event_type === "sold")
                        .sort((a,b) => b.created_at.localeCompare(a.created_at))[0];
                      if (lastSold) {
                        setEventForm(p=>({...p, event_type:t,
                          counterparty: lastSold.counterparty || "",
                          counterparty_id: lastSold.counterparty_id || null
                        }));
                      }
                    } else if (t === "purchase_discount") {
                      const lastPurchase = [...history]
                        .filter(h => h.artwork_id === selectedId && h.event_type === "purchase")
                        .sort((a,b) => b.created_at.localeCompare(a.created_at))[0];
                      if (lastPurchase) {
                        setEventForm(p=>({...p, event_type:t,
                          counterparty: lastPurchase.counterparty || "",
                          counterparty_id: lastPurchase.counterparty_id || null
                        }));
                      }
                    // 売上値引き：直近の売上記録から売上先を自動入力
                    } else if (t === "sold_discount") {
                      const lastSold = [...history]
                        .filter(h => h.artwork_id === selectedId && h.event_type === "sold")
                        .sort((a,b) => b.created_at.localeCompare(a.created_at))[0];
                      if (lastSold) {
                        setEventForm(p=>({...p, event_type:t,
                          counterparty: lastSold.counterparty || "",
                          counterparty_id: lastSold.counterparty_id || null
                        }));
                      }
                    // 委託中に売上・委託戻りを選んだ場合：委託先を自動入力
                    } else if ((t === "sold" || t === "return") && selected.status === "consigned") {
                      setEventForm(p=>({...p, event_type:t,
                        counterparty: selected.consignee || "",
                        counterparty_id: selected.consignee_id || null
                      }));
                    }
                  }}>
                    {(() => {
                      const isEditingFirst = editingHistoryId!=null && selectedHistory[0]?.id===editingHistoryId;
                      const latestType = selectedHistory[selectedHistory.length-1]?.event_type;
                      const isAddingWhileConsigned = editingHistoryId==null && latestType === "consign";
                      const opts = isEditingFirst
                        ? [["purchase",EVENT_LABELS.purchase]]
                        : isAddingWhileConsigned
                        ? [["sold",EVENT_LABELS.sold],["return",EVENT_LABELS.return]]
                        : Object.entries(EVENT_LABELS);
                      return opts.map(([k,v])=><option key={k} value={k}>{v}</option>);
                    })()}
                  </select>
                </Field>
                {!["memo","return"].includes(eventForm.event_type)&&(
                  <Field label={cpLabel(eventForm.event_type)}>
                    <CpSelect
                      value={eventForm.counterparty} cpId={eventForm.counterparty_id}
                      counterparties={counterparties}
                      placeholder={cpHolder(eventForm.event_type)}
                      onChange={(name,id)=>setEventForm(p=>({...p,counterparty:name,counterparty_id:id}))}
                      onQuickRegister={quickRegisterCp}
                    />
                  </Field>
                )}
                {!["return","memo"].includes(eventForm.event_type) && (
                  <Field label={
                    eventForm.event_type==="purchase"?"仕入価格 (円)":
                    eventForm.event_type==="purchase_discount"?"値引き額 (円)":
                    eventForm.event_type==="sold"?"成約価格 (円)":
                    eventForm.event_type==="sold_discount"?"値引き額 (円)":
                    eventForm.event_type==="consign"?"委託価格 (円)":"価格 (円)"}>
                    <input style={S.formInput} type="number" placeholder="例：350000" value={eventForm.new_price} onChange={e=>setEF("new_price",e.target.value)}/>
                  </Field>
                )}
                <Field label="メモ" fullWidth><input style={S.formInput} placeholder="詳細・経緯など" value={eventForm.memo} onChange={e=>setEF("memo",e.target.value)}/></Field>
              </div>
              <button style={{...S.submitBtn,...((eventForm.created_at!==""&&!isRealDate(eventForm.created_at))?S.submitDisabled:{})}}
                onClick={addEvent}
                disabled={eventForm.created_at!==""&&!isRealDate(eventForm.created_at)}>
                {editingHistoryId?"保存する":"記録する"}
              </button>
            </div>
          </div>
        )}

        {/* ══ 取引先登録・編集フォーム ══ */}
        {view==="cp_form" && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <button style={S.backBtn} onClick={()=>{setCpEditId(null);setView(cpEditId?"cp_detail":"cp_list");}}>← 戻る</button>
            <h1 style={{...S.pageTitle,marginBottom:24}}>{cpEditId?"取引先を編集":"取引先を登録"}</h1>
            <div style={S.formCard}>
              <div style={S.formSectionTitle}>種別</div>
              <div style={{...S.formGrid,...(isMobile?{gridTemplateColumns:"1fr"}:{})}}>
                <Field label="種別">
                  <select style={S.formInput} value={cpForm.type_id ?? ""} onChange={e=>setCF("type_id",e.target.value?Number(e.target.value):null)}>
                    <option value="">未分類</option>
                    {counterpartyTypes.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </Field>

              </div>

              <div style={{...S.formSectionTitle,marginTop:20}}>取引先情報</div>
              <div style={{...S.formGrid,...(isMobile?{gridTemplateColumns:"1fr"}:{})}}>
                {isPersonType(cpForm.type_id) ? (
                  <Field label="取引先名" required><input style={S.formInput} placeholder="例：田中 誠" value={cpForm.name}
                    onChange={e=>setCF("name",e.target.value)}
                    onBlur={e=>setCF("name",normalizeSpaces(e.target.value).trim())}/></Field>
                ) : (
                  <Field label="取引先名" required><input style={S.formInput} placeholder="例：株式会社〇〇" value={cpForm.company}
                    onChange={e=>setCF("company",e.target.value)}
                    onBlur={e=>setCF("company",normalizeSpaces(e.target.value).trim())}/></Field>
                )}
                <Field label="フリガナ"><input style={S.formInput} placeholder="例：タナカ マコト" value={cpForm.name_kana}
                  onChange={e=>setCF("name_kana",e.target.value)}
                  onBlur={e=>setCF("name_kana",sanitizeKana(e.target.value))}/></Field>
                <Field label="部署（任意）"><input style={S.formInput} placeholder="例：コレクション部" value={cpForm.department} onChange={e=>setCF("department",e.target.value)}/></Field>
                {isPersonType(cpForm.type_id)&&(
                  <Field label="所属会社・団体（任意）"><input style={S.formInput} placeholder="例：田中商事株式会社" value={cpForm.company} onChange={e=>setCF("company",e.target.value)}/></Field>
                )}
              </div>

              <div style={{...S.formSectionTitle,marginTop:20}}>インボイス（適格請求書）</div>
              <div style={{...S.formGrid,...(isMobile?{gridTemplateColumns:"1fr"}:{})}}>
                <Field label="インボイス登録番号（T+13桁）"><input style={S.formInput} placeholder="例：T1234567890123" value={cpForm.invoice_no} onChange={e=>setCF("invoice_no",e.target.value)}/></Field>
                <Field label="登録開始日"><SplitDateInput value={cpForm.invoice_from} onChange={(val)=>setCF("invoice_from",val)}/></Field>
                <Field label="登録終了日（任意）"><SplitDateInput value={cpForm.invoice_to} onChange={(val)=>setCF("invoice_to",val)}/></Field>
              </div>

              <div style={{...S.formSectionTitle,marginTop:20}}>連絡先</div>
              <div style={{...S.formGrid,...(isMobile?{gridTemplateColumns:"1fr"}:{})}}>
                <Field label="メールアドレス"><input style={S.formInput} type="email" placeholder="例：info@example.com" value={cpForm.email} onChange={e=>setCF("email",e.target.value)}/></Field>
                <Field label="電話番号"><input style={S.formInput} placeholder="例：03-1234-5678" value={cpForm.phone} onChange={e=>setCF("phone",e.target.value)}/></Field>
                <Field label="郵便番号"><input style={S.formInput} placeholder="例：150-0001" value={cpForm.zip} onChange={e=>setCF("zip",e.target.value)}/></Field>
                <Field label="住所"><input style={S.formInput} placeholder="例：東京都渋谷区〇〇1-1-1" value={cpForm.address} onChange={e=>setCF("address",e.target.value)}/></Field>
                <Field label="建物名以下" fullWidth><input style={S.formInput} placeholder="例：〇〇ビル3F" value={cpForm.building} onChange={e=>setCF("building",e.target.value)}/></Field>
                <Field label="メモ" fullWidth><textarea style={{...S.formInput,resize:"vertical",minHeight:72}} placeholder="特記事項・嗜好など" value={cpForm.note} onChange={e=>setCF("note",e.target.value)}/></Field>
              </div>
              <button
                style={{...S.submitBtn,...(((!isPersonType(cpForm.type_id)&&!cpForm.company)||(isPersonType(cpForm.type_id)&&!cpForm.name)||(cpForm.invoice_from&&!isRealDate(cpForm.invoice_from))||(cpForm.invoice_to&&!isRealDate(cpForm.invoice_to)))?S.submitDisabled:{})}}
                onClick={saveCp}
                disabled={(!isPersonType(cpForm.type_id)&&!cpForm.company)||(isPersonType(cpForm.type_id)&&!cpForm.name)||(cpForm.invoice_from&&!isRealDate(cpForm.invoice_from))||(cpForm.invoice_to&&!isRealDate(cpForm.invoice_to))}>
                {cpEditId?"保存する":"登録する"}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ══ スマホ：ボトムナビ（フローティング型） ══ */}
      {isMobile && (
        <div style={S.bottomNavWrap}>
          <nav style={S.bottomNavBar} ref={navBarRef}>
            <span style={{
              position:"absolute", top:5, bottom:5,
              left:navSlider.left, width:navSlider.width,
              background:"#EFEFEF", borderRadius:999,
              opacity:navSlider.visible?1:0,
              transition:"left 0.25s cubic-bezier(0.4,0,0.2,1), width 0.25s cubic-bezier(0.4,0,0.2,1), opacity 0.15s",
              pointerEvents:"none" as const,
            }}/>
            {[
              { key:"inventory",   icon:"", label:"在庫" },
              { key:"daily",       icon:"", label:"日計" },
              { key:"consignment", icon:"", label:"委託" },
              { key:"list",        icon:"", label:"作品" },
              { key:"cp_list",     icon:"", label:"取引先" },
              { key:"settings",    icon:"", label:"設定" },
            ].map(({key,icon,label})=>{
              const active = activeNav===key;
              return (
                <button key={key}
                  ref={el=>{navItemRefs.current[key]=el;}}
                  style={S.bottomNavItem}
                  onClick={()=>{navigateTo(key);setSelectedId(null);setSelectedCpId(null);}}>
                  <span style={S.bottomNavHighlight}>
                    <span className="material-icons" style={{fontSize:15,lineHeight:1,color:active?"#1a1919":"#5E6367",transition:"color 0.2s"}}>{icon}</span>
                    <span style={{fontSize:7.5,fontWeight:700,color:active?"#1a1919":"#5E6367",transition:"color 0.2s"}}>{label}</span>
                  </span>
                </button>
              );
            })}
          </nav>
          <button
            style={S.bottomNavFab}
            onClick={()=>setRegisterMenuOpen(o=>!o)}>
            <span style={{fontSize:22,lineHeight:1}}>{registerMenuOpen?"✕":"＋"}</span>
          </button>
          {/* 登録ポップアップ */}
          {registerMenuOpen && (
            <>
              <div style={S.registerOverlay} onClick={()=>setRegisterMenuOpen(false)}/>
              <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:201,display:"flex",flexDirection:"column",gap:12,padding:"0 16px 32px",boxSizing:"border-box" as const}}>
                <button className="registerCard" style={{display:"flex",alignItems:"center",gap:12,padding:"18px 16px",cursor:"pointer",width:"100%",boxSizing:"border-box" as const,background:"#FFFFFF",border:"1px solid #C6C6C8",borderRadius:12,textAlign:"left" as const}}
                  onClick={()=>{navigateTo("add_artwork");setRegisterMenuOpen(false);}}>
                  <span style={S.registerMenuIcon}>◈</span>
                  <div>
                    <div style={S.registerMenuTitle}>仕入を登録</div>
                    <div style={S.registerMenuSub}>新しい作品を仕入れる</div>
                  </div>
                </button>
                <button className="registerCard" style={{display:"flex",alignItems:"center",gap:12,padding:"18px 16px",cursor:"pointer",width:"100%",boxSizing:"border-box" as const,background:"#FFFFFF",border:"1px solid #C6C6C8",borderRadius:12,textAlign:"left" as const}}
                  onClick={()=>{navigateTo("add_sale");setRegisterMenuOpen(false);}}>
                  <span style={S.registerMenuIcon}>◆</span>
                  <div>
                    <div style={S.registerMenuTitle}>売上を登録</div>
                    <div style={S.registerMenuSub}>在庫作品の売上を記録する</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}


// ─── 取引一覧コンポーネント ───────────────────────────────
function TransactionList({ history, artworks, counterparties, onSelectArtwork, onSelectCp }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const fmt = (n) => n != null && n !== "" ? `¥${Number(n).toLocaleString()}` : "—";

  // 絞り込み
  const filtered = history.filter(h => {
    const matchType = typeFilter === "all" || h.event_type === typeFilter;
    const q = search.toLowerCase();
    const artwork = artworks.find(a => a.artwork_id === h.artwork_id);
    const matchSearch = !q || [
      h.counterparty,
      h.memo,
      artwork?.title,
      artwork?.artist,
    ].some(s => (s||"").toLowerCase().includes(q));
    return matchType && matchSearch;
  });

  // 日付ごとにグループ化・降順
  const groups = filtered.reduce((acc, h) => {
    const d = h.created_at;
    if (!acc[d]) acc[d] = [];
    acc[d].push(h);
    return acc;
  }, {});
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  // 日付の日本語表示
  const fmtDate = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}年${dt.getMonth()+1}月${dt.getDate()}日`;
  };

  // 日付ごとの合計
  const dayTotal = (evs) => {
    const purchase = evs.filter(e=>e.event_type==="purchase").reduce((s,e)=>s+(e.new_price||0),0);
    const sold     = evs.filter(e=>e.event_type==="sold").reduce((s,e)=>s+(e.new_price||0),0);
    return { purchase, sold };
  };

  return (
    <div>
      {/* 検索・フィルター */}
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
        <input style={{...TL.search}} placeholder="作品名・作家・取引先・メモで検索…"
          value={search} onChange={e=>setSearch(e.target.value)}/>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[["all","すべて"],["purchase","仕入"],["consign","委託"],["return","委託返却"],["discount","値引き"],["sold","売却"],["memo","メモ"]].map(([k,l])=>(
            <button key={k}
              style={{...TL.filterBtn,...(typeFilter===k?TL.filterActive:{}),...(k!=="all"?{color:EVENT_COLORS[k]||"#5E6367",borderColor:(EVENT_COLORS[k]||"#5E6367")+"44"}:{})}}
              onClick={()=>setTypeFilter(k)}
              onMouseEnter={e=>{ if(typeFilter!==k){ e.currentTarget.style.background="#efeeeb"; e.currentTarget.style.borderColor="#efeeeb"; } }}
              onMouseLeave={e=>{ if(typeFilter!==k){ e.currentTarget.style.background="#F9F9F7"; e.currentTarget.style.borderColor = k!=="all" ? (EVENT_COLORS[k]||"#5E6367")+"44" : "#C6C6C8"; } }}>{l}
            </button>
          ))}
        </div>
        <div style={{fontSize:12,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",textAlign:"right"}}>{filtered.length}件</div>
      </div>

      {/* 日付グループ */}
      {sortedDates.length===0
        ? <div style={{color:"#5E6367",fontSize:13,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",padding:"40px 0",textAlign:"center"}}>該当する取引がありません</div>
        : sortedDates.map(date => {
          const evs = groups[date];
          const { purchase, sold } = dayTotal(evs);
          return (
            <div key={date} style={TL.dateGroup}>
              {/* 日付ヘッダー */}
              <div style={TL.dateHeader}>
                <span style={TL.dateLabel}>{fmtDate(date)}</span>
                <div style={TL.dateSummary}>
                  {purchase>0&&<span style={{color:"#60a5fa",fontSize:12,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}>仕入 {fmt(purchase)}</span>}
                  {sold>0&&<span style={{color:"#22c55e",fontSize:12,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}>売上 {fmt(sold)}</span>}
                  <span style={{color:"#5E6367",fontSize:12,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}>{evs.length}件</span>
                </div>
              </div>

              {/* 取引行 */}
              {evs.map((h,i) => {
                const artwork = artworks.find(a => a.artwork_id === h.artwork_id);
                return (
                  <div key={h.id} style={{...TL.row,...(i%2===0?{}:{background:"#F9F9F7"})}}>
                    {/* 種別バッジ */}
                    <div style={TL.eventType}>
                      <span style={{...TL.badge,background:EVENT_COLORS[h.event_type]+"22",color:EVENT_COLORS[h.event_type],border:`1px solid ${EVENT_COLORS[h.event_type]}44`}}>
                        {EVENT_LABELS[h.event_type]}
                      </span>
                    </div>

                    {/* 作品情報 */}
                    <div style={TL.artworkCol}>
                      {artwork
                        ? <button style={TL.artworkLink} onClick={()=>onSelectArtwork(artwork.artwork_id)}>
                            <span style={TL.artworkTitle}>{artwork.title}</span>
                            <span style={TL.artworkSub}>{artwork.artist}</span>
                          </button>
                        : <span style={{color:"#5E6367",fontSize:12,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}>—</span>
                      }
                    </div>

                    {/* 取引先 */}
                    <div style={TL.cpCol}>
                      {h.counterparty
                        ? h.counterparty_id
                          ? <button style={TL.cpLink} onClick={()=>onSelectCp(h.counterparty_id)}>
                              {h.counterparty}
                            </button>
                          : <span style={{fontSize:12,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",color:"#5E6367"}}>{h.counterparty}</span>
                        : <span style={{color:"#5E6367",fontSize:12}}>—</span>
                      }
                    </div>

                    {/* 価格 */}
                    <div style={TL.priceCol}>

                      {h.new_price!=null&&(
                        <span style={{...TL.newPrice,color:EVENT_COLORS[h.event_type]}}>{fmt(h.new_price)}</span>
                      )}
                    </div>

                    {/* メモ */}
                    {h.memo&&<div style={TL.memo}>{h.memo}</div>}
                  </div>
                );
              })}
            </div>
          );
        })
      }
    </div>
  );
}

const TL = {
  search:      { background:"#FFFFFF", border:"1px solid #C6C6C8", borderRadius:8, padding:"8px 14px", color:"#1a1919", fontSize:13, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", outline:"none", width:"100%", boxSizing:"border-box" },
  filterBtn:   { padding:"4px 10px", borderRadius:20, border:"1px solid #C6C6C8", background:"transparent", color:"#5E6367", cursor:"pointer", fontSize:12, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  filterActive:{ background:"#081319", color:"#fff", borderColor:"#081319" },
  dateGroup:   { marginBottom:24 },
  dateHeader:  { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0 6px", borderBottom:"2px solid #C6C6C8", marginBottom:2 },
  dateLabel:   { fontSize:14, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", letterSpacing:"0.05em" },
  dateSummary: { display:"flex", gap:12, alignItems:"center" },
  row:         { display:"flex", alignItems:"center", gap:12, padding:"10px 6px", borderBottom:"1px solid #C6C6C8", flexWrap:"wrap" },
  eventType:   { flexShrink:0, width:70 },
  badge:       { padding:"2px 7px", borderRadius:12, fontSize:12, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", whiteSpace:"nowrap" },
  artworkCol:  { flex:1, minWidth:120 },
  artworkLink: { background:"none", border:"none", padding:0, cursor:"pointer", textAlign:"left", display:"flex", flexDirection:"column", gap:1 },
  artworkTitle:{ fontSize:13, color:"#1a1919", fontWeight:600 },
  artworkSub:  { fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  cpCol:       { flexShrink:0, minWidth:100, maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  cpLink:      { background:"none", border:"none", color:"#5A57A6", cursor:"pointer", fontSize:12, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", padding:0, textDecoration:"none" },
  priceCol:    { flexShrink:0, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2, minWidth:90 },
  oldPrice:    { fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", textDecoration:"line-through" },
  newPrice:    { fontSize:15, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  memo:        { width:"100%", fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", paddingLeft:82 },
};



// ─── 作家設定（一覧） ─────────────────────────────────────
function ArtistSettings({ artists, artworks, artworkGroups, onSaveArtists, onSaveGroups, nextGroupId, onNextGroupId, nextId, onNextId, onEdit }) {
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number|null>(null);
  // グループ管理用state
  const [groupTab, setGroupTab] = useState<"artists"|"groups">("artists");
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<number|null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<number|null>(null);

  const filtered = artists.filter(a =>
    !search || [a.name, a.name_kana].some(s=>(s||"").toLowerCase().includes(search.toLowerCase()))
  ).sort((a,b)=>a.artist_id.localeCompare(b.artist_id));

  const confirmDelete = (id: number) => setConfirmDeleteId(id);
  const doDelete = () => {
    if (confirmDeleteId !== null) {
      onSaveArtists(artists.filter(a=>a.id!==confirmDeleteId));
      setConfirmDeleteId(null);
    }
  };

  const targetArtist = artists.find(a=>a.id===confirmDeleteId);
  const artworkCount = confirmDeleteId !== null
    ? artworks.filter(aw =>
        targetArtist
          ? (aw.artist_id && aw.artist_id === targetArtist.artist_id)
            || (!aw.artist_id && aw.artist === targetArtist.name)
          : false
      ).length
    : 0;
  const hasArtworks = artworkCount > 0;

  // グループ削除確認
  const targetGroup = artworkGroups.find(g=>g.id===confirmDeleteGroupId);
  const groupArtistCount = confirmDeleteGroupId !== null
    ? artists.filter(a=>a.group_id===confirmDeleteGroupId).length : 0;

  const addGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    onSaveGroups([...artworkGroups, { id: nextGroupId, name }]);
    onNextGroupId(nextGroupId + 1);
    setNewGroupName("");
  };

  const saveGroupEdit = () => {
    const name = editingGroupName.trim();
    if (!name || editingGroupId === null) return;
    onSaveGroups(artworkGroups.map(g => g.id===editingGroupId ? {...g, name} : g));
    setEditingGroupId(null);
    setEditingGroupName("");
  };

  const doDeleteGroup = () => {
    if (confirmDeleteGroupId === null) return;
    // グループ削除時：所属作家のgroup_idをnullに
    onSaveArtists(artists.map(a => a.group_id===confirmDeleteGroupId ? {...a, group_id:null} : a));
    onSaveGroups(artworkGroups.filter(g => g.id!==confirmDeleteGroupId));
    setConfirmDeleteGroupId(null);
  };

  // グループの並び替え
  const moveGroup = (id: number, dir: -1|1) => {
    const idx = artworkGroups.findIndex(g=>g.id===id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= artworkGroups.length) return;
    const next = [...artworkGroups];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    onSaveGroups(next);
  };

  return (
    <div style={{maxWidth:560}}>

      {/* 作家削除確認ダイアログ */}
      {confirmDeleteId !== null && (
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.6)"}}>
          <div style={{background:"#FFFFFF",border:"1px solid #C6C6C8",borderRadius:12,padding:"28px 32px",maxWidth:400,width:"90%",textAlign:"center"}}>
            {hasArtworks ? (
              <>
                <div style={{fontSize:18,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginBottom:8,color:"#f87171"}}>削除できません</div>
                <div style={{fontSize:14,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginBottom:24,lineHeight:1.8}}>
                  <span style={{color:"#1a1919",fontWeight:"bold"}}>{targetArtist?.name}</span> の作品が<br/>
                  作品一覧に <span style={{color:"#f59e0b",fontWeight:"bold"}}>{artworkCount}点</span> 登録されています。<br/>
                  先に作品をすべて削除してから、<br/>作家を削除してください。
                </div>
                <button style={{padding:"8px 32px",borderRadius:6,border:"none",background:"#C6C6C8",color:"#5E6367",cursor:"pointer",fontSize:13,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}
                  onClick={()=>setConfirmDeleteId(null)}>閉じる</button>
              </>
            ) : (
              <>
                <div style={{fontSize:18,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginBottom:8}}>削除の確認</div>
                <div style={{fontSize:14,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginBottom:24,lineHeight:1.6}}>
                  <span style={{color:"#1a1919",fontWeight:"bold"}}>{targetArtist?.name}</span>（{targetArtist?.name_kana}）を削除しますか？<br/>
                  この操作は取り消せません。
                </div>
                <div style={{display:"flex",gap:10,justifyContent:"center"}}>
                  <button style={{padding:"8px 24px",borderRadius:6,border:"none",background:"#C6C6C8",color:"#5E6367",cursor:"pointer",fontSize:13,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}
                    onClick={()=>setConfirmDeleteId(null)}>キャンセル</button>
                  <button style={{padding:"8px 24px",borderRadius:6,border:"none",background:"#f87171",color:"#fff",cursor:"pointer",fontSize:13,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}
                    onClick={doDelete}>削除する</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* グループ削除確認ダイアログ */}
      {confirmDeleteGroupId !== null && (
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.6)"}}>
          <div style={{background:"#FFFFFF",border:"1px solid #C6C6C8",borderRadius:12,padding:"28px 32px",maxWidth:400,width:"90%",textAlign:"center"}}>
            <div style={{fontSize:18,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginBottom:8}}>グループを削除</div>
            <div style={{fontSize:14,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginBottom:24,lineHeight:1.8}}>
              <span style={{color:"#1a1919",fontWeight:"bold"}}>「{targetGroup?.name}」</span> を削除します。<br/>
              {groupArtistCount > 0 && (
                <span>このグループに属する <span style={{color:"#f59e0b",fontWeight:"bold"}}>{groupArtistCount}名</span> の作家は未分類になります。<br/></span>
              )}
              この操作は取り消せません。
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button style={{padding:"8px 24px",borderRadius:6,border:"none",background:"#C6C6C8",color:"#5E6367",cursor:"pointer",fontSize:13,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}
                onClick={()=>setConfirmDeleteGroupId(null)}>キャンセル</button>
              <button style={{padding:"8px 24px",borderRadius:6,border:"none",background:"#f87171",color:"#fff",cursor:"pointer",fontSize:13,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}
                onClick={doDeleteGroup}>削除する</button>
            </div>
          </div>
        </div>
      )}

      {/* タブ切り替え：作家一覧 / グループ管理 */}
      <div style={{display:"flex",gap:4,marginBottom:20}}>
        {(["artists","groups"] as const).map(tab=>(
          <button key={tab}
            style={{padding:"8px 20px",borderRadius:8,background:groupTab===tab?"#081319":"#F9F9F7",border:groupTab===tab?"1px solid #081319":"1px solid #C6C6C8",color:groupTab===tab?"#fff":"#5E6367",cursor:"pointer",fontSize:13,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",fontWeight:groupTab===tab?600:400}}
            onClick={e=>{setGroupTab(tab);e.currentTarget.blur();}}
            onMouseEnter={e=>{ if(groupTab!==tab){ e.currentTarget.style.background="#efeeeb"; e.currentTarget.style.borderColor="#efeeeb"; } }}
            onMouseLeave={e=>{ if(groupTab!==tab){ e.currentTarget.style.background="#F9F9F7"; e.currentTarget.style.borderColor="#C6C6C8"; } }}>
            {tab==="artists"?"作家一覧":"グループ管理"}
          </button>
        ))}
      </div>

      {/* ── 作家一覧タブ ── */}
      {groupTab==="artists" && (
        <>
          <div style={S.toolbar}>
            <input style={S.search} placeholder="名前・フリガナで検索…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <div style={{fontSize:12,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",margin:"0 0 12px",textAlign:"right"}}>{filtered.length}件</div>
          <div style={{display:"flex",flexDirection:"column",gap:0}}>
            {filtered.map(a=>{
              const grp = artworkGroups.find(g=>g.id===a.group_id);
              return (
                <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #C6C6C8"}}>
                  <span style={{fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",fontSize:12,color:"#1a1919",width:40,flexShrink:0}}>{a.artist_id}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",display:"flex",alignItems:"center",gap:6}}>
                      {a.name}
                      {grp && <span style={{fontSize:11,color:"#818cf8",border:"1px solid #818cf8",borderRadius:3,padding:"0 4px",lineHeight:"16px"}}>{grp.name}</span>}
                    </div>
                    <div style={{fontSize:12,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}>{a.name_kana}</div>
                  </div>
                  <button style={{background:"none",border:"none",color:"#5A57A6",cursor:"pointer",fontSize:12,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}
                    onClick={()=>onEdit(a.id)}>編集</button>
                  <button style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:12,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}
                    onClick={()=>confirmDelete(a.id)}>削除</button>
                </div>
              );
            })}
            {filtered.length===0&&<div style={{color:"#5E6367",fontSize:13,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",padding:"20px 0"}}>該当する作家がいません</div>}
          </div>
        </>
      )}

      {/* ── グループ管理タブ ── */}
      {groupTab==="groups" && (
        <>
          <div style={{fontSize:12,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginBottom:16,lineHeight:1.6}}>
            グループを定義して作家を分類できます。在庫ページのタブとして表示されます。
          </div>

          {/* 新規グループ追加 */}
          <div style={{display:"flex",gap:8,marginBottom:20}}>
            <input
              style={{...S.formInput,flex:1}}
              placeholder="新しいグループ名"
              value={newGroupName}
              onChange={e=>setNewGroupName(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter")addGroup();}}
            />
            <button
              style={{padding:"8px 16px",borderRadius:6,border:"none",background:newGroupName.trim()?"#5A57A6":"#C6C6C8",color:newGroupName.trim()?"#fff":"#5E6367",cursor:newGroupName.trim()?"pointer":"default",fontSize:13,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",whiteSpace:"nowrap"}}
              onClick={addGroup} disabled={!newGroupName.trim()}>
              ＋ 追加
            </button>
          </div>

          {/* グループ一覧 */}
          {artworkGroups.length===0 ? (
            <div style={{color:"#5E6367",fontSize:13,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",padding:"20px 0",textAlign:"center"}}>グループがまだありません</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:0}}>
              {artworkGroups.map((g,idx)=>{
                const cnt = artists.filter(a=>a.group_id===g.id).length;
                const isEditing = editingGroupId===g.id;
                return (
                  <div key={g.id} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 0",borderBottom:"1px solid #C6C6C8"}}>
                    {/* 並び替えボタン */}
                    <div style={{display:"flex",flexDirection:"column",gap:1,flexShrink:0}}>
                      <button style={{background:"none",border:"none",color:idx===0?"#5E6367":"#5E6367",cursor:idx===0?"default":"pointer",fontSize:10,padding:"1px 4px",lineHeight:1}}
                        onClick={()=>moveGroup(g.id,-1)} disabled={idx===0}>▲</button>
                      <button style={{background:"none",border:"none",color:idx===artworkGroups.length-1?"#5E6367":"#5E6367",cursor:idx===artworkGroups.length-1?"default":"pointer",fontSize:10,padding:"1px 4px",lineHeight:1}}
                        onClick={()=>moveGroup(g.id,1)} disabled={idx===artworkGroups.length-1}>▼</button>
                    </div>
                    {/* グループ名 */}
                    {isEditing ? (
                      <input
                        style={{...S.formInput,flex:1,height:30,padding:"4px 10px"}}
                        value={editingGroupName}
                        onChange={e=>setEditingGroupName(e.target.value)}
                        onKeyDown={e=>{if(e.key==="Enter")saveGroupEdit();if(e.key==="Escape"){setEditingGroupId(null);}}}
                        autoFocus
                      />
                    ) : (
                      <div style={{flex:1,minWidth:0}}>
                        <span style={{fontSize:14,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",color:"#1a1919"}}>{g.name}</span>
                        <span style={{fontSize:12,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginLeft:8}}>{cnt}名</span>
                      </div>
                    )}
                    {/* 操作ボタン */}
                    {isEditing ? (
                      <>
                        <button style={{background:"none",border:"none",color:"#22c55e",cursor:"pointer",fontSize:12,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}
                          onClick={saveGroupEdit}>保存</button>
                        <button style={{background:"none",border:"none",color:"#5E6367",cursor:"pointer",fontSize:12,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}
                          onClick={()=>setEditingGroupId(null)}>取消</button>
                      </>
                    ) : (
                      <>
                        <button style={{background:"none",border:"none",color:"#5A57A6",cursor:"pointer",fontSize:12,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}
                          onClick={()=>{setEditingGroupId(g.id);setEditingGroupName(g.name);}}>編集</button>
                        <button style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:12,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}
                          onClick={()=>setConfirmDeleteGroupId(g.id)}>削除</button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── 取引先種別設定 ─────────────────────────────────────────
function CpTypeSettings({ counterpartyTypes, counterparties, onSaveTypes, onSaveCounterparties, nextId, onNextId }) {
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<"individual"|"corporate">("individual");
  const [editingId, setEditingId] = useState<number|null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingCategory, setEditingCategory] = useState<"individual"|"corporate">("individual");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number|null>(null);

  const addType = () => {
    const name = newName.trim();
    if (!name) return;
    onSaveTypes([...counterpartyTypes, { id: nextId, name, category: newCategory }]);
    onNextId(nextId + 1);
    setNewName(""); setNewCategory("individual");
  };

  const startEdit = (t) => { setEditingId(t.id); setEditingName(t.name); setEditingCategory(t.category); };
  const saveEdit = () => {
    const name = editingName.trim();
    if (!name || editingId === null) return;
    onSaveTypes(counterpartyTypes.map(t => t.id===editingId ? {...t, name, category:editingCategory} : t));
    setEditingId(null); setEditingName("");
  };

  const targetType = counterpartyTypes.find(t=>t.id===confirmDeleteId);
  const typeCpCount = confirmDeleteId !== null
    ? counterparties.filter(c=>c.type_id===confirmDeleteId).length : 0;

  const doDelete = () => {
    if (confirmDeleteId === null) return;
    // 種別削除時：所属取引先のtype_idはnull（未分類）に戻す
    onSaveCounterparties(counterparties.map(c => c.type_id===confirmDeleteId ? {...c, type_id:null} : c));
    onSaveTypes(counterpartyTypes.filter(t=>t.id!==confirmDeleteId));
    setConfirmDeleteId(null);
  };

  // 種別の並び替え
  const moveType = (id: number, dir: -1|1) => {
    const idx = counterpartyTypes.findIndex(t=>t.id===id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= counterpartyTypes.length) return;
    const next = [...counterpartyTypes];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    onSaveTypes(next);
  };

  return (
    <div style={{maxWidth:560}}>

      {/* 削除確認ダイアログ */}
      {confirmDeleteId !== null && (
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.6)"}}>
          <div style={{background:"#FFFFFF",border:"1px solid #C6C6C8",borderRadius:12,padding:"28px 32px",maxWidth:400,width:"90%",textAlign:"center"}}>
            <div style={{fontSize:18,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginBottom:8}}>種別を削除</div>
            <div style={{fontSize:14,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginBottom:24,lineHeight:1.8}}>
              <span style={{color:"#1a1919",fontWeight:"bold"}}>「{targetType?.name}」</span> を削除します。<br/>
              {typeCpCount > 0 && (
                <span>この種別の取引先 <span style={{color:"#f59e0b",fontWeight:"bold"}}>{typeCpCount}件</span> は未分類になります。<br/></span>
              )}
              この操作は取り消せません。
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button style={{padding:"8px 24px",borderRadius:6,border:"none",background:"#C6C6C8",color:"#5E6367",cursor:"pointer",fontSize:13,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}
                onClick={()=>setConfirmDeleteId(null)}>キャンセル</button>
              <button style={{padding:"8px 24px",borderRadius:6,border:"none",background:"#f87171",color:"#fff",cursor:"pointer",fontSize:13,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}
                onClick={doDelete}>削除する</button>
            </div>
          </div>
        </div>
      )}

      <div style={{fontSize:12,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginBottom:16,lineHeight:1.6}}>
        取引先の種別を自由に追加・編集できます。「個人系」は氏名を、「法人系」は会社名を主な表示名として使用します。
      </div>

      {/* 新規種別追加 */}
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        <input
          style={{...S.formInput,flex:1,minWidth:140}}
          placeholder="新しい種別名（例：オークションハウス）"
          value={newName}
          onChange={e=>setNewName(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter")addType();}}
        />
        <select style={{...S.formInput,width:120}} value={newCategory} onChange={e=>setNewCategory(e.target.value as "individual"|"corporate")}>
          <option value="individual">個人系</option>
          <option value="corporate">法人系</option>
        </select>
        <button
          style={{padding:"8px 16px",borderRadius:6,border:"none",background:newName.trim()?"#5A57A6":"#C6C6C8",color:newName.trim()?"#fff":"#5E6367",cursor:newName.trim()?"pointer":"default",fontSize:13,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",whiteSpace:"nowrap"}}
          onClick={addType} disabled={!newName.trim()}>
          ＋ 追加
        </button>
      </div>

      {/* 種別一覧 */}
      {counterpartyTypes.length===0 ? (
        <div style={{color:"#5E6367",fontSize:13,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",padding:"20px 0",textAlign:"center"}}>種別がまだありません</div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:0}}>
          {counterpartyTypes.map((t,idx)=>{
            const cnt = counterparties.filter(c=>c.type_id===t.id).length;
            const isEditing = editingId===t.id;
            return (
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 0",borderBottom:"1px solid #C6C6C8",flexWrap:"wrap"}}>
                {/* 並び替えボタン */}
                <div style={{display:"flex",flexDirection:"column",gap:1,flexShrink:0}}>
                  <button style={{background:"none",border:"none",color:"#5E6367",cursor:idx===0?"default":"pointer",fontSize:10,padding:"1px 4px",lineHeight:1}}
                    onClick={()=>moveType(t.id,-1)} disabled={idx===0}>▲</button>
                  <button style={{background:"none",border:"none",color:"#5E6367",cursor:idx===counterpartyTypes.length-1?"default":"pointer",fontSize:10,padding:"1px 4px",lineHeight:1}}
                    onClick={()=>moveType(t.id,1)} disabled={idx===counterpartyTypes.length-1}>▼</button>
                </div>
                {/* 種別名・カテゴリ */}
                {isEditing ? (
                  <>
                    <input
                      style={{...S.formInput,flex:1,minWidth:100,height:30,padding:"4px 10px"}}
                      value={editingName}
                      onChange={e=>setEditingName(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter")saveEdit();if(e.key==="Escape"){setEditingId(null);}}}
                      autoFocus
                    />
                    <select style={{...S.formInput,width:100,height:30,padding:"4px 8px"}} value={editingCategory} onChange={e=>setEditingCategory(e.target.value as "individual"|"corporate")}>
                      <option value="individual">個人系</option>
                      <option value="corporate">法人系</option>
                    </select>
                  </>
                ) : (
                  <div style={{flex:1,minWidth:0}}>
                    <span style={{fontSize:14,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",color:"#1a1919"}}>{t.name}</span>
                    <span style={{fontSize:11,color:"#5A57A6",border:"1px solid #5A57A644",borderRadius:3,padding:"0 4px",lineHeight:"16px",marginLeft:8}}>
                      {t.category==="individual"?"個人系":"法人系"}
                    </span>
                    <span style={{fontSize:12,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginLeft:8}}>{cnt}件</span>
                  </div>
                )}
                {/* 操作ボタン */}
                {isEditing ? (
                  <>
                    <button style={{background:"none",border:"none",color:"#22c55e",cursor:"pointer",fontSize:12,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}
                      onClick={saveEdit}>保存</button>
                    <button style={{background:"none",border:"none",color:"#5E6367",cursor:"pointer",fontSize:12,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}
                      onClick={()=>setEditingId(null)}>取消</button>
                  </>
                ) : (
                  <>
                    <button style={{background:"none",border:"none",color:"#5A57A6",cursor:"pointer",fontSize:12,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}
                      onClick={()=>startEdit(t)}>編集</button>
                    <button style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:12,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}
                      onClick={()=>setConfirmDeleteId(t.id)}>削除</button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 作家登録・編集フォーム ────────────────────────────────
function ArtistForm({ artists, artworkGroups=[], editId, onSave, nextId, onNextId, onDone, isMobile=false }) {
  const existing = editId ? artists.find(a=>a.id===editId) : null;
  const [form, setForm] = useState({
    name:      existing?.name      ?? "",
    name_kana: existing?.name_kana ?? "",
    group_id:  existing?.group_id  ?? null,
  });

  const save = () => {
    if (!form.name || !form.name_kana) return;
    if (editId) {
      onSave(artists.map(a=>a.id===editId?{...a,...form}:a));
    } else {
      const id = nextId;
      const artist_id = String(id).padStart(4,"0");
      onSave([...artists,{id,artist_id,name:form.name,name_kana:form.name_kana,group_id:form.group_id}]);
      onNextId(id+1);
    }
    onDone();
  };

  return (
    <div style={{maxWidth:480}}>
      <div style={{...S.formGrid,...(isMobile?{gridTemplateColumns:"1fr"}:{})}}>
        <Field label="作家名" required>
          <input style={S.formInput} placeholder="例：田中 誠" value={form.name}
            onChange={e=>setForm(p=>({...p,name:normalizeSpaces(e.target.value)}))} autoFocus/>
        </Field>
        <Field label="フリガナ" required>
          <input style={S.formInput} placeholder="カタカナで入力" value={form.name_kana}
            onChange={e=>setForm(p=>({...p,name_kana:e.target.value}))}
            onBlur={e=>setForm(p=>({...p,name_kana:sanitizeKana(e.target.value)}))}/>
        </Field>
        <Field label="グループ" fullWidth>
          <select
            style={{...S.formInput,cursor:"pointer"}}
            value={form.group_id ?? ""}
            onChange={e=>setForm(p=>({...p,group_id:e.target.value===""?null:Number(e.target.value)}))}>
            <option value="">未分類（グループなし）</option>
            {artworkGroups.map(g=>(
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </Field>
      </div>
      <div style={{display:"flex",gap:10,marginTop:24}}>
        <button
          style={{...S.submitBtn,marginTop:0,...(!form.name||!form.name_kana?S.submitDisabled:{})}}
          onClick={save} disabled={!form.name||!form.name_kana}>
          {editId ? "保存する" : "登録する"}
        </button>
        <button
          style={{...S.submitBtn,marginTop:0,background:"#C6C6C8",color:"#5E6367"}}
          onClick={onDone}>キャンセル</button>
      </div>
    </div>
  );
}

// ─── 作家選択コンポーネント ───────────────────────────────
function ArtistSelect({ value, artistId, artists, onChange, onQuickRegister }) {
  const [open,      setOpen]      = useState(false);
  const [q,         setQ]         = useState("");
  const [showQuick, setShowQuick] = useState(false);
  const [quickForm, setQuickForm] = useState({ name:"", name_kana:"" });

  const [cursor, setCursor] = useState(-1);
  const filtered = [...artists]
    .sort((a,b)=>a.name_kana.localeCompare(b.name_kana,"ja"))
    .filter(a=>{
      const nq = hiraToKata(q).toLowerCase().replace(/[\s\u3000]+/g,"");
      return !nq||[a.name,a.name_kana].some(s=>(s||"").toLowerCase().replace(/[\s\u3000]+/g,"").includes(nq));
    });

  const canRegister = quickForm.name.trim() && quickForm.name_kana.trim();
  const selectArtist = (a) => { onChange(a.name,a.artist_id,a.name_kana); setOpen(false); setQ(""); setCursor(-1); };
  const handleKey = (e) => {
    if (!open) { if(e.key==="ArrowDown"||e.key==="Enter") setOpen(true); return; }
    if (e.key==="ArrowDown") { e.preventDefault(); setCursor(c=>Math.min(c+1,filtered.length-1)); }
    else if (e.key==="ArrowUp") { e.preventDefault(); setCursor(c=>Math.max(c-1,0)); }
    else if (e.key==="Enter") { if(cursor>=0&&filtered[cursor]) selectArtist(filtered[cursor]); }
    else if (e.key==="Escape") { setOpen(false); setCursor(-1); }
  };

  const handleQuickRegister = () => {
    if (!canRegister) return;
    onQuickRegister(quickForm, (newArtist) => {
      onChange(newArtist.name, newArtist.artist_id, newArtist.name_kana);
      setOpen(false);
      setShowQuick(false);
      setQ("");
      setQuickForm({ name:"", name_kana:"" });
    });
  };

  return (
    <div style={{position:"relative"}}>
      <div style={{position:"relative"}}>
        <input style={{...S.formInput,paddingRight:32}} placeholder="作家名を選択または入力"
          value={value}
          onChange={e=>{onChange(e.target.value,null,"");setCursor(-1);}}
          onFocus={()=>setOpen(true)}
          onKeyDown={handleKey}/>
        <button type="button" style={{position:"absolute",right:0,top:0,bottom:0,width:32,background:"transparent",border:"none",cursor:"pointer",color:"#5A57A6",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={()=>setOpen(o=>!o)}>▾</button>
      </div>
      {artistId&&<div style={{fontSize:12,color:"#5A57A6",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginTop:2}}>✓ 作家ID：{artistId}</div>}
      {open&&(
        <div style={S.cpDropdown}>
          {!showQuick ? (<>
            <input style={{...S.formInput,margin:"8px 8px 4px",width:"calc(100% - 16px)",fontSize:12,boxSizing:"border-box"}}
              placeholder="絞り込み（フリガナ可）…" value={q} onChange={e=>{setQ(e.target.value);setCursor(-1);}} onKeyDown={handleKey} autoFocus/>
            <div style={{maxHeight:200,overflowY:"auto"}}>
              {filtered.map((a,i)=>(
                <div key={a.id} style={{...S.cpDropdownItem,...(cursor===i?{background:"#efeeeb"}:{})}}
                  onClick={()=>selectArtist(a)}
                  onMouseEnter={()=>setCursor(i)}
                  onMouseLeave={()=>{}}>
                  <span style={{fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",fontSize:12,color:"#1a1919",width:36,flexShrink:0}}>{a.artist_id}</span>
                  <div>
                    <span style={{fontWeight:600}}>{a.name}</span>
                    <span style={{fontSize:12,color:"#5E6367",marginLeft:6,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}>{a.name_kana}</span>
                  </div>
                </div>
              ))}
              {filtered.length===0&&<div style={{padding:"10px 12px",fontSize:12,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}>見つかりません</div>}
            </div>
            {onQuickRegister && (
              <button style={{...S.cpDropdownClose,color:"#5A57A6",borderTop:"1px solid #C6C6C8"}}
                onClick={()=>{setShowQuick(true);setQuickForm({name:q,name_kana:""});}}>
                ＋ 新規作家として登録
              </button>
            )}
            <button style={S.cpDropdownClose} onClick={()=>{setOpen(false);setQ("");}}>閉じる</button>
          </>) : (<>
            <div style={{padding:"10px 12px 6px",fontSize:12,color:"#5A57A6",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",letterSpacing:"0.05em"}}>新規作家登録</div>
            <div style={{padding:"0 10px 8px",display:"flex",flexDirection:"column",gap:8}}>
              <input style={{...S.formInput,fontSize:12}} placeholder="作家名 *（必須）"
                value={quickForm.name} onChange={e=>setQuickForm(p=>({...p,name:normalizeSpaces(e.target.value)}))}/>
              <input style={{...S.formInput,fontSize:12}} placeholder="カタカナで入力"
                value={quickForm.name_kana}
                onChange={e=>setQuickForm(p=>({...p,name_kana:e.target.value}))}
                onBlur={e=>setQuickForm(p=>({...p,name_kana:sanitizeKana(e.target.value)}))}/>
              <div style={{display:"flex",gap:6}}>
                <button
                  style={{...S.submitBtn,marginTop:0,padding:"7px 14px",fontSize:12,flex:1,...(!canRegister?S.submitDisabled:{})}}
                  onClick={handleQuickRegister}
                  disabled={!canRegister}>登録</button>
                <button style={{...S.cpDropdownClose,border:"1px solid #C6C6C8",borderRadius:8,padding:"7px 14px",width:"auto"}}
                  onClick={()=>setShowQuick(false)}>戻る</button>
              </div>
            </div>
          </>)}
        </div>
      )}
    </div>
  );
}


// ─── 売上登録フォーム ─────────────────────────────────────
function SaleForm({ artworks, counterparties, artists=[], artworkGroups=[], taxSettings, onSave, isMobile=false }) {
  const fmt   = (n) => n != null ? `¥${Number(n).toLocaleString()}` : "—";
  const toDay = () => new Date().toISOString().slice(0,10);
  const TAX_RATE = getTaxRate(new Date().toISOString().slice(0,10), taxSettings?.rates||[]);

  const [soldDate,      setSoldDate]      = useState(toDay());
  const [buyerName,     setBuyerName]     = useState("");
  const [buyerId,       setBuyerId]       = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [artSearch,     setArtSearch]     = useState("");
  const [artTab,        setArtTab]        = useState("ALL");
  const [cpOpen,        setCpOpen]        = useState(false);
  const [cpQ,           setCpQ]           = useState("");

  const allInStock = artworks
    .filter(a => a.status === "in_stock" || a.status === "consigned")
    .sort((a,b) => (a.artist_kana||"").localeCompare(b.artist_kana||"","ja"));

  const existingGroupIds = new Set(allInStock.map(a=>{ const art=artists.find(ar=>ar.artist_id===a.artist_id); return art?.group_id; }).filter(id=>id!=null));
  const visibleSaleGroups = artworkGroups.filter(g=>existingGroupIds.has(g.id));
  const noGroupInStock = allInStock.filter(a=>{ const art=artists.find(ar=>ar.artist_id===a.artist_id); return art?.group_id==null; });
  const existingKanaKeys2 = new Set(noGroupInStock.map(a=>getKanaRow(a.artist_kana||a.artist)));
  const visibleArtTabs = KANA_ROWS.filter(r=>existingKanaKeys2.has(r.key));

  const available = allInStock.filter(a => {
    let matchTab = false;
    if (artTab === "ALL") {
      matchTab = true;
    } else if (artTab.startsWith("G:")) {
      const gid = Number(artTab.slice(2));
      const art = artists.find(ar=>ar.artist_id===a.artist_id);
      matchTab = art?.group_id === gid;
    } else {
      const art = artists.find(ar=>ar.artist_id===a.artist_id);
      matchTab = art?.group_id==null && getKanaRow(a.artist_kana||a.artist)===artTab;
    }
    const q           = artSearch.toLowerCase();
    const matchSearch = !q || [a.title, a.artist, a.artwork_id]
      .some(s => (s||"").toLowerCase().includes(q));
    return matchTab && matchSearch;
  });

  const filteredCps = counterparties.filter(c =>
    !cpQ || [c.name,c.company].some(s=>(s||"").toLowerCase().includes(cpQ.toLowerCase()))
  );
  const cpDisplayName = (cp) => cp ? (cp.name || cp.company || "—") : "—";

  const isSelected = (id) => selectedItems.some(i => i.artwork_id === id);

  const calcTax = (price, rate) => {
    const p = Number(price)||0;
    const rnd = roundFn(taxSettings?.rounding||"floor");
    return rnd(p - p / (1 + rate));
  };

  const toggleItem = (a) => {
    if (isSelected(a.artwork_id)) {
      setSelectedItems(p => p.filter(i => i.artwork_id !== a.artwork_id));
    } else {
      const price = a.announce_price || 0;
      setSelectedItems(p => [...p, { artwork_id: a.artwork_id, price, tax: calcTax(price, TAX_RATE), memo: "" }]);
    }
  };

  const updateItem = (artwork_id, key, val) => {
    setSelectedItems(p => p.map(i => {
      if (i.artwork_id !== artwork_id) return i;
      const updated = { ...i, [key]: val };
      if (key === "price") updated.tax = calcTax(Number(val)||0, TAX_RATE);
      return updated;
    }));
  };

  const totalPrice = selectedItems.reduce((s,i) => s + (Number(i.price)||0), 0);
  const totalTax   = selectedItems.reduce((s,i) => s + (Number(i.tax)||0), 0);
  const totalExcl  = totalPrice - totalTax;
  const canSave    = selectedItems.length > 0 && buyerName && isRealDate(soldDate)
    && selectedItems.every(i => i.price !== "" && i.price != null && Number(i.price) > 0);

  const handleSave = () => {
    if (!canSave) return;
    onSave(selectedItems.map(i => ({
      artwork_id: i.artwork_id,
      sold_price: Number(i.price),
      buyer_name: buyerName,
      buyer_id:   buyerId,
      sold_date:  soldDate,
      memo: i.memo || "",
    })));
  };

  return (
    <div style={{width:"100%", boxSizing:"border-box"}}>

      {/* ── STEP 1: 売上情報 ── */}
      <div style={SF.section}>
        <div style={SF.sectionTitle}>① 売上情報</div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{width:"100%"}}>
            <label style={SF.label}>売上日 <span style={SF.required}>*</span></label>
            <SplitDateInput value={soldDate} onChange={(val)=>setSoldDate(val)}/>
          </div>
          <div>
            <label style={SF.label}>売上先 <span style={SF.required}>*</span></label>
            <div style={{position:"relative",marginTop:6}}>
              <input style={{...S.formInput,paddingRight:32}} placeholder="売上先を選択または入力"
                value={buyerName} onChange={e=>{setBuyerName(e.target.value);setBuyerId(null);}}
                onFocus={()=>setCpOpen(true)}/>
              <button type="button" style={{position:"absolute",right:0,top:0,bottom:0,width:32,background:"transparent",border:"none",cursor:"pointer",color:"#5A57A6",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}
                onClick={()=>setCpOpen(o=>!o)}>▾</button>
              {buyerId&&<div style={{fontSize:12,color:"#5A57A6",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginTop:4}}>✓ 取引先DBと連携済み</div>}
              {cpOpen&&(
                <div style={S.cpDropdown}>
                  <input style={{...S.formInput,margin:"8px 8px 4px",width:"calc(100% - 16px)",fontSize:12,boxSizing:"border-box"}}
                    placeholder="絞り込み…" value={cpQ} onChange={e=>setCpQ(e.target.value)} autoFocus/>
                  <div style={{maxHeight:160,overflowY:"auto"}}>
                    {filteredCps.map(c=>(
                      <div key={c.id} style={S.cpDropdownItem}
                        onClick={()=>{setBuyerName(cpDisplayName(c));setBuyerId(c.cp_id);setCpOpen(false);setCpQ("");}}
                        onMouseEnter={e=>e.currentTarget.style.background="#efeeeb"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <span style={{fontWeight:600}}>{cpDisplayName(c)}</span>
                      </div>
                    ))}
                  </div>
                  <button style={S.cpDropdownClose} onClick={()=>{setCpOpen(false);setCpQ("");}}>閉じる</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── STEP 2: 作品選択 ── */}
      <div style={SF.section}>
        <div style={SF.sectionTitle}>② 作品を選択</div>
        <input style={{...S.formInput,width:"100%",boxSizing:"border-box",marginBottom:10}}
          placeholder="作品名・作家名・作品IDで検索…"
          value={artSearch} onChange={e=>{ setArtSearch(e.target.value); setArtTab("ALL"); }}/>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10,alignItems:"center"}}>
          <button style={{...IS.tab,...(artTab==="ALL"?IS.tabActive:{})}}
            onClick={e=>{ setArtTab("ALL"); e.currentTarget.blur(); }}
            onMouseEnter={e=>{ if(artTab!=="ALL"){ e.currentTarget.style.background="#efeeeb"; e.currentTarget.style.boxShadow="0 0 0 1px #efeeeb"; } }}
            onMouseLeave={e=>{ if(artTab!=="ALL"){ e.currentTarget.style.background="#F9F9F7"; e.currentTarget.style.boxShadow="0 0 0 1px #C6C6C8"; } }}>
            すべて <span style={IS.tabCount}>{allInStock.length}</span>
          </button>
          {visibleSaleGroups.length>0&&(
            <>
              <span style={{width:1,height:18,background:"#C6C6C8",flexShrink:0,margin:"0 2px"}}/>
              {visibleSaleGroups.map(g=>{
                const key=`G:${g.id}`;
                const cnt=allInStock.filter(a=>{const art=artists.find(ar=>ar.artist_id===a.artist_id);return art?.group_id===g.id;}).length;
                return (
                  <button key={key} style={{...IS.tab,...(artTab===key?IS.tabActive:{}),...(artTab===key?{boxShadow:"0 0 0 1px #081319",color:"#fff"}:{})}}
                    onClick={e=>{ setArtTab(key); setArtSearch(""); e.currentTarget.blur(); }}
                    onMouseEnter={e=>{ if(artTab!==key){ e.currentTarget.style.background="#efeeeb"; e.currentTarget.style.boxShadow="0 0 0 1px #efeeeb"; } }}
                    onMouseLeave={e=>{ if(artTab!==key){ e.currentTarget.style.background="#F9F9F7"; e.currentTarget.style.boxShadow="0 0 0 1px #C6C6C8"; } }}>
                    {g.name} <span style={IS.tabCount}>{cnt}</span>
                  </button>
                );
              })}
            </>
          )}
          {visibleArtTabs.length>0&&(
            <>
              <span style={{width:1,height:18,background:"#C6C6C8",flexShrink:0,margin:"0 2px"}}/>
              {visibleArtTabs.map(row=>{
                const cnt=noGroupInStock.filter(a=>getKanaRow(a.artist_kana||a.artist)===row.key).length;
                return (
                  <button key={row.key} style={{...IS.tab,...(artTab===row.key?IS.tabActive:{})}}
                    onClick={e=>{ setArtTab(row.key); setArtSearch(""); e.currentTarget.blur(); }}
                    onMouseEnter={e=>{ if(artTab!==row.key){ e.currentTarget.style.background="#efeeeb"; e.currentTarget.style.boxShadow="0 0 0 1px #efeeeb"; } }}
                    onMouseLeave={e=>{ if(artTab!==row.key){ e.currentTarget.style.background="#F9F9F7"; e.currentTarget.style.boxShadow="0 0 0 1px #C6C6C8"; } }}>
                    {row.label} <span style={IS.tabCount}>{cnt}</span>
                  </button>
                );
              })}
            </>
          )}
        </div>
        <div style={{fontSize:12,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginBottom:8,textAlign:"right"}}>{available.length}件</div>

        <div style={{border:"1px solid #C6C6C8",borderRadius:8,overflow:"hidden",maxHeight:320,overflowY:"auto"}}>
          {available.map((a,i) => {
            const sel = isSelected(a.artwork_id);
            return (
              <div key={a.artwork_id}
                style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",cursor:"pointer",
                  background: sel?"#EAF2FE":i%2===0?"transparent":"#F9F9F7",
                  outline: sel?"1px solid #38bdf844":"none", transition:"background 0.1s"}}
                onClick={()=>toggleItem(a)}
                onMouseEnter={e=>{ if(!sel) e.currentTarget.style.background="#efeeeb"; }}
                onMouseLeave={e=>{ if(!sel) e.currentTarget.style.background=i%2===0?"transparent":"#F9F9F7"; }}>
                <div style={{width:20,height:20,borderRadius:4,flexShrink:0,
                  boxShadow:sel?"none":"0 0 0 1px #C6C6C8",
                  background:sel?"#38bdf8":"transparent",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff"}}>
                  {sel?"✓":""}
                </div>
                <div style={{flex:1,minWidth:0,display:"flex",alignItems:"center",gap:10,overflow:"hidden"}}>
                  <span style={{fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",fontSize:12,color:"#1a1919",fontWeight:700,flexShrink:0,width:70}}>{a.artwork_id}</span>
                  <span style={{fontSize:12,color:"#5E6367",flexShrink:0,whiteSpace:"nowrap"}}>{a.artist}</span>
                  <span style={{fontWeight:600,fontSize:14,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1}}>{a.title}</span>
                  <span style={{color:"#60a5fa",fontSize:13,flexShrink:0,whiteSpace:"nowrap"}}>¥{Number(a.purchase_price).toLocaleString()}</span>
                </div>
                {!sel&&<span style={{...S.statusBadge,background:STATUSES[a.status]?.color+"22",color:STATUSES[a.status]?.color,border:`1px solid ${STATUSES[a.status]?.color}44`,flexShrink:0,fontSize:12}}>
                  {STATUSES[a.status]?.label}
                </span>}
              </div>
            );
          })}
          {available.length===0&&<div style={{color:"#5E6367",fontSize:13,padding:"24px",textAlign:"center"}}>該当する作品がありません</div>}
        </div>
      </div>

      {/* ── STEP 3: 価格確認・編集 ── */}
      {selectedItems.length > 0 && (
        <div style={SF.section}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={SF.sectionTitle} >③ 価格を確認・編集</div>
            <span style={{fontSize:13,color:"#38bdf8",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}>{selectedItems.length}点選択中</span>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:680}}>
              <thead>
                <tr style={{borderBottom:"2px solid #C6C6C8"}}>
                  {["作品ID","作家","タイトル","売上価格","消費税額","税抜額","メモ",""].map(h=>(
                    <th key={h} style={{padding:"8px 10px",textAlign:h==="売上価格"||h==="消費税額"||h==="税抜額"?"right":"left",fontSize:12,color:"#5E6367",whiteSpace:"nowrap",fontWeight:600}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedItems.map((item,i)=>{
                  const a    = artworks.find(a=>a.artwork_id===item.artwork_id);
                  const excl = (Number(item.price)||0) - (Number(item.tax)||0);
                  return (
                    <tr key={item.artwork_id} style={{borderBottom:"1px solid #C6C6C8",background:i%2===0?"transparent":"#F9F9F7"}}>
                      <td style={{padding:"10px 10px",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",fontSize:12,color:"#1a1919",fontWeight:700,whiteSpace:"nowrap"}}>{a?.artwork_id}</td>
                      <td style={{padding:"10px 10px",fontSize:12,color:"#5E6367",whiteSpace:"nowrap"}}>{a?.artist}</td>
                      <td style={{padding:"10px 10px",fontWeight:600,fontSize:14,whiteSpace:"nowrap",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis"}}>{a?.title}</td>
                      <td style={{padding:"10px 10px",textAlign:"right"}}>
                        <input style={{...S.formInput,padding:"5px 8px",fontSize:14,textAlign:"right",width:110,fontWeight:600}}
                          type="number" value={item.price}
                          onChange={e=>updateItem(item.artwork_id,"price",e.target.value)}/>
                      </td>
                      <td style={{padding:"10px 10px",textAlign:"right"}}>
                        <input style={{...S.formInput,padding:"5px 8px",fontSize:13,textAlign:"right",width:90,color:"#f59e0b"}}
                          type="number" value={item.tax}
                          onChange={e=>updateItem(item.artwork_id,"tax",e.target.value)}/>
                      </td>
                      <td style={{padding:"10px 10px",textAlign:"right",fontSize:13,color:"#5E6367"}}>{fmt(excl)}</td>
                      <td style={{padding:"10px 10px"}}>
                        <input style={{...S.formInput,padding:"5px 8px",fontSize:13,width:140}}
                          placeholder="備考など" value={item.memo||""}
                          onChange={e=>updateItem(item.artwork_id,"memo",e.target.value)}/>
                      </td>
                      <td style={{padding:"10px 10px",textAlign:"center"}}>
                        <button style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:16}}
                          onClick={()=>setSelectedItems(p=>p.filter(i=>i.artwork_id!==item.artwork_id))}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{borderTop:"2px solid #C6C6C8",background:"#FFFFFF"}}>
                  <td colSpan={3} style={{padding:"10px 10px",fontSize:13,color:"#5E6367",fontWeight:600}}>{selectedItems.length}点 合計</td>
                  <td style={{padding:"10px 10px",textAlign:"right",fontSize:16,color:"#22c55e",fontWeight:700}}>{fmt(totalPrice)}</td>
                  <td style={{padding:"10px 10px",textAlign:"right",fontSize:13,color:"#f59e0b"}}>{fmt(totalTax)}</td>
                  <td style={{padding:"10px 10px",textAlign:"right",fontSize:13,color:"#5E6367"}}>{fmt(totalExcl)}</td>
                  <td></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <button style={{...S.submitBtn,width:"100%",padding:"14px",...(!canSave?S.submitDisabled:{})}}
        onClick={handleSave} disabled={!canSave}>
        売上を登録する（{selectedItems.length}点）
      </button>
    </div>
  );
}

const SF = {
  section:      { background:"#F9F9F7", border:"1px solid #C6C6C8", borderRadius:12, padding:"20px", marginBottom:16, boxSizing:"border-box", width:"100%" },
  sectionTitle: { fontSize:13, fontWeight:700, color:"#5A57A6", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", letterSpacing:"0.05em", marginBottom:14 },
  row:          { display:"flex", gap:16, flexWrap:"wrap" },
  field:        { display:"flex", flexDirection:"column", gap:6, flex:1, minWidth:140 },
  label:        { fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  required:     { color:"#f87171" },
};


// ─── 画廊情報設定 ─────────────────────────────────────────
function GallerySettings({ galleryInfo, onSave, isMobile=false }) {
  const [form, setForm] = useState({ ...galleryInfo });
  const setF = (k,v) => setForm(p=>({...p,[k]:v}));
  return (
    <div style={{maxWidth:600}}>
      <div style={{...S.formGrid,...(isMobile?{gridTemplateColumns:"1fr"}:{})}}>
        <Field label="画廊名" fullWidth><input style={S.formInput} placeholder="例：ギャラリー〇〇" value={form.name} onChange={e=>setF("name",e.target.value)}/></Field>
        <Field label="郵便番号"><input style={S.formInput} placeholder="例：100-0001" value={form.zip} onChange={e=>setF("zip",e.target.value)}/></Field>
        <Field label="住所"><input style={S.formInput} placeholder="例：東京都千代田区〇〇1-1-1" value={form.address} onChange={e=>setF("address",e.target.value)}/></Field>
        <Field label="建物名以下" fullWidth><input style={S.formInput} placeholder="例：〇〇ビル3F" value={form.building} onChange={e=>setF("building",e.target.value)}/></Field>
        <Field label="電話番号"><input style={S.formInput} placeholder="例：03-1234-5678" value={form.tel} onChange={e=>setF("tel",e.target.value)}/></Field>
        <Field label="メールアドレス"><input style={S.formInput} placeholder="例：info@gallery.jp" value={form.email} onChange={e=>setF("email",e.target.value)}/></Field>
        <Field label="FAX"><input style={S.formInput} placeholder="例：03-1234-5679" value={form.fax} onChange={e=>setF("fax",e.target.value)}/></Field>
      </div>
      <div style={{...S.formSectionTitle, marginTop:28}}>事業年度</div>
      <div style={{fontSize:12,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginBottom:14,lineHeight:1.6}}>
        日計の「第N期」表示に使用します。開始月と第1期の基準年を設定してください。
      </div>
      <div style={{...S.formGrid,...(isMobile?{gridTemplateColumns:"1fr"}:{})}}>
        <Field label="事業年度 開始月">
          <select style={S.formInput} value={form.fiscalStartMonth||9} onChange={e=>setF("fiscalStartMonth",Number(e.target.value))}>
            {[...Array(12)].map((_,i)=>(
              <option key={i+1} value={i+1}>{i+1}月</option>
            ))}
          </select>
        </Field>
        <Field label="第1期の開始年">
          <input style={S.formInput} type="number" placeholder="例：1970"
            value={form.fiscalOriginYear||1970}
            onChange={e=>setF("fiscalOriginYear",Number(e.target.value))}/>
        </Field>
      </div>
      <button style={S.submitBtn} onClick={()=>onSave(form)}>保存する</button>
    </div>
  );
}

// ─── 社員設定 ─────────────────────────────────────────────
function StaffSettings({ staffList, onSave, nextId, onNextId }) {
  const [newName, setNewName] = useState("");
  const add = () => {
    if (!newName.trim()) return;
    onSave([...staffList, { id: nextId, name: newName.trim() }]);
    onNextId(nextId + 1);
    setNewName("");
  };
  const remove = (id) => onSave(staffList.filter(s => s.id !== id));
  return (
    <div style={{maxWidth:400}}>
      <div style={{display:"flex",flexDirection:"column",gap:0,marginBottom:20}}>
        {staffList.map(s => (
          <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:"1px solid #C6C6C8"}}>
            <span style={{fontSize:14,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}>{s.name}</span>
            <button style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:12,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}
              onClick={()=>remove(s.id)}>削除</button>
          </div>
        ))}
        {staffList.length===0&&<div style={{color:"#5E6367",fontSize:13,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",padding:"20px 0"}}>社員が登録されていません</div>}
      </div>
      <div style={{display:"flex",gap:8}}>
        <input style={{...S.formInput,flex:1}} placeholder="氏名を入力" value={newName} onChange={e=>setNewName(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&add()}/>
        <button style={{...S.submitBtn,marginTop:0,padding:"9px 20px"}} onClick={add}>追加</button>
      </div>
    </div>
  );
}

// ─── 消費税設定 ───────────────────────────────────────────
function TaxSettings({ taxSettings, onSave, isMobile=false }) {
  const [rates, setRates] = useState(
    [...(taxSettings.rates||[])].sort((a,b)=>a.from.localeCompare(b.from))
  );
  const [transitional, setTransitional] = useState([...(taxSettings.transitionalRates||[])]);
  const [rounding, setRounding] = useState(taxSettings.rounding||"floor");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const toPercent = (r) => {
    if (r === 0) return "0";
    const p = r * 100;
    return p % 1 === 0 ? String(p) : p.toFixed(1);
  };

  // ── 通常税率の操作 ──
  const updateRate = (idx, field, val) => {
    const next = [...rates];
    if (field === "from") next[idx] = { ...next[idx], from: val };
    else { const n = parseFloat(val); next[idx] = { ...next[idx], rate: isNaN(n) ? 0 : n / 100 }; }
    setRates(next); setSaved(false); setSaveError("");
  };
  const addRate = () => { setRates([...rates, { from: "", rate: 0.10 }]); setSaved(false); setSaveError(""); };
  const deleteRate = (idx) => { setRates(rates.filter((_,i)=>i!==idx)); setSaved(false); setSaveError(""); };

  // ── 経過措置の操作 ──
  const updateTR = (idx, field, val) => {
    const next = [...transitional];
    if (field === "rate") { const n = parseFloat(val); next[idx] = { ...next[idx], rate: isNaN(n) ? 0 : n / 100 }; }
    else if (field === "to") next[idx] = { ...next[idx], to: val === "" ? null : val };
    else next[idx] = { ...next[idx], from: val };
    setTransitional(next); setSaved(false); setSaveError("");
  };
  const addTR = () => { setTransitional([...transitional, { from: "", to: null, rate: 0.80 }]); setSaved(false); setSaveError(""); };
  const deleteTR = (idx) => { setTransitional(transitional.filter((_,i)=>i!==idx)); setSaved(false); setSaveError(""); };

  const handleSave = () => {
    const rateInvalid = rates.some(r => !isRealDate(r.from));
    const trInvalid = transitional.some(t => !isRealDate(t.from) || (t.to && !isRealDate(t.to)));
    if (rateInvalid || trInvalid) {
      setSaveError("存在しない日付が含まれています。赤枠の項目を確認してください。");
      return;
    }
    const sortedRates = [...rates].sort((a,b)=>a.from.localeCompare(b.from));
    onSave({ rates: sortedRates, transitionalRates: transitional, rounding });
    setRates(sortedRates); setSaved(true); setSaveError("");
    setTimeout(()=>setSaved(false), 2500);
  };

  // ── 通常税率の適用期間ラベル ──
  const sorted = [...rates].sort((a,b)=>a.from.localeCompare(b.from));
  const indexMap = sorted.map(sr=>rates.indexOf(sr));
  const rangeLabel = (si) => {
    const next = sorted[si+1];
    if (!sorted[si]?.from) return "—";
    if (!next?.from) return "以降（現在も適用中）";
    const d = new Date(next.from); d.setDate(d.getDate()-1);
    return `〜 ${d.toISOString().slice(0,10)}`;
  };

  // ── 共通スタイル ──
  const block   = { background:"#FFFFFF", border:"1px solid #C6C6C8", borderRadius:8, padding: isMobile ? "16px" : "20px 24px", marginBottom:24 };
  const ttl     = { fontSize:13, fontWeight:700, color:"#5A57A6", marginBottom:4 };
  const desc    = { fontSize:12, color:"#5E6367", marginBottom:16, lineHeight:1.6 };
  const inp     = { ...S.formInput, padding:"6px 10px", fontSize:13 };
  const delBtn  = { background:"transparent", border:"1px solid #F6D9D9", borderRadius:4, color:"#f87171", fontSize:12, padding:"4px 10px", cursor:"pointer", whiteSpace:"nowrap" as const, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" };
  const addBtn  = { background:"transparent", border:"1px solid #C6C6C8", borderRadius:6, color:"#5A57A6", fontSize:12, padding:"6px 14px", cursor:"pointer", marginTop:12, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" };

  // ── PC用テーブルスタイル ──
  const th = { fontSize:11, color:"#5E6367", fontWeight:400, textAlign:"left" as const, paddingBottom:8, borderBottom:"1px solid #C6C6C8" };
  const td = { paddingTop:8, paddingBottom:8, borderBottom:"1px solid #C6C6C8", verticalAlign:"middle" as const };

  // ── スマホ用：1行カードスタイル ──
  const mCard = { background:"#FFFFFF", border:"1px solid #C6C6C8", borderRadius:8, padding:"12px", marginBottom:8, display:"flex", flexDirection:"column" as const, gap:10 };
  const mRow  = { display:"flex", alignItems:"center", gap:8 };
  const mLab  = { fontSize:11, color:"#5E6367", width:68, flexShrink:0, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" };

  return (
    <div style={{ maxWidth: isMobile ? "100%" : 720 }}>

      {/* ── 通常税率ブロック ── */}
      <div style={block}>
        <div style={ttl}>通常消費税率（売上・仕入共通）</div>
        <div style={desc}>
          開始日以降、次の行の開始日の前日まで適用されます。{!isMobile && <br/>}保存時に開始日の昇順で自動整列されます。
        </div>

        {isMobile ? (
          /* スマホ：縦積みカード */
          <div>
            {indexMap.map((origIdx, si) => {
              const r = rates[origIdx];
              return (
                <div key={origIdx} style={mCard}>
                  <div style={mRow}>
                    <span style={mLab}>適用開始日</span>
                    <SplitDateInput value={r.from} onChange={(val)=>updateRate(origIdx,"from",val)} compact/>
                  </div>
                  <div style={mRow}>
                    <span style={mLab}>税率（%）</span>
                    <input type="number" value={toPercent(r.rate)} onChange={e=>updateRate(origIdx,"rate",e.target.value)}
                      style={{...inp, width:80}} step="0.1" min="0" />
                  </div>
                  <div style={{...mRow, justifyContent:"space-between"}}>
                    <span style={{fontSize:11, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}>{rangeLabel(si)}</span>
                    <button style={delBtn} onClick={()=>deleteRate(origIdx)}>削除</button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* PC：テーブル */
          <table style={{width:"100%", borderCollapse:"collapse"}}>
            <thead><tr>
              <th style={{...th, width:160}}>適用開始日</th>
              <th style={{...th, width:90, paddingLeft:8}}>税率（%）</th>
              <th style={{...th, paddingLeft:16}}>適用期間</th>
              <th style={{...th, width:56}}></th>
            </tr></thead>
            <tbody>
              {indexMap.map((origIdx, si) => {
                const r = rates[origIdx];
                return (
                  <tr key={origIdx}>
                    <td style={{...td, paddingRight:12}}>
                      <SplitDateInput value={r.from} onChange={(val)=>updateRate(origIdx,"from",val)} compact/>
                    </td>
                    <td style={{...td, paddingRight:12, paddingLeft:8}}>
                      <input type="number" value={toPercent(r.rate)} onChange={e=>updateRate(origIdx,"rate",e.target.value)}
                        style={{...inp, width:72}} step="0.1" min="0" />
                    </td>
                    <td style={{...td, fontSize:12, color:"#5E6367", paddingLeft:16}}>{rangeLabel(si)}</td>
                    <td style={{...td, textAlign:"right"}}>
                      <button style={delBtn} onClick={()=>deleteRate(origIdx)}>削除</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <button style={addBtn} onClick={addRate}>＋ 行を追加</button>
      </div>

      {/* ── インボイス経過措置ブロック ── */}
      <div style={block}>
        <div style={ttl}>インボイス未登録事業者からの仕入 — 経過措置</div>
        <div style={desc}>
          インボイス未登録の取引先から仕入れた場合に適用する仕入税額控除割合です。{!isMobile && <br/>}終了日を空欄にすると無期限として扱います。
        </div>

        {isMobile ? (
          /* スマホ：縦積みカード */
          <div>
            {transitional.map((t, idx) => (
              <div key={idx} style={mCard}>
                <div style={mRow}>
                  <span style={mLab}>開始日</span>
                  <SplitDateInput value={t.from} onChange={(val)=>updateTR(idx,"from",val)} compact/>
                </div>
                <div style={mRow}>
                  <span style={mLab}>終了日</span>
                  <SplitDateInput value={t.to??""} onChange={(val)=>updateTR(idx,"to",val)} compact/>
                </div>
                <div style={{...mRow, justifyContent:"space-between"}}>
                  <div style={mRow}>
                    <span style={mLab}>控除割合（%）</span>
                    <input type="number" value={toPercent(t.rate)} onChange={e=>updateTR(idx,"rate",e.target.value)}
                      style={{...inp, width:72}} step="0.1" min="0" max="100" />
                  </div>
                  <button style={delBtn} onClick={()=>deleteTR(idx)}>削除</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* PC：テーブル */
          <table style={{width:"100%", borderCollapse:"collapse"}}>
            <thead><tr>
              <th style={{...th, width:150}}>開始日</th>
              <th style={{...th, width:150, paddingLeft:12}}>終了日</th>
              <th style={{...th, width:110, paddingLeft:12}}>控除割合（%）</th>
              <th style={{...th, width:56}}></th>
            </tr></thead>
            <tbody>
              {transitional.map((t, idx) => (
                <tr key={idx}>
                  <td style={{...td, paddingRight:12}}>
                    <SplitDateInput value={t.from} onChange={(val)=>updateTR(idx,"from",val)} compact/>
                  </td>
                  <td style={{...td, paddingRight:12, paddingLeft:12}}>
                    <SplitDateInput value={t.to??""} onChange={(val)=>updateTR(idx,"to",val)} compact/>
                  </td>
                  <td style={{...td, paddingRight:12, paddingLeft:12}}>
                    <input type="number" value={toPercent(t.rate)} onChange={e=>updateTR(idx,"rate",e.target.value)}
                      style={{...inp, width:80}} step="0.1" min="0" max="100" />
                  </td>
                  <td style={{...td, textAlign:"right"}}>
                    <button style={delBtn} onClick={()=>deleteTR(idx)}>削除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button style={addBtn} onClick={addTR}>＋ 行を追加</button>
      </div>

      {/* ── 端数処理 ── */}
      <div style={{marginTop:24}}>
        <div style={{fontSize:13,fontWeight:600,color:"#1a1919",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginBottom:4}}>消費税の端数処理</div>
        <div style={{fontSize:12,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginBottom:10}}>税込価格から税額を逆算するときの端数処理方法です。</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {[{v:"floor",l:"切り捨て"},{v:"round",l:"四捨五入"},{v:"ceil",l:"切り上げ"}].map(({v,l})=>(
            <button key={v}
              style={{...S.filterBtn,...(rounding===v?S.filterActive:{})}}
              onClick={()=>setRounding(v)}
              onMouseEnter={e=>{ if(rounding!==v){ e.currentTarget.style.background="#efeeeb"; e.currentTarget.style.borderColor="#efeeeb"; } }}
              onMouseLeave={e=>{ if(rounding!==v){ e.currentTarget.style.background="#F9F9F7"; e.currentTarget.style.borderColor="#C6C6C8"; } }}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── 保存ボタン ── */}
      <div style={{display:"flex", alignItems:"center", gap:12, marginTop:20}}>
        <button style={S.submitBtn} onClick={handleSave}>保存する</button>
        {saved && <span style={{fontSize:12, color:"#22c55e", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}>✓ 保存しました</span>}
        {saveError && <span style={{fontSize:12, color:"#f87171", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}>{saveError}</span>}
      </div>
    </div>
  );
}

// ─── 委託一覧 ─────────────────────────────────────────────
function ConsignmentList({ consignments, counterparties, galleryInfo, staffList, artworks, taxSettings, onEdit, onReturn, onSale, onSelectArtwork }) {
  const fmt = (n) => n != null ? `¥${Number(n).toLocaleString()}` : "—";
  const toDay = () => new Date().toISOString().slice(0,10);

  const [expandedId,  setExpandedId]  = useState(null);
  const [returnIds,   setReturnIds]   = useState({});
  // 売上登録ミニフォーム: { artwork_id, price, tax, buyer_name, buyer_id, date }
  const [saleForm,    setSaleForm]    = useState(null);
  const [cpOpen,      setCpOpen]      = useState(false);
  const [cpQ,         setCpQ]         = useState("");

  const TAX_RATE = getTaxRate(new Date().toISOString().slice(0,10), taxSettings?.rates||[]);
  const calcTax  = (p) => { const n=Number(p)||0; const rnd=roundFn(taxSettings?.rounding||"floor"); return rnd(n - n / (1 + TAX_RATE)); };

  const filteredCps = counterparties.filter(c =>
    !cpQ || [c.name,c.company].some(s=>(s||"").toLowerCase().includes(cpQ.toLowerCase()))
  );
  const cpDisplayName = (cp) => cp ? (cp.name || cp.company || "—") : "—";

  const openSaleForm = (item, artwork) => {
    const price = artwork?.announce_price || item.price || 0;
    setSaleForm({
      artwork_id: item.artwork_id,
      price,
      tax: calcTax(price),
      buyer_name: "",
      buyer_id:   null,
      date:       toDay(),
    });
    setCpOpen(false);
    setCpQ("");
  };

  const toggleReturn = (consignment_id, artwork_id) => {
    setReturnIds(p => {
      const cur = p[consignment_id] || [];
      return { ...p, [consignment_id]: cur.includes(artwork_id) ? cur.filter(id=>id!==artwork_id) : [...cur, artwork_id] };
    });
  };

  const handleReturn = (c) => {
    const ids = returnIds[c.id] || [];
    if (ids.length === 0) return;
    onReturn(c.id, ids);
    setReturnIds(p => ({ ...p, [c.id]: [] }));
    setExpandedId(null);
  };

  const handleSale = () => {
    if (!saleForm || !saleForm.buyer_name || !saleForm.price || !isRealDate(saleForm.date)) return;
    onSale({
      artwork_id: saleForm.artwork_id,
      sold_price: Number(saleForm.price),
      buyer_name: saleForm.buyer_name,
      buyer_id:   saleForm.buyer_id,
      sold_date:  saleForm.date,
    });
    setSaleForm(null);
  };

  if (consignments.length === 0) return (
    <div style={{color:"#5E6367",fontSize:13,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",padding:"60px 0",textAlign:"center"}}>委託案件がありません</div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {[...consignments].sort((a,b)=>b.date.localeCompare(a.date)).map(c=>{
        const isExpanded  = expandedId === c.id;
        const selectedIds = returnIds[c.id] || [];
        const activeItems = c.items.filter(item =>
          !item.artwork_id || artworks.find(a=>a.artwork_id===item.artwork_id)?.status==="consigned"
        );
        const returnedCount = c.items.filter(item => {
          const a = item.artwork_id ? artworks.find(ar=>ar.artwork_id===item.artwork_id) : null;
          return a && a.status==="in_stock";
        }).length;
        const soldCount = c.items.filter(item => {
          const a = item.artwork_id ? artworks.find(ar=>ar.artwork_id===item.artwork_id) : null;
          return a && a.status==="sold";
        }).length;

        return (
          <div key={c.id} style={{position:"relative",background:"#FFFFFF",border:"1px solid #C6C6C8",borderRadius:10,padding:"16px"}}>
            <div style={{position:"absolute",top:16,right:16,fontSize:12,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",color:"#5E6367",textAlign:"right",lineHeight:1.6}}>
              <div>#{String(c.id).padStart(4,"0")}</div>
              <div>担当：{c.staff_name||"—"}</div>
            </div>
            {/* ヘッダー */}
            <div style={{marginBottom:10}}>
              <div style={{fontSize:14,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",fontWeight:700,color:"#1a1919",marginBottom:4,letterSpacing:"0.02em",paddingRight:100}}>{c.date}</div>
              <div style={{fontSize:16,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",fontWeight:600,marginBottom:8,paddingRight:100}}>{c.consignee_name}</div>
              <div style={{fontSize:12,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginBottom:10}}>
                委託{activeItems.length}点{returnedCount>0&&`・返却${returnedCount}点`}{soldCount>0&&`・売上${soldCount}点`}
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <button style={{...S.addEventBtn,color:"#1a1919",background:"#EFEFEF",borderColor:"#C6C6C8"}}
                  onClick={()=>onEdit&&onEdit(c.id)}><span className="material-icons" style={{fontSize:14,verticalAlign:"middle",marginRight:4}}>{"\ue3c9"}</span>編集</button>
                <button style={{...S.addEventBtn,color:"#1a1919",background:"#EFEFEF",borderColor:"#C6C6C8"}}
                  onClick={()=>printConsignment(c,galleryInfo,counterparties)}><span className="material-icons" style={{fontSize:14,verticalAlign:"middle",marginRight:4}}>{"\ue8ad"}</span>納品書</button>
                {activeItems.length>0&&(
                  <button style={{...S.addEventBtn,color:"#1a1919",background:"#EFEFEF",borderColor:"#C6C6C8"}}
                    onClick={()=>{ setExpandedId(isExpanded?null:c.id); setSaleForm(null); }}>
                    {isExpanded?"▲ 閉じる":<><span className="material-icons" style={{fontSize:14,verticalAlign:"middle",marginRight:4}}>{"\ue31b"}</span>委託戻り</>}
                  </button>
                )}
              </div>
            </div>

            {/* 作品リスト */}
            <div style={{display:"flex",flexDirection:"column",gap:isExpanded?6:2}}>
              {c.items.map((item,i)=>{
                const artwork    = item.artwork_id ? artworks.find(a=>a.artwork_id===item.artwork_id) : null;
                const isReturned = artwork && artwork.status==="in_stock";
                const isSold     = artwork && artwork.status==="sold";
                const isActive   = !isReturned && !isSold;
                const isChecked  = selectedIds.includes(item.artwork_id);
                const isSaleOpen = saleForm?.artwork_id === item.artwork_id;

                return (
                  <div key={i}>
                    <div style={{display:"flex",alignItems:"center",gap:10,fontSize:13,
                      color:isReturned||isSold?"#5E6367":"#5E6367",
                      padding:isExpanded?"16px 4px":"8px 4px",borderBottom:"1px solid #C6C6C8",
                      cursor:(isExpanded && isActive && item.artwork_id)?"pointer":"default"}}
                      onClick={()=>{ if(isExpanded && isActive && item.artwork_id) toggleReturn(c.id,item.artwork_id); }}>

                      {/* 委託戻りモードのチェックボックス（見た目のみ、操作は行全体で受ける） */}
                      {isExpanded && isActive && item.artwork_id && (
                        <div style={{width:28,height:28,flexShrink:0,
                          display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <div style={{width:18,height:18,borderRadius:4,
                            boxShadow:isChecked?"none":"0 0 0 1px #C6C6C8",
                            background:isChecked?"#1a1919":"transparent",
                            display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff"}}>
                            {isChecked?"✓":""}
                          </div>
                        </div>
                      )}

                      <span
                        style={{flex:1,cursor:(!isExpanded && item.artwork_id)?"pointer":"inherit"}}
                        onClick={()=>{ if(!isExpanded && item.artwork_id && onSelectArtwork) onSelectArtwork(item.artwork_id); }}>
                        {item.artist?`${item.artist}「${item.title}」`:item.title}
                      </span>

                      {/* 状態表示・売上ボタン */}
                      {isReturned && <span style={{fontSize:11,color:"#5E6367",flexShrink:0}}>返却済</span>}
                      {isSold     && <span style={{fontSize:11,color:"#5E6367",flexShrink:0}}>売上済</span>}
                      {isActive   && !isExpanded && (
                        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                          <span style={{color:"#1a1919",fontSize:13}}>{fmt(item.price)}</span>
                          <button
                            style={{...S.addEventBtn,fontSize:11,padding:"3px 10px",color:"#1a1919",background:"#EFEFEF",borderColor:"#C6C6C8"}}
                            onClick={(e)=>{e.stopPropagation();openSaleForm(item,artwork);}}>
                            売上登録
                          </button>
                        </div>
                      )}
                      {isActive && isExpanded && (
                        <span style={{color:"#1a1919",fontSize:13,flexShrink:0}}>{fmt(item.price)}</span>
                      )}
                    </div>

                    {/* 売上登録ミニフォーム */}
                    {isSaleOpen && (
                      <div style={{background:"#FFFFFF",border:"1px solid #C6C6C8",borderRadius:8,padding:"14px",margin:"4px 0 8px"}}>
                        <div style={{fontSize:12,color:"#1a1919",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",fontWeight:600,marginBottom:12}}>
                          売上登録：{item.artist}「{item.title}」
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:10}}>
                          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                            <div style={{flex:1,minWidth:120}}>
                              <div style={{fontSize:11,color:"#5E6367",marginBottom:4,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}>成約価格 (円)</div>
                              <input style={{...S.formInput,fontSize:14,textAlign:"right"}}
                                type="number" value={saleForm.price}
                                onChange={e=>setSaleForm(p=>({...p,price:Number(e.target.value),tax:calcTax(Number(e.target.value))}))}/>
                            </div>
                            <div style={{flex:1,minWidth:100}}>
                              <div style={{fontSize:11,color:"#5E6367",marginBottom:4,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}>消費税額 (円)</div>
                              <input style={{...S.formInput,fontSize:13,textAlign:"right",color:"#1a1919"}}
                                type="number" value={saleForm.tax}
                                onChange={e=>setSaleForm(p=>({...p,tax:Number(e.target.value)}))}/>
                            </div>
                            <div style={{flex:1,minWidth:110}}>
                              <div style={{fontSize:11,color:"#5E6367",marginBottom:4,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}>売上日</div>
                              <SplitDateInput value={saleForm.date} onChange={(val)=>setSaleForm(p=>({...p,date:val}))} compact/>
                            </div>
                          </div>
                          <div>
                            <div style={{fontSize:11,color:"#5E6367",marginBottom:4,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}>売上先 *</div>
                            <div style={{position:"relative"}}>
                              <div style={{display:"flex",gap:6}}>
                                <input style={{...S.formInput,flex:1}} placeholder="売上先を選択または入力"
                                  value={saleForm.buyer_name}
                                  onChange={e=>setSaleForm(p=>({...p,buyer_name:e.target.value,buyer_id:null}))}
                                  onFocus={()=>setCpOpen(true)}/>
                                <button type="button" style={{...S.formInput,width:"auto",padding:"0 10px",cursor:"pointer",flexShrink:0,color:"#5E6367"}}
                                  onClick={()=>setCpOpen(o=>!o)}>▾</button>
                              </div>
                              {saleForm.buyer_id&&<div style={{fontSize:11,color:"#5E6367",marginTop:2}}>✓ 取引先DBと連携済み</div>}
                              {cpOpen&&(
                                <div style={S.cpDropdown}>
                                  <input style={{...S.formInput,margin:"8px 8px 4px",width:"calc(100% - 16px)",fontSize:12,boxSizing:"border-box"}}
                                    placeholder="絞り込み…" value={cpQ} onChange={e=>setCpQ(e.target.value)} autoFocus/>
                                  <div style={{maxHeight:140,overflowY:"auto"}}>
                                    {filteredCps.map(cp=>(
                                      <div key={cp.id} style={S.cpDropdownItem}
                                        onClick={()=>{setSaleForm(p=>({...p,buyer_name:cpDisplayName(cp),buyer_id:cp.cp_id}));setCpOpen(false);setCpQ("");}}
                                        onMouseEnter={e=>e.currentTarget.style.background="#efeeeb"}
                                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                                        <span style={{fontWeight:600}}>{cpDisplayName(cp)}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <button style={S.cpDropdownClose} onClick={()=>{setCpOpen(false);setCpQ("");}}>閉じる</button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
                            <button style={{...S.submitBtn,marginTop:0,padding:"7px 16px",fontSize:12,background:"#EFEFEF",color:"#5E6367",border:"1px solid #C6C6C8"}}
                              onClick={()=>setSaleForm(null)}>キャンセル</button>
                            <button style={{...S.submitBtn,marginTop:0,padding:"7px 16px",fontSize:12,
                              ...(!saleForm.buyer_name||!saleForm.price||!isRealDate(saleForm.date)?S.submitDisabled:{background:"#1a1919",color:"#fff"})}}
                              disabled={!saleForm.buyer_name||!saleForm.price||!isRealDate(saleForm.date)}
                              onClick={handleSale}>登録する</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 備考 */}
            {c.note && (
              <div style={{marginTop:10,padding:"8px 10px",background:"#FFFFFF",borderRadius:6,
                fontSize:12,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",lineHeight:"1.6",
                borderLeft:"2px solid #C6C6C8",whiteSpace:"pre-wrap"}}>
                {c.note}
              </div>
            )}

            {/* 委託戻り実行ボタン */}
            {isExpanded&&(
              <div style={{marginTop:12,display:"flex",justifyContent:"flex-end",gap:8}}>
                <button style={{...S.submitBtn,marginTop:0,padding:"8px 20px",fontSize:13,
                  background:"#EFEFEF",color:"#5E6367",border:"1px solid #C6C6C8"}}
                  onClick={()=>{setExpandedId(null);setReturnIds(p=>({...p,[c.id]:[]}))}}>
                  キャンセル
                </button>
                <button style={{...S.submitBtn,marginTop:0,padding:"8px 20px",fontSize:13,
                  ...(selectedIds.length===0?S.submitDisabled:{background:"#1a1919",color:"#fff"})}}
                  disabled={selectedIds.length===0}
                  onClick={()=>handleReturn(c)}>
                  委託戻り（{selectedIds.length}点）
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


// ─── 新規委託フォーム ─────────────────────────────────────
function ConsignmentForm({ artworks, counterparties, staffList, galleryInfo, nextId, editTarget=null, onSave, isMobile=false }) {
  const fmt = (n) => n != null ? `¥${Number(n).toLocaleString()}` : "";
  const today = () => new Date().toISOString().slice(0,10);

  const [date,         setDate]         = useState(editTarget?.date || today());
  const [consigneeId,  setConsigneeId]  = useState(editTarget?.consignee_id || null);
  const [consigneeName,setConsigneeName]= useState(editTarget?.consignee_name || "");
  const [staffId,      setStaffId]      = useState(editTarget?.staff_id || staffList[0]?.id||null);
  const [note,         setNote]         = useState(editTarget?.note || "");
  const [items, setItems] = useState(() => {
    if (editTarget) return editTarget.items;
    return [];
  });
  const [cpOpen,       setCpOpen]       = useState(false);
  const [cpQ,          setCpQ]          = useState("");


  // 在庫作品から選択
  const inStockArtworks = artworks.filter(a => a.status === "in_stock");
  const [artworkSearch, setArtworkSearch] = useState("");
  const filteredArtworks = inStockArtworks.filter(a =>
    !artworkSearch || [a.title,a.artist,a.artwork_id].some(s=>(s||"").toLowerCase().includes(artworkSearch.toLowerCase()))
  );
  const [showArtworkPicker, setShowArtworkPicker] = useState(false);

  const addArtworkItem = (a) => {
    if (items.find(i=>i.artwork_id===a.artwork_id)) return;
    setItems(p=>[...p,{ artwork_id:a.artwork_id, artist:a.artist, title:a.title, size:a.size, announce_price:a.announce_price, price:a.announce_price||0 }]);
    setShowArtworkPicker(false);
    setArtworkSearch("");
  };
  const addFreeItem = () => setItems(p=>[...p,{ artwork_id:null, artist:"", title:"", size:"", announce_price:null, price:0 }]);
  const removeItem  = (i) => setItems(p=>p.filter((_,j)=>j!==i));
  const updateItem  = (i,k,v) => setItems(p=>p.map((item,j)=>j===i?{...item,[k]:v}:item));

  const filteredCps = counterparties.filter(c =>
    !cpQ || [c.name,c.company].some(s=>(s||"").toLowerCase().includes(cpQ.toLowerCase()))
  );
  const cpDisplayName = (cp) => cp ? (cp.name || cp.company || "—") : "—";

  const canSave = consigneeName && isRealDate(date) && items.length > 0;

  const handleSave = () => {
    const staffName = staffList.find(s=>s.id===staffId)?.name||"";
    const c = {
      id: editTarget ? editTarget.id : nextId,
      date,
      consignee_id:   consigneeId,
      consignee_name: consigneeName,
      staff_id:       staffId,
      staff_name:     staffName,
      note,
      items,
    };
    onSave(c);
  };

  return (
    <div style={{maxWidth:760}}>
      {/* 基本情報 */}
      <div style={{...S.formGrid,...(isMobile?{gridTemplateColumns:"1fr"}:{})}}>
        <Field label="委託日">
          <SplitDateInput value={date} onChange={(val)=>setDate(val)}/>
        </Field>
        <Field label="担当者">
          <select style={S.formInput} value={staffId||""} onChange={e=>setStaffId(Number(e.target.value))}>
            <option value="">未選択</option>
            {staffList.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="委託先" fullWidth>
          <div style={{position:"relative"}}>
            <div style={{display:"flex",gap:6}}>
              <input style={{...S.formInput,flex:1}} placeholder="委託先を選択または入力"
                value={consigneeName} onChange={e=>{setConsigneeName(e.target.value);setConsigneeId(null);}}
                onFocus={()=>setCpOpen(true)}/>
              <button type="button" style={{...S.formInput,padding:"0 10px",cursor:"pointer",flexShrink:0,width:"auto",color:"#1a1919"}}
                onClick={()=>setCpOpen(o=>!o)}>▾</button>
            </div>
            {consigneeId&&<div style={{fontSize:12,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",marginTop:2}}>✓ 取引先DBと連携済み</div>}
            {cpOpen&&(
              <div style={S.cpDropdown}>
                <input style={{...S.formInput,margin:"8px 8px 4px",width:"calc(100% - 16px)",fontSize:12,boxSizing:"border-box"}}
                  placeholder="絞り込み…" value={cpQ} onChange={e=>setCpQ(e.target.value)} autoFocus/>
                <div style={{maxHeight:160,overflowY:"auto"}}>
                  {filteredCps.map(c=>(
                    <div key={c.id} style={S.cpDropdownItem}
                      onClick={()=>{setConsigneeName(cpDisplayName(c));setConsigneeId(c.cp_id);setCpOpen(false);setCpQ("");}}
                      onMouseEnter={e=>e.currentTarget.style.background="#efeeeb"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <span style={{fontWeight:600}}>{cpDisplayName(c)}</span>
                    </div>
                  ))}
                </div>
                <button style={S.cpDropdownClose} onClick={()=>{setCpOpen(false);setCpQ("");}}>閉じる</button>
              </div>
            )}
          </div>
        </Field>
        <Field label="備考" fullWidth>
          <textarea
            style={{...S.formInput, resize:"vertical", minHeight:60, lineHeight:"1.6"}}
            placeholder="委託期間・条件・連絡事項など"
            value={note}
            onChange={e=>setNote(e.target.value)}
          />
        </Field>
      </div>

      {/* 作品リスト */}
      <div style={{marginTop:24,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:12,color:"#1a1919",fontWeight:600,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",letterSpacing:"0.08em"}}>委託作品</div>
        <div style={{display:"flex",gap:8}}>
          <button style={{...S.addEventBtn,color:"#1a1919",background:"#EFEFEF",borderColor:"#C6C6C8"}} onClick={()=>setShowArtworkPicker(true)}>＋ 在庫から選択</button>
          <button style={{...S.addEventBtn,color:"#94a3b8",background:"transparent",borderColor:"#C6C6C8"}} onClick={addFreeItem}>＋ 自由入力</button>
        </div>
      </div>

      {/* 作品ピッカー */}
      {showArtworkPicker&&(
        <div style={{background:"#FFFFFF",border:"1px solid #C6C6C8",borderRadius:10,padding:"12px",marginBottom:12}}>
          <input style={{...S.formInput,width:"100%",boxSizing:"border-box",marginBottom:8}}
            placeholder="作品名・作家で検索…" value={artworkSearch} onChange={e=>setArtworkSearch(e.target.value)} autoFocus/>
          <div style={{maxHeight:200,overflowY:"auto",display:"flex",flexDirection:"column",gap:1}}>
            {filteredArtworks.map(a=>(
              <div key={a.artwork_id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 8px",cursor:"pointer",borderRadius:6,fontSize:13}}
                onMouseEnter={e=>e.currentTarget.style.background="#efeeeb"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                onClick={()=>addArtworkItem(a)}>
                <div>
                  <span style={{fontWeight:600,marginRight:8}}>{a.title}</span>
                  <span style={{color:"#5E6367",fontSize:12,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}>{a.artist}</span>
                </div>
                <span style={{color:"#1a1919",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",fontSize:14}}>¥{Number(a.announce_price).toLocaleString()}</span>
              </div>
            ))}
            {filteredArtworks.length===0&&<div style={{color:"#5E6367",fontSize:12,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",padding:"12px 0",textAlign:"center"}}>該当する在庫作品がありません</div>}
          </div>
          <button style={{...S.cpDropdownClose}} onClick={()=>{setShowArtworkPicker(false);setArtworkSearch("");}}>閉じる</button>
        </div>
      )}

      {/* 作品テーブル（PC） */}
      {!isMobile && items.length > 0 && (
        <div style={{overflowX:"auto",marginBottom:8}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:560,fontSize:13,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}>
            <thead>
              <tr style={{borderBottom:"1px solid #C6C6C8"}}>
                {["作家","タイトル","サイズ","発表価格","委託価格",""].map(h=>(
                  <th key={h} style={{padding:"6px 8px",textAlign:h==="委託価格"||h==="発表価格"?"right":"left",fontSize:12,color:"#5E6367",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item,i)=>(
                <tr key={i} style={{borderBottom:"1px solid #C6C6C8"}}>
                  <td style={{padding:"6px 8px"}}>
                    {item.artwork_id
                      ? item.artist
                      : <input style={{...S.formInput,padding:"4px 6px",fontSize:12}} value={item.artist} onChange={e=>updateItem(i,"artist",e.target.value)} placeholder="作家名"/>}
                  </td>
                  <td style={{padding:"6px 8px"}}>
                    {item.artwork_id
                      ? item.title
                      : <input style={{...S.formInput,padding:"4px 6px",fontSize:12}} value={item.title} onChange={e=>updateItem(i,"title",e.target.value)} placeholder="タイトル"/>}
                  </td>
                  <td style={{padding:"6px 8px",color:"#5E6367",fontSize:12}}>
                    {item.artwork_id
                      ? item.size
                      : <input style={{...S.formInput,padding:"4px 6px",fontSize:12}} value={item.size} onChange={e=>updateItem(i,"size",e.target.value)} placeholder="サイズ"/>}
                  </td>
                  <td style={{padding:"6px 8px",textAlign:"right"}}>
                    <input style={{...S.formInput,padding:"4px 6px",fontSize:13,textAlign:"right",width:100,color:"#1a1919"}}
                      type="number" value={item.announce_price||""} placeholder="—"
                      onChange={e=>updateItem(i,"announce_price",Number(e.target.value))}/>
                  </td>
                  <td style={{padding:"6px 8px",textAlign:"right"}}>
                    <input style={{...S.formInput,padding:"4px 6px",fontSize:13,textAlign:"right",width:100,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}
                      type="number" value={item.price} onChange={e=>updateItem(i,"price",Number(e.target.value))}/>
                  </td>
                  <td style={{padding:"6px 8px",textAlign:"center"}}>
                    <button style={{background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:14}} onClick={()=>removeItem(i)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 作品カード（モバイル） */}
      {isMobile && items.length > 0 && (
        <div style={{marginBottom:8}}>
          {items.map((item,i)=>(
            <div key={i} style={{background:"#FFFFFF",border:"1px solid #C6C6C8",borderRadius:10,padding:"14px",marginBottom:10,position:"relative"}}>
              <button style={{position:"absolute",top:12,right:12,background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:15}} onClick={()=>removeItem(i)}>✕</button>

              {item.artwork_id ? (
                <>
                  <div style={{fontSize:15,fontWeight:600,marginBottom:2,paddingRight:24}}>{item.artist}</div>
                  <div style={{fontSize:13,color:"#5E6367",marginBottom:2}}>{item.title}</div>
                  <div style={{fontSize:12,color:"#94a3b8",marginBottom:12}}>{item.size}</div>
                </>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12,paddingRight:24}}>
                  <input style={{...S.formInput,fontSize:13}} value={item.artist} onChange={e=>updateItem(i,"artist",e.target.value)} placeholder="作家名"/>
                  <input style={{...S.formInput,fontSize:13}} value={item.title} onChange={e=>updateItem(i,"title",e.target.value)} placeholder="タイトル"/>
                  <input style={{...S.formInput,fontSize:12}} value={item.size} onChange={e=>updateItem(i,"size",e.target.value)} placeholder="サイズ"/>
                </div>
              )}

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:12,color:"#5E6367"}}>発表価格</span>
                <input style={{...S.formInput,width:130,textAlign:"right",fontSize:13,color:"#1a1919"}}
                  type="number" value={item.announce_price||""} placeholder="—"
                  onChange={e=>updateItem(i,"announce_price",Number(e.target.value))}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:12,color:"#5E6367"}}>委託価格</span>
                <input style={{...S.formInput,width:130,textAlign:"right",fontSize:13,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}
                  type="number" value={item.price} onChange={e=>updateItem(i,"price",Number(e.target.value))}/>
              </div>
            </div>
          ))}
        </div>
      )}
      {items.length===0&&<div style={{color:"#5E6367",fontSize:12,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",padding:"20px 0",textAlign:"center",border:"1px dashed #C6C6C8",borderRadius:8,marginBottom:12}}>作品を追加してください</div>}

      <button style={{...S.submitBtn,background:"#1a1919",...(!canSave?S.submitDisabled:{})}} onClick={handleSave} disabled={!canSave}>
        {editTarget ? "変更を保存する" : "委託を登録する"}
      </button>
    </div>
  );
}

// ─── PDF出力 ──────────────────────────────────────────────
function printConsignment(c, galleryInfo, counterparties=[]) {
  const fmt    = (n) => n != null ? `¥${Number(n).toLocaleString()}` : "—";
  const docNo  = `C-${String(c.id).padStart(4,"0")}`;
  const today  = new Date().toLocaleDateString("ja-JP",{year:"numeric",month:"long",day:"numeric"});
  const totalAnnounce = c.items.reduce((s,i)=>s+(i.announce_price||0),0);
  const totalPrice    = c.items.reduce((s,i)=>s+(i.price||0),0);
  const itemCount     = c.items.length;

  // 委託先の取引先レコードを解決
  const cpRecord = c.consignee_id
    ? counterparties.find(cp => cp.cp_id === c.consignee_id)
    : null;

  // 住所ブロック（〒 + 住所 + 建物）
  const consigneeAddress = cpRecord
    ? [
        cpRecord.zip     ? `〒${cpRecord.zip}` : "",
        cpRecord.address ? cpRecord.address + (cpRecord.building ? ` ${cpRecord.building}` : "") : "",
      ].filter(Boolean).join("　")
    : "";

  // 連絡先ブロック（電話・メール）
  const consigneeContact = cpRecord
    ? [
        cpRecord.phone ? `TEL：${cpRecord.phone}` : "",
        cpRecord.email ? cpRecord.email : "",
      ].filter(Boolean).join("　")
    : "";

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>委託納品書 ${docNo}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4 portrait; margin: 0; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Noto Sans JP","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;
    font-size: 11pt;
    color: #1a1a1a;
    background: #fff;
    padding: 16mm 18mm 18mm;
    min-height: 297mm;
  }

  /* ── ヘッダー ── */
  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #1a1a1a;
    padding-bottom: 8px;
    margin-bottom: 16px;
  }
  .doc-title { font-size: 20pt; font-weight: 700; letter-spacing: .05em; line-height: 1; }
  .doc-meta  { text-align: right; font-size: 9pt; color: #444; line-height: 1.8; }
  .doc-no    { font-size: 12pt; font-weight: 700; color: #1a1a1a; }

  /* ── 委託先・画廊情報 ── */
  .info-row { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
  .consignee-block .sec-label { font-size: 8pt; color: #666; margin-bottom: 2px; letter-spacing: .06em; }
  .consignee-name  { font-size: 14pt; font-weight: 700; border-bottom: 1.5px solid #1a1a1a; padding-bottom: 4px; margin-bottom: 5px; }
  .consignee-detail{ font-size: 9pt; color: #444; line-height: 1.8; }
  .gallery-block   { width: 175px; text-align: right; font-size: 8.5pt; color: #444; line-height: 1.9; flex-shrink: 0; }
  .gallery-name    { font-size: 10pt; font-weight: 700; color: #1a1a1a; margin-bottom: 2px; }

  /* ── 本文 ── */
  .body-text { font-size: 10pt; margin-bottom: 13px; line-height: 1.7; }

  /* ── 作品テーブル ── */
  table { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 9.5pt; }
  thead tr { background: #1a1a1a; color: #fff; }
  thead th { padding: 7px 8px; font-weight: 500; letter-spacing: .04em; white-space: nowrap; }
  tbody tr { border-bottom: 1px solid #d8d8d8; }
  tbody tr:last-child { border-bottom: 2px solid #1a1a1a; }
  tbody tr:nth-child(even) { background: #f8f8f8; }
  tbody td { padding: 7px 8px; vertical-align: top; line-height: 1.5; }
  .col-no     { width: 24px; text-align: center; color: #666; }
  .col-artist { width: 76px; }
  .col-size   { width: 96px; white-space: nowrap; }
  .col-price  { width: 78px; text-align: right; }
  .col-medium { font-size: 8.5pt; color: #777; }
  .price-val  { font-feature-settings: "tnum"; letter-spacing: .02em; }
  .price-yen  { font-size: 8pt; color: #555; margin-right: 1px; }

  /* ── 合計 ── */
  .total-area { display: flex; justify-content: flex-end; margin-bottom: 14px; }
  .total-table { border-collapse: collapse; font-size: 10pt; min-width: 215px; }
  .total-table td { padding: 5px 10px; border-bottom: 1px solid #d8d8d8; }
  .total-table td:first-child { color: #555; }
  .total-table td:last-child  { text-align: right; font-feature-settings: "tnum"; }
  .total-table tr.grand-total td { font-weight: 700; font-size: 11pt; border-top: 2px solid #1a1a1a; border-bottom: 2px solid #1a1a1a; }

  /* ── 備考 ── */
  .note-fixed  { font-size: 9pt; color: #888; margin-bottom: 10px; }
  .note-section { margin-bottom: 14px; }
  .note-label  { font-size: 8pt; letter-spacing: .1em; color: #888; margin-bottom: 3px; }
  .note-box    { border: 1px solid #ccc; border-radius: 3px; min-height: 44px; padding: 7px 10px; font-size: 9.5pt; color: #333; line-height: 1.7; }

  /* ── フッター ── */
  .footer-row  { display: flex; justify-content: space-between; align-items: flex-end; padding-top: 10px; border-top: 1px solid #d8d8d8; font-size: 9pt; color: #444; }
  .staff-block .staff-label { font-size: 8pt; color: #888; letter-spacing: .06em; }
  .staff-block .staff-name  { font-size: 11pt; font-weight: 700; color: #1a1a1a; }
  .seal-area   { display: flex; gap: 18px; align-items: flex-end; }
  .seal-box    { text-align: center; }
  .seal-box .seal-label { font-size: 8pt; color: #888; margin-bottom: 3px; }
  .seal-circle { width: 44px; height: 44px; border: 1.5px solid #bbb; border-radius: 50%; }
</style>
</head>
<body>

  <!-- ヘッダー -->
  <div class="doc-header">
    <div class="doc-title">委託納品書</div>
    <div class="doc-meta">
      <div class="doc-no">${docNo}</div>
      <div>発行日：${today}</div>
    </div>
  </div>

  <!-- 委託先 ／ 画廊情報 -->
  <div class="info-row">
    <div class="consignee-block">
      <div class="sec-label">委 託 先</div>
      <div class="consignee-name">${c.consignee_name}　御中</div>
      <div class="consignee-detail">
        ${consigneeAddress ? `<div>${consigneeAddress}</div>` : ""}
        ${consigneeContact ? `<div>${consigneeContact}</div>` : ""}
        ${!cpRecord ? `<div style="font-size:8pt;color:#aaa;">（取引先DBと未連携）</div>` : ""}
      </div>
    </div>
    <div class="gallery-block">
      <div class="gallery-name">${galleryInfo.name||"（画廊名未設定）"}</div>
      ${galleryInfo.zip     ? `<div>〒${galleryInfo.zip}</div>` : ""}
      ${galleryInfo.address ? `<div>${galleryInfo.address}${galleryInfo.building?" "+galleryInfo.building:""}</div>` : ""}
      ${galleryInfo.tel     ? `<div>TEL：${galleryInfo.tel}</div>` : ""}
      ${galleryInfo.fax     ? `<div>FAX：${galleryInfo.fax}</div>` : ""}
      ${galleryInfo.email   ? `<div>${galleryInfo.email}</div>` : ""}
    </div>
  </div>

  <!-- 本文 -->
  <p class="body-text">下記の通り、作品を委託いたします。何卒よろしくお願い申し上げます。</p>

  <!-- 作品テーブル -->
  <table>
    <thead>
      <tr>
        <th class="col-no">No.</th>
        <th class="col-artist">作家名</th>
        <th>作品タイトル</th>
        <th class="col-size">サイズ</th>
        <th class="col-price">発表価格</th>
        <th class="col-price">委託価格</th>
      </tr>
    </thead>
    <tbody>
      ${c.items.map((item,idx) => `
      <tr>
        <td class="col-no">${idx+1}</td>
        <td class="col-artist">${item.artist||"—"}</td>
        <td>
          ${item.title||"—"}
          ${item.medium ? `<div class="col-medium">${item.medium}</div>` : ""}
        </td>
        <td class="col-size">${item.size||"—"}</td>
        <td class="col-price"><span class="price-yen">¥</span><span class="price-val">${item.announce_price ? Number(item.announce_price).toLocaleString() : "—"}</span></td>
        <td class="col-price"><span class="price-yen">¥</span><span class="price-val">${Number(item.price).toLocaleString()}</span></td>
      </tr>`).join("")}
    </tbody>
  </table>

  <!-- 合計 -->
  <div class="total-area">
    <table class="total-table">
      <tr>
        <td>発表価格 合計</td>
        <td><span class="price-yen">¥</span>${totalAnnounce>0?totalAnnounce.toLocaleString():"—"}</td>
      </tr>
      <tr>
        <td>委託価格 合計</td>
        <td><span class="price-yen">¥</span>${totalPrice.toLocaleString()}</td>
      </tr>
      <tr class="grand-total">
        <td>点数</td>
        <td>${itemCount} 点</td>
      </tr>
    </table>
  </div>

  <!-- 備考 -->
  ${c.note ? `
  <div class="note-section">
    <div class="note-label">備 考</div>
    <div class="note-box">${c.note.replace(/\n/g,"<br>")}</div>
  </div>` : ""}

  <!-- フッター -->
  <div class="footer-row">
    <div class="staff-block">
      <div class="staff-label">担 当</div>
      <div class="staff-name">${c.staff_name||"—"}</div>
      <div style="margin-top:2px;font-size:9pt;">${galleryInfo.name||""}</div>
    </div>
    <div class="seal-area">
      <div class="seal-box">
        <div class="seal-label">担当</div>
        <div class="seal-circle"></div>
      </div>
      <div class="seal-box">
        <div class="seal-label">確認</div>
        <div class="seal-circle"></div>
      </div>
    </div>
  </div>

</body>
</html>`;

  // iframeを使って印刷（ポップアップブロッカーを回避）
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;border:none;visibility:hidden;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }, 800);
}

// ─── 在庫一覧コンポーネント ───────────────────────────────
// 頭文字タブの定義
const KANA_ROWS = [
  { key:"ア", label:"ア", chars:["ア","イ","ウ","エ","オ"] },
  { key:"カ", label:"カ", chars:["カ","キ","ク","ケ","コ"] },
  { key:"サ", label:"サ", chars:["サ","シ","ス","セ","ソ"] },
  { key:"タ", label:"タ", chars:["タ","チ","ツ","テ","ト"] },
  { key:"ナ", label:"ナ", chars:["ナ","ニ","ヌ","ネ","ノ"] },
  { key:"ハ", label:"ハ", chars:["ハ","ヒ","フ","ヘ","ホ"] },
  { key:"マ", label:"マ", chars:["マ","ミ","ム","メ","モ"] },
  { key:"ヤ", label:"ヤ", chars:["ヤ","ユ","ヨ"] },
  { key:"ラ", label:"ラ", chars:["ラ","リ","ル","レ","ロ"] },
  { key:"ワ", label:"ワ", chars:["ワ","ヲ","ン"] },
];

const getKanaRow = (kana) => {
  if (!kana) return null;
  const first = kana.trim()[0];
  for (const row of KANA_ROWS) {
    if (row.chars.includes(first)) return row.key;
  }
  return null;
};

function InventoryList({ artworks, counterparties, artists=[], artworkGroups=[], isMobile=false, onSelect }) {
  const [activeTab, setActiveTab] = useState("ALL");
  const [search, setSearch] = useState("");

  const inStock = artworks.filter(a => a.status === "in_stock" || a.status === "consigned");

  const sorted = [...inStock].sort((a, b) => {
    const kanaA = (a.artist_kana || a.artist || "").toLowerCase();
    const kanaB = (b.artist_kana || b.artist || "").toLowerCase();
    if (kanaA !== kanaB) return kanaA.localeCompare(kanaB, "ja");
    return (b.purchased_at || "").localeCompare(a.purchased_at || "");
  });

  // 作品のグループキー取得（group_id があればグループ、なければ頭文字）
  const getGroupKey  = (a) => { const art = artists.find(ar=>ar.artist_id===a.artist_id); return art?.group_id != null ? `G:${art.group_id}` : null; };
  const getKanaKey   = (a) => getKanaRow(a.artist_kana || a.artist);

  // グループタブ：作品が存在するものだけ
  const usedGroupIds = new Set(sorted.map(a=>{ const art=artists.find(ar=>ar.artist_id===a.artist_id); return art?.group_id; }).filter(id=>id!=null));
  const visibleGroups = artworkGroups.filter(g=>usedGroupIds.has(g.id));

  // 頭文字タブ：グループ未設定の作品のみ対象
  const noGroupSorted = sorted.filter(a=>{ const art=artists.find(ar=>ar.artist_id===a.artist_id); return art?.group_id==null; });
  const existingKanaKeys = new Set(noGroupSorted.map(a=>getKanaKey(a)));
  const visibleKanaTabs = KANA_ROWS.filter(r=>existingKanaKeys.has(r.key));

  // 検索＋タブでフィルタ
  const filtered = sorted.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || [a.title, a.artist, a.artist_kana].some(s => (s||"").toLowerCase().includes(q));
    let matchTab = false;
    if (activeTab === "ALL") {
      matchTab = true;
    } else if (activeTab.startsWith("G:")) {
      const gid = Number(activeTab.slice(2));
      const art = artists.find(ar=>ar.artist_id===a.artist_id);
      matchTab = art?.group_id === gid;
    } else {
      // 頭文字タブ：グループ未設定の作品のみ
      const art = artists.find(ar=>ar.artist_id===a.artist_id);
      matchTab = art?.group_id==null && getKanaKey(a)===activeTab;
    }
    return matchSearch && matchTab;
  });

  // 作家でグループ化
  const groups = filtered.reduce((acc, a) => {
    const key = a.artist;
    if (!acc[key]) acc[key] = { artist: a.artist, artist_kana: a.artist_kana || "", works: [] };
    acc[key].works.push(a);
    return acc;
  }, {});

  const fmt = (n) => n != null && n !== "" ? `¥${Number(n).toLocaleString()}` : "—";

  // セパレーター有無判定
  const hasGroups = visibleGroups.length > 0;
  const hasKana   = visibleKanaTabs.length > 0;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:0}}>

      {/* 検索バー */}
      <div style={{marginBottom:14}}>
        <input
          style={{...IS.searchBar, width:"100%", boxSizing:"border-box"}}
          placeholder="作家名・作品名で検索…"
          value={search}
          onChange={e => { setSearch(e.target.value); setActiveTab("ALL"); }}
        />
      </div>

      {/* タブ（すべて | グループ … | 頭文字 …） */}
      <div style={{...IS.tabBar, alignItems:"center"}}>
        {/* すべて */}
        <button
          style={{...IS.tab,...(activeTab==="ALL"?IS.tabActive:{})}}
          onClick={e=>{ setActiveTab("ALL"); e.currentTarget.blur(); }}
          onMouseEnter={e=>{ if(activeTab!=="ALL"){ e.currentTarget.style.background="#efeeeb"; e.currentTarget.style.boxShadow="0 0 0 1px #efeeeb"; } }}
          onMouseLeave={e=>{ if(activeTab!=="ALL"){ e.currentTarget.style.background="#F9F9F7"; e.currentTarget.style.boxShadow="0 0 0 1px #C6C6C8"; } }}>
          すべて
          <span style={IS.tabCount}>{inStock.length}</span>
        </button>

        {/* グループタブ */}
        {hasGroups && (
          <>
            <span style={{width:1,height:18,background:"#C6C6C8",flexShrink:0,margin:"0 2px"}}/>
            {visibleGroups.map(g => {
              const key = `G:${g.id}`;
              const cnt = sorted.filter(a=>{ const art=artists.find(ar=>ar.artist_id===a.artist_id); return art?.group_id===g.id; }).length;
              return (
                <button key={key}
                  style={{...IS.tab,...(activeTab===key?IS.tabActive:{}),...(activeTab===key?{boxShadow:"0 0 0 1px #081319",color:"#fff"}:{})}}
                  onClick={e=>{ setActiveTab(key); setSearch(""); e.currentTarget.blur(); }}
                  onMouseEnter={e=>{ if(activeTab!==key){ e.currentTarget.style.background="#efeeeb"; e.currentTarget.style.boxShadow="0 0 0 1px #efeeeb"; } }}
                  onMouseLeave={e=>{ if(activeTab!==key){ e.currentTarget.style.background="#F9F9F7"; e.currentTarget.style.boxShadow="0 0 0 1px #C6C6C8"; } }}>
                  {g.name}
                  <span style={IS.tabCount}>{cnt}</span>
                </button>
              );
            })}
          </>
        )}

        {/* 頭文字タブ */}
        {hasKana && (
          <>
            <span style={{width:1,height:18,background:"#C6C6C8",flexShrink:0,margin:"0 2px"}}/>
            {visibleKanaTabs.map(row => {
              const cnt = noGroupSorted.filter(a => getKanaKey(a) === row.key).length;
              return (
                <button key={row.key}
                  style={{...IS.tab,...(activeTab===row.key?IS.tabActive:{})}}
                  onClick={e=>{ setActiveTab(row.key); setSearch(""); e.currentTarget.blur(); }}
                  onMouseEnter={e=>{ if(activeTab!==row.key){ e.currentTarget.style.background="#efeeeb"; e.currentTarget.style.boxShadow="0 0 0 1px #efeeeb"; } }}
                  onMouseLeave={e=>{ if(activeTab!==row.key){ e.currentTarget.style.background="#F9F9F7"; e.currentTarget.style.boxShadow="0 0 0 1px #C6C6C8"; } }}>
                  {row.label}
                  <span style={IS.tabCount}>{cnt}</span>
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* 件数表示 */}
      <div style={{fontSize:12,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",margin:"10px 0 16px",textAlign:"right"}}>
        {filtered.length}件 / 在庫{inStock.length}件
      </div>

      {/* 作品リスト */}
      {Object.keys(groups).length === 0 ? (
        <div style={{color:"#5E6367",fontSize:13,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",padding:"40px 0",textAlign:"center"}}>
          該当する作品がありません
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:28}}>
          {Object.values(groups).map(g => (
            <div key={g.artist}>
              <div style={IS.artistHeader}>
                <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                  <span style={IS.artistName}>{g.artist}</span>
                  {g.artist_kana && <span style={IS.artistKana}>{g.artist_kana}</span>}
                </div>
                <span style={IS.artistCount}>{g.works.length}点</span>
              </div>
              <div style={IS.workList}>
                {g.works.map((a, i) => (
                  <div key={a.artwork_id}
                    style={{...IS.workRow,...(i%2===0?{}:{background:"#F9F9F7"})}}
                    onClick={()=>onSelect(a.artwork_id)}
                    onMouseEnter={e=>e.currentTarget.style.background="#efeeeb"}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"transparent":"#F9F9F7"}>
                    <div style={isMobile?{display:"flex",flexDirection:"column",alignItems:"flex-start",flex:1,minWidth:0}:{display:"contents"}}>
                      <div style={IS.workId}>{a.artwork_id}</div>
                      <div style={IS.workMain}>
                        <div style={IS.workTitle}>{a.title}</div>
                        <div style={isMobile?{display:"flex",flexDirection:"column",gap:1}:IS.workMeta}>
                          {a.medium && <span style={IS.plainText}>{a.medium}</span>}
                          {!isMobile && a.medium&&a.size&&<span style={IS.dot}>·</span>}
                          {a.size  && <span style={{...IS.plainText,color:"#5E6367",flexShrink:1,overflow:"hidden",textOverflow:"ellipsis"}}>{a.size}</span>}
                        </div>
                        {a.appraisal && <div style={{marginTop:2}}><span style={IS.appraisalChip}>鑑 {a.appraisal}</span></div>}
                      </div>
                    </div>
                    <div style={IS.workRight}>
                      <span style={{...IS.statusBadge,
                        background: STATUSES[a.status]?.color+"22",
                        color:      STATUSES[a.status]?.color,
                        border:    `1px solid ${STATUSES[a.status]?.color}44`}}>
                        {STATUSES[a.status]?.label}
                      </span>
                      <div style={IS.priceBlock}>
                        <div style={IS.purchasedAt}>{a.purchased_at}</div>
                        <div style={IS.priceRow}>
                          <span style={IS.priceLabel}>仕入</span>
                          <span style={{...IS.priceVal,fontSize:14,color:"#1a1919",fontWeight:600}}>{fmt(a.purchase_price)}</span>
                        </div>
                        <div style={IS.priceRow}>
                          <span style={IS.priceLabel}>発表</span>
                          <span style={{...IS.priceVal,color:"#1a1919"}}>{fmt(a.announce_price)}</span>
                        </div>
                        {a.status === "consigned" && (<>
                          <div style={IS.priceRow}>
                            <span style={IS.priceLabel}>委託</span>
                            <span style={{...IS.priceVal,color:"#1a1919"}}>{fmt(a.consignment_price)}</span>
                          </div>
                          {a.consignee&&(
                            <div style={{fontSize:12,color:"#5E6367",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",textAlign:"right",opacity:0.8}}>{a.consignee}</div>
                          )}
                        </>)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const IS = {
  searchBar:    { background:"#FFFFFF", border:"1px solid #C6C6C8", borderRadius:8, padding:"8px 14px", color:"#1a1919", fontSize:13, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", outline:"none" },
  tabBar:       { display:"flex", gap:4, flexWrap:"wrap" },
  tab:          { padding:"5px 10px", borderRadius:20, border:"none", boxShadow:"0 0 0 1px #C6C6C8", background:"transparent", color:"#5E6367", cursor:"pointer", fontSize:12, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", display:"flex", alignItems:"center", gap:4, outline:"none" },
  tabActive:    { background:"#081319", color:"#fff", boxShadow:"0 0 0 1px #081319" },
  tabCount:     { fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  artistHeader: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 0 12px", marginBottom:4 },
  artistName:   { fontSize:17, fontWeight:700, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", letterSpacing:"0.05em" },
  artistKana:   { fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", letterSpacing:"0.06em" },
  artistCount:  { fontSize:12, color:"#1a1919", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", flexShrink:0 },
  workList:     { display:"flex", flexDirection:"column" },
  workRow:      { display:"flex", alignItems:"flex-start", gap:6, padding:"10px 4px", cursor:"pointer", transition:"background 0.15s", borderBottom:"1px solid #C6C6C8" },
  workId:       { fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontSize:14, color:"#1a1919", letterSpacing:"0.02em", flexShrink:0, width:70, fontWeight:700 },
  workMain:     { flex:1, minWidth:0 },
  workTitle:    { fontWeight:600, fontSize:14, marginBottom:4, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  workMeta:     { display:"flex", gap:4, flexWrap:"nowrap", overflow:"hidden" },
  metaChip:     { background:"#C6C6C8", padding:"1px 6px", borderRadius:4, fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", flexShrink:0, whiteSpace:"nowrap" },
  sizeChip:     { background:"#F9F9F7", padding:"1px 6px", borderRadius:4, fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", flexShrink:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", minWidth:0 },
  workRight:    { flexShrink:0, display:"flex", flexDirection:"column", alignItems:"stretch", gap:2, minWidth:150 },
  statusBadge:  { padding:"2px 8px", borderRadius:20, fontSize:12, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", whiteSpace:"nowrap", alignSelf:"flex-start" },
  priceBlock:   { display:"flex", flexDirection:"column", gap:2, alignItems:"flex-end" },
  priceRow:     { display:"flex", alignItems:"baseline", width:"100%" },
  priceLabel:   { fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", width:28, flexShrink:0, whiteSpace:"nowrap" },
  priceVal:     { fontSize:12, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", textAlign:"right", flex:1, whiteSpace:"nowrap" },
  consignee:    { fontSize:12, color:"#38bdf8", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", textAlign:"right", maxWidth:90, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  purchasedAt:  { fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  appraisalChip:{ background:"#EEEEEC", padding:"3px 10px", borderRadius:999, fontSize:11, lineHeight:1.4, color:"#8D2728", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", flexShrink:0, whiteSpace:"nowrap", border:"1px solid #D0D0CE", display:"inline-block" },
  plainText:    { fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", whiteSpace:"nowrap", flexShrink:0 },
  dot:          { fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", flexShrink:0 },
};


// ─── 日計表コンポーネント ─────────────────────────────────
function DailyReport({ artworks, history, counterparties, taxSettings, galleryInfo, isMobile, onSelectArtwork }) {
  const fmt  = (n) => n != null ? `¥${Number(n).toLocaleString()}` : "—";
  const [expandedDate, setExpandedDate] = useState(null);

  // 日付表示（日計ページのみ）：「2026年7月8日（水）」形式
  const WEEKDAY_JA = ["日","月","火","水","木","金","土"];
  const formatDayLabel = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${WEEKDAY_JA[d.getDay()]}）`;
  };

  // 事業年度設定（未設定時は旧来の9月/1970年をデフォルト）
  const fiscalStartMonth  = galleryInfo?.fiscalStartMonth  || 9;  // 1〜12
  const fiscalOriginYear  = galleryInfo?.fiscalOriginYear  || 1970;
  const fiscalStartMonth0 = fiscalStartMonth - 1; // 0-indexed

  const hasInvoice = (cpId, date) => {
    if (!cpId) return false;
    const cp = counterparties.find(c => c.cp_id === cpId);
    if (!cp || !cp.invoice_no) return false;
    if (cp.invoice_from && date < cp.invoice_from) return false;
    if (cp.invoice_to   && date > cp.invoice_to)   return false;
    return true;
  };

  // PC：4行ミニグリッドの内側セル配置（ヘッダー／データ／合計で共有）
  const variantStyle = () => DR.txnGridCols;

  const GridCells = ({ variant, counterparty, id, artist, title, size, amount1, amount2, amount3, cost, profit }) => (
    <>
      <div style={DR.gCounterparty}>{counterparty}</div>
      <div style={DR.gId}>{id}</div>
      <div style={DR.gArtist}>{artist}</div>
      <div style={DR.gTitle}>{title}</div>
      <div style={DR.gSize}>{size}</div>
      <div style={DR.gAmount1}>{amount1}</div>
      <div style={DR.gAmount2}>{amount2}</div>
      <div style={DR.gAmount3}>{amount3}</div>
      {variant === "s" && (cost || profit) && (
        <div style={DR.gCostProfit}>
          {cost}
          {profit}
        </div>
      )}
    </>
  );

  // PC：グリッドデータ行（1取引=4行ブロック）
  const TxnGridData = ({ variant, artwork, cpName, badge, amounts, cost, profit, bg, onClick }) => (
    <div style={{...DR.txnGridRow, ...variantStyle(variant), ...DR.txnGridData, ...(bg ? {background:bg} : {})}} onClick={onClick}>
      <GridCells variant={variant}
        counterparty={<>
          <div style={DR.gCpName}>{cpName || "—"}</div>
          {badge}
        </>}
        id={<span style={DR.gIdVal}>{artwork?.artwork_id || "—"}</span>}
        artist={<span style={DR.gTextVal}>{artwork?.artist || "—"}</span>}
        title={<span style={DR.gTitleVal}>{artwork?.title || "—"}</span>}
        size={<span style={DR.gSizeVal}>{artwork?.size || ""}</span>}
        amount1={<span style={{...DR.gAmountMain, color: amounts[0].color || "#1a1919"}}>{amounts[0].value}</span>}
        amount2={<div style={DR.gAmountRow}>
          <span style={DR.gAmountRowLabel}>{amounts[1].label}</span>
          <span style={{...DR.gAmountRowSub, color: amounts[1].color || "#5E6367"}}>{amounts[1].value}</span>
        </div>}
        amount3={<div style={DR.gAmountRow}>
          <span style={DR.gAmountRowLabel}>{amounts[2].label}</span>
          <span style={{...DR.gAmountRowTax, color: amounts[2].color || "#5E6367"}}>{amounts[2].value}</span>
        </div>}
        cost={cost && <span style={{...DR.gAmountRowSub, color: cost.color || "#5E6367"}}>{cost.value}</span>}
        profit={profit && <span style={{...DR.gAmountMain, fontWeight:700, color: profit.color || "#1a1919"}}>{profit.value}</span>}
      />
    </div>
  );

  // PC：グリッド合計行
  const TxnGridFoot = ({ variant, label, amounts, cost, profit }) => (
    <div style={{...DR.txnGridRow, ...variantStyle(variant), ...DR.txnGridFoot}}>
      <GridCells variant={variant}
        counterparty={<span style={DR.gFootLabel}>{label}</span>}
        id={null} artist={null} title={null} size={null}
        amount1={<span style={{...DR.gAmountMain, fontWeight:700, color: amounts[0].color || "#1a1919"}}>{amounts[0].value}</span>}
        amount2={<div style={DR.gAmountRow}>
          <span style={DR.gAmountRowLabel}>{amounts[1].label}</span>
          <span style={{...DR.gAmountRowSub, color: amounts[1].color || "#5E6367"}}>{amounts[1].value}</span>
        </div>}
        amount3={<div style={DR.gAmountRow}>
          <span style={DR.gAmountRowLabel}>{amounts[2].label}</span>
          <span style={{...DR.gAmountRowTax, color: amounts[2].color || "#5E6367"}}>{amounts[2].value}</span>
        </div>}
        cost={cost && <span style={{...DR.gAmountRowSub, color: cost.color || "#5E6367"}}>{cost.value}</span>}
        profit={profit && <span style={{...DR.gAmountMain, fontWeight:700, color: profit.color || "#1a1919"}}>{profit.value}</span>}
      />
    </div>
  );

  // PC：グリッド見出し行（列ラベル）
  const TxnGridHeader = ({ variant, cpLabel, amount1Label, showCostProfit=true }) => (
    <div style={{...DR.txnGridRow, ...variantStyle(variant), ...DR.txnGridHeader}}>
      <div style={DR.hCp}>{cpLabel}</div>
      <div style={DR.hInfo}>作品情報</div>
      <div style={DR.hAmt1}>{amount1Label}</div>
      {variant==="s" && showCostProfit && <div style={DR.hCostProfit}>原価／売却損益</div>}
    </div>
  );

  // スマホ：1取引=1カード
  const MobileTxnCard = ({ artwork, cpLabel, cpName, badge, bg, amounts, onClick }) => (
    <div style={{...DR.card, background: bg || "#F9F9F7"}} onClick={onClick}>
      <div style={DR.cardTopRow}>
        <span style={DR.cardId}>{artwork?.artwork_id || "—"}</span>
        <div style={DR.cardCp}>
          <div>{cpLabel ? `${cpLabel}：${cpName||"—"}` : (cpName||"—")}</div>
          {badge}
        </div>
      </div>
      <div style={DR.cardArtist}>{artwork?.artist || "—"}</div>
      <div style={DR.cardTitle}>{artwork?.title || "—"}</div>
      {artwork?.size && <div style={DR.cardSize}>{artwork.size}</div>}
      <div style={DR.cardAmountRow}>
        {amounts.map((a, i) => (
          <div key={i} style={DR.cardAmountCell}>
            <span style={DR.cardAmountLabel}>{a.label}</span>
            <span style={{...DR.cardAmountVal, color: a.color || "#1a1919"}}>{a.value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const purchaseEvents         = history.filter(h => h.event_type === "purchase");
  const purchaseDiscountEvents = history.filter(h => h.event_type === "purchase_discount");
  const purchaseIncreaseEvents  = history.filter(h => h.event_type === "purchase_increase");
  const soldEvents             = history.filter(h => h.event_type === "sold");
  const soldDiscountEvents     = history.filter(h => h.event_type === "sold_discount");
  const soldIncreaseEvents      = history.filter(h => h.event_type === "sold_increase");

  const allDates = [...new Set([
    ...purchaseEvents.map(h => h.created_at),
    ...purchaseDiscountEvents.map(h => h.created_at),
    ...purchaseIncreaseEvents.map(h => h.created_at),
    ...soldEvents.map(h => h.created_at),
    ...soldDiscountEvents.map(h => h.created_at),
    ...soldIncreaseEvents.map(h => h.created_at),
  ])].sort((a, b) => b.localeCompare(a));

  // 日別サマリー計算
  const dailySummaries = allDates.map(date => {
    const dp  = purchaseEvents.filter(h => h.created_at === date);
    const dpd = purchaseDiscountEvents.filter(h => h.created_at === date);
    const dpi = purchaseIncreaseEvents.filter(h => h.created_at === date);
    const ds  = soldEvents.filter(h => h.created_at === date);
    const dsd = soldDiscountEvents.filter(h => h.created_at === date);
    const dsi = soldIncreaseEvents.filter(h => h.created_at === date);

    const purchaseRows = dp.map(h => {
      const artwork    = artworks.find(a => a.artwork_id === h.artwork_id);
      const price      = h.new_price || 0;
      const taxRate    = getTaxRate(date, taxSettings.rates);
      const rnd        = roundFn(taxSettings.rounding||"floor");
      const tax        = rnd(price - price / (1 + taxRate));
      const excl       = price - tax;
      const inv        = hasInvoice(h.counterparty_id, date);
      const creditRate = getPurchaseCreditRate(date, inv, taxSettings);
      const taxCredit  = rnd(tax * creditRate);
      return { h, artwork, price, excl, tax, taxCredit, inv, creditRate, isDiscount: false };
    });

    // 仕入値引き行（マイナス計上）
    const purchaseDiscountRows = dpd.map(h => {
      const artwork    = artworks.find(a => a.artwork_id === h.artwork_id);
      const isIncrease  = h.event_type === "purchase_increase";
      const discountAmt = isIncrease
        ? -((h.new_price||0) - (h.old_price||0))
        : (h.old_price||0) - (h.new_price||0);
      const taxRate     = getTaxRate(date, taxSettings.rates);
      const rnd         = roundFn(taxSettings.rounding||"floor");
      const tax         = rnd(discountAmt - discountAmt / (1 + taxRate));
      const excl        = discountAmt - tax;
      const inv         = hasInvoice(h.counterparty_id, date);
      const creditRate  = getPurchaseCreditRate(date, inv, taxSettings);
      const taxCredit   = rnd(tax * creditRate);
      return { h, artwork, discountAmt, excl, tax, taxCredit, inv, creditRate, isDiscount: true };
    });

    const soldRows = ds.map(h => {
      const artwork    = artworks.find(a => a.artwork_id === h.artwork_id);
      const price      = h.new_price || 0;
      const salesRate  = getTaxRate(date, taxSettings.rates);
      const rnd        = roundFn(taxSettings.rounding||"floor");
      const tax        = rnd(price - price / (1 + salesRate));
      const excl       = price - tax;
      const cost       = artwork?.purchase_price || 0;
      const purchaseDate = artwork?.purchased_at || date;
      const purchRate  = getTaxRate(purchaseDate, taxSettings.rates);
      const costExcl   = rnd(cost - cost / (1 + purchRate));
      const profitLoss = excl - costExcl;
      return { h, artwork, price, excl, tax, cost, costExcl, profitLoss, isDiscount: false };
    });

    // 仕入値上げ行
    const purchaseIncreaseRows = dpi.map(h => {
      const artwork     = artworks.find(a => a.artwork_id === h.artwork_id);
      const increaseAmt = (h.new_price||0) - (h.old_price||0);
      const taxRate     = getTaxRate(date, taxSettings.rates);
      const rnd         = roundFn(taxSettings.rounding||"floor");
      const tax         = rnd(increaseAmt - increaseAmt / (1 + taxRate));
      const excl        = increaseAmt - tax;
      const inv         = hasInvoice(h.counterparty_id, date);
      const creditRate  = getPurchaseCreditRate(date, inv, taxSettings);
      const taxCredit   = rnd(tax * creditRate);
      return { h, artwork, increaseAmt, excl, tax, taxCredit, inv, creditRate };
    });

    // 売上値引き行
    const soldDiscountRows = dsd.map(h => {
      const artwork     = artworks.find(a => a.artwork_id === h.artwork_id);
      const discountAmt = (h.old_price||0) - (h.new_price||0);
      const taxRate     = getTaxRate(date, taxSettings.rates);
      const rnd         = roundFn(taxSettings.rounding||"floor");
      const tax         = rnd(discountAmt - discountAmt / (1 + taxRate));
      const excl        = discountAmt - tax;
      const cost        = artwork?.purchase_price || 0;
      const purchaseDate = artwork?.purchased_at || date;
      const purchRate   = getTaxRate(purchaseDate, taxSettings.rates);
      const costExcl    = rnd(cost - cost / (1 + purchRate));
      // 売却損益＝値引きによる差額分のみ（値引きは売上を減らすのでマイナス）
      const profitLoss  = -excl;
      return { h, artwork, discountAmt, excl, tax, cost, costExcl, profitLoss };
    });

    // 売上値上げ行
    const soldIncreaseRows = dsi.map(h => {
      const artwork     = artworks.find(a => a.artwork_id === h.artwork_id);
      const increaseAmt = (h.new_price||0) - (h.old_price||0);
      const taxRate     = getTaxRate(date, taxSettings.rates);
      const rnd         = roundFn(taxSettings.rounding||"floor");
      const tax         = rnd(increaseAmt - increaseAmt / (1 + taxRate));
      const excl        = increaseAmt - tax;
      const cost        = artwork?.purchase_price || 0;
      const purchaseDate = artwork?.purchased_at || date;
      const purchRate   = getTaxRate(purchaseDate, taxSettings.rates);
      const costExcl    = rnd(cost - cost / (1 + purchRate));
      // 売却損益＝値上げによる差額分のみ（値上げは売上を増やすのでプラス）
      const profitLoss  = excl;
      return { h, artwork, increaseAmt, excl, tax, cost, costExcl, profitLoss };
    });

    const purchaseTotal        = purchaseRows.reduce((s,r) => s + r.price, 0);
    const purchaseDiscountTotal= purchaseDiscountRows.reduce((s,r) => s + r.discountAmt, 0);
    const purchaseIncreaseTotal= purchaseIncreaseRows.reduce((s,r) => s + r.increaseAmt, 0);
    const soldTotal            = soldRows.reduce((s,r) => s + r.price, 0);
    const soldDiscountTotal    = soldDiscountRows.reduce((s,r) => s + r.discountAmt, 0);
    const soldIncreaseTotal    = soldIncreaseRows.reduce((s,r) => s + r.increaseAmt, 0);
    const soldExclTotal        = soldRows.reduce((s,r) => s + r.excl, 0)
                               - soldDiscountRows.reduce((s,r) => s + r.excl, 0)
                               + soldIncreaseRows.reduce((s,r) => s + r.excl, 0);
    const costExclTotal        = soldRows.reduce((s,r) => s + r.costExcl, 0);

    return {
      date,
      purchaseRows, purchaseDiscountRows, purchaseIncreaseRows,
      soldRows, soldDiscountRows, soldIncreaseRows,
      purchaseTotal, purchaseDiscountTotal, purchaseIncreaseTotal,
      soldTotal, soldDiscountTotal, soldIncreaseTotal,
      soldExclTotal, costExclTotal,
    };
  });

  // 期の判定（設定された開始月ベース）：dateから期の基準年を返す
  const getFiscalYear = (dateStr) => {
    const d = new Date(dateStr);
    const m = d.getMonth(); // 0-indexed
    const y = d.getFullYear();
    return m >= fiscalStartMonth0 ? y : y - 1;
  };
  const getFiscalPeriod = (fy) => fy - fiscalOriginYear + 1;
  const getFiscalLabel  = (fy) => {
    const endMonth = fiscalStartMonth === 1 ? 12 : fiscalStartMonth - 1;
    const endYear  = fiscalStartMonth === 1 ? fy : fy + 1;
    return `第${getFiscalPeriod(fy)}期（${fy}年${fiscalStartMonth}月 〜 ${endYear}年${endMonth}月）`;
  };

  // 期ごとにグループ化（降順）
  const fiscalGroups = dailySummaries.reduce((acc, day) => {
    const fy = getFiscalYear(day.date);
    if (!acc[fy]) acc[fy] = [];
    acc[fy].push(day);
    return acc;
  }, {});
  const sortedFiscalYears = Object.keys(fiscalGroups).map(Number).sort((a,b) => b - a);

  if (allDates.length === 0) return (
    <div style={{color:"#5E6367",fontSize:13,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",padding:"60px 0",textAlign:"center"}}>取引データがありません</div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:0}}>
      {sortedFiscalYears.map(fy => {
        const days = fiscalGroups[fy];
        const fyPurchaseTotal = days.reduce((s,d) => s + d.purchaseTotal - d.purchaseDiscountTotal + (d.purchaseIncreaseTotal||0), 0);
        const fySoldTotal     = days.reduce((s,d) => s + d.soldTotal - d.soldDiscountTotal + (d.soldIncreaseTotal||0), 0);
        const fySoldExcl      = days.reduce((s,d) => s + d.soldExclTotal, 0);
        const fyCostExcl      = days.reduce((s,d) => s + d.costExclTotal, 0);
        const fyProfitLoss    = fySoldExcl - fyCostExcl;

        return (
          <div key={fy}>
            {/* 期ヘッダー＋累計 */}
            <div style={DR.fiscalHeader}>
              <div style={DR.fiscalTitle}>{getFiscalLabel(fy)}</div>
              <div style={DR.fiscalSummary}>
                <div style={DR.fiscalCell}>
                  <span style={DR.fiscalLabel}>仕入総累計</span>
                  <span style={{...DR.fiscalVal,color:"#1a1919"}}>{fmt(fyPurchaseTotal)}</span>
                </div>
                <div style={DR.fiscalCell}>
                  <span style={DR.fiscalLabel}>売上総累計</span>
                  <span style={{...DR.fiscalVal,color:"#1a1919"}}>{fmt(fySoldTotal)}</span>
                </div>
                <div style={DR.fiscalCell}>
                  <span style={DR.fiscalLabel}>売却損益累計</span>
                  <span style={{...DR.fiscalVal,color:"#1a1919"}}>{fmt(fyProfitLoss)}</span>
                </div>
              </div>
            </div>

            {/* 日別明細 */}
            {days.map(({ date, purchaseRows, purchaseDiscountRows, purchaseIncreaseRows, soldRows, soldDiscountRows, soldIncreaseRows, purchaseTotal, purchaseDiscountTotal, purchaseIncreaseTotal, soldTotal, soldDiscountTotal, soldIncreaseTotal, soldExclTotal, costExclTotal }) => {
              const isExpanded = expandedDate === date;
              return (
                <div key={date} style={DR.dayBlock}>

            {/* 日付ヘッダー */}
            <div style={DR.dayHeader}
              onClick={()=>setExpandedDate(isExpanded ? null : date)}
              onMouseEnter={e=>e.currentTarget.style.background="#efeeeb"}
              onMouseLeave={e=>e.currentTarget.style.background="#F9F9F7"}>
              <div style={DR.dayDateRow}>
                <span style={DR.dayDate}>{formatDayLabel(date)}</span>
                <span style={DR.expandIcon}>{isExpanded ? "▲" : "▼"}</span>
              </div>
              {(()=>{
                const dayPurchaseNet = purchaseTotal - purchaseDiscountTotal + purchaseIncreaseTotal;
                const daySoldNet = soldTotal - soldDiscountTotal + soldIncreaseTotal;
                // 売却損益＝売れた作品の売上（税抜）－その作品の原価（税抜）。
                // その日の仕入総額（dayPurchaseNet）とは無関係（仕入だけの日は売却損益は発生しない）
                const dayProfitLoss = soldExclTotal - costExclTotal;
                return (
                  <div style={DR.summaryGrid}>
                    <div style={DR.summaryCell}>
                      <span style={DR.summaryLabel}>仕入高
                        {purchaseDiscountTotal>0&&<span style={{fontSize:12,color:"#1a1919",marginLeft:4}}>▼{fmt(purchaseDiscountTotal)}</span>}
                        {purchaseIncreaseTotal>0&&<span style={{fontSize:12,color:"#1a1919",marginLeft:4}}>▲{fmt(purchaseIncreaseTotal)}</span>}
                      </span>
                      <span style={{...DR.summaryVal,color:"#1a1919"}}>{fmt(dayPurchaseNet)}</span>
                    </div>
                    <div style={DR.summaryCell}>
                      <span style={DR.summaryLabel}>売上高
                        {soldDiscountTotal>0&&<span style={{fontSize:12,color:"#1a1919",marginLeft:4}}>▼{fmt(soldDiscountTotal)}</span>}
                        {soldIncreaseTotal>0&&<span style={{fontSize:12,color:"#1a1919",marginLeft:4}}>▲{fmt(soldIncreaseTotal)}</span>}
                      </span>
                      <span style={{...DR.summaryVal,color:"#1a1919"}}>{fmt(daySoldNet)}</span>
                    </div>
                    <div style={DR.summaryCell}>
                      <span style={DR.summaryLabel}>売却損益高</span>
                      <span style={{...DR.summaryVal,color:"#1a1919"}}>{fmt(dayProfitLoss)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 展開：明細 */}
            {isExpanded && (() => {
              const purchaseSections = (
              <>
                {/* 仕入明細*/}
                {purchaseRows.length > 0 && (
                  <div style={DR.section}>
                    <div style={{...DR.sectionTitle,color:"#1a1919"}}>仕入</div>
                    {isMobile ? (
                      <div style={DR.cardList}>
                        {purchaseRows.map(({h,artwork,price,excl,taxCredit,inv,creditRate}) => (
                          <MobileTxnCard key={h.id} artwork={artwork} cpLabel="仕入先" cpName={h.counterparty}
                            badge={inv
                              ? <span style={DR.invoiceBadge}>✓ インボイス</span>
                              : <span style={DR.noInvoiceBadge}>未登録{creditRate<1?` ${(creditRate*100).toFixed(0)}%`:""}</span>}
                            amounts={[
                              {label:"仕入額", value:fmt(price), color:"#1a1919"},
                              {label:"税抜金額", value:fmt(excl)},
                              {label:"消費税額", value:fmt(taxCredit), color:"#5E6367"},
                            ]}
                            onClick={()=>artwork&&onSelectArtwork(artwork.artwork_id)} />
                        ))}
                        <div style={DR.cardFootTotal}>
                          <span style={DR.tfootLabel}>仕入 合計</span>
                          <span style={{...DR.tfootVal,color:"#1a1919"}}>{fmt(purchaseRows.reduce((s,r)=>s+r.price,0))}</span>
                        </div>
                      </div>
                    ) : (
                    <div style={DR.txnTable}>
                      <TxnGridHeader variant="p" cpLabel="仕入先" amount1Label="仕入額" />
                      {purchaseRows.map(({h,artwork,price,excl,taxCredit,inv,creditRate},i)=>(
                        <TxnGridData key={h.id} variant="p" artwork={artwork} cpName={h.counterparty}
                          bg={i%2===0?undefined:"#F9F9F7"}
                          badge={inv
                            ? <span style={DR.invoiceBadge}>✓ インボイス</span>
                            : <span style={DR.noInvoiceBadge}>未登録{creditRate<1?` ${(creditRate*100).toFixed(0)}%`:""}</span>}
                          amounts={[
                            {label:"仕入額", value:fmt(price), color:"#1a1919"},
                            {label:"税抜", value:fmt(excl)},
                            {label:"消費税", value:fmt(taxCredit), color:"#5E6367"},
                          ]}
                          onClick={()=>artwork&&onSelectArtwork(artwork.artwork_id)} />
                      ))}
                      <TxnGridFoot variant="p" label="仕入 合計" amounts={[
                        {label:"仕入額", value:fmt(purchaseRows.reduce((s,r)=>s+r.price,0)), color:"#1a1919"},
                        {label:"税抜", value:fmt(purchaseRows.reduce((s,r)=>s+r.excl,0))},
                        {label:"消費税", value:fmt(purchaseRows.reduce((s,r)=>s+r.taxCredit,0)), color:"#5E6367"},
                      ]} />
                    </div>
                    )}
                  </div>
                )}

                {/* 仕入値引き明細 */}
                {purchaseDiscountRows.length > 0 && (
                  <div style={DR.section}>
                    <div style={{...DR.sectionTitle,color:"#1a1919"}}>仕入値引き</div>
                    {isMobile ? (
                      <div style={DR.cardList}>
                        {purchaseDiscountRows.map(({h,artwork,discountAmt,excl,taxCredit,inv,creditRate}) => (
                          <MobileTxnCard key={h.id} artwork={artwork} cpLabel="仕入先" cpName={h.counterparty} bg="#F9F9F7"
                            badge={inv ? <span style={DR.invoiceBadge}>✓ インボイス</span>
                              : <span style={DR.noInvoiceBadge}>未登録{creditRate<1?` (${(creditRate*100).toFixed(0)}%控除)`:""}</span>}
                            amounts={[
                              {label:"値引き額", value:`-${fmt(discountAmt)}`, color:"#1a1919"},
                              {label:"税抜金額", value:`-${fmt(excl)}`, color:"#1a1919"},
                              {label:"消費税額", value:`-${fmt(taxCredit)}`, color:"#5E6367"},
                            ]}
                            onClick={()=>artwork&&onSelectArtwork(artwork.artwork_id)} />
                        ))}
                        <div style={DR.cardFootTotal}>
                          <span style={DR.tfootLabel}>値引き 合計</span>
                          <span style={{...DR.tfootVal,color:"#1a1919"}}>-{fmt(purchaseDiscountRows.reduce((s,r)=>s+r.discountAmt,0))}</span>
                        </div>
                      </div>
                    ) : (
                    <div style={DR.txnTable}>
                      <TxnGridHeader variant="p" cpLabel="仕入先" amount1Label="値引き額" />
                      {purchaseDiscountRows.map(({h,artwork,discountAmt,excl,taxCredit,inv,creditRate})=>(
                        <TxnGridData key={h.id} variant="p" artwork={artwork} cpName={h.counterparty} bg="#F9F9F7"
                          badge={inv ? <span style={DR.invoiceBadge}>✓ インボイス</span>
                            : <span style={DR.noInvoiceBadge}>未登録{creditRate<1?` (${(creditRate*100).toFixed(0)}%控除)`:""}</span>}
                          amounts={[
                            {label:"値引き額", value:`-${fmt(discountAmt)}`, color:"#1a1919"},
                            {label:"税抜", value:`-${fmt(excl)}`, color:"#1a1919"},
                            {label:"消費税", value:`-${fmt(taxCredit)}`, color:"#5E6367"},
                          ]}
                          onClick={()=>artwork&&onSelectArtwork(artwork.artwork_id)} />
                      ))}
                      <TxnGridFoot variant="p" label="値引き 合計" amounts={[
                        {label:"値引き額", value:`-${fmt(purchaseDiscountRows.reduce((s,r)=>s+r.discountAmt,0))}`, color:"#1a1919"},
                        {label:"税抜", value:`-${fmt(purchaseDiscountRows.reduce((s,r)=>s+r.excl,0))}`, color:"#1a1919"},
                        {label:"消費税", value:`-${fmt(purchaseDiscountRows.reduce((s,r)=>s+r.taxCredit,0))}`, color:"#5E6367"},
                      ]} />
                    </div>
                    )}
                  </div>
                )}

                {/* 仕入値上げ明細 */}
                {purchaseIncreaseRows.length > 0 && (
                  <div style={DR.section}>
                    <div style={{...DR.sectionTitle,color:"#1a1919"}}>仕入値上げ</div>
                    {isMobile ? (
                      <div style={DR.cardList}>
                        {purchaseIncreaseRows.map(({h,artwork,increaseAmt,excl,taxCredit}) => (
                          <MobileTxnCard key={h.id} artwork={artwork} cpLabel="仕入先" cpName={h.counterparty} bg="#F9F9F7"
                            amounts={[
                              {label:"値上げ額", value:`+${fmt(increaseAmt)}`, color:"#1a1919"},
                              {label:"税抜金額", value:`+${fmt(excl)}`, color:"#1a1919"},
                              {label:"消費税額", value:`+${fmt(taxCredit)}`, color:"#5E6367"},
                            ]}
                            onClick={()=>artwork&&onSelectArtwork(artwork.artwork_id)} />
                        ))}
                        <div style={DR.cardFootTotal}>
                          <span style={DR.tfootLabel}>値上げ 合計</span>
                          <span style={{...DR.tfootVal,color:"#1a1919"}}>+{fmt(purchaseIncreaseRows.reduce((s,r)=>s+r.increaseAmt,0))}</span>
                        </div>
                      </div>
                    ) : (
                    <div style={DR.txnTable}>
                      <TxnGridHeader variant="p" cpLabel="仕入先" amount1Label="値上げ額" />
                      {purchaseIncreaseRows.map(({h,artwork,increaseAmt,excl,taxCredit})=>(
                        <TxnGridData key={h.id} variant="p" artwork={artwork} cpName={h.counterparty} bg="#F9F9F7"
                          amounts={[
                            {label:"値上げ額", value:`+${fmt(increaseAmt)}`, color:"#1a1919"},
                            {label:"税抜", value:`+${fmt(excl)}`, color:"#1a1919"},
                            {label:"消費税", value:`+${fmt(taxCredit)}`, color:"#5E6367"},
                          ]}
                          onClick={()=>artwork&&onSelectArtwork(artwork.artwork_id)} />
                      ))}
                      <TxnGridFoot variant="p" label="値上げ 合計" amounts={[
                        {label:"値上げ額", value:`+${fmt(purchaseIncreaseRows.reduce((s,r)=>s+r.increaseAmt,0))}`, color:"#1a1919"},
                        {label:"税抜", value:`+${fmt(purchaseIncreaseRows.reduce((s,r)=>s+r.excl,0))}`, color:"#1a1919"},
                        {label:"消費税", value:`+${fmt(purchaseIncreaseRows.reduce((s,r)=>s+r.taxCredit,0))}`, color:"#5E6367"},
                      ]} />
                    </div>
                    )}
                  </div>
                )}
              </>
              );

              const salesSections = (
              <>
                {/* 売上明細*/}
                {soldRows.length > 0 && (
                  <div style={DR.section}>
                    <div style={{...DR.sectionTitle,color:"#1a1919"}}>売上</div>
                    {isMobile ? (
                      <div style={DR.cardList}>
                        {soldRows.map(({h,artwork,price,excl,tax,costExcl,profitLoss}) => (
                          <MobileTxnCard key={h.id} artwork={artwork} cpLabel="売上先" cpName={h.counterparty}
                            amounts={[
                              {label:"売上額", value:fmt(price), color:"#1a1919"},
                              {label:"税抜金額", value:fmt(excl)},
                              {label:"消費税額", value:fmt(tax), color:"#5E6367"},
                              {label:"原価", value:fmt(costExcl)},
                              {label:"売却損益", value:fmt(profitLoss), color:"#1a1919"},
                            ]}
                            onClick={()=>artwork&&onSelectArtwork(artwork.artwork_id)} />
                        ))}
                        <div style={DR.cardFootTotal}>
                          <span style={DR.tfootLabel}>売上 合計</span>
                          <span style={{...DR.tfootVal,color:"#1a1919"}}>{fmt(soldRows.reduce((s,r)=>s+r.price,0))}</span>
                        </div>
                      </div>
                    ) : (
                    <div style={DR.txnTable}>
                      <TxnGridHeader variant="s" cpLabel="売上先" amount1Label="売上額" />
                      {soldRows.map(({h,artwork,price,excl,tax,costExcl,profitLoss},i)=>(
                        <TxnGridData key={h.id} variant="s" artwork={artwork} cpName={h.counterparty}
                          bg={i%2===0?undefined:"#F9F9F7"}
                          amounts={[
                            {label:"売上額", value:fmt(price), color:"#1a1919"},
                            {label:"税抜", value:fmt(excl)},
                            {label:"消費税", value:fmt(tax), color:"#5E6367"},
                          ]}
                          cost={{value:fmt(costExcl)}}
                          profit={{value:fmt(profitLoss), color:"#1a1919"}}
                          onClick={()=>artwork&&onSelectArtwork(artwork.artwork_id)} />
                      ))}
                      <TxnGridFoot variant="s" label="売上 合計" amounts={[
                        {label:"売上額", value:fmt(soldRows.reduce((s,r)=>s+r.price,0)), color:"#1a1919"},
                        {label:"税抜", value:fmt(soldExclTotal)},
                        {label:"消費税", value:fmt(soldRows.reduce((s,r)=>s+r.tax,0)), color:"#5E6367"},
                      ]}
                        cost={{value:fmt(costExclTotal)}}
                        profit={{value:fmt(soldExclTotal-costExclTotal), color:"#1a1919"}}
                      />
                    </div>
                    )}
                  </div>
                )}

                {/* 売上値引き明細 */}
                {soldDiscountRows.length > 0 && (
                  <div style={DR.section}>
                    <div style={{...DR.sectionTitle,color:"#1a1919"}}>売上値引き</div>
                    {isMobile ? (
                      <div style={DR.cardList}>
                        {soldDiscountRows.map(({h,artwork,discountAmt,excl,tax,costExcl}) => (
                          <MobileTxnCard key={h.id} artwork={artwork} cpLabel="売上先" cpName={h.counterparty} bg="#F9F9F7"
                            amounts={[
                              {label:"値引き額", value:`-${fmt(discountAmt)}`, color:"#1a1919"},
                              {label:"税抜金額", value:`-${fmt(excl)}`, color:"#1a1919"},
                              {label:"消費税額", value:`-${fmt(tax)}`, color:"#5E6367"},
                              {label:"原価", value:fmt(costExcl), color:"#5E6367"},
                              {label:"売却損益", value:`-${fmt(excl)}`, color:"#1a1919"},
                            ]}
                            onClick={()=>artwork&&onSelectArtwork(artwork.artwork_id)} />
                        ))}
                        <div style={DR.cardFootTotal}>
                          <span style={DR.tfootLabel}>値引き 合計</span>
                          <span style={{...DR.tfootVal,color:"#1a1919"}}>-{fmt(soldDiscountTotal)}</span>
                        </div>
                      </div>
                    ) : (
                    <div style={DR.txnTable}>
                      <TxnGridHeader variant="s" cpLabel="売上先" amount1Label="値引き額" />
                      {soldDiscountRows.map(({h,artwork,discountAmt,excl,tax,costExcl,profitLoss})=>(
                        <TxnGridData key={h.id} variant="s" artwork={artwork} cpName={h.counterparty} bg="#F9F9F7"
                          amounts={[
                            {label:"値引き額", value:`-${fmt(discountAmt)}`, color:"#1a1919"},
                            {label:"税抜", value:`-${fmt(excl)}`, color:"#1a1919"},
                            {label:"消費税", value:`-${fmt(tax)}`, color:"#5E6367"},
                          ]}
                          cost={{value:fmt(costExcl)}}
                          profit={{value:`-${fmt(excl)}`, color:"#1a1919"}}
                          onClick={()=>artwork&&onSelectArtwork(artwork.artwork_id)} />
                      ))}
                      <TxnGridFoot variant="s" label="値引き 合計" amounts={[
                        {label:"値引き額", value:`-${fmt(soldDiscountTotal)}`, color:"#1a1919"},
                        {label:"税抜", value:`-${fmt(soldDiscountRows.reduce((s,r)=>s+r.excl,0))}`, color:"#1a1919"},
                        {label:"消費税", value:`-${fmt(soldDiscountRows.reduce((s,r)=>s+r.tax,0))}`, color:"#5E6367"},
                      ]}
                        cost={{value:fmt(soldDiscountRows.reduce((s,r)=>s+r.costExcl,0))}}
                        profit={{value:`-${fmt(soldDiscountRows.reduce((s,r)=>s+r.excl,0))}`, color:"#1a1919"}}
                      />
                    </div>
                    )}
                  </div>
                )}

                {/* 売上値上げ明細 */}
                {soldIncreaseRows.length > 0 && (
                  <div style={DR.section}>
                    <div style={{...DR.sectionTitle,color:"#1a1919"}}>売上値上げ</div>
                    {isMobile ? (
                      <div style={DR.cardList}>
                        {soldIncreaseRows.map(({h,artwork,increaseAmt,excl,tax,costExcl}) => (
                          <MobileTxnCard key={h.id} artwork={artwork} cpLabel="売上先" cpName={h.counterparty} bg="#F9F9F7"
                            amounts={[
                              {label:"値上げ額", value:`+${fmt(increaseAmt)}`, color:"#1a1919"},
                              {label:"税抜金額", value:`+${fmt(excl)}`, color:"#1a1919"},
                              {label:"消費税額", value:`+${fmt(tax)}`, color:"#5E6367"},
                              {label:"原価", value:fmt(costExcl), color:"#5E6367"},
                              {label:"売却損益", value:`+${fmt(excl)}`, color:"#1a1919"},
                            ]}
                            onClick={()=>artwork&&onSelectArtwork(artwork.artwork_id)} />
                        ))}
                        <div style={DR.cardFootTotal}>
                          <span style={DR.tfootLabel}>値上げ 合計</span>
                          <span style={{...DR.tfootVal,color:"#1a1919"}}>+{fmt(soldIncreaseRows.reduce((s,r)=>s+r.increaseAmt,0))}</span>
                        </div>
                      </div>
                    ) : (
                    <div style={DR.txnTable}>
                      <TxnGridHeader variant="s" cpLabel="売上先" amount1Label="値上げ額" />
                      {soldIncreaseRows.map(({h,artwork,increaseAmt,excl,tax,costExcl})=>(
                        <TxnGridData key={h.id} variant="s" artwork={artwork} cpName={h.counterparty} bg="#F9F9F7"
                          amounts={[
                            {label:"値上げ額", value:`+${fmt(increaseAmt)}`, color:"#1a1919"},
                            {label:"税抜", value:`+${fmt(excl)}`, color:"#1a1919"},
                            {label:"消費税", value:`+${fmt(tax)}`, color:"#5E6367"},
                          ]}
                          cost={{value:fmt(costExcl)}}
                          profit={{value:`+${fmt(excl)}`, color:"#1a1919"}}
                          onClick={()=>artwork&&onSelectArtwork(artwork.artwork_id)} />
                      ))}
                      <TxnGridFoot variant="s" label="値上げ 合計" amounts={[
                        {label:"値上げ額", value:`+${fmt(soldIncreaseRows.reduce((s,r)=>s+r.increaseAmt,0))}`, color:"#1a1919"},
                        {label:"税抜", value:`+${fmt(soldIncreaseRows.reduce((s,r)=>s+r.excl,0))}`, color:"#1a1919"},
                        {label:"消費税", value:`+${fmt(soldIncreaseRows.reduce((s,r)=>s+r.tax,0))}`, color:"#5E6367"},
                      ]}
                        cost={{value:fmt(soldIncreaseRows.reduce((s,r)=>s+r.costExcl,0))}}
                        profit={{value:`+${fmt(soldIncreaseRows.reduce((s,r)=>s+r.excl,0))}`, color:"#1a1919"}}
                      />
                    </div>
                    )}
                  </div>
                )}
              </>
              );

              return (
                <div style={DR.detail}>
                  {isMobile ? (
                    <>{purchaseSections}{salesSections}</>
                  ) : (
                    <div style={DR.detailCols}>
                      <div style={DR.detailColLeft}>{purchaseSections}</div>
                      <div style={DR.detailCol}>{salesSections}</div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        );
      })}
      </div>
    );
  })}
    </div>
  );
}


const DR = {
  dayBlock:      { borderBottom:"1px solid #C6C6C8" },
  dayHeader:     { padding:"14px 10px", cursor:"pointer", transition:"background 0.15s", background:"#F9F9F7" },
  dayDateRow:    { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 },
  dayDate:       { fontSize:15, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", letterSpacing:"0.05em" },
  expandIcon:    { fontSize:10, color:"#5E6367" },
  summaryGrid:   { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 },
  summaryCell:   { display:"flex", flexDirection:"column", gap:3 },
  summaryLabel:  { fontSize:10, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  summaryVal:    { fontSize:15, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontWeight:700 },
  detail:        { padding:"0 6px 14px", display:"flex", flexDirection:"column", gap:10 },
  detailCols:    { display:"flex", flexDirection:"column", gap:16 },
  detailCol:     { display:"flex", flexDirection:"column", gap:10, width:"100%" },
  detailColLeft: { display:"flex", flexDirection:"column", gap:10, width:"100%" },
  section:       { background:"#F9F9F7", border:"1px solid #ece9e2", borderRadius:8, padding:"10px 10px" },
  sectionTitle:  { fontSize:12, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", letterSpacing:"0.08em", marginBottom:8, fontWeight:600 },
  txnGridHeader: { borderBottom:"1px solid #C6C6C8", marginBottom:2 },
  hCp:           { gridColumn:1, gridRow:1, fontSize:10, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", minWidth:0, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" },
  hInfo:         { gridColumn:2, gridRow:1, fontSize:10, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", minWidth:0, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" },
  hAmt1:         { gridColumn:3, gridRow:1, textAlign:"right", fontSize:10, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", minWidth:0, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" },
  hCostProfit:   { gridColumn:4, gridRow:1, textAlign:"right", fontSize:10, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", minWidth:0, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" },
  tbl:           { width:"auto", borderCollapse:"collapse", minWidth:560, fontSize:12, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  tblWide:       { width:"auto", borderCollapse:"collapse", minWidth:680, fontSize:12, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  thead:         { borderBottom:"1px solid #C6C6C8" },
  thId:          { padding:"4px 6px", textAlign:"left", fontSize:10, color:"#5E6367", whiteSpace:"nowrap", width:72 },
  thText:        { padding:"4px 6px", textAlign:"left", fontSize:10, color:"#5E6367", whiteSpace:"nowrap" },
  thArtwork:     { padding:"4px 6px", textAlign:"left", fontSize:10, color:"#5E6367", whiteSpace:"nowrap", minWidth:160 },
  thNum:         { padding:"4px 6px", textAlign:"right", fontSize:10, color:"#5E6367", whiteSpace:"nowrap" },
  trow:          { borderBottom:"1px solid #C6C6C8", cursor:"pointer", transition:"background 0.1s" },
  tdId:          { padding:"7px 6px", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontSize:12, color:"#1a1919", fontWeight:700, whiteSpace:"nowrap", verticalAlign:"top" },
  tdText:        { padding:"7px 6px", fontSize:12, color:"#5E6367", whiteSpace:"nowrap", verticalAlign:"top", maxWidth:120, overflow:"hidden", textOverflow:"ellipsis" },
  tdTitle:       { padding:"7px 6px", fontSize:12, color:"#1a1919", fontWeight:600, whiteSpace:"nowrap", verticalAlign:"top", maxWidth:140, overflow:"hidden", textOverflow:"ellipsis" },
  tdArtwork:     { padding:"7px 6px", fontSize:12, verticalAlign:"top", maxWidth:260 },
  tdArtworkArtist:{ color:"#5E6367", fontSize:11, marginBottom:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  tdArtworkTitle: { color:"#1a1919", fontWeight:600, fontSize:12, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  tdArtworkSize:  { color:"#5E6367", fontSize:10.5, marginTop:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  tdNum:         { padding:"7px 6px", textAlign:"right", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontSize:13, whiteSpace:"nowrap", verticalAlign:"top" },
  tfoot:         { borderTop:"2px solid #C6C6C8", background:"#F9F9F7" },
  tfootLabel:    { padding:"6px 6px", fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  tfootVal:      { fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontSize:14, fontWeight:700 },
  fiscalHeader:  { background:"#FFFFFF", border:"1px solid #C6C6C8", borderRadius:10, padding:"14px 14px", margin:"16px 0 0", position:"sticky", top:0, zIndex:10 },
  fiscalTitle:   { fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", letterSpacing:"0.08em", marginBottom:10, fontWeight:600 },
  fiscalSummary: { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 },
  fiscalCell:    { display:"flex", flexDirection:"column", gap:3 },
  fiscalLabel:   { fontSize:10, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  fiscalVal:     { fontSize:16, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontWeight:700 },
  invoiceBadge:  { fontSize:9, background:"#22c55e22", color:"#22c55e", border:"1px solid #22c55e44", padding:"1px 5px", borderRadius:8, whiteSpace:"nowrap" },
  noInvoiceBadge:{ fontSize:9, background:"#f8717122", color:"#f87171", border:"1px solid #f8717144", padding:"1px 5px", borderRadius:8, whiteSpace:"nowrap" },

  // ── PC：flex行（取引情報を左、金額情報を右に両端配置） ──
  txnTable:      { display:"flex", flexDirection:"column", width:"100%" },

  // ── PC：4行ミニグリッド（作品ID/作家名/タイトル/サイズを縦積み、金額を該当行に配置） ──
  // 列構成（仕入系=3列 / 売上系=5列）。列幅は固定し、どの行でも金額の開始位置が揃う。
  // 各列を画面幅に応じて比例配分（minmaxの下限は読みやすさを保つための最低幅）
  // 仕入先/売上先20%・作品情報30%・仕入額/売上額25%・原価／売却損益25%（比率4:6:5:5）
  // 純粋な比率のみ（下限なし）なので箱の幅にかかわらず必ず端まで埋まる
  // 仕入・売上で同じ列幅の型を共有：仕入は列4（原価／売却損益）を使わないため、
  // 仕入・売上を縦に並べても列の境界が揃い、仕入の右側は自然に空白になる
  txnGridCols:   { gridTemplateColumns:"4fr 6fr 5fr 5fr", columnGap:10 },
  txnGridRow:    { display:"grid", width:"100%", gridTemplateRows:"repeat(4, auto)", columnGap:10, rowGap:0, alignItems:"center", padding:"5px 8px" },
  txnGridHead:   { borderBottom:"1px solid #C6C6C8" },
  txnGridData:   { borderBottom:"1px solid #C6C6C8", cursor:"pointer", transition:"background 0.1s" },
  txnGridFoot:   { borderTop:"2px solid #C6C6C8", background:"#F9F9F7" },

  gCounterparty: { gridColumn:1, gridRow:"1 / span 4", alignSelf:"center", minWidth:0, overflow:"hidden" },
  gId:           { gridColumn:2, gridRow:1, minWidth:0, overflow:"hidden" },
  gArtist:       { gridColumn:2, gridRow:2, minWidth:0, overflow:"hidden" },
  gTitle:        { gridColumn:2, gridRow:3, minWidth:0, overflow:"hidden" },
  gSize:         { gridColumn:2, gridRow:4, minWidth:0, overflow:"hidden" },
  gAmount1:      { gridColumn:3, gridRow:1, textAlign:"right", minWidth:0 },
  gAmount2:      { gridColumn:3, gridRow:3, textAlign:"right", minWidth:0 },
  gAmount3:      { gridColumn:3, gridRow:4, textAlign:"right", minWidth:0 },
  gCostProfit:   { gridColumn:4, gridRow:"1 / span 4", alignSelf:"center", display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2, width:"100%" },

  gHeadLabel:    { fontSize:10, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", whiteSpace:"nowrap" },
  gHeadLabelR:   { fontSize:10, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", whiteSpace:"nowrap", display:"block" },
  gCpName:       { fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", whiteSpace:"normal", wordBreak:"break-word", lineHeight:1.4 },
  gIdVal:        { fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontSize:12, color:"#1a1919", fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", display:"block" },
  gTextVal:      { fontSize:11, color:"#5E6367", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", display:"block" },
  gTitleVal:     { fontSize:12, color:"#1a1919", fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", display:"block" },
  gSizeVal:      { fontSize:10.5, color:"#5E6367", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", display:"block" },
  gAmountLabel:  { fontSize:9.5, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", whiteSpace:"nowrap", display:"block", marginBottom:1 },
  gAmountMain:   { fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontSize:14, fontWeight:700, whiteSpace:"nowrap", display:"block" },
  gAmountSub:    { fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontSize:12, whiteSpace:"nowrap", display:"block" },
  gAmountTax:    { fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontSize:11, whiteSpace:"nowrap", display:"block" },
  gAmountVal:    { fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontSize:13, whiteSpace:"nowrap" },
  // 横並びラベル付き金額行（ラベル 数値）
  gAmountRow:    { display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:6, whiteSpace:"nowrap" },
  gAmountRowLabel:{ fontSize:9.5, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", flexShrink:0 },
  gAmountRowSub: { fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontSize:12, whiteSpace:"nowrap" },
  gAmountRowTax: { fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontSize:11, whiteSpace:"nowrap" },
  gFootLabel:    { fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", whiteSpace:"nowrap" },
  gFootVal:      { fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontSize:14, fontWeight:700, whiteSpace:"nowrap" },

  // ── スマホ：カード型行 ──
  cardList:      { display:"flex", flexDirection:"column", gap:8 },
  card:          { borderRadius:8, padding:"10px 12px", cursor:"pointer" },
  cardTopRow:    { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 },
  cardId:        { fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontSize:12, color:"#1a1919", fontWeight:700 },
  cardCp:        { fontSize:11, color:"#5E6367", textAlign:"right" },
  cardArtist:    { fontSize:11, color:"#5E6367", marginBottom:1 },
  cardTitle:     { fontSize:13, color:"#1a1919", fontWeight:700, marginBottom:1 },
  cardSize:      { fontSize:10.5, color:"#5E6367", marginBottom:8 },
  cardAmountRow: { display:"flex", flexWrap:"wrap", gap:"4px 14px", borderTop:"1px solid #C6C6C888", paddingTop:6 },
  cardAmountCell:{ display:"flex", flexDirection:"column", gap:1, minWidth:72 },
  cardAmountLabel:{ fontSize:9.5, color:"#5E6367" },
  cardAmountVal: { fontSize:13, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontWeight:600 },
  cardFootTotal: { display:"flex", justifyContent:"space-between", padding:"8px 12px", marginTop:2, borderRadius:8, background:"#F9F9F7", border:"1px solid #C6C6C8" },
};


// ─── 詳細ページヘルパー ─────────────────────────────────────────
function TxBlock({ color, title, children }) {
  return (
    <div style={{ marginBottom:12, borderLeft:`3px solid ${color}55`, paddingLeft:10 }}>
      <div style={{ fontSize:10, letterSpacing:"0.08em", color, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontWeight:600, marginBottom:6 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function TxRow({ label, val, color, large }) {
  if (val == null || val === "" || val === "—") return null;
  return (
    <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:4 }}>
      <span style={{ fontSize:11, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", flexShrink:0, minWidth:72 }}>{label}</span>
      <span style={{ fontSize: large ? 15 : 13, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", color: color||"#5E6367", fontWeight: large ? 600 : 400 }}>
        {val}
      </span>
    </div>
  );
}

// 年・月・日を分割入力する日付コンポーネント
// Safari等でtype="date"の年に6桁まで入力できてしまう問題を回避するため、
// 年(4桁)・月(2桁)・日(2桁)を独立した入力欄にし、桁数を物理的に制限する。
// あわせて「4月31日」のような実在しない日付をリアルタイムで検知し、赤枠＋メッセージで知らせる
// （自動補正はしない＝入力者が気づかないうちに値が変わることを避けるため）。
function SplitDateInput({ value, onChange, compact }) {
  const parse = (v) => {
    const mch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v || "");
    return mch ? { y: mch[1], mo: String(Number(mch[2])), d: String(Number(mch[3])) } : { y: "", mo: "", d: "" };
  };
  const [y, setY]   = useState(() => parse(value).y);
  const [mo, setMo] = useState(() => parse(value).mo);
  const [d, setD]   = useState(() => parse(value).d);
  const lastEmitted = useRef(value || "");

  useEffect(() => {
    if (value !== lastEmitted.current) {
      const p = parse(value);
      setY(p.y); setMo(p.mo); setD(p.d);
      lastEmitted.current = value || "";
    }
  }, [value]);

  const mRef = useRef<HTMLInputElement>(null);
  const dRef = useRef<HTMLInputElement>(null);
  const pad2 = (n) => String(n).padStart(2, "0");

  const emit = (ny, nmo, nd) => {
    const composed = (ny.length === 4 && nmo !== "" && nd !== "") ? `${ny}-${pad2(nmo)}-${pad2(nd)}` : "";
    lastEmitted.current = composed;
    onChange(composed);
  };
  const onY  = (e) => { const v=e.target.value.replace(/[^0-9]/g,"").slice(0,4); setY(v);  emit(v,mo,d); if(v.length===4) mRef.current?.focus(); };
  const onMo = (e) => { const v=e.target.value.replace(/[^0-9]/g,"").slice(0,2); setMo(v); emit(y,v,d);  if(v.length===2) dRef.current?.focus(); };
  const onD  = (e) => { const v=e.target.value.replace(/[^0-9]/g,"").slice(0,2); setD(v);  emit(y,mo,v); };

  let errorMsg = "";
  if (y.length===4 && mo!=="" && d!=="") {
    const yi=Number(y), moi=Number(mo), di=Number(d);
    if (moi<1||moi>12) errorMsg = "月は1〜12で入力してください";
    else { const dim=daysInMonthOf(yi,moi); if(di<1||di>dim) errorMsg = `${moi}月は${dim}日までです`; }
  }

  const box = { ...S.formInput, textAlign:"center" as const,
    padding: compact ? "6px 4px" : "9px 6px", fontSize: compact ? 12 : 13 };
  const wy = compact?46:60, wmd = compact?28:40;
  const errStyle = errorMsg ? { borderColor:"#f87171" } : {};

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:4}}>
        <input inputMode="numeric" placeholder="年" value={y} onChange={onY}
          style={{...box,...errStyle,width:wy,flex:"none"}}/>
        <span style={{color:"#5E6367"}}>/</span>
        <input inputMode="numeric" placeholder="月" value={mo} onChange={onMo} ref={mRef}
          style={{...box,...errStyle,width:wmd,flex:"none"}}/>
        <span style={{color:"#5E6367"}}>/</span>
        <input inputMode="numeric" placeholder="日" value={d} onChange={onD} ref={dRef}
          style={{...box,...errStyle,width:wmd,flex:"none"}}/>
      </div>
      {errorMsg && <div style={{fontSize:11,color:"#f87171",marginTop:4,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}>{errorMsg}</div>}
    </div>
  );
}

// ─── フォームヘルパー ───────────────────────────────────────────
function Field({ label, required, fullWidth, badge, children }) {
  return (
    <div style={{ ...S.formGrid, display:"flex", flexDirection:"column", gap:6,
      ...(fullWidth ? { gridColumn:"1/-1" } : {}) }}>
      <label style={{...S.formLabel, display:"flex", alignItems:"center", gap:6}}>
        {label}{required && <span style={{ color:"#f87171", marginLeft:2 }}>*</span>}
        {badge}
      </label>
      {children}
    </div>
  );
}

function CpSelect({ counterparties, value, cpId, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState("");
  const [cursor, setCursor] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const filtered = counterparties.filter(c => {
    const nq = hiraToKata(q).toLowerCase().replace(/[\s\u3000]+/g,"");
    return !nq || [c.name, c.company, c.name_kana].some(s => (s||"").toLowerCase().replace(/[\s\u3000]+/g,"").includes(nq));
  });
  const cpDisplayName = (cp) => cp ? (cp.name || cp.company || "—") : "—";
  const select = (cp) => { onChange(cpDisplayName(cp), cp.cp_id||cp.id); setOpen(false); setQ(""); setCursor(-1); };
  const handleKey = (e) => {
    if (!open) { if(e.key==="ArrowDown"||e.key==="Enter") setOpen(true); return; }
    if (e.key==="ArrowDown") { e.preventDefault(); setCursor(c=>Math.min(c+1,filtered.length-1)); }
    else if (e.key==="ArrowUp") { e.preventDefault(); setCursor(c=>Math.max(c-1,0)); }
    else if (e.key==="Enter") { if(cursor>=0&&filtered[cursor]) select(filtered[cursor]); }
    else if (e.key==="Escape") { setOpen(false); setCursor(-1); }
  };
  return (
    <div style={{ position:"relative" }}>
      <div style={{ position:"relative" }}>
        <input style={{ ...S.formInput, flex:1, paddingRight:32 }} placeholder={placeholder||"取引先を選択または入力"}
          value={value} onChange={e => { onChange(e.target.value, null); setCursor(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey} />
        <button type="button" style={{position:"absolute",right:0,top:0,bottom:0,width:32,background:"transparent",border:"none",cursor:"pointer",color:"#5A57A6",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={() => setOpen(o => !o)}>▾</button>
      </div>
      {cpId && <div style={{ fontSize:11, color:"#5A57A6", marginTop:2 }}>✓ 取引先DBと連携済み</div>}
      {open && (
        <div style={S.cpDropdown}>
          <input style={{ ...S.formInput, margin:"8px 8px 4px", width:"calc(100% - 16px)", fontSize:12, boxSizing:"border-box" }}
            placeholder="絞り込み（フリガナ可）…" value={q}
            onChange={e => { setQ(e.target.value); setCursor(-1); }}
            onKeyDown={handleKey} autoFocus />
          <div ref={listRef} style={{ maxHeight:160, overflowY:"auto" }}>
            {filtered.map((cp,i) => (
              <div key={cp.id} style={{...S.cpDropdownItem,...(cursor===i?{background:"#efeeeb"}:{})}}
                onClick={() => select(cp)}
                onMouseEnter={()=>setCursor(i)}
                onMouseLeave={()=>{}}>
                <span style={{ fontWeight:600 }}>{cpDisplayName(cp)}</span>
                {cp.name_kana&&<span style={{fontSize:11,color:"#5E6367",marginLeft:6}}>{cp.name_kana}</span>}
              </div>
            ))}
          </div>
          <button style={S.cpDropdownClose} onClick={() => { setOpen(false); setQ(""); setCursor(-1); }}>閉じる</button>
        </div>
      )}
    </div>
  );
}

// ─── グローバルスタイル ─────────────────────────────────────────
const S = {
  root:        { display:"flex", height:"100vh", background:"#F9F9F7", color:"#1a1919", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", overflow:"hidden" },
  sidebar:     { width:220, flexShrink:0, background:"#F9F9F7", borderRight:"1px solid #C6C6C8", display:"flex", flexDirection:"column", padding:"28px 16px", gap:8 },
  logo:        { display:"flex", alignItems:"center", gap:10, marginBottom:28, paddingBottom:20, borderBottom:"1px solid #C6C6C8" },
  logoMark:    { fontSize:28, color:"#5A57A6" },
  logoTitle:   { fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontSize:18, fontWeight:700, letterSpacing:"0.2em" },
  logoSub:     { fontSize:9, letterSpacing:"0.1em", color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  nav:         { display:"flex", flexDirection:"column", gap:4 },
  navItem:     { display:"flex", alignItems:"center", gap:8, padding:"10px 12px", borderRadius:8, border:"none", background:"transparent", color:"#5E6367", cursor:"pointer", fontSize:13, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", transition:"background 0.15s, color 0.15s", textAlign:"left" },
  navActive:   { background:"#C6C6C8", color:"#1a1919" },
  navAdd:      { marginTop:0, background:"#F9F9F7", color:"#1a1919", border:"1px solid #C6C6C8" },
  navAdd2:     { background:"#F9F9F7", color:"#1a1919", border:"1px solid #C6C6C8" },
  navDivider:  { height:1, background:"#C6C6C8", margin:"8px 0" },
  navIcon:     { fontSize:16 },
  sideStats:   { marginTop:"auto", display:"flex", flexDirection:"column", gap:10, padding:"14px 12px", background:"#F9F9F7", borderRadius:10, border:"1px solid #C6C6C8" },
  statItem:    { display:"flex", justifyContent:"space-between", alignItems:"center" },
  statNum:     { fontSize:20, fontWeight:700, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  statLab:     { fontSize:11, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  main:        { flex:1, overflow:"auto", background:"#F9F9F7" },
  content:     { padding:"24px 16px 70px" },
  contentPc:   { padding:"36px 40px", maxWidth:800, margin:"0 auto", boxSizing:"border-box" },
  pageHeader:  { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 },
  pageTitle:   { fontSize:26, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", letterSpacing:"0.05em", fontWeight:600, margin:0 },
  toolbar:     { display:"flex", gap:10, marginBottom:16, alignItems:"center", flexWrap:"wrap" },
  search:      { flex:1, minWidth:180, background:"#FFFFFF", border:"1px solid #C6C6C8", borderRadius:8, padding:"8px 14px", color:"#1a1919", fontSize:13, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", outline:"none" },
  searchBar:   { background:"#FFFFFF", border:"1px solid #C6C6C8", borderRadius:8, padding:"8px 14px", color:"#1a1919", fontSize:13, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", outline:"none", width:"100%", boxSizing:"border-box", marginBottom:10 },
  filterGroup: { display:"flex", gap:6, flexWrap:"wrap" },
  filterBtn:   { padding:"6px 12px", borderRadius:20, border:"1px solid #C6C6C8", background:"transparent", color:"#5E6367", cursor:"pointer", fontSize:12, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  filterActive:{ background:"#081319", color:"#fff", borderColor:"#081319" },
  filter:      { padding:"6px 12px", borderRadius:20, border:"1px solid #C6C6C8", background:"transparent", color:"#5E6367", cursor:"pointer", fontSize:12, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  tableOuter:  { overflowX:"auto" },
  tableWrap:   { overflowX:"auto" },
  table:       { width:"100%", borderCollapse:"collapse", minWidth:900 },
  th:          { textAlign:"left", padding:"10px 12px", fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", letterSpacing:"0.05em", borderBottom:"1px solid #C6C6C8", whiteSpace:"nowrap" },
  tr:          { cursor:"pointer", transition:"background 0.15s" },
  td:          { padding:"13px 12px", fontSize:13, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", borderBottom:"1px solid #C6C6C8", color:"#5E6367", whiteSpace:"nowrap", verticalAlign:"top" },
  price:       { fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontSize:14, color:"#1a1919" },
  statusBadge: { padding:"3px 9px", borderRadius:20, fontSize:12, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  arrowBtn:    { color:"#5E6367", fontSize:14 },
  empty:       { textAlign:"center", color:"#5E6367", padding:"60px 0", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontSize:13 },
  backBtn:     { background:"none", border:"none", color:"#5E6367", cursor:"pointer", fontSize:13, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", marginBottom:20, padding:0 },
  detailGrid:       { display:"grid", gridTemplateColumns:"360px 1fr", gap:24 },
  detailGridMobile: { display:"flex", flexDirection:"column", gap:16 },
  detailCard:  { background:"#F9F9F7", border:"1px solid #C6C6C8", borderRadius:12, overflow:"hidden" },
  artThumb:    { height:200, background:"linear-gradient(135deg,#EAE9F3 0%,#FFFFFF 100%)", display:"flex", alignItems:"center", justifyContent:"center", borderBottom:"1px solid #C6C6C8" },
  artThumbIcon:{ fontSize:60, color:"#C6C6C8" },
  detailInfo:      { padding:"20px 22px" },
  detailStatusRow: { marginBottom:10 },
  detailTitle:     { fontSize:22, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", margin:"0 0 4px", fontWeight:700 },
  detailArtist:    { color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontSize:14, margin:"0 0 12px" },
  detailMeta:      { display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 },
  metaTag:         { background:"#C6C6C8", padding:"2px 8px", borderRadius:4, fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  metaTagPlain:    { fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  historyPanel:    { background:"#F9F9F7", border:"1px solid #C6C6C8", borderRadius:12, padding:"22px 24px", display:"flex", flexDirection:"column" },
  historyHeader:   { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 },
  historyTitle:    { fontSize:16, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontWeight:600, margin:0 },
  addEventBtn:     { padding:"6px 14px", borderRadius:8, border:"1px solid #5A57A655", background:"#EAE9F3", color:"#5A57A6", cursor:"pointer", fontSize:12, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  timeline:        { display:"flex", flexDirection:"column", gap:0 },
  timelineItem:    { display:"flex", gap:14 },
  timelineLine:    { display:"flex", flexDirection:"column", alignItems:"center", paddingTop:4, flexShrink:0, width:16 },
  timelineDot:     { width:10, height:10, borderRadius:"50%", flexShrink:0 },
  timelineConnector:{ flex:1, width:2, background:"#C6C6C8", marginTop:4, minHeight:16 },
  timelineBody:    { paddingBottom:20, flex:1 },
  timelineTop:     { display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" },
  eventTag:        { padding:"2px 8px", borderRadius:12, fontSize:12, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  timelineDate:    { fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  timelineCp:      { fontSize:13, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", color:"#5E6367", marginBottom:4, display:"flex", alignItems:"center", gap:5 },
  timelinePrices:  { display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" },
  oldPrice:        { fontSize:13, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", textDecoration:"line-through" },
  arrow:           { color:"#5E6367", fontSize:12 },
  newPrice:        { fontSize:15, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontWeight:600 },
  timelineMemo:    { fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  formCard:         { background:"#F9F9F7", border:"1px solid #C6C6C8", borderRadius:12, padding:"24px 24px 20px" },
  formSectionTitle: { fontSize:12, letterSpacing:"0.08em", color:"#5A57A6", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", marginBottom:14, fontWeight:600 },
  formGrid:         { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px 20px" },
  formLabel:        { fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  formInput:        { background:"#FFFFFF", border:"1px solid #C6C6C8", borderRadius:8, padding:"9px 12px", color:"#1a1919", fontSize:13, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", outline:"none", width:"100%", boxSizing:"border-box", WebkitAppearance:"none", appearance:"none" },
  formSub:          { color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontSize:13, marginBottom:20 },
  submitBtn:        { marginTop:20, padding:"11px 28px", background:"#5A57A6", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontSize:14, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontWeight:600 },
  submitDisabled:   { background:"#C6C6C8", color:"#5E6367", cursor:"not-allowed" },
  cpTypeBadge:  { padding:"2px 8px", borderRadius:12, fontSize:11, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", border:"1px solid" },
  cpLink:       { color:"#5A57A6", cursor:"pointer", textDecoration:"none" },
  cpArtworkItem:{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #C6C6C8", fontSize:13, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", color:"#5E6367" },
  cpDropdown:     { position:"absolute", top:"100%", left:0, right:0, background:"#FFFFFF", border:"1px solid #C6C6C8", borderRadius:8, zIndex:100, marginTop:4, boxShadow:"0 4px 20px #00000066" },
  cpDropdownItem: { padding:"8px 12px", cursor:"pointer", fontSize:13, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", color:"#5E6367" },
  cpDropdownClose:{ width:"100%", padding:"8px", background:"none", border:"none", borderTop:"1px solid #C6C6C8", color:"#5E6367", cursor:"pointer", fontSize:12, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  priceBlock:   { display:"flex", flexDirection:"column", gap:2, alignItems:"flex-end" },
  priceRow:     { display:"flex", alignItems:"baseline", width:"100%" },
  priceLabel:   { fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", width:28, flexShrink:0, whiteSpace:"nowrap" },
  priceVal:     { fontSize:12, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", textAlign:"right", flex:1, whiteSpace:"nowrap" },
  purchasedAt:  { fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", marginTop:4 },
  appraisalChip:{ background:"#EEEEEC", padding:"3px 10px", borderRadius:999, fontSize:11, lineHeight:1.4, color:"#8D2728", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", flexShrink:0, whiteSpace:"nowrap", border:"1px solid #D0D0CE", display:"inline-block" },
  workList:     { display:"flex", flexDirection:"column" },
  workRow:      { display:"flex", alignItems:"flex-start", gap:6, padding:"10px 4px", cursor:"pointer", transition:"background 0.15s", borderBottom:"1px solid #C6C6C8" },
  workMain:     { flex:1, minWidth:0 },
  workId:       { fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontSize:14, color:"#1a1919", letterSpacing:"0.02em", flexShrink:0, width:70, fontWeight:700 },
  workTitle:    { fontWeight:600, fontSize:14, marginBottom:4, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  workMeta:     { display:"flex", gap:6, fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", flexWrap:"wrap", alignItems:"center" },
  workRight:    { flexShrink:0, display:"flex", flexDirection:"column", alignItems:"stretch", gap:2, minWidth:150 },
  plainText:    { fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", whiteSpace:"nowrap", flexShrink:0 },
  dot:          { fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", flexShrink:0 },
  tabBar:       { display:"flex", gap:4, flexWrap:"wrap", marginBottom:12 },
  tab:          { padding:"4px 10px", borderRadius:20, border:"1px solid #C6C6C8", background:"transparent", color:"#5E6367", cursor:"pointer", fontSize:12, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", transition:"background 0.15s" },
  tabActive:    { background:"#081319", color:"#fff", borderColor:"#081319" },
  tabCount:     { fontSize:10, color:"#5E6367", marginLeft:3 },
  artistHeader: { marginBottom:16 },
  artistName:   { fontSize:16, fontWeight:600, marginBottom:2 },
  artistKana:   { fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  artistCount:  { fontSize:12, color:"#38bdf8", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  registerOverlay:  { position:"fixed", inset:0, background:"#00000088", zIndex:200, display:"flex", alignItems:"flex-end" },
  registerMenu:     { background:"#FFFFFF", border:"1px solid #C6C6C8", borderRadius:"12px 12px 0 0", width:"100%", padding:"20px 20px 32px", position:"fixed", bottom:0, left:0, right:0, zIndex:201 },
  registerMenuTitle:{ fontSize:14, fontWeight:600, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", marginBottom:16, color:"#1a1919" },
  registerMenuSub:  { fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", marginBottom:8 },
  registerMenuItem: { display:"flex", alignItems:"center", gap:12, padding:"14px 0", borderBottom:"1px solid #C6C6C8", cursor:"pointer", width:"100%", boxSizing:"border-box" as const },
  registerMenuIcon: { fontSize:20 },
  bottomNavWrap:    { position:"fixed", bottom:0, left:0, right:0, margin:"0 calc(12px + env(safe-area-inset-right)) calc(14px + env(safe-area-inset-bottom)) calc(12px + env(safe-area-inset-left))", height:58, display:"flex", alignItems:"center", gap:10, zIndex:100 },
  bottomNavBar:     { flex:1, height:"100%", background:"#FFFFFF", border:"1px solid #C6C6C8", borderRadius:999, display:"flex", alignItems:"center", padding:5, boxShadow:"0 4px 14px #00000014", position:"relative" },
  bottomNavItem:    { minWidth:40, width:"16.666%", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", height:"100%", background:"none", border:"none", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", position:"relative" },
  bottomNavHighlight: { width:"100%", height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", borderRadius:999, position:"relative", left:1 },
  bottomNavFab:     { width:58, height:58, flexShrink:0, background:"#1a1919", borderRadius:999, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", cursor:"pointer", border:"none", boxShadow:"0 4px 14px #00000030", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
};

// ─── スマホ取引先カードスタイル ──────────────────────────────────
const MC = {
  card:        { display:"flex", alignItems:"flex-start", gap:10, padding:"12px 8px", cursor:"pointer", transition:"background 0.15s", borderBottom:"1px solid #C6C6C8" },
  left:        { flexShrink:0, width:64 },
  artworkId:   { fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontSize:12, color:"#1a1919", fontWeight:700 },
  main:        { flex:1, minWidth:0 },
  title:       { fontWeight:700, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  artist:      { fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", whiteSpace:"nowrap" },
  chips:       { display:"flex", gap:4, flexWrap:"wrap", marginTop:4 },
  chip:        { padding:"1px 6px", borderRadius:10, fontSize:11, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", border:"1px solid #C6C6C8", color:"#5E6367" },
  price:       { fontSize:13, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", color:"#1a1919" },
  date:        { fontSize:11, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  right:       { flexShrink:0, textAlign:"right" },
  statusBadge: { padding:"3px 9px", borderRadius:20, fontSize:11, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  dot:         { fontSize:12, color:"#5E6367" },
  plainText:   { fontSize:12, color:"#5E6367", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
};

