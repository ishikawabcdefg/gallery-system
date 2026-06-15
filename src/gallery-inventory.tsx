import { useState, useMemo, useEffect } from "react";

// ─── 定数 ────────────────────────────────────────────────
const STATUSES = {
  in_stock:  { label: "在庫あり", color: "#4ade80" },
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
  purchase_discount: "#38bdf8",
  purchase_increase: "#818cf8",
  consign:           "#a78bfa",
  return:            "#94a3b8",
  sold:              "#4ade80",
  sold_discount:     "#f59e0b",
  sold_increase:     "#34d399",
  memo:              "#64748b",
};
const CP_TYPES = {
  individual: { label: "個人",     color: "#a78bfa" },
  corporate:  { label: "法人",     color: "#38bdf8" },
  artist:     { label: "作家",     color: "#f59e0b" },
  gallery:    { label: "画廊・施設", color: "#60a5fa" },
};

// 全角・半角スペースを半角スペース1つに正規化（連続スペースも圧縮）
const normalizeSpaces = (s: string) => s.replace(/[\u3000\u0020]+/g, " ");

// フリガナ用 onBlur サニタイザ：カタカナ・半角スペース・長音符以外を除去し、スペースを正規化
const sanitizeKana = (s: string) =>
  normalizeSpaces(s.replace(/[^\u30A0-\u30FF\u0020\u3000]/g, "")).trim();

// 作家グループ初期データ（is_foreign:true だった作家を「外国作家」グループに移行）
const initialArtworkGroups = [
  { id: 1, name: "外国作家" },
];

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
const calcTax = (taxIncPrice, rate) => {
  if (!taxIncPrice) return { excl: 0, tax: 0 };
  const excl = Math.floor(taxIncPrice / (1 + rate));
  const tax  = taxIncPrice - excl;
  return { excl, tax };
};

// ─── サンプルデータ ───────────────────────────────────────
const initialCounterparties = [
  {
    id: 1, cp_id: "0001", invoice_no: "T1234567890123", invoice_from: "2023-10-01", invoice_to: null, type: "artist", name: "田中 誠", name_kana: "タナカ マコト",
    company: null, department: null,
    email: "tanaka@example.com", phone: "090-1234-5678",
    zip: "150-0001", address: "東京都渋谷区神南1-1-1", building: "", note: "油彩専門。毎年個展開催。",
  },
  {
    id: 2, cp_id: "0002", invoice_no: "", invoice_from: null, invoice_to: null, type: "individual", name: "田村 一郎", name_kana: "タムラ イチロウ",
    company: "田村商事株式会社", department: null,
    email: "tamura@example.com", phone: "03-1234-5678",
    zip: "106-0032", address: "東京都港区六本木1-2-3", building: "田村ビル4F", note: "コレクター。近代日本画を好む。",
  },
  {
    id: 3, cp_id: "0003", invoice_no: "T9876543210987", invoice_from: "2023-10-01", invoice_to: null, type: "gallery", name: null, name_kana: null,
    company: "ホテル椿山荘", department: "宴会・文化事業部",
    email: "art@tsubakiyama.example.com", phone: "03-9876-5432",
    zip: "112-8680", address: "東京都文京区関口2-10-8", building: "", note: "ロビー展示スペースあり。",
  },
  {
    id: 4, cp_id: "0004", invoice_no: "T1111222233334", invoice_from: "2023-10-01", invoice_to: null, type: "artist", name: "山本 竜", name_kana: "ヤマモト リュウ",
    company: null, department: null,
    email: "yamamoto@example.com", phone: "06-1111-2222",
    zip: "530-0001", address: "大阪府大阪市北区梅田1-1-1", building: "", note: "版画・シルクスクリーン専門。",
  },
  {
    id: 5, cp_id: "0005", invoice_no: "T5555666677778", invoice_from: "2023-10-01", invoice_to: null, type: "corporate", name: null, name_kana: null,
    company: "株式会社アート・ソリューションズ", department: "コレクション部",
    email: "collection@artsol.example.com", phone: "03-5555-6666",
    zip: "100-0001", address: "東京都千代田区千代田1-1", building: "千代田ビル10F", note: "企業コレクション担当。大口取引あり。",
  },
  {
    id: 6, cp_id: "0006", invoice_no: "T2222333344445", invoice_from: "2023-10-01", invoice_to: null, type: "gallery", name: null, name_kana: "タナカ アトリエ",
    company: "田中アトリエ", department: null,
    email: "", phone: "", zip: "", address: "", building: "", note: "作家直営アトリエ。直接買付。",
  },
  {
    id: 7, cp_id: "0007", invoice_no: "T3333444455556", invoice_from: "2023-10-01", invoice_to: null, type: "gallery", name: null, name_kana: "アート オオサカ ジッコウ イインカイ",
    company: "アート大阪実行委員会", department: null,
    email: "", phone: "", zip: "", address: "", building: "", note: "アート大阪出展作家より仕入れ。",
  },
  {
    id: 8, cp_id: "0008", invoice_no: "", invoice_from: null, invoice_to: null, type: "gallery", name: null, name_kana: "ガレリア ヴィスタ",
    company: "ガレリア・ヴィスタ", department: null,
    email: "", phone: "", zip: "", address: "", building: "", note: "ミラノ系現代アートギャラリー。海外作家取次。",
  },
  {
    id: 9, cp_id: "0009", invoice_no: "T4444555566667", invoice_from: "2023-10-01", invoice_to: null, type: "gallery", name: null, name_kana: "ギンザ アート コレクティブ",
    company: "銀座アートコレクティブ", department: null,
    email: "", phone: "", zip: "", address: "", building: "", note: "銀座エリアの作家グループ。年2回企画展開催。",
  },
  {
    id: 10, cp_id: "0010", invoice_no: "", invoice_from: null, invoice_to: null, type: "gallery", name: null, name_kana: "スペース ムー",
    company: "スペース・ムー", department: null,
    email: "", phone: "", zip: "", address: "", building: "", note: "渋谷区の貸しギャラリー。個展作品の買取対応あり。",
  },
  {
    id: 11, cp_id: "0011", invoice_no: "", invoice_from: null, invoice_to: null, type: "gallery", name: null, name_kana: "アートブリッジ インターナショナル",
    company: "アートブリッジ・インターナショナル", department: null,
    email: "", phone: "", zip: "", address: "", building: "", note: "欧米作家の日本展開を支援するエージェント会社。",
  },
  {
    id: 12, cp_id: "0012", invoice_no: "T6666777788889", invoice_from: "2023-10-01", invoice_to: null, type: "gallery", name: null, name_kana: "オークション ハウス セントラル",
    company: "オークションハウス・セントラル", department: null,
    email: "", phone: "", zip: "", address: "", building: "", note: "東京都内の美術品競売会社。",
  },
  {
    id: 13, cp_id: "0013", invoice_no: "T7777888899990", invoice_from: "2023-10-01", invoice_to: null, type: "gallery", name: null, name_kana: "シンワ オークション",
    company: "シンワオークション株式会社", department: null,
    email: "", phone: "", zip: "", address: "", building: "", note: "国内大手美術品オークション会社。",
  },
  {
    id: 14, cp_id: "0014", invoice_no: "", invoice_from: null, invoice_to: null, type: "gallery", name: null, name_kana: "アトリエ ノルド",
    company: "アトリエ・ノルド", department: null,
    email: "", phone: "", zip: "", address: "", building: "", note: "北欧系作家のエージェント兼ギャラリー。",
  },
  {
    id: 15, cp_id: "0015", invoice_no: "T8888999900001", invoice_from: "2023-10-01", invoice_to: null, type: "gallery", name: null, name_kana: "ギンザ アートギャラリー イチバンカン",
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
  { id: 1, artwork_id: "25EA001", event_type: "purchase", old_price: null,   new_price: 280000, counterparty: "田中 誠",       counterparty_id: "0001", memo: "アトリエ直接仕入",      created_at: "2024-11-10" },
  { id: 2, artwork_id: "2493001", event_type: "purchase", old_price: null,   new_price: 95000,  counterparty: "銀座アートギャラリー・壱番館", counterparty_id: "0015", memo: "グループ展より引き取り", created_at: "2024-09-03" },
  { id: 3, artwork_id: "2493001", event_type: "sold_discount", old_price: 220000, new_price: 200000, counterparty: "田村 一郎",     counterparty_id: "0002", memo: "顧客交渉により値引き",  created_at: "2025-01-15" },
  { id: 4, artwork_id: "2493001", event_type: "sold",     old_price: null,   new_price: 200000, counterparty: "田村 一郎",     counterparty_id: "0002", memo: "田村様コレクションへ",  created_at: "2025-01-15" },
  { id: 5, artwork_id: "251K001", event_type: "purchase", old_price: null,   new_price: 150000, counterparty: "山本 竜",       counterparty_id: "0004", memo: "直接購入",              created_at: "2025-01-20" },
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
        created_at: "2025-06-16"
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
        created_at: "2025-06-10"
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
        created_at: "2026-01-29"
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
        created_at: "2025-08-28"
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
        created_at: "2025-08-23"
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
        created_at: "2025-05-23"
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
        created_at: "2025-09-25"
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
        created_at: "2026-01-05"
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
        created_at: "2025-06-11"
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
        created_at: "2024-09-19"
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
        created_at: "2025-06-08"
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
        created_at: "2025-07-15"
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
        created_at: "2025-11-28"
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
        created_at: "2023-08-10"
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
        created_at: "2024-01-04"
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
        created_at: "2024-10-12"
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
        created_at: "2023-09-03"
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
        created_at: "2025-07-12"
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
        created_at: "2024-05-02"
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
        created_at: "2025-04-04"
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
        created_at: "2023-08-28"
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
        created_at: "2025-06-26"
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
        created_at: "2024-02-04"
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
        created_at: "2024-05-01"
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
        created_at: "2023-09-16"
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
        created_at: "2026-02-04"
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
        created_at: "2026-01-29"
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
        created_at: "2023-10-25"
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
        created_at: "2024-07-28"
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
        created_at: "2025-03-08"
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
        created_at: "2026-02-15"
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
        created_at: "2024-11-08"
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
        created_at: "2024-01-24"
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
        created_at: "2025-06-01"
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
        created_at: "2025-02-01"
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
        created_at: "2024-03-25"
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
        created_at: "2024-12-31"
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
        created_at: "2025-07-18"
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
        created_at: "2024-06-27"
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
        created_at: "2025-04-28"
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
        created_at: "2025-07-21"
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
        created_at: "2024-01-12"
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
        created_at: "2025-03-11"
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
        created_at: "2024-10-01"
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
        created_at: "2025-06-06"
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
        created_at: "2025-07-19"
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
        created_at: "2024-11-01"
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
        created_at: "2025-03-13"
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
        created_at: "2025-09-25"
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
        created_at: "2025-01-30"
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
        created_at: "2024-06-06"
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
        created_at: "2026-01-30"
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
        created_at: "2025-10-28"
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
        created_at: "2024-09-13"
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
        created_at: "2026-01-01"
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
        created_at: "2025-09-26"
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
        created_at: "2023-11-16"
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
        created_at: "2023-08-10"
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
        created_at: "2024-10-27"
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
        created_at: "2024-04-09"
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
        created_at: "2023-12-14"
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
        created_at: "2024-08-15"
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
        created_at: "2025-06-30"
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
        created_at: "2024-07-24"
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
        created_at: "2025-02-25"
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
        created_at: "2024-09-27"
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
        created_at: "2023-06-05"
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
        created_at: "2025-08-12"
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
        created_at: "2024-08-29"
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
        created_at: "2025-05-14"
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
        created_at: "2025-05-28"
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
        created_at: "2025-09-16"
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
        created_at: "2025-01-29"
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
        created_at: "2024-05-15"
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
        created_at: "2025-02-21"
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
        created_at: "2025-03-16"
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
        created_at: "2024-07-17"
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
        created_at: "2024-06-25"
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
        created_at: "2024-09-16"
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
        created_at: "2024-10-13"
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
        created_at: "2023-07-20"
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
        created_at: "2024-12-22"
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
        created_at: "2023-05-30"
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
        created_at: "2024-11-30"
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
        created_at: "2025-02-09"
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
        created_at: "2025-04-24"
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
        created_at: "2025-11-18"
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
        created_at: "2025-01-29"
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
        created_at: "2023-08-02"
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
        created_at: "2024-08-22"
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
        created_at: "2023-05-23"
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
        created_at: "2025-01-05"
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
        created_at: "2025-06-08"
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
        created_at: "2023-12-15"
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
        created_at: "2024-09-05"
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
        created_at: "2025-05-10"
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
        created_at: "2025-10-19"
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
        created_at: "2024-05-28"
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
        created_at: "2024-10-14"
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
        created_at: "2024-08-25"
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
        created_at: "2024-03-18"
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
        created_at: "2024-08-14"
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
const cpFullName    = (cp) => {
  if (!cp) return "—";
  if (cp.type === "individual" || cp.type === "artist") {
    return cp.company ? `${cp.name}（${cp.company}）` : cp.name || "—";
  }
  return cp.department ? `${cp.company} ${cp.department}` : cp.company || "—";
};

// ─── メインコンポーネント ─────────────────────────────────
export default function GalleryApp() {
  const [artworks, setArtworks] = useState([...initialArtworks, ...additionalArtworks]);
  const [history,  setHistory]  = useState([...initialHistory, ...additionalHistory]);
  const [counterparties, setCounterparties] = useState(initialCounterparties);
  const [view,      setView]     = useState("inventory");
  const [prevView,   setPrevView]  = useState(null);
  const [selectedId,    setSelectedId]    = useState(null);
  const [selectedCpId,  setSelectedCpId]  = useState(null);
  const [search,    setSearch]   = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cpSearch,  setCpSearch] = useState("");
  const [cpTypeFilter, setCpTypeFilter] = useState("all");
  const [nextHid,   setNextHid]  = useState(190);
  const [nextCpId,  setNextCpId] = useState(20);
  const [nextArtworkInternalId, setNextArtworkInternalId] = useState(104);
  const [taxSettings, setTaxSettings] = useState(DEFAULT_TAX_SETTINGS);
  const [artists, setArtists] = useState(initialArtists);
  const [nextArtistId, setNextArtistId] = useState(25);
  const [editingArtistId, setEditingArtistId] = useState<number|null>(null);
  const [artworkGroups, setArtworkGroups] = useState(initialArtworkGroups);
  const [nextGroupId, setNextGroupId] = useState(2);

  // 画廊情報
  const [galleryInfo, setGalleryInfo] = useState({
    name: "", zip: "", address: "", building: "", tel: "", email: "", fax: "",
    fiscalStartMonth: 9,   // 事業年度開始月（1〜12）
    fiscalOriginYear: 1970, // 第1期の開始年
  });

  // 社員
  const [staffList, setStaffList] = useState([
    { id: 1, name: "山田 太郎" },
    { id: 2, name: "鈴木 花子" },
  ]);
  const [nextStaffId, setNextStaffId] = useState(3);

  // 委託案件
  const [consignments, setConsignments] = useState(initialConsignments);
  const [editingConsignmentId, setEditingConsignmentId] = useState(null);
  const [nextConsignmentId, setNextConsignmentId] = useState(6);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [registerMenuOpen, setRegisterMenuOpen] = useState(false);
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
      button:focus { outline: none !important; border-color: inherit !important; box-shadow: none !important; }
      button:focus-visible { outline: none !important; }
      button:active { box-shadow: none !important; }
      input[type=number]::-webkit-inner-spin-button,
      input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      input[type=number] { -moz-appearance: textfield; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // ── フォーム状態 ──
  const emptyArtwork = { title:"", artist:"", artist_id:null, artist_kana:"", medium:"", size:"", appraisal:"", purchase_price:"", supplier:"", supplier_id:null, announce_price:"", purchased_at:"", memo:"" };
  const [artworkForm, setArtworkForm] = useState(emptyArtwork);
  const setAF = (k,v) => setArtworkForm(p=>({...p,[k]:v}));

  const emptyEvent = { event_type:"purchase", new_price:"", counterparty:"", counterparty_id:null, memo:"", created_at:"" };
  const [editingHistoryId, setEditingHistoryId] = useState(null);
  const [eventForm, setEventForm] = useState(emptyEvent);
  const setEF = (k,v) => setEventForm(p=>({...p,[k]:v}));

  const emptyCp = { type:"individual", name:"", name_kana:"", company:"", department:"", invoice_no:"", invoice_from:"", invoice_to:"", email:"", phone:"", zip:"", address:"", building:"", note:"" };
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
  }), [artworks, search, statusFilter]);

  const filteredCps = useMemo(() => counterparties.filter(c => {
    const mt = cpTypeFilter === "all" || c.type === cpTypeFilter;
    const q  = cpSearch.toLowerCase();
    const ms = !q || [c.name,c.name_kana,c.company,c.department,c.email,c.phone,c.address]
      .some(s=>(s||"").toLowerCase().includes(q));
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
      memo:artworkForm.memo||"仕入", created_at:dt };
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
    setCpForm({ type:cp.type, name:cp.name||"", name_kana:cp.name_kana||"",
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
    const isPersonType = quickForm.type === "individual" || quickForm.type === "artist";
    const cp_id = String(id).padStart(4, "0");
    const newCp = {
      id, cp_id,
      type: quickForm.type,
      name: isPersonType ? quickForm.name : null,
      name_kana: quickForm.name_kana || "",
      company: isPersonType ? quickForm.company || null : quickForm.company,
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

  const isPersonType = (t) => t==="individual"||t==="artist";

  // アクティブタブ判定
  const activeNav = view==="inventory" ? "inventory"
    : view==="list"||view==="detail" ? "list"
    : view==="daily" ? "daily"
    : view==="consignment"||view==="consignment_new"||view==="consignment_edit" ? "consignment"
    : view==="cp_list"||view==="cp_detail" ? "cp_list"
    : view==="add_sale" ? null
    : view==="settings"||view==="tax_settings"||view==="gallery_settings"||view==="staff_settings"||view==="artist_settings"||view==="artist_list"||view==="artist_form" ? "settings"
    : null;

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
                onClick={()=>{setView(key);setSelectedId(null);setSelectedCpId(null);}}
                onMouseEnter={e=>{ if(activeNav!==key) e.currentTarget.style.background="#161622"; }}
                onMouseLeave={e=>{ e.currentTarget.style.background=""; }}>
                {activeNav===key && <span style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:"#a78bfa",borderRadius:"0 2px 2px 0"}}/>}
                <span style={S.navIcon}><span className="material-icons" style={{fontSize:16,lineHeight:1,verticalAlign:"middle"}}>{icon}</span></span>{label}
              </button>
            ))}
            <div style={S.navDivider}/>
            <button style={{...S.navItem,...S.navAdd}} onClick={()=>setView("add_artwork")}
              onMouseEnter={e=>{ e.currentTarget.style.background="#241540"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="#1a1030"; }}>
              <span style={S.navIcon}>＋</span>仕入を登録
            </button>
            <button style={{...S.navItem,...S.navAdd2}} onClick={()=>setView("add_sale")}
              onMouseEnter={e=>{ e.currentTarget.style.background="#0a2030"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="#0a1a20"; }}>
              <span style={S.navIcon}>＋</span>売上を登録
            </button>
          </nav>
          <div style={S.sideStats}>
            <div style={S.statItem}><span style={S.statNum}>{stats.total}</span><span style={S.statLab}>総作品数</span></div>
            <div style={S.statItem}><span style={{...S.statNum,color:"#4ade80"}}>{stats.in_stock}</span><span style={S.statLab}>在庫あり</span></div>
            <div style={S.statItem}><span style={{...S.statNum,color:"#38bdf8"}}>{stats.consigned}</span><span style={S.statLab}>委託中</span></div>
            <div style={S.statItem}><span style={{...S.statNum,color:"#f87171"}}>{stats.sold}</span><span style={S.statLab}>売却済</span></div>
            <div style={{borderTop:"1px solid #1e1e30",paddingTop:10,marginTop:2,display:"flex",flexDirection:"column",gap:8}}>
              <div style={S.statItem}><span style={{...S.statNum,fontSize:13,color:"#4ade80"}}>{fmt(stats.thisMonthRevenue)}</span><span style={S.statLab}>今月の売上</span></div>
              <div style={S.statItem}><span style={{...S.statNum,fontSize:13,color:"#34d399"}}>{fmt(stats.thisFiscalRevenue)}</span><span style={S.statLab}>今期の売上</span></div>
            </div>
          </div>
        </aside>
      )}

      {/* ── メインエリア ── */}
      <main style={{...S.main,...(isMobile?{paddingBottom:70}:{})}}>

                {/* ══ 作品一覧 ══ */}
        {view==="list" && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <div style={S.pageHeader}><h1 style={S.pageTitle}>作品一覧</h1></div>
            <div style={S.toolbar}>
              <input style={S.search} placeholder="作品名・作家・取引先で検索…" value={search} onChange={e=>setSearch(e.target.value)}/>
              <div style={S.filterGroup}>
                {[["all","すべて"],["in_stock","在庫あり"],["consigned","委託中"],["sold","売却済み"]].map(([k,l])=>(
                  <button key={k} style={{...S.filterBtn,...(statusFilter===k?S.filterActive:{})}} onClick={()=>setStatusFilter(k)}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{fontSize:12,color:"#aaa",fontFamily:"sans-serif",margin:"0 0 12px",textAlign:"right"}}>{filteredArtworks.length}件</div>

            {/* PC：テーブル表示 */}
            {!isMobile && (
              <div style={S.tableOuter}>
              <div style={S.tableWrap}>
                <table style={S.table}>
                  <thead><tr>{["ID","作品名","作家","技法","仕入先","仕入価格","発表価格","委託先","委託価格","売却先","成約価格","状態",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredArtworks.map(a=>(
                      <tr key={a.id} style={S.tr}
                        onClick={()=>{setSelectedId(a.artwork_id);setView("detail");}}
                        onMouseEnter={e=>e.currentTarget.style.background="#0f0f18"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{...S.td,fontFamily:"'Courier New',monospace",fontSize:12,color:"#a78bfa",letterSpacing:"0.05em"}}>{a.artwork_id||"—"}</td>
                        <td style={{...S.td,fontWeight:600}}>{a.title}</td>
                        <td style={S.td}>{a.artist}</td>
                        <td style={{...S.td,color:"#ccc",fontSize:12}}>{a.medium||"—"}</td>
                        <td style={{...S.td,fontSize:12}}>
                          {a.supplier_id
                            ? <button style={S.cpLink} onClick={e=>{e.stopPropagation();setSelectedCpId(a.supplier_id);setView("cp_detail");}}>{a.supplier}</button>
                            : <span style={{color:"#ccc"}}>{a.supplier||"—"}</span>}
                        </td>
                        <td style={{...S.td,...S.price}}>{fmt(a.purchase_price)}</td>
                        <td style={{...S.td,...S.price,color:"#a78bfa"}}>{fmt(a.announce_price)}</td>
                        <td style={{...S.td,fontSize:12}}>
                          {a.consignee_id
                            ? <button style={{...S.cpLink,color:"#38bdf8"}} onClick={e=>{e.stopPropagation();setSelectedCpId(a.consignee_id);setView("cp_detail");}}>{a.consignee}</button>
                            : <span style={{color:"#ccc"}}>{a.consignee||"—"}</span>}
                        </td>
                        <td style={{...S.td,...S.price,color:"#38bdf8"}}>{fmt(a.consignment_price)}</td>
                        <td style={{...S.td,fontSize:12}}>
                          {a.buyer_id
                            ? <button style={{...S.cpLink,color:"#4ade80"}} onClick={e=>{e.stopPropagation();setSelectedCpId(a.buyer_id);setView("cp_detail");}}>{a.buyer}</button>
                            : <span style={{color:"#ccc"}}>{a.buyer||"—"}</span>}
                        </td>
                        <td style={{...S.td,...S.price,color:"#4ade80"}}>{fmt(a.sold_price)}</td>
                        <td style={S.td}><span style={{...S.statusBadge,background:STATUSES[a.status]?.color+"22",color:STATUSES[a.status]?.color,border:`1px solid ${STATUSES[a.status]?.color}44`}}>{STATUSES[a.status]?.label}</span></td>
                        <td style={S.td}><span style={S.arrowBtn}>→</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredArtworks.length===0&&<div style={S.empty}>該当する作品がありません</div>}
              </div>
              </div>
            )}

            {/* スマホ：カード表示 */}
            {isMobile && (
              <div style={{display:"flex",flexDirection:"column",gap:1}}>
                {filteredArtworks.map((a,i)=>(
                  <div key={a.id}
                    style={{...MC.card,...(i%2===0?{}:{background:"#0d0d16"})}}
                    onClick={()=>{setSelectedId(a.artwork_id);setView("detail");}}
                    onMouseEnter={e=>e.currentTarget.style.background="#1a1a28"}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"transparent":"#0d0d16"}>
                    <div style={MC.left}>
                      <div style={MC.artworkId}>{a.artwork_id}</div>
                    </div>
                    <div style={MC.main}>
                      <div style={MC.title}>{a.title}</div>
                      <div style={MC.artist}>{a.artist}</div>
                      <div style={MC.chips}>
                        {a.medium&&<span style={MC.plainText}>{a.medium}</span>}
                        {a.status==="consigned"&&a.consignee&&<><span style={MC.dot}>·</span><span style={{...MC.plainText,color:"#38bdf8"}}>{a.consignee}</span></>}
                        {a.status==="sold"&&a.buyer&&<><span style={MC.dot}>·</span><span style={{...MC.plainText,color:"#4ade80"}}>{a.buyer}</span></>}
                      </div>
                    </div>
                    <div style={MC.right}>
                      <span style={{...MC.statusBadge,background:STATUSES[a.status]?.color+"22",color:STATUSES[a.status]?.color,border:`1px solid ${STATUSES[a.status]?.color}44`}}>
                        {STATUSES[a.status]?.label}
                      </span>
                      <div style={{...MC.price,color:a.status==="sold"?"#4ade80":"#a78bfa"}}>
                        {fmt(a.status==="sold"?a.sold_price:a.announce_price)}
                      </div>
                      <div style={MC.date}>{a.purchased_at}</div>
                    </div>
                  </div>
                ))}
                {filteredArtworks.length===0&&<div style={S.empty}>該当する作品がありません</div>}
              </div>
            )}
          </div>
        )}

        {/* ══ 作品詳細 ══ */}
        {view==="detail" && selected && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <button style={S.backBtn} onClick={()=>{setView(prevView||"list");setPrevView(null);}}>← {prevView==="consignment"?"委託に戻る":"一覧に戻る"}</button>
            <div style={{...S.detailGrid,...(isMobile?S.detailGridMobile:{})}}>
              <div style={S.detailCard}>
                <div style={S.artThumb}><span style={S.artThumbIcon}>◈</span></div>
                <div style={S.detailInfo}>
                  <div style={S.detailStatusRow}>
                    <span style={{...S.statusBadge,background:STATUSES[selected.status]?.color+"22",color:STATUSES[selected.status]?.color,border:`1px solid ${STATUSES[selected.status]?.color}44`}}>
                      {STATUSES[selected.status]?.label}
                    </span>
                  </div>
                  <h2 style={S.detailTitle}>{selected.title}</h2>
                  {selected.artwork_id&&<div style={{fontFamily:"'Courier New',monospace",fontSize:12,color:"#a78bfa",letterSpacing:"0.08em",marginBottom:4}}>{selected.artwork_id}</div>}
                  <p style={S.detailArtist}>{selected.artist}</p>
                  <div style={S.detailMeta}>
                    {selected.medium&&<span style={S.metaTagPlain}>{selected.medium}</span>}
                    {selected.medium&&selected.size&&<span style={{color:"#444",fontSize:12}}>·</span>}
                    {selected.size&&<span style={{...S.metaTagPlain,color:"#bbb"}}>{selected.size}</span>}
                    {selected.appraisal&&<span style={{...S.metaTag,color:"#f59e0b",borderColor:"#f59e0b33",background:"#f59e0b11"}}>鑑定：{selected.appraisal}</span>}
                  </div>
                  <TxBlock color="#60a5fa" title="仕入">
                    <TxRow label="仕入先" val={selected.supplier_id
                      ? <button style={S.cpLink} onClick={()=>{setSelectedCpId(selected.supplier_id);setView("cp_detail");}}>{selected.supplier}</button>
                      : selected.supplier} />
                    <TxRow label="仕入価格" val={fmt(selected.purchase_price)} />
                    <TxRow label="仕入日"   val={selected.purchased_at} />
                  </TxBlock>
                  <TxBlock color="#a78bfa" title="発表価格">
                    <TxRow label="現在の発表価格" val={fmt(selected.announce_price)} color="#a78bfa" large />
                  </TxBlock>
                  <TxBlock color="#38bdf8" title="委託">
                    <TxRow label="委託先" val={selected.consignee_id
                      ? <button style={{...S.cpLink,color:"#38bdf8"}} onClick={()=>{setSelectedCpId(selected.consignee_id);setView("cp_detail");}}>{selected.consignee}</button>
                      : selected.consignee} />
                    <TxRow label="委託価格" val={fmt(selected.consignment_price)} color="#38bdf8" />
                    <TxRow label="委託日"   val={selected.consigned_at} />
                  </TxBlock>
                  <TxBlock color="#4ade80" title="売却">
                    <TxRow label="売却先" val={selected.buyer_id
                      ? <button style={{...S.cpLink,color:"#4ade80"}} onClick={()=>{setSelectedCpId(selected.buyer_id);setView("cp_detail");}}>{selected.buyer}</button>
                      : selected.buyer} />
                    <TxRow label="成約価格" val={fmt(selected.sold_price)} color="#4ade80" large />
                    <TxRow label="売却日"   val={selected.sold_at} />
                  </TxBlock>
                </div>
              </div>
              <div style={S.historyPanel}>
                <div style={S.historyHeader}>
                  <h3 style={S.historyTitle}>取引履歴</h3>
                  <button style={S.addEventBtn} onClick={()=>{setEventForm(emptyEvent);setView("add_history");}}>＋ 記録を追加</button>
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
                              <span style={{fontSize:11,color:"#555",fontFamily:"sans-serif",fontStyle:"italic"}}>委託ページから編集</span>
                            )}
                            {!["consign","return"].includes(h.event_type)&&(
                            <button style={{...S.addEventBtn,fontSize:11,padding:"2px 8px",color:"#f59e0b",borderColor:"#f59e0b44"}}
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
                              }}>編集</button>
                            )}
                            {!["consign","return"].includes(h.event_type)&&(
                            <button style={{...S.addEventBtn,fontSize:11,padding:"2px 8px",color:"#f87171",borderColor:"#f8717144"}}
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
                            <span>{h.event_type==="purchase"?"📥":h.event_type==="sold"?"📤":h.event_type==="consign"?"🏛":h.event_type==="return"?"↩️":"👤"}</span>
                            {h.counterparty_id
                              ? <button style={S.cpLink} onClick={()=>{setSelectedCpId(h.counterparty_id);setView("cp_detail");}}>{h.counterparty}</button>
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
                              <span style={{fontSize:11,color:"#aaa",fontFamily:"sans-serif",marginLeft:8}}>（値引き {fmt(h.old_price-h.new_price)}）</span>
                            )}
                            {(h.event_type==="purchase_increase"||h.event_type==="sold_increase")&&h.old_price!=null&&(
                              <span style={{fontSize:11,color:"#aaa",fontFamily:"sans-serif",marginLeft:8}}>（値上げ {fmt(h.new_price-h.old_price)}）</span>
                            )}
                          </div>
                        )}
                        {h.memo&&<div style={S.timelineMemo}>{h.memo}</div>}
                      </div>
                    </div>
                  ))}
                  {selectedHistory.length===0&&<div style={{color:"#aaa",fontSize:13,fontFamily:"sans-serif",padding:"20px 0"}}>履歴はまだありません</div>}
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
              <button style={S.addEventBtn} onClick={()=>{setCpForm(emptyCp);setCpEditId(null);setView("cp_form");}}>＋ 取引先を登録</button>
            </div>
            <div style={S.toolbar}>
              <input style={S.search} placeholder="名前・会社名・メール・住所で検索…" value={cpSearch} onChange={e=>setCpSearch(e.target.value)}/>
              <div style={S.filterGroup}>
                {[["all","すべて"],...Object.entries(CP_TYPES).map(([k,v])=>[k,v.label])].map(([k,l])=>(
                  <button key={k} style={{...S.filterBtn,...(cpTypeFilter===k?S.filterActive:{})}} onClick={()=>setCpTypeFilter(k)}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{fontSize:12,color:"#aaa",fontFamily:"sans-serif",margin:"0 0 12px",textAlign:"right"}}>{filteredCps.length}件</div>

            {/* PC：テーブル表示 */}
            {!isMobile && (
              <div style={S.tableOuter}>
              <div style={S.tableWrap}>
                <table style={S.table}>
                  <thead><tr>{["ID","種別","取引先名","ふりがな","部署","メール","電話","住所",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredCps.map(cp=>(
                      <tr key={cp.id} style={S.tr}
                        onClick={()=>{setSelectedCpId(cp.cp_id);setView("cp_detail");}}
                        onMouseEnter={e=>e.currentTarget.style.background="#0f0f18"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{...S.td,fontFamily:"'Courier New',monospace",fontSize:12,color:"#a78bfa"}}>{cp.cp_id||"—"}</td>
                        <td style={S.td}>
                          <span style={{...S.cpTypeBadge,background:CP_TYPES[cp.type]?.color+"22",color:CP_TYPES[cp.type]?.color,border:`1px solid ${CP_TYPES[cp.type]?.color}44`}}>
                            {CP_TYPES[cp.type]?.label}
                          </span>
                        </td>
                        <td style={{...S.td,fontWeight:600}}>{cpDisplayName(cp)}</td>
                        <td style={{...S.td,fontSize:12,color:"#ccc"}}>{cp.name_kana||"—"}</td>
                        <td style={{...S.td,fontSize:12,color:"#ccc"}}>{cp.department||"—"}</td>
                        <td style={{...S.td,fontSize:12}}>{cp.email||"—"}</td>
                        <td style={{...S.td,fontSize:12}}>{cp.phone||"—"}</td>
                        <td style={{...S.td,fontSize:12}}>{[cp.zip,cp.address,cp.building].filter(Boolean).join(" ")||"—"}</td>
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
                    style={{...MC.card,...(i%2===0?{}:{background:"#0d0d16"})}}
                    onClick={()=>{setSelectedCpId(cp.cp_id);setView("cp_detail");}}
                    onMouseEnter={e=>e.currentTarget.style.background="#1a1a28"}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"transparent":"#0d0d16"}>
                    <div style={MC.left}>
                      <div style={MC.artworkId}>{cp.cp_id}</div>
                    </div>
                    <div style={{...MC.main,overflow:"visible"}}>
                      <div style={{...MC.title,whiteSpace:"normal",overflow:"visible",textOverflow:"clip"}}>{cpDisplayName(cp)}</div>
                      {cp.name_kana&&<div style={MC.artist}>{cp.name_kana}</div>}
                      {(isPersonType(cp.type)&&cp.company)&&<div style={{...MC.artist,color:"#bbb"}}>{cp.company}</div>}
                      <div style={MC.chips}>
                        <span style={{...MC.chip,color:CP_TYPES[cp.type]?.color,borderColor:CP_TYPES[cp.type]?.color+"44"}}>
                          {CP_TYPES[cp.type]?.label}
                        </span>
                        {cp.department&&<span style={MC.chip}>{cp.department}</span>}
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
                    <span style={{...S.cpTypeBadge,background:CP_TYPES[selectedCp.type]?.color+"22",color:CP_TYPES[selectedCp.type]?.color,border:`1px solid ${CP_TYPES[selectedCp.type]?.color}44`}}>
                      {CP_TYPES[selectedCp.type]?.label}
                    </span>
                  </div>
                  <h2 style={S.detailTitle}>{cpDisplayName(selectedCp)}</h2>
                  {selectedCp.cp_id&&<div style={{fontFamily:"'Courier New',monospace",fontSize:12,color:"#a78bfa",letterSpacing:"0.08em",marginBottom:4}}>{selectedCp.cp_id}</div>}
                  {selectedCp.name_kana&&<p style={{...S.detailArtist,fontSize:12,color:"#bbb"}}>{selectedCp.name_kana}</p>}
                  {selectedCp.company&&isPersonType(selectedCp.type)&&<p style={S.detailArtist}>{selectedCp.company}</p>}
                  {selectedCp.department&&<p style={{...S.detailArtist,color:"#94a3b8"}}>{selectedCp.department}</p>}

                  {(selectedCp.invoice_no) && (
                    <TxBlock color="#f59e0b" title="インボイス">
                      <TxRow label="登録番号" val={selectedCp.invoice_no} color="#f59e0b" />
                      <TxRow label="登録開始" val={selectedCp.invoice_from} />
                      <TxRow label="登録終了" val={selectedCp.invoice_to} />
                    </TxBlock>
                  )}
                  {!selectedCp.invoice_no && (
                    <div style={{fontSize:12,fontFamily:"sans-serif",color:"#f87171",background:"#f8717111",border:"1px solid #f8717133",borderRadius:6,padding:"6px 10px",marginBottom:8}}>
                      ⚠ インボイス未登録（仕入税額控除に経過措置が適用されます）
                    </div>
                  )}
                  <TxBlock color={CP_TYPES[selectedCp.type]?.color} title="基本情報">
                    <TxRow label="部署"   val={selectedCp.department} />
                    <TxRow label="メール" val={selectedCp.email} />
                    <TxRow label="電話"   val={selectedCp.phone} />
                    <TxRow label="郵便番号" val={selectedCp.zip} />
                    <TxRow label="住所"     val={selectedCp.address} />
                    <TxRow label="建物名以下" val={selectedCp.building} />
                  </TxBlock>
                  {selectedCp.note&&(
                    <TxBlock color="#94a3b8" title="メモ">
                      <p style={{fontSize:13,fontFamily:"sans-serif",color:"#ccc",margin:0,lineHeight:1.7}}>{selectedCp.note}</p>
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
                  ? <div style={{color:"#aaa",fontSize:13,fontFamily:"sans-serif"}}>取引実績はまだありません</div>
                  : [...cpArtworks].sort((a,b)=>{
                      const da = a.sold_at||a.consigned_at||a.purchased_at||"";
                      const db = b.sold_at||b.consigned_at||b.purchased_at||"";
                      return db.localeCompare(da);
                    }).map(a=>(
                    <div key={a.id} style={S.cpArtworkItem}
                      onClick={()=>{setSelectedId(a.artwork_id);setView("detail");}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,marginBottom:2}}>{a.title}</div>
                        <div style={{fontSize:12,color:"#ccc",fontFamily:"sans-serif"}}>{a.artist} · {a.medium}</div>
                        <div style={{marginTop:6,display:"flex",gap:8,flexWrap:"wrap"}}>
                          {a.supplier_id===selectedCp.cp_id&&<span style={{...S.eventTag,background:"#60a5fa22",color:"#60a5fa",border:"1px solid #60a5fa44",fontSize:12}}>仕入先</span>}
                          {a.consignee_id===selectedCp.cp_id&&<span style={{...S.eventTag,background:"#38bdf822",color:"#38bdf8",border:"1px solid #38bdf844",fontSize:12}}>委託先</span>}
                          {a.buyer_id===selectedCp.cp_id&&<span style={{...S.eventTag,background:"#4ade8022",color:"#4ade80",border:"1px solid #4ade8044",fontSize:12}}>購入者</span>}
                        </div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <span style={{...S.statusBadge,background:STATUSES[a.status]?.color+"22",color:STATUSES[a.status]?.color,border:`1px solid ${STATUSES[a.status]?.color}44`}}>
                          {STATUSES[a.status]?.label}
                        </span>
                        <div style={{...S.price,fontSize:14,marginTop:6,color:"#4ade80"}}>{a.sold_price?fmt(a.sold_price):fmt(a.announce_price)}</div>
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
                { key:"staff_settings",   label:"社員",       desc:"委託納品書の担当者一覧",          icon:"◎" },
                { key:"tax_settings",     label:"消費税",     desc:"税率・インボイス経過措置の設定",  icon:"%" },
              ].map(({key,label,desc,icon})=>(
                <button key={key}
                  style={{display:"flex",alignItems:"center",gap:16,padding:"14px 16px",background:"#0f0f18",border:"1px solid #1e1e30",borderRadius:10,cursor:"pointer",textAlign:"left",width:"100%"}}
                  onClick={()=>setView(key)}>
                  <div style={{width:36,height:36,borderRadius:8,background:"#1e1e30",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"#a78bfa",flexShrink:0}}>{icon}</div>
                  <div>
                    <div style={{fontSize:14,color:"#e2e0f0",fontFamily:"sans-serif",fontWeight:600,marginBottom:2}}>{label}</div>
                    <div style={{fontSize:12,color:"#ccc",fontFamily:"sans-serif"}}>{desc}</div>
                  </div>
                  <span style={{marginLeft:"auto",color:"#aaa"}}>→</span>
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
            <GallerySettings galleryInfo={galleryInfo} onSave={setGalleryInfo} />
          </div>
        )}

        {/* ══ 作家設定 ══ */}
        {view==="artist_settings" && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <button style={S.backBtn} onClick={()=>setView("settings")}>← 設定に戻る</button>
            <div style={S.pageHeader}>
              <h1 style={S.pageTitle}>作家</h1>
              <button style={S.addEventBtn} onClick={()=>{ setEditingArtistId(null); setView("artist_form"); }}>＋ 作家を登録</button>
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
            <h1 style={S.pageTitle}>{editingArtistId ? "作家を編集" : "作家を登録"}</h1>
            <ArtistForm
              artists={artists}
              artworkGroups={artworkGroups}
              editId={editingArtistId}
              onSave={setArtists}
              nextId={nextArtistId}
              onNextId={setNextArtistId}
              onDone={()=>{ setEditingArtistId(null); setView("artist_settings"); }}
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

        {/* ══ 委託一覧 ══ */}
        {view==="consignment" && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <div style={S.pageHeader}>
              <h1 style={S.pageTitle}>委託</h1>
              <button style={S.addEventBtn} onClick={()=>{setConsignmentPreselect([]);setView("consignment_new");}}>＋ 新規委託</button>
            </div>
            <ConsignmentList
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
              <h1 style={S.pageTitle}>委託を編集</h1>
              <ConsignmentForm
                artworks={artworks}
                counterparties={counterparties}
                staffList={staffList}
                galleryInfo={galleryInfo}
                nextId={null}
                editTarget={target}
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
            <h1 style={S.pageTitle}>新規委託</h1>
            <ConsignmentForm
              artworks={artworks}
              counterparties={counterparties}
              staffList={staffList}
              galleryInfo={galleryInfo}
              nextId={nextConsignmentId}
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
              onSelect={(artwork_id)=>{setSelectedId(artwork_id);setView("detail");}}
            />
          </div>
        )}

        {/* ══ 売上登録 ══ */}
        {view==="add_sale" && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <button style={S.backBtn} onClick={()=>setView("inventory")}>← 戻る</button>
            <h1 style={S.pageTitle}>売上を登録</h1>
            <SaleForm
              artworks={artworks}
              counterparties={counterparties}
              artists={artists}
              artworkGroups={artworkGroups}
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
                    memo: memo || "売上",
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
            <button style={S.backBtn} onClick={()=>setView("list")}>← 戻る</button>
            <h1 style={S.pageTitle}>仕入を登録</h1>
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
                <Field label="技法"><input style={S.formInput} placeholder="油彩、水彩、版画…" value={artworkForm.medium} onChange={e=>setAF("medium",e.target.value)}/></Field>
                <Field label="サイズ"><input style={S.formInput} placeholder="F30 (90.9×72.7cm)" value={artworkForm.size} onChange={e=>setAF("size",e.target.value)}/></Field>
                <Field label="鑑定"><input style={S.formInput} placeholder="例：東京美術倶楽部、日動美術財団" value={artworkForm.appraisal} onChange={e=>setAF("appraisal",e.target.value)}/></Field>
              </div>
              <div style={{...S.formSectionTitle,marginTop:20}}>仕入情報</div>
              <div style={{...S.formGrid,...(isMobile?{gridTemplateColumns:"1fr"}:{})}}>
                <Field label="仕入先">
                  <CpSelect
                    value={artworkForm.supplier} cpId={artworkForm.supplier_id}
                    counterparties={counterparties}
                    onChange={(name,id)=>setArtworkForm(p=>({...p,supplier:name,supplier_id:id}))}
                    onQuickRegister={quickRegisterCp}
                  />
                </Field>
                <Field label="仕入価格 (円)"><input style={S.formInput} type="number" placeholder="例：280000" value={artworkForm.purchase_price} onChange={e=>setAF("purchase_price",e.target.value)}/></Field>
                <Field label="発表価格 (円)"><input style={S.formInput} type="number" placeholder="例：580000" value={artworkForm.announce_price} onChange={e=>setAF("announce_price",e.target.value)}/></Field>
                <Field label="仕入日"><input style={S.formInput} type="date" value={artworkForm.purchased_at} onChange={e=>setAF("purchased_at",e.target.value)}/></Field>
                <Field label="仕入メモ" fullWidth><input style={S.formInput} placeholder="経緯・備考など" value={artworkForm.memo} onChange={e=>setAF("memo",e.target.value)}/></Field>
              </div>
              <button style={{...S.submitBtn,...(!artworkForm.title||!artworkForm.artist?S.submitDisabled:{})}}
                onClick={addArtwork} disabled={!artworkForm.title||!artworkForm.artist}>登録する</button>
            </div>
          </div>
        )}

        {/* ══ 取引記録追加フォーム ══ */}
        {view==="add_history" && selected && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <button style={S.backBtn} onClick={()=>{setView("detail");setEditingHistoryId(null);}}>← 戻る</button>
            <h1 style={S.pageTitle}>{editingHistoryId?"取引記録を編集":"取引記録を追加"}</h1>
            <p style={S.formSub}>対象：<strong style={{color:"#e2e0f0"}}>{selected.title}</strong> <span style={{color:"#ccc"}}>（{selected.artist}）</span></p>
            <div style={S.formCard}>
              <div style={S.formGrid}>
                <Field label="日付">
                  <input style={S.formInput} type="date" value={eventForm.created_at||""} onChange={e=>setEF("created_at",e.target.value)}/>
                </Field>
                <Field label="種別">
                  <select style={S.formInput} value={eventForm.event_type} onChange={e=>{
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
                    }
                  }}>
                    {Object.entries(EVENT_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
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
              <button style={S.submitBtn} onClick={addEvent}>{editingHistoryId?"保存する":"記録する"}</button>
            </div>
          </div>
        )}

        {/* ══ 取引先登録・編集フォーム ══ */}
        {view==="cp_form" && (
          <div style={{...S.content,...(!isMobile?S.contentPc:{})}}>
            <button style={S.backBtn} onClick={()=>{setCpEditId(null);setView(cpEditId?"cp_detail":"cp_list");}}>← 戻る</button>
            <h1 style={S.pageTitle}>{cpEditId?"取引先を編集":"取引先を登録"}</h1>
            <div style={S.formCard}>
              <div style={S.formSectionTitle}>種別</div>
              <div style={S.formGrid}>
                <Field label="種別">
                  <select style={S.formInput} value={cpForm.type} onChange={e=>setCF("type",e.target.value)}>
                    {Object.entries(CP_TYPES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </Field>

              </div>

              <div style={{...S.formSectionTitle,marginTop:20}}>取引先情報</div>
              <div style={S.formGrid}>
                {isPersonType(cpForm.type) ? (
                  <Field label="取引先名" required><input style={S.formInput} placeholder="例：田中 誠" value={cpForm.name} onChange={e=>setCF("name",e.target.value)}/></Field>
                ) : (
                  <Field label="取引先名" required><input style={S.formInput} placeholder="例：株式会社〇〇" value={cpForm.company} onChange={e=>setCF("company",e.target.value)}/></Field>
                )}
                <Field label="ふりがな"><input style={S.formInput} placeholder="例：タナカ マコト / かぶしきかいしゃ〇〇" value={cpForm.name_kana} onChange={e=>setCF("name_kana",e.target.value)}/></Field>
                <Field label="部署（任意）"><input style={S.formInput} placeholder="例：コレクション部" value={cpForm.department} onChange={e=>setCF("department",e.target.value)}/></Field>
                {isPersonType(cpForm.type)&&(
                  <Field label="所属会社・団体（任意）"><input style={S.formInput} placeholder="例：田中商事株式会社" value={cpForm.company} onChange={e=>setCF("company",e.target.value)}/></Field>
                )}
              </div>

              <div style={{...S.formSectionTitle,marginTop:20}}>インボイス（適格請求書）</div>
              <div style={S.formGrid}>
                <Field label="インボイス登録番号（T+13桁）"><input style={S.formInput} placeholder="例：T1234567890123" value={cpForm.invoice_no} onChange={e=>setCF("invoice_no",e.target.value)}/></Field>
                <Field label="登録開始日"><input style={S.formInput} type="date" value={cpForm.invoice_from} onChange={e=>setCF("invoice_from",e.target.value)}/></Field>
                <Field label="登録終了日（任意）"><input style={S.formInput} type="date" value={cpForm.invoice_to} onChange={e=>setCF("invoice_to",e.target.value)}/></Field>
              </div>

              <div style={{...S.formSectionTitle,marginTop:20}}>連絡先</div>
              <div style={S.formGrid}>
                <Field label="メールアドレス"><input style={S.formInput} type="email" placeholder="例：info@example.com" value={cpForm.email} onChange={e=>setCF("email",e.target.value)}/></Field>
                <Field label="電話番号"><input style={S.formInput} placeholder="例：03-1234-5678" value={cpForm.phone} onChange={e=>setCF("phone",e.target.value)}/></Field>
                <Field label="郵便番号"><input style={S.formInput} placeholder="例：150-0001" value={cpForm.zip} onChange={e=>setCF("zip",e.target.value)}/></Field>
                <Field label="住所"><input style={S.formInput} placeholder="例：東京都渋谷区〇〇1-1-1" value={cpForm.address} onChange={e=>setCF("address",e.target.value)}/></Field>
                <Field label="建物名以下" fullWidth><input style={S.formInput} placeholder="例：〇〇ビル3F" value={cpForm.building} onChange={e=>setCF("building",e.target.value)}/></Field>
                <Field label="メモ" fullWidth><textarea style={{...S.formInput,resize:"vertical",minHeight:72}} placeholder="特記事項・嗜好など" value={cpForm.note} onChange={e=>setCF("note",e.target.value)}/></Field>
              </div>
              <button
                style={{...S.submitBtn,...((!isPersonType(cpForm.type)&&!cpForm.company)||(isPersonType(cpForm.type)&&!cpForm.name)?S.submitDisabled:{})}}
                onClick={saveCp}
                disabled={(!isPersonType(cpForm.type)&&!cpForm.company)||(isPersonType(cpForm.type)&&!cpForm.name)}>
                {cpEditId?"保存する":"登録する"}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ══ スマホ：ボトムナビ ══ */}
      {isMobile && (
        <nav style={S.bottomNav}>
          {[
            { key:"inventory",   icon:"", label:"在庫" },
            { key:"daily",       icon:"", label:"日計" },
            { key:"consignment", icon:"", label:"委託" },
            { key:"list",        icon:"", label:"作品" },
            { key:"cp_list",     icon:"", label:"取引先" },
            { key:"settings",    icon:"", label:"設定" },
          ].map(({key,icon,label})=>(
            <button key={key}
              style={{...S.bottomNavItem,...(activeNav===key?S.bottomNavActive:{})}}
              onClick={()=>{setView(key);setSelectedId(null);setSelectedCpId(null);}}>
              <span style={S.bottomNavIcon}><span className="material-icons" style={{fontSize:18,lineHeight:1}}>{icon}</span></span>
              <span style={S.bottomNavLabel}>{label}</span>
            </button>
          ))}
          <button
            style={{...S.bottomNavItem,...S.bottomNavPlus,...(registerMenuOpen?{color:"#a78bfa"}:{})}}
            onClick={()=>setRegisterMenuOpen(o=>!o)}>
            <span style={{...S.bottomNavIcon,fontSize:22,lineHeight:1}}>{registerMenuOpen?"✕":"＋"}</span>
            <span style={S.bottomNavLabel}>登録</span>
          </button>
          {/* 登録ポップアップ */}
          {registerMenuOpen && (
            <>
              <div style={S.registerOverlay} onClick={()=>setRegisterMenuOpen(false)}/>
              <div style={S.registerMenu}>
                <button style={S.registerMenuItem} onClick={()=>{setView("add_artwork");setRegisterMenuOpen(false);}}>
                  <span style={S.registerMenuIcon}>◈</span>
                  <div>
                    <div style={S.registerMenuTitle}>仕入を登録</div>
                    <div style={S.registerMenuSub}>新しい作品を仕入れる</div>
                  </div>
                </button>
                <button style={S.registerMenuItem} onClick={()=>{setView("add_sale");setRegisterMenuOpen(false);}}>
                  <span style={S.registerMenuIcon}>◆</span>
                  <div>
                    <div style={S.registerMenuTitle}>売上を登録</div>
                    <div style={S.registerMenuSub}>在庫作品の売上を記録する</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </nav>
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
              style={{...TL.filterBtn,...(typeFilter===k?TL.filterActive:{}),...(k!=="all"?{color:EVENT_COLORS[k]||"#888",borderColor:(EVENT_COLORS[k]||"#888")+"44"}:{})}}
              onClick={()=>setTypeFilter(k)}>{l}
            </button>
          ))}
        </div>
        <div style={{fontSize:12,color:"#aaa",fontFamily:"sans-serif",textAlign:"right"}}>{filtered.length}件</div>
      </div>

      {/* 日付グループ */}
      {sortedDates.length===0
        ? <div style={{color:"#aaa",fontSize:13,fontFamily:"sans-serif",padding:"40px 0",textAlign:"center"}}>該当する取引がありません</div>
        : sortedDates.map(date => {
          const evs = groups[date];
          const { purchase, sold } = dayTotal(evs);
          return (
            <div key={date} style={TL.dateGroup}>
              {/* 日付ヘッダー */}
              <div style={TL.dateHeader}>
                <span style={TL.dateLabel}>{fmtDate(date)}</span>
                <div style={TL.dateSummary}>
                  {purchase>0&&<span style={{color:"#60a5fa",fontSize:12,fontFamily:"sans-serif"}}>仕入 {fmt(purchase)}</span>}
                  {sold>0&&<span style={{color:"#4ade80",fontSize:12,fontFamily:"sans-serif"}}>売上 {fmt(sold)}</span>}
                  <span style={{color:"#aaa",fontSize:12,fontFamily:"sans-serif"}}>{evs.length}件</span>
                </div>
              </div>

              {/* 取引行 */}
              {evs.map((h,i) => {
                const artwork = artworks.find(a => a.artwork_id === h.artwork_id);
                return (
                  <div key={h.id} style={{...TL.row,...(i%2===0?{}:{background:"#0d0d16"})}}>
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
                        : <span style={{color:"#aaa",fontSize:12,fontFamily:"sans-serif"}}>—</span>
                      }
                    </div>

                    {/* 取引先 */}
                    <div style={TL.cpCol}>
                      {h.counterparty
                        ? h.counterparty_id
                          ? <button style={TL.cpLink} onClick={()=>onSelectCp(h.counterparty_id)}>
                              {h.counterparty}
                            </button>
                          : <span style={{fontSize:12,fontFamily:"sans-serif",color:"#ccc"}}>{h.counterparty}</span>
                        : <span style={{color:"#aaa",fontSize:12}}>—</span>
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
  search:      { background:"#0f0f18", border:"1px solid #2a2a40", borderRadius:8, padding:"8px 14px", color:"#e2e0f0", fontSize:13, fontFamily:"sans-serif", outline:"none", width:"100%", boxSizing:"border-box" },
  filterBtn:   { padding:"4px 10px", borderRadius:20, border:"1px solid #2a2a40", background:"transparent", color:"#ccc", cursor:"pointer", fontSize:12, fontFamily:"sans-serif" },
  filterActive:{ background:"#1e1e30", color:"#e2e0f0", borderColor:"#a78bfa55" },
  dateGroup:   { marginBottom:24 },
  dateHeader:  { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0 6px", borderBottom:"2px solid #1e1e30", marginBottom:2 },
  dateLabel:   { fontSize:14, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", letterSpacing:"0.05em" },
  dateSummary: { display:"flex", gap:12, alignItems:"center" },
  row:         { display:"flex", alignItems:"center", gap:12, padding:"10px 6px", borderBottom:"1px solid #13131e", flexWrap:"wrap" },
  eventType:   { flexShrink:0, width:70 },
  badge:       { padding:"2px 7px", borderRadius:12, fontSize:12, fontFamily:"sans-serif", whiteSpace:"nowrap" },
  artworkCol:  { flex:1, minWidth:120 },
  artworkLink: { background:"none", border:"none", padding:0, cursor:"pointer", textAlign:"left", display:"flex", flexDirection:"column", gap:1 },
  artworkTitle:{ fontSize:13, color:"#e2e0f0", fontWeight:600 },
  artworkSub:  { fontSize:12, color:"#ccc", fontFamily:"sans-serif" },
  cpCol:       { flexShrink:0, minWidth:100, maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  cpLink:      { background:"none", border:"none", color:"#a78bfa", cursor:"pointer", fontSize:12, fontFamily:"sans-serif", padding:0, textDecoration:"underline", textDecorationStyle:"dotted" },
  priceCol:    { flexShrink:0, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2, minWidth:90 },
  oldPrice:    { fontSize:12, color:"#aaa", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", textDecoration:"line-through" },
  newPrice:    { fontSize:15, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" },
  memo:        { width:"100%", fontSize:12, color:"#bbb", fontFamily:"sans-serif", paddingLeft:82 },
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
          <div style={{background:"#1a1a2e",border:"1px solid #2e2e48",borderRadius:12,padding:"28px 32px",maxWidth:400,width:"90%",textAlign:"center"}}>
            {hasArtworks ? (
              <>
                <div style={{fontSize:18,fontFamily:"sans-serif",marginBottom:8,color:"#f87171"}}>削除できません</div>
                <div style={{fontSize:14,color:"#bbb",fontFamily:"sans-serif",marginBottom:24,lineHeight:1.8}}>
                  <span style={{color:"#e2e0f0",fontWeight:"bold"}}>{targetArtist?.name}</span> の作品が<br/>
                  作品一覧に <span style={{color:"#f59e0b",fontWeight:"bold"}}>{artworkCount}点</span> 登録されています。<br/>
                  先に作品をすべて削除してから、<br/>作家を削除してください。
                </div>
                <button style={{padding:"8px 32px",borderRadius:6,border:"none",background:"#2a2a40",color:"#ccc",cursor:"pointer",fontSize:13,fontFamily:"sans-serif"}}
                  onClick={()=>setConfirmDeleteId(null)}>閉じる</button>
              </>
            ) : (
              <>
                <div style={{fontSize:18,fontFamily:"sans-serif",marginBottom:8}}>削除の確認</div>
                <div style={{fontSize:14,color:"#bbb",fontFamily:"sans-serif",marginBottom:24,lineHeight:1.6}}>
                  <span style={{color:"#e2e0f0",fontWeight:"bold"}}>{targetArtist?.name}</span>（{targetArtist?.name_kana}）を削除しますか？<br/>
                  この操作は取り消せません。
                </div>
                <div style={{display:"flex",gap:10,justifyContent:"center"}}>
                  <button style={{padding:"8px 24px",borderRadius:6,border:"none",background:"#2a2a40",color:"#ccc",cursor:"pointer",fontSize:13,fontFamily:"sans-serif"}}
                    onClick={()=>setConfirmDeleteId(null)}>キャンセル</button>
                  <button style={{padding:"8px 24px",borderRadius:6,border:"none",background:"#f87171",color:"#fff",cursor:"pointer",fontSize:13,fontFamily:"sans-serif"}}
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
          <div style={{background:"#1a1a2e",border:"1px solid #2e2e48",borderRadius:12,padding:"28px 32px",maxWidth:400,width:"90%",textAlign:"center"}}>
            <div style={{fontSize:18,fontFamily:"sans-serif",marginBottom:8}}>グループを削除</div>
            <div style={{fontSize:14,color:"#bbb",fontFamily:"sans-serif",marginBottom:24,lineHeight:1.8}}>
              <span style={{color:"#e2e0f0",fontWeight:"bold"}}>「{targetGroup?.name}」</span> を削除します。<br/>
              {groupArtistCount > 0 && (
                <span>このグループに属する <span style={{color:"#f59e0b",fontWeight:"bold"}}>{groupArtistCount}名</span> の作家は未分類になります。<br/></span>
              )}
              この操作は取り消せません。
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button style={{padding:"8px 24px",borderRadius:6,border:"none",background:"#2a2a40",color:"#ccc",cursor:"pointer",fontSize:13,fontFamily:"sans-serif"}}
                onClick={()=>setConfirmDeleteGroupId(null)}>キャンセル</button>
              <button style={{padding:"8px 24px",borderRadius:6,border:"none",background:"#f87171",color:"#fff",cursor:"pointer",fontSize:13,fontFamily:"sans-serif"}}
                onClick={doDeleteGroup}>削除する</button>
            </div>
          </div>
        </div>
      )}

      {/* タブ切り替え：作家一覧 / グループ管理 */}
      <div style={{display:"flex",gap:4,marginBottom:20,borderBottom:"1px solid #1e1e30",paddingBottom:0}}>
        {(["artists","groups"] as const).map(tab=>(
          <button key={tab}
            style={{padding:"8px 20px",background:"none",border:"none",borderBottom:groupTab===tab?"2px solid #a78bfa":"2px solid transparent",color:groupTab===tab?"#a78bfa":"#888",cursor:"pointer",fontSize:13,fontFamily:"sans-serif",fontWeight:groupTab===tab?600:400,marginBottom:-1}}
            onClick={e=>{setGroupTab(tab);e.currentTarget.blur();}}>
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
          <div style={{fontSize:12,color:"#aaa",fontFamily:"sans-serif",margin:"0 0 12px",textAlign:"right"}}>{filtered.length}件</div>
          <div style={{display:"flex",flexDirection:"column",gap:0}}>
            {filtered.map(a=>{
              const grp = artworkGroups.find(g=>g.id===a.group_id);
              return (
                <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #1e1e30"}}>
                  <span style={{fontFamily:"'Courier New',monospace",fontSize:12,color:"#a78bfa",width:40,flexShrink:0}}>{a.artist_id}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontFamily:"sans-serif",display:"flex",alignItems:"center",gap:6}}>
                      {a.name}
                      {grp && <span style={{fontSize:11,color:"#818cf8",border:"1px solid #818cf8",borderRadius:3,padding:"0 4px",lineHeight:"16px"}}>{grp.name}</span>}
                    </div>
                    <div style={{fontSize:12,color:"#bbb",fontFamily:"sans-serif"}}>{a.name_kana}</div>
                  </div>
                  <button style={{background:"none",border:"none",color:"#a78bfa",cursor:"pointer",fontSize:12,fontFamily:"sans-serif"}}
                    onClick={()=>onEdit(a.id)}>編集</button>
                  <button style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:12,fontFamily:"sans-serif"}}
                    onClick={()=>confirmDelete(a.id)}>削除</button>
                </div>
              );
            })}
            {filtered.length===0&&<div style={{color:"#aaa",fontSize:13,fontFamily:"sans-serif",padding:"20px 0"}}>該当する作家がいません</div>}
          </div>
        </>
      )}

      {/* ── グループ管理タブ ── */}
      {groupTab==="groups" && (
        <>
          <div style={{fontSize:12,color:"#aaa",fontFamily:"sans-serif",marginBottom:16,lineHeight:1.6}}>
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
              style={{padding:"8px 16px",borderRadius:6,border:"none",background:newGroupName.trim()?"#a78bfa":"#2a2a40",color:newGroupName.trim()?"#fff":"#666",cursor:newGroupName.trim()?"pointer":"default",fontSize:13,fontFamily:"sans-serif",whiteSpace:"nowrap"}}
              onClick={addGroup} disabled={!newGroupName.trim()}>
              ＋ 追加
            </button>
          </div>

          {/* グループ一覧 */}
          {artworkGroups.length===0 ? (
            <div style={{color:"#aaa",fontSize:13,fontFamily:"sans-serif",padding:"20px 0",textAlign:"center"}}>グループがまだありません</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:0}}>
              {artworkGroups.map((g,idx)=>{
                const cnt = artists.filter(a=>a.group_id===g.id).length;
                const isEditing = editingGroupId===g.id;
                return (
                  <div key={g.id} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 0",borderBottom:"1px solid #1e1e30"}}>
                    {/* 並び替えボタン */}
                    <div style={{display:"flex",flexDirection:"column",gap:1,flexShrink:0}}>
                      <button style={{background:"none",border:"none",color:idx===0?"#333":"#888",cursor:idx===0?"default":"pointer",fontSize:10,padding:"1px 4px",lineHeight:1}}
                        onClick={()=>moveGroup(g.id,-1)} disabled={idx===0}>▲</button>
                      <button style={{background:"none",border:"none",color:idx===artworkGroups.length-1?"#333":"#888",cursor:idx===artworkGroups.length-1?"default":"pointer",fontSize:10,padding:"1px 4px",lineHeight:1}}
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
                        <span style={{fontSize:14,fontFamily:"sans-serif",color:"#e2e0f0"}}>{g.name}</span>
                        <span style={{fontSize:12,color:"#888",fontFamily:"sans-serif",marginLeft:8}}>{cnt}名</span>
                      </div>
                    )}
                    {/* 操作ボタン */}
                    {isEditing ? (
                      <>
                        <button style={{background:"none",border:"none",color:"#4ade80",cursor:"pointer",fontSize:12,fontFamily:"sans-serif"}}
                          onClick={saveGroupEdit}>保存</button>
                        <button style={{background:"none",border:"none",color:"#888",cursor:"pointer",fontSize:12,fontFamily:"sans-serif"}}
                          onClick={()=>setEditingGroupId(null)}>取消</button>
                      </>
                    ) : (
                      <>
                        <button style={{background:"none",border:"none",color:"#a78bfa",cursor:"pointer",fontSize:12,fontFamily:"sans-serif"}}
                          onClick={()=>{setEditingGroupId(g.id);setEditingGroupName(g.name);}}>編集</button>
                        <button style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:12,fontFamily:"sans-serif"}}
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

// ─── 作家登録・編集フォーム ────────────────────────────────
function ArtistForm({ artists, artworkGroups=[], editId, onSave, nextId, onNextId, onDone }) {
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
      <div style={S.formGrid}>
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
          style={{...S.submitBtn,marginTop:0,background:"#2a2a40",color:"#ccc"}}
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

  const filtered = [...artists]
    .sort((a,b)=>a.name_kana.localeCompare(b.name_kana,"ja"))
    .filter(a=>!q||[a.name,a.name_kana].some(s=>(s||"").toLowerCase().includes(q.toLowerCase())));

  const canRegister = quickForm.name.trim() && quickForm.name_kana.trim();

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
          onChange={e=>onChange(e.target.value,null,"")}
          onFocus={()=>setOpen(true)}/>
        <button type="button" style={{position:"absolute",right:0,top:0,bottom:0,width:32,background:"transparent",border:"none",cursor:"pointer",color:"#a78bfa",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={()=>setOpen(o=>!o)}>▾</button>
      </div>
      {artistId&&<div style={{fontSize:12,color:"#a78bfa",fontFamily:"sans-serif",marginTop:2}}>✓ 作家ID：{artistId}</div>}
      {open&&(
        <div style={S.cpDropdown}>
          {!showQuick ? (<>
            <input style={{...S.formInput,margin:"8px 8px 4px",width:"calc(100% - 16px)",fontSize:12,boxSizing:"border-box"}}
              placeholder="絞り込み…" value={q} onChange={e=>setQ(e.target.value)} autoFocus/>
            <div style={{maxHeight:200,overflowY:"auto"}}>
              {filtered.map(a=>(
                <div key={a.id} style={S.cpDropdownItem}
                  onClick={()=>{onChange(a.name,a.artist_id,a.name_kana);setOpen(false);setQ("");}}
                  onMouseEnter={e=>e.currentTarget.style.background="#1e1e30"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <span style={{fontFamily:"'Courier New',monospace",fontSize:12,color:"#a78bfa",width:36,flexShrink:0}}>{a.artist_id}</span>
                  <div>
                    <span style={{fontWeight:600}}>{a.name}</span>
                    <span style={{fontSize:12,color:"#ccc",marginLeft:6,fontFamily:"sans-serif"}}>{a.name_kana}</span>
                  </div>
                </div>
              ))}
              {filtered.length===0&&<div style={{padding:"10px 12px",fontSize:12,color:"#aaa",fontFamily:"sans-serif"}}>見つかりません</div>}
            </div>
            {onQuickRegister && (
              <button style={{...S.cpDropdownClose,color:"#a78bfa",borderTop:"1px solid #1e1e30"}}
                onClick={()=>{setShowQuick(true);setQuickForm({name:q,name_kana:""});}}>
                ＋ 新規作家として登録
              </button>
            )}
            <button style={S.cpDropdownClose} onClick={()=>{setOpen(false);setQ("");}}>閉じる</button>
          </>) : (<>
            <div style={{padding:"10px 12px 6px",fontSize:12,color:"#a78bfa",fontFamily:"sans-serif",letterSpacing:"0.05em"}}>新規作家登録</div>
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
                <button style={{...S.cpDropdownClose,border:"1px solid #2a2a40",borderRadius:8,padding:"7px 14px",width:"auto"}}
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
function SaleForm({ artworks, counterparties, artists=[], artworkGroups=[], onSave, isMobile=false }) {
  const fmt   = (n) => n != null ? `¥${Number(n).toLocaleString()}` : "—";
  const toDay = () => new Date().toISOString().slice(0,10);
  const TAX_RATE = 0.10;

  const [soldDate,      setSoldDate]      = useState(toDay());
  const [buyerName,     setBuyerName]     = useState("");
  const [buyerId,       setBuyerId]       = useState(null);
  const [memo,          setMemo]          = useState("");
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
    return p - Math.floor(p / (1 + rate));
  };

  const toggleItem = (a) => {
    if (isSelected(a.artwork_id)) {
      setSelectedItems(p => p.filter(i => i.artwork_id !== a.artwork_id));
    } else {
      const price = a.announce_price || 0;
      setSelectedItems(p => [...p, { artwork_id: a.artwork_id, price, tax: calcTax(price, TAX_RATE) }]);
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
  const canSave    = selectedItems.length > 0 && buyerName && soldDate;

  const handleSave = () => {
    if (!canSave) return;
    onSave(selectedItems.map(i => ({
      artwork_id: i.artwork_id,
      sold_price: Number(i.price),
      buyer_name: buyerName,
      buyer_id:   buyerId,
      sold_date:  soldDate,
      memo,
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
            <input style={{...S.formInput, marginTop:6, display:"block", width:"100%", boxSizing:"border-box", WebkitAppearance:"none", appearance:"none"}} type="date" value={soldDate} onChange={e=>setSoldDate(e.target.value)}/>
          </div>
          <div>
            <label style={SF.label}>売上先 <span style={SF.required}>*</span></label>
            <div style={{position:"relative",marginTop:6}}>
              <input style={{...S.formInput,paddingRight:32}} placeholder="売上先を選択または入力"
                value={buyerName} onChange={e=>{setBuyerName(e.target.value);setBuyerId(null);}}
                onFocus={()=>setCpOpen(true)}/>
              <button type="button" style={{position:"absolute",right:0,top:0,bottom:0,width:32,background:"transparent",border:"none",cursor:"pointer",color:"#a78bfa",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}
                onClick={()=>setCpOpen(o=>!o)}>▾</button>
              {buyerId&&<div style={{fontSize:12,color:"#a78bfa",fontFamily:"sans-serif",marginTop:4}}>✓ 取引先DBと連携済み</div>}
              {cpOpen&&(
                <div style={S.cpDropdown}>
                  <input style={{...S.formInput,margin:"8px 8px 4px",width:"calc(100% - 16px)",fontSize:12,boxSizing:"border-box"}}
                    placeholder="絞り込み…" value={cpQ} onChange={e=>setCpQ(e.target.value)} autoFocus/>
                  <div style={{maxHeight:160,overflowY:"auto"}}>
                    {filteredCps.map(c=>(
                      <div key={c.id} style={S.cpDropdownItem}
                        onClick={()=>{setBuyerName(cpDisplayName(c));setBuyerId(c.cp_id);setCpOpen(false);setCpQ("");}}
                        onMouseEnter={e=>e.currentTarget.style.background="#1e1e30"}
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
          <div>
            <label style={SF.label}>メモ</label>
            <input style={{...S.formInput,marginTop:6}} placeholder="備考など" value={memo} onChange={e=>setMemo(e.target.value)}/>
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
            onClick={e=>{ setArtTab("ALL"); e.currentTarget.blur(); }}>
            すべて <span style={IS.tabCount}>{allInStock.length}</span>
          </button>
          {visibleSaleGroups.length>0&&(
            <>
              <span style={{width:1,height:18,background:"#2a2a40",flexShrink:0,margin:"0 2px"}}/>
              {visibleSaleGroups.map(g=>{
                const key=`G:${g.id}`;
                const cnt=allInStock.filter(a=>{const art=artists.find(ar=>ar.artist_id===a.artist_id);return art?.group_id===g.id;}).length;
                return (
                  <button key={key} style={{...IS.tab,...(artTab===key?IS.tabActive:{}),...(artTab===key?{boxShadow:"0 0 0 1px #818cf855",color:"#818cf8"}:{})}}
                    onClick={e=>{ setArtTab(key); setArtSearch(""); e.currentTarget.blur(); }}>
                    {g.name} <span style={IS.tabCount}>{cnt}</span>
                  </button>
                );
              })}
            </>
          )}
          {visibleArtTabs.length>0&&(
            <>
              <span style={{width:1,height:18,background:"#2a2a40",flexShrink:0,margin:"0 2px"}}/>
              {visibleArtTabs.map(row=>{
                const cnt=noGroupInStock.filter(a=>getKanaRow(a.artist_kana||a.artist)===row.key).length;
                return (
                  <button key={row.key} style={{...IS.tab,...(artTab===row.key?IS.tabActive:{})}}
                    onClick={e=>{ setArtTab(row.key); setArtSearch(""); e.currentTarget.blur(); }}>
                    {row.label} <span style={IS.tabCount}>{cnt}</span>
                  </button>
                );
              })}
            </>
          )}
        </div>
        <div style={{fontSize:12,color:"#aaa",fontFamily:"sans-serif",marginBottom:8,textAlign:"right"}}>{available.length}件</div>

        <div style={{border:"1px solid #1e1e30",borderRadius:8,overflow:"hidden",maxHeight:320,overflowY:"auto"}}>
          {available.map((a,i) => {
            const sel = isSelected(a.artwork_id);
            return (
              <div key={a.artwork_id}
                style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",cursor:"pointer",
                  background: sel?"#0f1e30":i%2===0?"transparent":"#0a0a14",
                  outline: sel?"1px solid #38bdf844":"none", transition:"background 0.1s"}}
                onMouseEnter={e=>{ if(!sel) e.currentTarget.style.background="#161622"; }}
                onMouseLeave={e=>{ if(!sel) e.currentTarget.style.background=i%2===0?"transparent":"#0a0a14"; }}>
                <div style={{width:20,height:20,borderRadius:4,flexShrink:0,
                  boxShadow:sel?"none":"0 0 0 1px #2a2a40",
                  background:sel?"#38bdf8":"transparent",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff"}}
                  onClick={()=>toggleItem(a)}>
                  {sel?"✓":""}
                </div>
                <div style={{flex:1,minWidth:0,display:"flex",alignItems:"center",gap:10,overflow:"hidden"}}
                  onClick={()=>toggleItem(a)}>
                  <span style={{fontFamily:"'Courier New',monospace",fontSize:12,color:"#a78bfa",fontWeight:700,flexShrink:0,width:70}}>{a.artwork_id}</span>
                  <span style={{fontSize:12,color:"#bbb",flexShrink:0,whiteSpace:"nowrap"}}>{a.artist}</span>
                  <span style={{fontWeight:600,fontSize:14,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1}}>{a.title}</span>
                  <span style={{color:"#34d399",fontSize:13,flexShrink:0,whiteSpace:"nowrap"}}>¥{Number(a.purchase_price).toLocaleString()}</span>
                </div>
                {!sel&&<span style={{...S.statusBadge,background:STATUSES[a.status]?.color+"22",color:STATUSES[a.status]?.color,border:`1px solid ${STATUSES[a.status]?.color}44`,flexShrink:0,fontSize:12}}>
                  {STATUSES[a.status]?.label}
                </span>}
              </div>
            );
          })}
          {available.length===0&&<div style={{color:"#aaa",fontSize:13,padding:"24px",textAlign:"center"}}>該当する作品がありません</div>}
        </div>
      </div>

      {/* ── STEP 3: 価格確認・編集 ── */}
      {selectedItems.length > 0 && (
        <div style={SF.section}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={SF.sectionTitle} >③ 価格を確認・編集</div>
            <span style={{fontSize:13,color:"#38bdf8",fontFamily:"sans-serif"}}>{selectedItems.length}点選択中</span>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:520}}>
              <thead>
                <tr style={{borderBottom:"2px solid #2a2a40"}}>
                  {["作品ID","作家","タイトル","売上価格","消費税額","税抜額",""].map(h=>(
                    <th key={h} style={{padding:"8px 10px",textAlign:h==="売上価格"||h==="消費税額"||h==="税抜額"?"right":"left",fontSize:12,color:"#aaa",whiteSpace:"nowrap",fontWeight:600}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedItems.map((item,i)=>{
                  const a    = artworks.find(a=>a.artwork_id===item.artwork_id);
                  const excl = (Number(item.price)||0) - (Number(item.tax)||0);
                  return (
                    <tr key={item.artwork_id} style={{borderBottom:"1px solid #1e1e30",background:i%2===0?"transparent":"#0a0a14"}}>
                      <td style={{padding:"10px 10px",fontFamily:"'Courier New',monospace",fontSize:12,color:"#a78bfa",fontWeight:700,whiteSpace:"nowrap"}}>{a?.artwork_id}</td>
                      <td style={{padding:"10px 10px",fontSize:12,color:"#bbb",whiteSpace:"nowrap"}}>{a?.artist}</td>
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
                      <td style={{padding:"10px 10px",textAlign:"right",fontSize:13,color:"#aaa"}}>{fmt(excl)}</td>
                      <td style={{padding:"10px 10px",textAlign:"center"}}>
                        <button style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:16}}
                          onClick={()=>setSelectedItems(p=>p.filter(i=>i.artwork_id!==item.artwork_id))}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{borderTop:"2px solid #2a2a40",background:"#0f0f18"}}>
                  <td colSpan={3} style={{padding:"10px 10px",fontSize:13,color:"#aaa",fontWeight:600}}>{selectedItems.length}点 合計</td>
                  <td style={{padding:"10px 10px",textAlign:"right",fontSize:16,color:"#4ade80",fontWeight:700}}>{fmt(totalPrice)}</td>
                  <td style={{padding:"10px 10px",textAlign:"right",fontSize:13,color:"#f59e0b"}}>{fmt(totalTax)}</td>
                  <td style={{padding:"10px 10px",textAlign:"right",fontSize:13,color:"#aaa"}}>{fmt(totalExcl)}</td>
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
  section:      { background:"#0f0f18", border:"1px solid #1e1e30", borderRadius:12, padding:"20px", marginBottom:16, boxSizing:"border-box", width:"100%" },
  sectionTitle: { fontSize:13, fontWeight:700, color:"#a78bfa", fontFamily:"sans-serif", letterSpacing:"0.05em", marginBottom:14 },
  row:          { display:"flex", gap:16, flexWrap:"wrap" },
  field:        { display:"flex", flexDirection:"column", gap:6, flex:1, minWidth:140 },
  label:        { fontSize:12, color:"#aaa", fontFamily:"sans-serif" },
  required:     { color:"#f87171" },
};


// ─── 画廊情報設定 ─────────────────────────────────────────
function GallerySettings({ galleryInfo, onSave }) {
  const [form, setForm] = useState({ ...galleryInfo });
  const setF = (k,v) => setForm(p=>({...p,[k]:v}));
  return (
    <div style={{maxWidth:600}}>
      <div style={S.formGrid}>
        <Field label="画廊名" fullWidth><input style={S.formInput} placeholder="例：ギャラリー〇〇" value={form.name} onChange={e=>setF("name",e.target.value)}/></Field>
        <Field label="郵便番号"><input style={S.formInput} placeholder="例：100-0001" value={form.zip} onChange={e=>setF("zip",e.target.value)}/></Field>
        <Field label="住所"><input style={S.formInput} placeholder="例：東京都千代田区〇〇1-1-1" value={form.address} onChange={e=>setF("address",e.target.value)}/></Field>
        <Field label="建物名以下" fullWidth><input style={S.formInput} placeholder="例：〇〇ビル3F" value={form.building} onChange={e=>setF("building",e.target.value)}/></Field>
        <Field label="電話番号"><input style={S.formInput} placeholder="例：03-1234-5678" value={form.tel} onChange={e=>setF("tel",e.target.value)}/></Field>
        <Field label="メールアドレス"><input style={S.formInput} placeholder="例：info@gallery.jp" value={form.email} onChange={e=>setF("email",e.target.value)}/></Field>
        <Field label="FAX"><input style={S.formInput} placeholder="例：03-1234-5679" value={form.fax} onChange={e=>setF("fax",e.target.value)}/></Field>
      </div>
      <div style={{...S.formSectionTitle, marginTop:28}}>事業年度</div>
      <div style={{fontSize:12,color:"#ccc",fontFamily:"sans-serif",marginBottom:14,lineHeight:1.6}}>
        日計の「第N期」表示に使用します。開始月と第1期の基準年を設定してください。
      </div>
      <div style={S.formGrid}>
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
          <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:"1px solid #1e1e30"}}>
            <span style={{fontSize:14,fontFamily:"sans-serif"}}>{s.name}</span>
            <button style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:12,fontFamily:"sans-serif"}}
              onClick={()=>remove(s.id)}>削除</button>
          </div>
        ))}
        {staffList.length===0&&<div style={{color:"#aaa",fontSize:13,fontFamily:"sans-serif",padding:"20px 0"}}>社員が登録されていません</div>}
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
  const [saved, setSaved] = useState(false);

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
    setRates(next); setSaved(false);
  };
  const addRate = () => { setRates([...rates, { from: "", rate: 0.10 }]); setSaved(false); };
  const deleteRate = (idx) => { setRates(rates.filter((_,i)=>i!==idx)); setSaved(false); };

  // ── 経過措置の操作 ──
  const updateTR = (idx, field, val) => {
    const next = [...transitional];
    if (field === "rate") { const n = parseFloat(val); next[idx] = { ...next[idx], rate: isNaN(n) ? 0 : n / 100 }; }
    else if (field === "to") next[idx] = { ...next[idx], to: val === "" ? null : val };
    else next[idx] = { ...next[idx], from: val };
    setTransitional(next); setSaved(false);
  };
  const addTR = () => { setTransitional([...transitional, { from: "", to: null, rate: 0.80 }]); setSaved(false); };
  const deleteTR = (idx) => { setTransitional(transitional.filter((_,i)=>i!==idx)); setSaved(false); };

  const handleSave = () => {
    const sortedRates = [...rates].sort((a,b)=>a.from.localeCompare(b.from));
    onSave({ rates: sortedRates, transitionalRates: transitional });
    setRates(sortedRates); setSaved(true);
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
  const block   = { background:"#0f0f18", border:"1px solid #1e1e30", borderRadius:8, padding: isMobile ? "16px" : "20px 24px", marginBottom:24 };
  const ttl     = { fontSize:13, fontWeight:700, color:"#a78bfa", marginBottom:4 };
  const desc    = { fontSize:12, color:"#888", marginBottom:16, lineHeight:1.6 };
  const inp     = { ...S.formInput, padding:"6px 10px", fontSize:13 };
  const delBtn  = { background:"transparent", border:"1px solid #3a2020", borderRadius:4, color:"#f87171", fontSize:12, padding:"4px 10px", cursor:"pointer", whiteSpace:"nowrap" as const, fontFamily:"sans-serif" };
  const addBtn  = { background:"transparent", border:"1px solid #2a2a40", borderRadius:6, color:"#a78bfa", fontSize:12, padding:"6px 14px", cursor:"pointer", marginTop:12, fontFamily:"sans-serif" };

  // ── PC用テーブルスタイル ──
  const th = { fontSize:11, color:"#888", fontWeight:400, textAlign:"left" as const, paddingBottom:8, borderBottom:"1px solid #1e1e30" };
  const td = { paddingTop:8, paddingBottom:8, borderBottom:"1px solid #16161f", verticalAlign:"middle" as const };

  // ── スマホ用：1行カードスタイル ──
  const mCard = { background:"#13131e", border:"1px solid #1e1e2a", borderRadius:8, padding:"12px", marginBottom:8, display:"flex", flexDirection:"column" as const, gap:10 };
  const mRow  = { display:"flex", alignItems:"center", gap:8 };
  const mLab  = { fontSize:11, color:"#888", width:68, flexShrink:0, fontFamily:"sans-serif" };

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
                    <input type="date" value={r.from} onChange={e=>updateRate(origIdx,"from",e.target.value)}
                      style={{...inp, flex:1}} />
                  </div>
                  <div style={mRow}>
                    <span style={mLab}>税率（%）</span>
                    <input type="number" value={toPercent(r.rate)} onChange={e=>updateRate(origIdx,"rate",e.target.value)}
                      style={{...inp, width:80}} step="0.1" min="0" />
                  </div>
                  <div style={{...mRow, justifyContent:"space-between"}}>
                    <span style={{fontSize:11, color:"#666", fontFamily:"sans-serif"}}>{rangeLabel(si)}</span>
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
                      <input type="date" value={r.from} onChange={e=>updateRate(origIdx,"from",e.target.value)} style={inp} />
                    </td>
                    <td style={{...td, paddingRight:12, paddingLeft:8}}>
                      <input type="number" value={toPercent(r.rate)} onChange={e=>updateRate(origIdx,"rate",e.target.value)}
                        style={{...inp, width:72}} step="0.1" min="0" />
                    </td>
                    <td style={{...td, fontSize:12, color:"#888", paddingLeft:16}}>{rangeLabel(si)}</td>
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
                  <input type="date" value={t.from} onChange={e=>updateTR(idx,"from",e.target.value)}
                    style={{...inp, flex:1}} />
                </div>
                <div style={mRow}>
                  <span style={mLab}>終了日</span>
                  <input type="date" value={t.to??""} onChange={e=>updateTR(idx,"to",e.target.value)}
                    style={{...inp, flex:1}} placeholder="無期限" />
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
                    <input type="date" value={t.from} onChange={e=>updateTR(idx,"from",e.target.value)} style={inp} />
                  </td>
                  <td style={{...td, paddingRight:12, paddingLeft:12}}>
                    <input type="date" value={t.to??""} onChange={e=>updateTR(idx,"to",e.target.value)} style={inp} placeholder="無期限" />
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

      {/* ── 保存ボタン ── */}
      <div style={{display:"flex", alignItems:"center", gap:12}}>
        <button style={S.submitBtn} onClick={handleSave}>保存する</button>
        {saved && <span style={{fontSize:12, color:"#4ade80", fontFamily:"sans-serif"}}>✓ 保存しました</span>}
      </div>
    </div>
  );
}

// ─── 委託一覧 ─────────────────────────────────────────────
function ConsignmentList({ consignments, counterparties, galleryInfo, staffList, artworks, onEdit, onReturn, onSale, onSelectArtwork }) {
  const fmt = (n) => n != null ? `¥${Number(n).toLocaleString()}` : "—";
  const toDay = () => new Date().toISOString().slice(0,10);

  const [expandedId,  setExpandedId]  = useState(null);
  const [returnIds,   setReturnIds]   = useState({});
  // 売上登録ミニフォーム: { artwork_id, price, tax, buyer_name, buyer_id, date }
  const [saleForm,    setSaleForm]    = useState(null);
  const [cpOpen,      setCpOpen]      = useState(false);
  const [cpQ,         setCpQ]         = useState("");

  const TAX_RATE = 0.10;
  const calcTax  = (p) => (Number(p)||0) - Math.floor((Number(p)||0) / (1 + TAX_RATE));

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
    if (!saleForm || !saleForm.buyer_name || !saleForm.price) return;
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
    <div style={{color:"#aaa",fontSize:13,fontFamily:"sans-serif",padding:"60px 0",textAlign:"center"}}>委託案件がありません</div>
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
          <div key={c.id} style={{background:"#0f0f18",border:"1px solid #1e1e30",borderRadius:10,padding:"16px"}}>
            {/* ヘッダー */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:8}}>
              <div>
                <div style={{fontSize:12,fontFamily:"'Courier New',monospace",color:"#a78bfa",marginBottom:4}}>#{String(c.id).padStart(4,"0")}</div>
                <div style={{fontSize:16,fontFamily:"sans-serif",fontWeight:600,marginBottom:2}}>{c.consignee_name}</div>
                <div style={{fontSize:12,color:"#aaa",fontFamily:"sans-serif",display:"flex",gap:10,flexWrap:"wrap"}}>
                  <span>{c.date} · 担当：{c.staff_name||"—"}</span>
                  {returnedCount>0&&<span style={{color:"#f87171"}}>返却済 {returnedCount}点</span>}
                  {soldCount>0&&<span style={{color:"#4ade80"}}>売上済 {soldCount}点</span>}
                </div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{fontSize:12,color:"#38bdf8",fontFamily:"sans-serif"}}>{activeItems.length}点</span>
                <button style={{...S.addEventBtn,color:"#f59e0b",borderColor:"#f59e0b44"}}
                  onClick={()=>onEdit&&onEdit(c.id)}>✏ 編集</button>
                <button style={{...S.addEventBtn}}
                  onClick={()=>printConsignment(c,galleryInfo,counterparties)}>🖨 納品書</button>
                {activeItems.length>0&&(
                  <button style={{...S.addEventBtn,color:"#a78bfa",borderColor:"#a78bfa44"}}
                    onClick={()=>{ setExpandedId(isExpanded?null:c.id); setSaleForm(null); }}>
                    {isExpanded?"▲ 閉じる":"↩ 委託戻り"}
                  </button>
                )}
              </div>
            </div>

            {/* 作品リスト */}
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
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
                      color:isReturned||isSold?"#555":"#ccc",
                      padding:"8px 4px",borderBottom:"1px solid #13131e"}}>

                      {/* 委託戻りモードのチェックボックス */}
                      {isExpanded && isActive && item.artwork_id && (
                        <div style={{width:18,height:18,borderRadius:4,flexShrink:0,cursor:"pointer",
                          boxShadow:isChecked?"none":"0 0 0 1px #2a2a40",
                          background:isChecked?"#a78bfa":"transparent",
                          display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff"}}
                          onClick={()=>toggleReturn(c.id,item.artwork_id)}>
                          {isChecked?"✓":""}
                        </div>
                      )}

                      <span
                        style={{flex:1,cursor:item.artwork_id?"pointer":"default",
                          textDecoration:item.artwork_id?"underline":"none",
                          textDecorationStyle:"dotted",textDecorationColor:"#555"}}
                        onClick={()=>item.artwork_id&&onSelectArtwork&&onSelectArtwork(item.artwork_id)}>
                        {item.artist?`${item.artist}「${item.title}」`:item.title}
                      </span>

                      {/* 状態表示・売上ボタン */}
                      {isReturned && <span style={{fontSize:11,color:"#f87171",flexShrink:0}}>返却済</span>}
                      {isSold     && <span style={{fontSize:11,color:"#4ade80",flexShrink:0}}>売上済</span>}
                      {isActive   && !isExpanded && (
                        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                          <span style={{color:"#38bdf8",fontSize:13}}>{fmt(item.price)}</span>
                          <button
                            style={{...S.addEventBtn,fontSize:11,padding:"3px 10px",color:"#4ade80",borderColor:"#4ade8044"}}
                            onClick={()=>openSaleForm(item,artwork)}>
                            売上登録
                          </button>
                        </div>
                      )}
                      {isActive && isExpanded && (
                        <span style={{color:"#38bdf8",fontSize:13,flexShrink:0}}>{fmt(item.price)}</span>
                      )}
                    </div>

                    {/* 売上登録ミニフォーム */}
                    {isSaleOpen && (
                      <div style={{background:"#0a1a0a",border:"1px solid #4ade8044",borderRadius:8,padding:"14px",margin:"4px 0 8px"}}>
                        <div style={{fontSize:12,color:"#4ade80",fontFamily:"sans-serif",fontWeight:600,marginBottom:12}}>
                          売上登録：{item.artist}「{item.title}」
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:10}}>
                          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                            <div style={{flex:1,minWidth:120}}>
                              <div style={{fontSize:11,color:"#aaa",marginBottom:4,fontFamily:"sans-serif"}}>成約価格 (円)</div>
                              <input style={{...S.formInput,fontSize:14,textAlign:"right"}}
                                type="number" value={saleForm.price}
                                onChange={e=>setSaleForm(p=>({...p,price:Number(e.target.value),tax:calcTax(Number(e.target.value))}))}/>
                            </div>
                            <div style={{flex:1,minWidth:100}}>
                              <div style={{fontSize:11,color:"#aaa",marginBottom:4,fontFamily:"sans-serif"}}>消費税額 (円)</div>
                              <input style={{...S.formInput,fontSize:13,textAlign:"right",color:"#f59e0b"}}
                                type="number" value={saleForm.tax}
                                onChange={e=>setSaleForm(p=>({...p,tax:Number(e.target.value)}))}/>
                            </div>
                            <div style={{flex:1,minWidth:110}}>
                              <div style={{fontSize:11,color:"#aaa",marginBottom:4,fontFamily:"sans-serif"}}>売上日</div>
                              <input style={{...S.formInput,fontSize:13}}
                                type="date" value={saleForm.date}
                                onChange={e=>setSaleForm(p=>({...p,date:e.target.value}))}/>
                            </div>
                          </div>
                          <div>
                            <div style={{fontSize:11,color:"#aaa",marginBottom:4,fontFamily:"sans-serif"}}>売上先 *</div>
                            <div style={{position:"relative"}}>
                              <div style={{display:"flex",gap:6}}>
                                <input style={{...S.formInput,flex:1}} placeholder="売上先を選択または入力"
                                  value={saleForm.buyer_name}
                                  onChange={e=>setSaleForm(p=>({...p,buyer_name:e.target.value,buyer_id:null}))}
                                  onFocus={()=>setCpOpen(true)}/>
                                <button type="button" style={{...S.formInput,padding:"0 10px",cursor:"pointer",flexShrink:0,color:"#a78bfa"}}
                                  onClick={()=>setCpOpen(o=>!o)}>▾</button>
                              </div>
                              {saleForm.buyer_id&&<div style={{fontSize:11,color:"#a78bfa",marginTop:2}}>✓ 取引先DBと連携済み</div>}
                              {cpOpen&&(
                                <div style={S.cpDropdown}>
                                  <input style={{...S.formInput,margin:"8px 8px 4px",width:"calc(100% - 16px)",fontSize:12,boxSizing:"border-box"}}
                                    placeholder="絞り込み…" value={cpQ} onChange={e=>setCpQ(e.target.value)} autoFocus/>
                                  <div style={{maxHeight:140,overflowY:"auto"}}>
                                    {filteredCps.map(cp=>(
                                      <div key={cp.id} style={S.cpDropdownItem}
                                        onClick={()=>{setSaleForm(p=>({...p,buyer_name:cpDisplayName(cp),buyer_id:cp.cp_id}));setCpOpen(false);setCpQ("");}}
                                        onMouseEnter={e=>e.currentTarget.style.background="#1e1e30"}
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
                            <button style={{...S.submitBtn,marginTop:0,padding:"7px 16px",fontSize:12,background:"#1a1030",color:"#aaa",border:"1px solid #2a2a40"}}
                              onClick={()=>setSaleForm(null)}>キャンセル</button>
                            <button style={{...S.submitBtn,marginTop:0,padding:"7px 16px",fontSize:12,
                              ...(!saleForm.buyer_name||!saleForm.price?S.submitDisabled:{background:"#4ade80",color:"#000"})}}
                              disabled={!saleForm.buyer_name||!saleForm.price}
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
              <div style={{marginTop:10,padding:"8px 10px",background:"#13131e",borderRadius:6,
                fontSize:12,color:"#aaa",fontFamily:"sans-serif",lineHeight:"1.6",
                borderLeft:"2px solid #2a2a40",whiteSpace:"pre-wrap"}}>
                {c.note}
              </div>
            )}

            {/* 委託戻り実行ボタン */}
            {isExpanded&&(
              <div style={{marginTop:12,display:"flex",justifyContent:"flex-end",gap:8}}>
                <button style={{...S.submitBtn,marginTop:0,padding:"8px 20px",fontSize:13,
                  background:"#1a1030",color:"#aaa",border:"1px solid #2a2a40"}}
                  onClick={()=>{setExpandedId(null);setReturnIds(p=>({...p,[c.id]:[]}))}}>
                  キャンセル
                </button>
                <button style={{...S.submitBtn,marginTop:0,padding:"8px 20px",fontSize:13,
                  ...(selectedIds.length===0?S.submitDisabled:{background:"#a78bfa"})}}
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
function ConsignmentForm({ artworks, counterparties, staffList, galleryInfo, nextId, editTarget=null, onSave }) {
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

  const canSave = consigneeName && date && items.length > 0;

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
      <div style={S.formGrid}>
        <Field label="委託日">
          <input style={S.formInput} type="date" value={date} onChange={e=>setDate(e.target.value)}/>
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
              <button type="button" style={{...S.formInput,padding:"0 10px",cursor:"pointer",flexShrink:0,color:"#a78bfa"}}
                onClick={()=>setCpOpen(o=>!o)}>▾</button>
            </div>
            {consigneeId&&<div style={{fontSize:12,color:"#a78bfa",fontFamily:"sans-serif",marginTop:2}}>✓ 取引先DBと連携済み</div>}
            {cpOpen&&(
              <div style={S.cpDropdown}>
                <input style={{...S.formInput,margin:"8px 8px 4px",width:"calc(100% - 16px)",fontSize:12,boxSizing:"border-box"}}
                  placeholder="絞り込み…" value={cpQ} onChange={e=>setCpQ(e.target.value)} autoFocus/>
                <div style={{maxHeight:160,overflowY:"auto"}}>
                  {filteredCps.map(c=>(
                    <div key={c.id} style={S.cpDropdownItem}
                      onClick={()=>{setConsigneeName(cpDisplayName(c));setConsigneeId(c.cp_id);setCpOpen(false);setCpQ("");}}
                      onMouseEnter={e=>e.currentTarget.style.background="#1e1e30"}
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
        <div style={{fontSize:12,color:"#a78bfa",fontFamily:"sans-serif",letterSpacing:"0.08em"}}>委託作品</div>
        <div style={{display:"flex",gap:8}}>
          <button style={S.addEventBtn} onClick={()=>setShowArtworkPicker(true)}>＋ 在庫から選択</button>
          <button style={{...S.addEventBtn,color:"#94a3b8",borderColor:"#94a3b833"}} onClick={addFreeItem}>＋ 自由入力</button>
        </div>
      </div>

      {/* 作品ピッカー */}
      {showArtworkPicker&&(
        <div style={{background:"#0f0f18",border:"1px solid #2a2a40",borderRadius:10,padding:"12px",marginBottom:12}}>
          <input style={{...S.formInput,width:"100%",boxSizing:"border-box",marginBottom:8}}
            placeholder="作品名・作家で検索…" value={artworkSearch} onChange={e=>setArtworkSearch(e.target.value)} autoFocus/>
          <div style={{maxHeight:200,overflowY:"auto",display:"flex",flexDirection:"column",gap:1}}>
            {filteredArtworks.map(a=>(
              <div key={a.artwork_id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 8px",cursor:"pointer",borderRadius:6,fontSize:13}}
                onMouseEnter={e=>e.currentTarget.style.background="#1e1e30"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                onClick={()=>addArtworkItem(a)}>
                <div>
                  <span style={{fontWeight:600,marginRight:8}}>{a.title}</span>
                  <span style={{color:"#ccc",fontSize:12,fontFamily:"sans-serif"}}>{a.artist}</span>
                </div>
                <span style={{color:"#a78bfa",fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",fontSize:14}}>¥{Number(a.announce_price).toLocaleString()}</span>
              </div>
            ))}
            {filteredArtworks.length===0&&<div style={{color:"#aaa",fontSize:12,fontFamily:"sans-serif",padding:"12px 0",textAlign:"center"}}>該当する在庫作品がありません</div>}
          </div>
          <button style={{...S.cpDropdownClose}} onClick={()=>{setShowArtworkPicker(false);setArtworkSearch("");}}>閉じる</button>
        </div>
      )}

      {/* 作品テーブル */}
      {items.length > 0 && (
        <div style={{overflowX:"auto",marginBottom:8}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:560,fontSize:13,fontFamily:"sans-serif"}}>
            <thead>
              <tr style={{borderBottom:"1px solid #2a2a40"}}>
                {["作家","タイトル","サイズ","発表価格","委託価格",""].map(h=>(
                  <th key={h} style={{padding:"6px 8px",textAlign:h==="委託価格"||h==="発表価格"?"right":"left",fontSize:12,color:"#aaa",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item,i)=>(
                <tr key={i} style={{borderBottom:"1px solid #13131e"}}>
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
                  <td style={{padding:"6px 8px",color:"#ccc",fontSize:12}}>
                    {item.artwork_id
                      ? item.size
                      : <input style={{...S.formInput,padding:"4px 6px",fontSize:12}} value={item.size} onChange={e=>updateItem(i,"size",e.target.value)} placeholder="サイズ"/>}
                  </td>
                  <td style={{padding:"6px 8px",textAlign:"right"}}>
                    <input style={{...S.formInput,padding:"4px 6px",fontSize:13,textAlign:"right",width:100,color:"#a78bfa"}}
                      type="number" value={item.announce_price||""} placeholder="—"
                      onChange={e=>updateItem(i,"announce_price",Number(e.target.value))}/>
                  </td>
                  <td style={{padding:"6px 8px",textAlign:"right"}}>
                    <input style={{...S.formInput,padding:"4px 6px",fontSize:13,textAlign:"right",width:100,fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"}}
                      type="number" value={item.price} onChange={e=>updateItem(i,"price",Number(e.target.value))}/>
                  </td>
                  <td style={{padding:"6px 8px",textAlign:"center"}}>
                    <button style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:14}} onClick={()=>removeItem(i)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {items.length===0&&<div style={{color:"#aaa",fontSize:12,fontFamily:"sans-serif",padding:"20px 0",textAlign:"center",border:"1px dashed #2a2a40",borderRadius:8,marginBottom:12}}>作品を追加してください</div>}

      <button style={{...S.submitBtn,...(!canSave?S.submitDisabled:{})}} onClick={handleSave} disabled={!canSave}>
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

function InventoryList({ artworks, counterparties, artists=[], artworkGroups=[], onSelect }) {
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
          onClick={e=>{ setActiveTab("ALL"); e.currentTarget.blur(); }}>
          すべて
          <span style={IS.tabCount}>{inStock.length}</span>
        </button>

        {/* グループタブ */}
        {hasGroups && (
          <>
            <span style={{width:1,height:18,background:"#2a2a40",flexShrink:0,margin:"0 2px"}}/>
            {visibleGroups.map(g => {
              const key = `G:${g.id}`;
              const cnt = sorted.filter(a=>{ const art=artists.find(ar=>ar.artist_id===a.artist_id); return art?.group_id===g.id; }).length;
              return (
                <button key={key}
                  style={{...IS.tab,...(activeTab===key?IS.tabActive:{}),...(activeTab===key?{boxShadow:"0 0 0 1px #818cf855",color:"#818cf8"}:{})}}
                  onClick={e=>{ setActiveTab(key); setSearch(""); e.currentTarget.blur(); }}>
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
            <span style={{width:1,height:18,background:"#2a2a40",flexShrink:0,margin:"0 2px"}}/>
            {visibleKanaTabs.map(row => {
              const cnt = noGroupSorted.filter(a => getKanaKey(a) === row.key).length;
              return (
                <button key={row.key}
                  style={{...IS.tab,...(activeTab===row.key?IS.tabActive:{})}}
                  onClick={e=>{ setActiveTab(row.key); setSearch(""); e.currentTarget.blur(); }}>
                  {row.label}
                  <span style={IS.tabCount}>{cnt}</span>
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* 件数表示 */}
      <div style={{fontSize:12,color:"#aaa",fontFamily:"sans-serif",margin:"10px 0 16px",textAlign:"right"}}>
        {filtered.length}件 / 在庫{inStock.length}件
      </div>

      {/* 作品リスト */}
      {Object.keys(groups).length === 0 ? (
        <div style={{color:"#aaa",fontSize:13,fontFamily:"sans-serif",padding:"40px 0",textAlign:"center"}}>
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
                    style={{...IS.workRow,...(i%2===0?{}:{background:"#0d0d16"})}}
                    onClick={()=>onSelect(a.artwork_id)}
                    onMouseEnter={e=>e.currentTarget.style.background="#1a1a28"}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"transparent":"#0d0d16"}>
                    <div style={IS.workId}>{a.artwork_id}</div>
                    <div style={IS.workMain}>
                      <div style={IS.workTitle}>{a.title}</div>
                      <div style={IS.workMeta}>
                        {a.medium    && <span style={IS.plainText}>{a.medium}</span>}
                        {a.medium&&a.size&&<span style={IS.dot}>·</span>}
                        {a.size      && <span style={{...IS.plainText,color:"#bbb",flexShrink:1,overflow:"hidden",textOverflow:"ellipsis"}}>{a.size}</span>}
                      </div>
                      {a.appraisal && <div style={{marginTop:2}}><span style={IS.appraisalChip}>鑑 {a.appraisal}</span></div>}
                    </div>
                    <div style={IS.workRight}>
                      <span style={{...IS.statusBadge,
                        background: STATUSES[a.status]?.color+"22",
                        color:      STATUSES[a.status]?.color,
                        border:    `1px solid ${STATUSES[a.status]?.color}44`}}>
                        {STATUSES[a.status]?.label}
                      </span>
                      <div style={IS.priceBlock}>
                        <div style={IS.priceRow}>
                          <span style={IS.priceLabel}>発表</span>
                          <span style={{...IS.priceVal,color:"#a78bfa"}}>{fmt(a.announce_price)}</span>
                        </div>
                        {a.status === "consigned" && (<>
                          <div style={IS.priceRow}>
                            <span style={IS.priceLabel}>委託</span>
                            <span style={{...IS.priceVal,color:"#818cf8"}}>{fmt(a.consignment_price)}</span>
                          </div>
                          {a.consignee&&(
                            <div style={{fontSize:12,color:"#818cf8",fontFamily:"sans-serif",textAlign:"right",opacity:0.8}}>{a.consignee}</div>
                          )}
                        </>)}
                        <div style={IS.priceRow}>
                          <span style={IS.priceLabel}>仕入</span>
                          <span style={{...IS.priceVal,fontSize:14,color:"#34d399",fontWeight:600}}>{fmt(a.purchase_price)}</span>
                        </div>
                      </div>
                      <div style={IS.purchasedAt}>{a.purchased_at}</div>
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
  searchBar:    { background:"#0f0f18", border:"1px solid #2a2a40", borderRadius:8, padding:"8px 14px", color:"#e2e0f0", fontSize:13, fontFamily:"sans-serif", outline:"none" },
  tabBar:       { display:"flex", gap:4, flexWrap:"wrap" },
  tab:          { padding:"5px 10px", borderRadius:20, border:"none", boxShadow:"0 0 0 1px #2a2a40", background:"transparent", color:"#ccc", cursor:"pointer", fontSize:12, fontFamily:"sans-serif", display:"flex", alignItems:"center", gap:4, outline:"none" },
  tabActive:    { background:"#1e1e30", color:"#e2e0f0", boxShadow:"0 0 0 1px #a78bfa55" },
  tabCount:     { fontSize:12, color:"#bbb", fontFamily:"sans-serif" },
  artistHeader: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0 6px", borderBottom:"2px solid #a78bfa44", marginBottom:2 },
  artistName:   { fontSize:17, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", letterSpacing:"0.05em" },
  artistKana:   { fontSize:12, color:"#bbb", fontFamily:"sans-serif", letterSpacing:"0.06em" },
  artistCount:  { fontSize:12, color:"#a78bfa", fontFamily:"sans-serif", flexShrink:0 },
  workList:     { display:"flex", flexDirection:"column" },
  workRow:      { display:"flex", alignItems:"center", gap:6, padding:"10px 4px", cursor:"pointer", transition:"background 0.15s", borderBottom:"1px solid #13131e" },
  workId:       { fontFamily:"'Courier New',monospace", fontSize:14, color:"#a78bfa", letterSpacing:"0.02em", flexShrink:0, width:70, fontWeight:700 },
  workMain:     { flex:1, minWidth:0, overflow:"hidden" },
  workTitle:    { fontWeight:600, fontSize:14, marginBottom:4, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  workMeta:     { display:"flex", gap:4, flexWrap:"nowrap", overflow:"hidden" },
  metaChip:     { background:"#1e1e30", padding:"1px 6px", borderRadius:4, fontSize:12, color:"#ccc", fontFamily:"sans-serif", flexShrink:0, whiteSpace:"nowrap" },
  sizeChip:     { background:"#141420", padding:"1px 6px", borderRadius:4, fontSize:12, color:"#bbb", fontFamily:"sans-serif", flexShrink:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", minWidth:0 },
  workRight:    { flexShrink:0, display:"flex", flexDirection:"column", alignItems:"stretch", gap:2, minWidth:150 },
  statusBadge:  { padding:"2px 8px", borderRadius:20, fontSize:12, fontFamily:"sans-serif", whiteSpace:"nowrap", alignSelf:"flex-start" },
  priceBlock:   { display:"flex", flexDirection:"column", gap:2, alignItems:"flex-end" },
  priceRow:     { display:"flex", alignItems:"baseline", width:"100%" },
  priceLabel:   { fontSize:12, color:"#aaa", fontFamily:"sans-serif", width:28, flexShrink:0, whiteSpace:"nowrap" },
  priceVal:     { fontSize:12, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", textAlign:"right", flex:1, whiteSpace:"nowrap" },
  consignee:    { fontSize:12, color:"#38bdf8", fontFamily:"sans-serif", textAlign:"right", maxWidth:90, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  purchasedAt:  { fontSize:12, color:"#aaa", fontFamily:"sans-serif" },
  appraisalChip:{ background:"#f59e0b11", padding:"1px 6px", borderRadius:4, fontSize:12, color:"#f59e0b", fontFamily:"sans-serif", flexShrink:0, whiteSpace:"nowrap", border:"1px solid #f59e0b33" },
  plainText:    { fontSize:12, color:"#ccc", fontFamily:"sans-serif", whiteSpace:"nowrap", flexShrink:0 },
  dot:          { fontSize:12, color:"#444", fontFamily:"sans-serif", flexShrink:0 },
};


// ─── 日計表コンポーネント ─────────────────────────────────
function DailyReport({ artworks, history, counterparties, taxSettings, galleryInfo, onSelectArtwork }) {
  const fmt  = (n) => n != null ? `¥${Number(n).toLocaleString()}` : "—";
  const [expandedDate, setExpandedDate] = useState(null);

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
      const excl       = Math.floor(price / (1 + taxRate));
      const tax        = price - excl;
      const inv        = hasInvoice(h.counterparty_id, date);
      const creditRate = getPurchaseCreditRate(date, inv, taxSettings);
      const taxCredit  = Math.floor(tax * creditRate);
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
      const excl        = Math.floor(discountAmt / (1 + taxRate));
      const tax         = discountAmt - excl;
      const inv         = hasInvoice(h.counterparty_id, date);
      const creditRate  = getPurchaseCreditRate(date, inv, taxSettings);
      const taxCredit   = Math.floor(tax * creditRate);
      return { h, artwork, discountAmt, excl, tax, taxCredit, inv, creditRate, isDiscount: true };
    });

    const soldRows = ds.map(h => {
      const artwork    = artworks.find(a => a.artwork_id === h.artwork_id);
      const price      = h.new_price || 0;
      const salesRate  = getTaxRate(date, taxSettings.rates);
      const excl       = Math.floor(price / (1 + salesRate));
      const tax        = price - excl;
      const cost       = artwork?.purchase_price || 0;
      const purchaseDate = artwork?.purchased_at || date;
      const purchRate  = getTaxRate(purchaseDate, taxSettings.rates);
      const costExcl   = Math.floor(cost / (1 + purchRate));
      const profitLoss = excl - costExcl;
      return { h, artwork, price, excl, tax, cost, costExcl, profitLoss, isDiscount: false };
    });

    // 仕入値上げ行
    const purchaseIncreaseRows = dpi.map(h => {
      const artwork     = artworks.find(a => a.artwork_id === h.artwork_id);
      const increaseAmt = (h.new_price||0) - (h.old_price||0);
      const taxRate     = getTaxRate(date, taxSettings.rates);
      const excl        = Math.floor(increaseAmt / (1 + taxRate));
      const tax         = increaseAmt - excl;
      const inv         = hasInvoice(h.counterparty_id, date);
      const creditRate  = getPurchaseCreditRate(date, inv, taxSettings);
      const taxCredit   = Math.floor(tax * creditRate);
      return { h, artwork, increaseAmt, excl, tax, taxCredit, inv, creditRate };
    });

    // 売上値引き行
    const soldDiscountRows = dsd.map(h => {
      const artwork     = artworks.find(a => a.artwork_id === h.artwork_id);
      const discountAmt = (h.old_price||0) - (h.new_price||0);
      const taxRate     = getTaxRate(date, taxSettings.rates);
      const excl        = Math.floor(discountAmt / (1 + taxRate));
      const tax         = discountAmt - excl;
      return { h, artwork, discountAmt, excl, tax };
    });

    // 売上値上げ行
    const soldIncreaseRows = dsi.map(h => {
      const artwork     = artworks.find(a => a.artwork_id === h.artwork_id);
      const increaseAmt = (h.new_price||0) - (h.old_price||0);
      const taxRate     = getTaxRate(date, taxSettings.rates);
      const excl        = Math.floor(increaseAmt / (1 + taxRate));
      const tax         = increaseAmt - excl;
      return { h, artwork, increaseAmt, excl, tax };
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
    <div style={{color:"#aaa",fontSize:13,fontFamily:"sans-serif",padding:"60px 0",textAlign:"center"}}>取引データがありません</div>
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
                  <span style={{...DR.fiscalVal,color:"#60a5fa"}}>{fmt(fyPurchaseTotal)}</span>
                </div>
                <div style={DR.fiscalCell}>
                  <span style={DR.fiscalLabel}>売上総累計</span>
                  <span style={{...DR.fiscalVal,color:"#4ade80"}}>{fmt(fySoldTotal)}</span>
                </div>
                <div style={DR.fiscalCell}>
                  <span style={DR.fiscalLabel}>差損益累計</span>
                  <span style={{...DR.fiscalVal,color:fyProfitLoss>=0?"#a78bfa":"#f87171"}}>{fmt(fyProfitLoss)}</span>
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
              onMouseEnter={e=>e.currentTarget.style.background="#0f0f18"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={DR.dayDateRow}>
                <span style={DR.dayDate}>{date}</span>
                <span style={DR.expandIcon}>{isExpanded ? "▲" : "▼"}</span>
              </div>
              <div style={{...DR.summaryGrid,gridTemplateColumns:"1fr 1fr"}}>
                <div style={DR.summaryCell}>
                  <span style={DR.summaryLabel}>仕入高
                    {purchaseDiscountTotal>0&&<span style={{fontSize:12,color:"#38bdf8",marginLeft:4}}>▼{fmt(purchaseDiscountTotal)}</span>}
                    {purchaseIncreaseTotal>0&&<span style={{fontSize:12,color:"#818cf8",marginLeft:4}}>▲{fmt(purchaseIncreaseTotal)}</span>}
                  </span>
                  <span style={{...DR.summaryVal,color:"#60a5fa"}}>{fmt(purchaseTotal - purchaseDiscountTotal + purchaseIncreaseTotal)}</span>
                </div>
                <div style={DR.summaryCell}>
                  <span style={DR.summaryLabel}>売上高
                    {soldDiscountTotal>0&&<span style={{fontSize:12,color:"#f59e0b",marginLeft:4}}>▼{fmt(soldDiscountTotal)}</span>}
                    {soldIncreaseTotal>0&&<span style={{fontSize:12,color:"#34d399",marginLeft:4}}>▲{fmt(soldIncreaseTotal)}</span>}
                  </span>
                  <span style={{...DR.summaryVal,color:"#4ade80"}}>{fmt(soldTotal - soldDiscountTotal + soldIncreaseTotal)}</span>
                </div>
              </div>
            </div>

            {/* 展開：明細 */}
            {isExpanded && (
              <div style={DR.detail}>

                {/* 仕入明細*/}
                {purchaseRows.length > 0 && (
                  <div style={DR.section}>
                    <div style={{...DR.sectionTitle,color:"#60a5fa"}}>仕入</div>
                    <div style={{overflowX:"auto"}}>
                      <table style={DR.tbl}>
                        <thead>
                          <tr style={DR.thead}>
                            <th style={DR.thId}>作品ID</th>
                            <th style={DR.thText}>仕入先</th>
                            <th style={DR.thText}>作家</th>
                            <th style={DR.thText}>タイトル</th>
                            <th style={DR.thText}>サイズ</th>
                            <th style={DR.thNum}>仕入額</th>
                            <th style={DR.thNum}>本体価格</th>
                            <th style={DR.thNum}>控除税額</th>
                          </tr>
                        </thead>
                        <tbody>
                          {purchaseRows.map(({h,artwork,price,excl,taxCredit,inv,creditRate},i)=>(
                            <tr key={h.id} style={{...DR.trow,...(i%2===0?{}:{background:"#0d0d16"})}}
                              onClick={()=>artwork&&onSelectArtwork(artwork.artwork_id)}>
                              <td style={DR.tdId}>{artwork?.artwork_id||"—"}</td>
                              <td style={DR.tdText}>
                                <div>{h.counterparty||"—"}</div>
                                {inv
                                  ? <span style={DR.invoiceBadge}>✓ インボイス</span>
                                  : <span style={DR.noInvoiceBadge}>未登録{creditRate<1?` ${(creditRate*100).toFixed(0)}%`:""}</span>
                                }
                              </td>
                              <td style={DR.tdText}>{artwork?.artist||"—"}</td>
                              <td style={DR.tdTitle}>{artwork?.title||"—"}</td>
                              <td style={DR.tdText}>{artwork?.size||"—"}</td>
                              <td style={{...DR.tdNum,color:"#60a5fa"}}>{fmt(price)}</td>
                              <td style={DR.tdNum}>{fmt(excl)}</td>
                              <td style={{...DR.tdNum,color:"#f59e0b"}}>{fmt(taxCredit)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={DR.tfoot}>
                            <td colSpan={5} style={DR.tfootLabel}>仕入 合計</td>
                            <td style={{...DR.tdNum,...DR.tfootVal,color:"#60a5fa"}}>{fmt(purchaseRows.reduce((s,r)=>s+r.price,0))}</td>
                            <td style={{...DR.tdNum,...DR.tfootVal}}>{fmt(purchaseRows.reduce((s,r)=>s+r.excl,0))}</td>
                            <td style={{...DR.tdNum,...DR.tfootVal,color:"#f59e0b"}}>{fmt(purchaseRows.reduce((s,r)=>s+r.taxCredit,0))}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* 仕入値引き明細 */}
                {purchaseDiscountRows.length > 0 && (
                  <div style={{...DR.section,borderLeft:"2px solid #38bdf844"}}>
                    <div style={{...DR.sectionTitle,color:"#38bdf8"}}>仕入値引き</div>
                    <div style={{overflowX:"auto"}}>
                      <table style={DR.tbl}>
                        <thead>
                          <tr style={DR.thead}>
                            <th style={DR.thId}>作品ID</th>
                            <th style={DR.thText}>仕入先</th>
                            <th style={DR.thText}>作家</th>
                            <th style={DR.thText}>タイトル</th>
                            <th style={DR.thText}>サイズ</th>
                            <th style={DR.thNum}>値引き額</th>
                            <th style={DR.thNum}>本体換算</th>
                            <th style={DR.thNum}>控除税額</th>
                          </tr>
                        </thead>
                        <tbody>
                          {purchaseDiscountRows.map(({h,artwork,discountAmt,excl,taxCredit,inv,creditRate},i)=>(
                            <tr key={h.id} style={{...DR.trow,background:"#000a0f"}}
                              onClick={()=>artwork&&onSelectArtwork(artwork.artwork_id)}>
                              <td style={DR.tdId}>{artwork?.artwork_id||"—"}</td>
                              <td style={DR.tdText}>
                                <div>{h.counterparty||"—"}</div>
                                {inv ? <span style={DR.invoiceBadge}>✓ インボイス</span>
                                     : <span style={DR.noInvoiceBadge}>未登録{creditRate<1?` (${(creditRate*100).toFixed(0)}%控除)`:""}</span>}
                              </td>
                              <td style={DR.tdText}>{artwork?.artist||"—"}</td>
                              <td style={DR.tdTitle}>{artwork?.title||"—"}</td>
                              <td style={DR.tdText}>{artwork?.size||"—"}</td>
                              <td style={{...DR.tdNum,color:"#38bdf8"}}>-{fmt(discountAmt)}</td>
                              <td style={{...DR.tdNum,color:"#38bdf8"}}>-{fmt(excl)}</td>
                              <td style={{...DR.tdNum,color:"#f59e0b"}}>-{fmt(taxCredit)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={DR.tfoot}>
                            <td colSpan={5} style={DR.tfootLabel}>値引き 合計</td>
                            <td style={{...DR.tdNum,...DR.tfootVal,color:"#38bdf8"}}>-{fmt(purchaseDiscountRows.reduce((s,r)=>s+r.discountAmt,0))}</td>
                            <td style={{...DR.tdNum,...DR.tfootVal,color:"#38bdf8"}}>-{fmt(purchaseDiscountRows.reduce((s,r)=>s+r.excl,0))}</td>
                            <td style={{...DR.tdNum,...DR.tfootVal,color:"#f59e0b"}}>-{fmt(purchaseDiscountRows.reduce((s,r)=>s+r.taxCredit,0))}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* 仕入値上げ明細 */}
                {purchaseIncreaseRows.length > 0 && (
                  <div style={{...DR.section,borderLeft:"2px solid #818cf844"}}>
                    <div style={{...DR.sectionTitle,color:"#818cf8"}}>仕入値上げ</div>
                    <div style={{overflowX:"auto"}}>
                      <table style={DR.tbl}>
                        <thead>
                          <tr style={DR.thead}>
                            <th style={DR.thId}>作品ID</th>
                            <th style={DR.thText}>仕入先</th>
                            <th style={DR.thText}>作家</th>
                            <th style={DR.thText}>タイトル</th>
                            <th style={DR.thText}>サイズ</th>
                            <th style={DR.thNum}>値上げ額</th>
                            <th style={DR.thNum}>本体換算</th>
                            <th style={DR.thNum}>控除税額</th>
                          </tr>
                        </thead>
                        <tbody>
                          {purchaseIncreaseRows.map(({h,artwork,increaseAmt,excl,taxCredit,inv,creditRate},i)=>(
                            <tr key={h.id} style={{...DR.trow,background:"#080818"}}
                              onClick={()=>artwork&&onSelectArtwork(artwork.artwork_id)}>
                              <td style={DR.tdId}>{artwork?.artwork_id||"—"}</td>
                              <td style={DR.tdText}>{h.counterparty||"—"}</td>
                              <td style={DR.tdText}>{artwork?.artist||"—"}</td>
                              <td style={DR.tdTitle}>{artwork?.title||"—"}</td>
                              <td style={DR.tdText}>{artwork?.size||"—"}</td>
                              <td style={{...DR.tdNum,color:"#818cf8"}}>+{fmt(increaseAmt)}</td>
                              <td style={{...DR.tdNum,color:"#818cf8"}}>+{fmt(excl)}</td>
                              <td style={{...DR.tdNum,color:"#f59e0b"}}>+{fmt(taxCredit)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={DR.tfoot}>
                            <td colSpan={5} style={DR.tfootLabel}>値上げ 合計</td>
                            <td style={{...DR.tdNum,...DR.tfootVal,color:"#818cf8"}}>+{fmt(purchaseIncreaseRows.reduce((s,r)=>s+r.increaseAmt,0))}</td>
                            <td style={{...DR.tdNum,...DR.tfootVal,color:"#818cf8"}}>+{fmt(purchaseIncreaseRows.reduce((s,r)=>s+r.excl,0))}</td>
                            <td style={{...DR.tdNum,...DR.tfootVal,color:"#f59e0b"}}>+{fmt(purchaseIncreaseRows.reduce((s,r)=>s+r.taxCredit,0))}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* 売上明細*/}
                {soldRows.length > 0 && (
                  <div style={DR.section}>
                    <div style={{...DR.sectionTitle,color:"#4ade80"}}>売上</div>
                    <div style={{overflowX:"auto"}}>
                      <table style={DR.tbl}>
                        <thead>
                          <tr style={DR.thead}>
                            <th style={DR.thId}>作品ID</th>
                            <th style={DR.thText}>売上先</th>
                            <th style={DR.thText}>作家</th>
                            <th style={DR.thText}>タイトル</th>
                            <th style={DR.thText}>サイズ</th>
                            <th style={DR.thNum}>売上額</th>
                            <th style={DR.thNum}>本体価格</th>
                            <th style={DR.thNum}>消費税額</th>
                            <th style={DR.thNum}>原価</th>
                            <th style={DR.thNum}>差損益</th>
                          </tr>
                        </thead>
                        <tbody>
                          {soldRows.map(({h,artwork,price,excl,tax,costExcl,profitLoss},i)=>(
                            <tr key={h.id} style={{...DR.trow,...(i%2===0?{}:{background:"#0d0d16"})}}
                              onClick={()=>artwork&&onSelectArtwork(artwork.artwork_id)}>
                              <td style={DR.tdId}>{artwork?.artwork_id||"—"}</td>
                              <td style={DR.tdText}>{h.counterparty||"—"}</td>
                              <td style={DR.tdText}>{artwork?.artist||"—"}</td>
                              <td style={DR.tdTitle}>{artwork?.title||"—"}</td>
                              <td style={DR.tdText}>{artwork?.size||"—"}</td>
                              <td style={{...DR.tdNum,color:"#4ade80"}}>{fmt(price)}</td>
                              <td style={DR.tdNum}>{fmt(excl)}</td>
                              <td style={{...DR.tdNum,color:"#f59e0b"}}>{fmt(tax)}</td>
                              <td style={DR.tdNum}>{fmt(costExcl)}</td>
                              <td style={{...DR.tdNum,color:profitLoss>=0?"#a78bfa":"#f87171",fontWeight:600}}>{fmt(profitLoss)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={DR.tfoot}>
                            <td colSpan={5} style={DR.tfootLabel}>売上 合計</td>
                            <td style={{...DR.tdNum,...DR.tfootVal,color:"#4ade80"}}>{fmt(soldRows.reduce((s,r)=>s+r.price,0))}</td>
                            <td style={{...DR.tdNum,...DR.tfootVal}}>{fmt(soldExclTotal)}</td>
                            <td style={{...DR.tdNum,...DR.tfootVal,color:"#f59e0b"}}>{fmt(soldRows.reduce((s,r)=>s+r.tax,0))}</td>
                            <td style={{...DR.tdNum,...DR.tfootVal}}>{fmt(costExclTotal)}</td>
                            <td style={{...DR.tdNum,...DR.tfootVal,color:soldExclTotal-costExclTotal>=0?"#a78bfa":"#f87171"}}>{fmt(soldExclTotal-costExclTotal)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* 売上値引き明細 */}
                {soldDiscountRows.length > 0 && (
                  <div style={{...DR.section,borderLeft:"2px solid #f59e0b44"}}>
                    <div style={{...DR.sectionTitle,color:"#f59e0b"}}>売上値引き</div>
                    <div style={{overflowX:"auto"}}>
                      <table style={DR.tbl}>
                        <thead>
                          <tr style={DR.thead}>
                            <th style={DR.thId}>作品ID</th>
                            <th style={DR.thText}>売上先</th>
                            <th style={DR.thText}>作家</th>
                            <th style={DR.thText}>タイトル</th>
                            <th style={DR.thText}>サイズ</th>
                            <th style={DR.thNum}>値引き額</th>
                            <th style={DR.thNum}>本体換算</th>
                            <th style={DR.thNum}>消費税相当</th>
                            <th style={DR.thNum}></th>
                            <th style={DR.thNum}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {soldDiscountRows.map(({h,artwork,discountAmt,excl,tax},i)=>(
                            <tr key={h.id} style={{...DR.trow,background:"#0f0a00"}}
                              onClick={()=>artwork&&onSelectArtwork(artwork.artwork_id)}>
                              <td style={DR.tdId}>{artwork?.artwork_id||"—"}</td>
                              <td style={DR.tdText}>{h.counterparty||"—"}</td>
                              <td style={DR.tdText}>{artwork?.artist||"—"}</td>
                              <td style={DR.tdTitle}>{artwork?.title||"—"}</td>
                              <td style={DR.tdText}>{artwork?.size||"—"}</td>
                              <td style={{...DR.tdNum,color:"#f59e0b"}}>-{fmt(discountAmt)}</td>
                              <td style={{...DR.tdNum,color:"#f59e0b"}}>-{fmt(excl)}</td>
                              <td style={{...DR.tdNum,color:"#f59e0b"}}>-{fmt(tax)}</td>
                              <td style={DR.tdNum}></td>
                              <td style={DR.tdNum}></td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={DR.tfoot}>
                            <td colSpan={5} style={DR.tfootLabel}>値引き 合計</td>
                            <td style={{...DR.tdNum,...DR.tfootVal,color:"#f59e0b"}}>-{fmt(soldDiscountTotal)}</td>
                            <td style={{...DR.tdNum,...DR.tfootVal,color:"#f59e0b"}}>-{fmt(soldDiscountRows.reduce((s,r)=>s+r.excl,0))}</td>
                            <td style={{...DR.tdNum,...DR.tfootVal,color:"#f59e0b"}}>-{fmt(soldDiscountRows.reduce((s,r)=>s+r.tax,0))}</td>
                            <td style={DR.tdNum}></td>
                            <td style={DR.tdNum}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* 売上値上げ明細 */}
                {soldIncreaseRows.length > 0 && (
                  <div style={{...DR.section,borderLeft:"2px solid #34d39944"}}>
                    <div style={{...DR.sectionTitle,color:"#34d399"}}>売上値上げ</div>
                    <div style={{overflowX:"auto"}}>
                      <table style={DR.tbl}>
                        <thead>
                          <tr style={DR.thead}>
                            <th style={DR.thId}>作品ID</th>
                            <th style={DR.thText}>売上先</th>
                            <th style={DR.thText}>作家</th>
                            <th style={DR.thText}>タイトル</th>
                            <th style={DR.thText}>サイズ</th>
                            <th style={DR.thNum}>値上げ額</th>
                            <th style={DR.thNum}>本体換算</th>
                            <th style={DR.thNum}>消費税相当</th>
                            <th style={DR.thNum}></th>
                            <th style={DR.thNum}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {soldIncreaseRows.map(({h,artwork,increaseAmt,excl,tax},i)=>(
                            <tr key={h.id} style={{...DR.trow,background:"#001a0a"}}
                              onClick={()=>artwork&&onSelectArtwork(artwork.artwork_id)}>
                              <td style={DR.tdId}>{artwork?.artwork_id||"—"}</td>
                              <td style={DR.tdText}>{h.counterparty||"—"}</td>
                              <td style={DR.tdText}>{artwork?.artist||"—"}</td>
                              <td style={DR.tdTitle}>{artwork?.title||"—"}</td>
                              <td style={DR.tdText}>{artwork?.size||"—"}</td>
                              <td style={{...DR.tdNum,color:"#34d399"}}>+{fmt(increaseAmt)}</td>
                              <td style={{...DR.tdNum,color:"#34d399"}}>+{fmt(excl)}</td>
                              <td style={{...DR.tdNum,color:"#f59e0b"}}>+{fmt(tax)}</td>
                              <td style={DR.tdNum}></td>
                              <td style={DR.tdNum}></td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={DR.tfoot}>
                            <td colSpan={5} style={DR.tfootLabel}>値上げ 合計</td>
                            <td style={{...DR.tdNum,...DR.tfootVal,color:"#34d399"}}>+{fmt(soldIncreaseRows.reduce((s,r)=>s+r.increaseAmt,0))}</td>
                            <td style={{...DR.tdNum,...DR.tfootVal,color:"#34d399"}}>+{fmt(soldIncreaseRows.reduce((s,r)=>s+r.excl,0))}</td>
                            <td style={{...DR.tdNum,...DR.tfootVal,color:"#f59e0b"}}>+{fmt(soldIncreaseRows.reduce((s,r)=>s+r.tax,0))}</td>
                            <td style={DR.tdNum}></td>
                            <td style={DR.tdNum}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            )}
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
  dayBlock:      { borderBottom:"1px solid #1e1e30" },
  dayHeader:     { padding:"14px 10px", cursor:"pointer", transition:"background 0.15s" },
  dayDateRow:    { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 },
  dayDate:       { fontSize:15, fontFamily:"sans-serif", letterSpacing:"0.05em" },
  expandIcon:    { fontSize:10, color:"#aaa" },
  summaryGrid:   { display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 },
  summaryCell:   { display:"flex", flexDirection:"column", gap:3 },
  summaryLabel:  { fontSize:10, color:"#aaa", fontFamily:"sans-serif" },
  summaryVal:    { fontSize:15, fontFamily:"sans-serif", fontWeight:600 },
  detail:        { padding:"0 6px 14px", display:"flex", flexDirection:"column", gap:10 },
  section:       { background:"#0a0a14", borderRadius:8, padding:"10px 10px" },
  sectionTitle:  { fontSize:12, fontFamily:"sans-serif", letterSpacing:"0.08em", marginBottom:8, fontWeight:600 },
  tbl:           { width:"100%", borderCollapse:"collapse", minWidth:700, fontSize:12, fontFamily:"sans-serif" },
  thead:         { borderBottom:"1px solid #2a2a40" },
  thId:          { padding:"4px 6px", textAlign:"left", fontSize:10, color:"#aaa", whiteSpace:"nowrap", width:72 },
  thText:        { padding:"4px 6px", textAlign:"left", fontSize:10, color:"#aaa", whiteSpace:"nowrap" },
  thNum:         { padding:"4px 6px", textAlign:"right", fontSize:10, color:"#aaa", whiteSpace:"nowrap" },
  trow:          { borderBottom:"1px solid #13131e", cursor:"pointer", transition:"background 0.1s" },
  tdId:          { padding:"7px 6px", fontFamily:"'Courier New',monospace", fontSize:12, color:"#a78bfa", fontWeight:700, whiteSpace:"nowrap", verticalAlign:"top" },
  tdText:        { padding:"7px 6px", fontSize:12, color:"#ccc", whiteSpace:"nowrap", verticalAlign:"top", maxWidth:120, overflow:"hidden", textOverflow:"ellipsis" },
  tdTitle:       { padding:"7px 6px", fontSize:12, color:"#e2e0f0", fontWeight:600, whiteSpace:"nowrap", verticalAlign:"top", maxWidth:140, overflow:"hidden", textOverflow:"ellipsis" },
  tdNum:         { padding:"7px 6px", textAlign:"right", fontFamily:"sans-serif", fontSize:13, whiteSpace:"nowrap", verticalAlign:"top" },
  tfoot:         { borderTop:"2px solid #2a2a40", background:"#0f0f18" },
  tfootLabel:    { padding:"6px 6px", fontSize:12, color:"#aaa", fontFamily:"sans-serif" },
  tfootVal:      { fontFamily:"sans-serif", fontSize:14, fontWeight:700 },
  fiscalHeader:  { background:"#13131e", border:"1px solid #a78bfa33", borderRadius:10, padding:"14px 14px", margin:"16px 0 0", position:"sticky", top:0, zIndex:10 },
  fiscalTitle:   { fontSize:12, color:"#a78bfa", fontFamily:"sans-serif", letterSpacing:"0.08em", marginBottom:10, fontWeight:600 },
  fiscalSummary: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },
  fiscalCell:    { display:"flex", flexDirection:"column", gap:3 },
  fiscalLabel:   { fontSize:10, color:"#aaa", fontFamily:"sans-serif" },
  fiscalVal:     { fontSize:16, fontFamily:"sans-serif", fontWeight:700 },
  invoiceBadge:  { fontSize:9, background:"#4ade8022", color:"#4ade80", border:"1px solid #4ade8044", padding:"1px 5px", borderRadius:8, whiteSpace:"nowrap" },
  noInvoiceBadge:{ fontSize:9, background:"#f8717122", color:"#f87171", border:"1px solid #f8717144", padding:"1px 5px", borderRadius:8, whiteSpace:"nowrap" },
};


// ─── 詳細ページヘルパー ─────────────────────────────────────────
function TxBlock({ color, title, children }) {
  return (
    <div style={{ marginBottom:12, borderLeft:`3px solid ${color}55`, paddingLeft:10 }}>
      <div style={{ fontSize:10, letterSpacing:"0.08em", color, fontFamily:"sans-serif", fontWeight:600, marginBottom:6 }}>
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
      <span style={{ fontSize:11, color:"#666", fontFamily:"sans-serif", flexShrink:0, minWidth:72 }}>{label}</span>
      <span style={{ fontSize: large ? 15 : 13, fontFamily:"sans-serif", color: color||"#ccc", fontWeight: large ? 600 : 400 }}>
        {val}
      </span>
    </div>
  );
}

// ─── フォームヘルパー ───────────────────────────────────────────
function Field({ label, required, fullWidth, children }) {
  return (
    <div style={{ ...S.formGrid, display:"flex", flexDirection:"column", gap:6,
      ...(fullWidth ? { gridColumn:"1/-1" } : {}) }}>
      <label style={S.formLabel}>
        {label}{required && <span style={{ color:"#f87171", marginLeft:2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function CpSelect({ counterparties, value, cpId, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState("");
  const filtered = counterparties.filter(c =>
    !q || [c.name, c.company].some(s => (s||"").toLowerCase().includes(q.toLowerCase()))
  );
  const cpDisplayName = (cp) => cp ? (cp.name || cp.company || "—") : "—";
  return (
    <div style={{ position:"relative" }}>
      <div style={{ position:"relative" }}>
        <input style={{ ...S.formInput, flex:1, paddingRight:32 }} placeholder={placeholder||"取引先を選択または入力"}
          value={value} onChange={e => onChange(e.target.value, null)}
          onFocus={() => setOpen(true)} />
        <button type="button" style={{position:"absolute",right:0,top:0,bottom:0,width:32,background:"transparent",border:"none",cursor:"pointer",color:"#a78bfa",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={() => setOpen(o => !o)}>▾</button>
      </div>
      {cpId && <div style={{ fontSize:11, color:"#a78bfa", marginTop:2 }}>✓ 取引先DBと連携済み</div>}
      {open && (
        <div style={S.cpDropdown}>
          <input style={{ ...S.formInput, margin:"8px 8px 4px", width:"calc(100% - 16px)", fontSize:12, boxSizing:"border-box" }}
            placeholder="絞り込み…" value={q} onChange={e => setQ(e.target.value)} autoFocus />
          <div style={{ maxHeight:160, overflowY:"auto" }}>
            {filtered.map(cp => (
              <div key={cp.id} style={S.cpDropdownItem}
                onClick={() => { onChange(cpDisplayName(cp), cp.cp_id||cp.id); setOpen(false); setQ(""); }}
                onMouseEnter={e => e.currentTarget.style.background="#1e1e30"}
                onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                <span style={{ fontWeight:600 }}>{cpDisplayName(cp)}</span>
              </div>
            ))}
          </div>
          <button style={S.cpDropdownClose} onClick={() => { setOpen(false); setQ(""); }}>閉じる</button>
        </div>
      )}
    </div>
  );
}

// ─── グローバルスタイル ─────────────────────────────────────────
const S = {
  root:        { display:"flex", height:"100vh", background:"#0a0a0f", color:"#e2e0f0", fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", overflow:"hidden" },
  sidebar:     { width:220, flexShrink:0, background:"#0f0f18", borderRight:"1px solid #1e1e30", display:"flex", flexDirection:"column", padding:"28px 16px", gap:8 },
  logo:        { display:"flex", alignItems:"center", gap:10, marginBottom:28, paddingBottom:20, borderBottom:"1px solid #1e1e30" },
  logoMark:    { fontSize:28, color:"#a78bfa" },
  logoTitle:   { fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontSize:18, fontWeight:700, letterSpacing:"0.2em" },
  logoSub:     { fontSize:9, letterSpacing:"0.1em", color:"#555", fontFamily:"sans-serif" },
  nav:         { display:"flex", flexDirection:"column", gap:4 },
  navItem:     { display:"flex", alignItems:"center", gap:8, padding:"10px 12px", borderRadius:8, border:"none", background:"transparent", color:"#888", cursor:"pointer", fontSize:13, fontFamily:"sans-serif", transition:"background 0.15s, color 0.15s", textAlign:"left" },
  navActive:   { background:"#1e1e30", color:"#e2e0f0" },
  navAdd:      { marginTop:0, background:"#1a1030", color:"#a78bfa", border:"1px solid #a78bfa33" },
  navAdd2:     { background:"#0a1a20", color:"#38bdf8", border:"1px solid #38bdf833" },
  navDivider:  { height:1, background:"#1e1e30", margin:"8px 0" },
  navIcon:     { fontSize:16 },
  sideStats:   { marginTop:"auto", display:"flex", flexDirection:"column", gap:10, padding:"14px 12px", background:"#0a0a14", borderRadius:10, border:"1px solid #1e1e30" },
  statItem:    { display:"flex", justifyContent:"space-between", alignItems:"center" },
  statNum:     { fontSize:20, fontWeight:700, fontFamily:"sans-serif" },
  statLab:     { fontSize:11, color:"#666", fontFamily:"sans-serif" },
  main:        { flex:1, overflow:"auto", background:"#0a0a0f" },
  content:     { padding:"24px 16px 70px" },
  contentPc:   { padding:"36px 40px" },
  pageHeader:  { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 },
  pageTitle:   { fontSize:26, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", letterSpacing:"0.05em", fontWeight:600, margin:0 },
  toolbar:     { display:"flex", gap:10, marginBottom:16, alignItems:"center", flexWrap:"wrap" },
  search:      { flex:1, minWidth:180, background:"#0f0f18", border:"1px solid #2a2a40", borderRadius:8, padding:"8px 14px", color:"#e2e0f0", fontSize:13, fontFamily:"sans-serif", outline:"none" },
  searchBar:   { background:"#0f0f18", border:"1px solid #2a2a40", borderRadius:8, padding:"8px 14px", color:"#e2e0f0", fontSize:13, fontFamily:"sans-serif", outline:"none", width:"100%", boxSizing:"border-box", marginBottom:10 },
  filterGroup: { display:"flex", gap:6, flexWrap:"wrap" },
  filterBtn:   { padding:"6px 12px", borderRadius:20, border:"1px solid #2a2a40", background:"transparent", color:"#888", cursor:"pointer", fontSize:12, fontFamily:"sans-serif" },
  filterActive:{ background:"#1e1e30", color:"#e2e0f0", borderColor:"#a78bfa44" },
  filter:      { padding:"6px 12px", borderRadius:20, border:"1px solid #2a2a40", background:"transparent", color:"#888", cursor:"pointer", fontSize:12, fontFamily:"sans-serif" },
  tableOuter:  { overflowX:"auto" },
  tableWrap:   { overflowX:"auto" },
  table:       { width:"100%", borderCollapse:"collapse", minWidth:900 },
  th:          { textAlign:"left", padding:"10px 12px", fontSize:12, color:"#aaa", fontFamily:"sans-serif", letterSpacing:"0.05em", borderBottom:"1px solid #1e1e30", whiteSpace:"nowrap" },
  tr:          { cursor:"pointer", transition:"background 0.15s" },
  td:          { padding:"13px 12px", fontSize:13, fontFamily:"sans-serif", borderBottom:"1px solid #13131e", color:"#ccc", whiteSpace:"nowrap" },
  price:       { fontFamily:"sans-serif", fontSize:14, color:"#e2e0f0" },
  statusBadge: { padding:"3px 9px", borderRadius:20, fontSize:12, fontFamily:"sans-serif" },
  arrowBtn:    { color:"#555", fontSize:14 },
  empty:       { textAlign:"center", color:"#aaa", padding:"60px 0", fontFamily:"sans-serif", fontSize:13 },
  backBtn:     { background:"none", border:"none", color:"#a78bfa", cursor:"pointer", fontSize:13, fontFamily:"sans-serif", marginBottom:20, padding:0 },
  detailGrid:       { display:"grid", gridTemplateColumns:"360px 1fr", gap:24 },
  detailGridMobile: { display:"flex", flexDirection:"column", gap:16 },
  detailCard:  { background:"#0f0f18", border:"1px solid #1e1e30", borderRadius:12, overflow:"hidden" },
  artThumb:    { height:200, background:"linear-gradient(135deg,#1a1030 0%,#0f0f18 100%)", display:"flex", alignItems:"center", justifyContent:"center", borderBottom:"1px solid #1e1e30" },
  artThumbIcon:{ fontSize:60, color:"#2a2a40" },
  detailInfo:      { padding:"20px 22px" },
  detailStatusRow: { marginBottom:10 },
  detailTitle:     { fontSize:22, fontFamily:"sans-serif", margin:"0 0 4px", fontWeight:700 },
  detailArtist:    { color:"#a78bfa", fontFamily:"sans-serif", fontSize:14, margin:"0 0 12px" },
  detailMeta:      { display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 },
  metaTag:         { background:"#1e1e30", padding:"2px 8px", borderRadius:4, fontSize:12, color:"#aaa", fontFamily:"sans-serif" },
  metaTagPlain:    { fontSize:12, color:"#aaa", fontFamily:"sans-serif" },
  historyPanel:    { background:"#0f0f18", border:"1px solid #1e1e30", borderRadius:12, padding:"22px 24px", display:"flex", flexDirection:"column" },
  historyHeader:   { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 },
  historyTitle:    { fontSize:16, fontFamily:"sans-serif", fontWeight:600, margin:0 },
  addEventBtn:     { padding:"6px 14px", borderRadius:8, border:"1px solid #a78bfa55", background:"#1a1030", color:"#a78bfa", cursor:"pointer", fontSize:12, fontFamily:"sans-serif" },
  timeline:        { display:"flex", flexDirection:"column", gap:0 },
  timelineItem:    { display:"flex", gap:14 },
  timelineLine:    { display:"flex", flexDirection:"column", alignItems:"center", paddingTop:4, flexShrink:0, width:16 },
  timelineDot:     { width:10, height:10, borderRadius:"50%", flexShrink:0 },
  timelineConnector:{ flex:1, width:2, background:"#1e1e30", marginTop:4, minHeight:16 },
  timelineBody:    { paddingBottom:20, flex:1 },
  timelineTop:     { display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" },
  eventTag:        { padding:"2px 8px", borderRadius:12, fontSize:12, fontFamily:"sans-serif" },
  timelineDate:    { fontSize:12, color:"#aaa", fontFamily:"sans-serif" },
  timelineCp:      { fontSize:13, fontFamily:"sans-serif", color:"#ccc", marginBottom:4, display:"flex", alignItems:"center", gap:5 },
  timelinePrices:  { display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" },
  oldPrice:        { fontSize:13, color:"#555", fontFamily:"sans-serif", textDecoration:"line-through" },
  arrow:           { color:"#555", fontSize:12 },
  newPrice:        { fontSize:15, fontFamily:"sans-serif", fontWeight:600 },
  timelineMemo:    { fontSize:12, color:"#aaa", fontFamily:"sans-serif" },
  formCard:         { background:"#0f0f18", border:"1px solid #1e1e30", borderRadius:12, padding:"24px 24px 20px" },
  formSectionTitle: { fontSize:12, letterSpacing:"0.08em", color:"#a78bfa", fontFamily:"sans-serif", marginBottom:14, fontWeight:600 },
  formGrid:         { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px 20px" },
  formLabel:        { fontSize:12, color:"#aaa", fontFamily:"sans-serif" },
  formInput:        { background:"#13131e", border:"1px solid #2a2a40", borderRadius:8, padding:"9px 12px", color:"#e2e0f0", fontSize:13, fontFamily:"sans-serif", outline:"none", width:"100%", boxSizing:"border-box", WebkitAppearance:"none", appearance:"none" },
  formSub:          { color:"#aaa", fontFamily:"sans-serif", fontSize:13, marginBottom:20 },
  submitBtn:        { marginTop:20, padding:"11px 28px", background:"#a78bfa", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontSize:14, fontFamily:"sans-serif", fontWeight:600 },
  submitDisabled:   { background:"#2a2a40", color:"#555", cursor:"not-allowed" },
  cpTypeBadge:  { padding:"2px 8px", borderRadius:12, fontSize:11, fontFamily:"sans-serif", border:"1px solid" },
  cpLink:       { color:"#a78bfa", cursor:"pointer", textDecoration:"underline dotted" },
  cpArtworkItem:{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #13131e", fontSize:13, fontFamily:"sans-serif", color:"#ccc" },
  cpDropdown:     { position:"absolute", top:"100%", left:0, right:0, background:"#0f0f18", border:"1px solid #2a2a40", borderRadius:8, zIndex:100, marginTop:4, boxShadow:"0 4px 20px #00000066" },
  cpDropdownItem: { padding:"8px 12px", cursor:"pointer", fontSize:13, fontFamily:"sans-serif", color:"#ccc" },
  cpDropdownClose:{ width:"100%", padding:"8px", background:"none", border:"none", borderTop:"1px solid #1e1e30", color:"#aaa", cursor:"pointer", fontSize:12, fontFamily:"sans-serif" },
  priceBlock:   { display:"flex", flexDirection:"column", gap:2, alignItems:"flex-end" },
  priceRow:     { display:"flex", alignItems:"baseline", width:"100%" },
  priceLabel:   { fontSize:12, color:"#aaa", fontFamily:"sans-serif", width:28, flexShrink:0, whiteSpace:"nowrap" },
  priceVal:     { fontSize:12, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", textAlign:"right", flex:1, whiteSpace:"nowrap" },
  purchasedAt:  { fontSize:12, color:"#aaa", fontFamily:"sans-serif", marginTop:4 },
  appraisalChip:{ background:"#f59e0b11", padding:"1px 6px", borderRadius:4, fontSize:12, color:"#f59e0b", fontFamily:"sans-serif", flexShrink:0, whiteSpace:"nowrap", border:"1px solid #f59e0b33" },
  workList:     { display:"flex", flexDirection:"column" },
  workRow:      { display:"flex", alignItems:"center", gap:6, padding:"10px 4px", cursor:"pointer", transition:"background 0.15s", borderBottom:"1px solid #13131e" },
  workMain:     { flex:1, minWidth:0, overflow:"hidden" },
  workId:       { fontFamily:"'Courier New',monospace", fontSize:14, color:"#a78bfa", letterSpacing:"0.02em", flexShrink:0, width:70, fontWeight:700 },
  workTitle:    { fontWeight:600, fontSize:14, marginBottom:4, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  workMeta:     { display:"flex", gap:6, fontSize:12, color:"#bbb", fontFamily:"sans-serif", flexWrap:"wrap", alignItems:"center" },
  workRight:    { flexShrink:0, display:"flex", flexDirection:"column", alignItems:"stretch", gap:2, minWidth:150 },
  plainText:    { fontSize:12, color:"#ccc", fontFamily:"sans-serif", whiteSpace:"nowrap", flexShrink:0 },
  dot:          { fontSize:12, color:"#444", fontFamily:"sans-serif", flexShrink:0 },
  tabBar:       { display:"flex", gap:4, flexWrap:"wrap", marginBottom:12 },
  tab:          { padding:"4px 10px", borderRadius:20, border:"1px solid #2a2a40", background:"transparent", color:"#aaa", cursor:"pointer", fontSize:12, fontFamily:"sans-serif", transition:"background 0.15s" },
  tabActive:    { background:"#1e1e30", color:"#e2e0f0", borderColor:"#a78bfa44" },
  tabCount:     { fontSize:10, color:"#666", marginLeft:3 },
  artistHeader: { marginBottom:16 },
  artistName:   { fontSize:16, fontWeight:600, marginBottom:2 },
  artistKana:   { fontSize:12, color:"#aaa", fontFamily:"sans-serif" },
  artistCount:  { fontSize:12, color:"#38bdf8", fontFamily:"sans-serif" },
  registerOverlay:  { position:"fixed", inset:0, background:"#00000088", zIndex:200, display:"flex", alignItems:"flex-end" },
  registerMenu:     { background:"#0f0f18", border:"1px solid #1e1e30", borderRadius:"12px 12px 0 0", width:"100%", padding:"20px 20px 32px", position:"fixed", bottom:0, left:0, right:0, zIndex:201 },
  registerMenuTitle:{ fontSize:14, fontWeight:600, fontFamily:"sans-serif", marginBottom:16, color:"#e2e0f0" },
  registerMenuSub:  { fontSize:12, color:"#aaa", fontFamily:"sans-serif", marginBottom:8 },
  registerMenuItem: { display:"flex", alignItems:"center", gap:12, padding:"14px 0", borderBottom:"1px solid #1e1e30", cursor:"pointer", width:"100%", boxSizing:"border-box" as const },
  registerMenuIcon: { fontSize:20 },
  bottomNav:        { position:"fixed", bottom:0, left:0, right:0, height:60, background:"#0f0f18", borderTop:"1px solid #1e1e30", display:"flex", alignItems:"center", zIndex:100 },
  bottomNavItem:    { flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, cursor:"pointer", height:"100%", background:"none", border:"none", color:"#666", fontFamily:"sans-serif" },
  bottomNavActive:  { color:"#a78bfa" },
  bottomNavIcon:    { fontSize:18 },
  bottomNavLabel:   { fontSize:10 },
  bottomNavPlus:    { flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, cursor:"pointer", height:"100%", background:"none", border:"none", fontFamily:"sans-serif", color:"#a78bfa" },
};

// ─── スマホ取引先カードスタイル ──────────────────────────────────
const MC = {
  card:        { display:"flex", alignItems:"center", gap:10, padding:"12px 8px", cursor:"pointer", transition:"background 0.15s", borderBottom:"1px solid #13131e" },
  left:        { flexShrink:0, width:64 },
  artworkId:   { fontFamily:"'Courier New',monospace", fontSize:12, color:"#a78bfa", fontWeight:700 },
  main:        { flex:1, minWidth:0 },
  title:       { fontWeight:700, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  artist:      { fontSize:12, color:"#bbb", fontFamily:"sans-serif", whiteSpace:"nowrap" },
  chips:       { display:"flex", gap:4, flexWrap:"wrap", marginTop:4 },
  chip:        { padding:"1px 6px", borderRadius:10, fontSize:11, fontFamily:"sans-serif", border:"1px solid #2a2a40", color:"#aaa" },
  price:       { fontSize:13, fontFamily:"sans-serif", color:"#ccc" },
  date:        { fontSize:11, color:"#aaa", fontFamily:"sans-serif" },
  right:       { flexShrink:0, textAlign:"right" },
  statusBadge: { padding:"3px 9px", borderRadius:20, fontSize:11, fontFamily:"sans-serif" },
  dot:         { fontSize:12, color:"#444" },
  plainText:   { fontSize:12, color:"#ccc", fontFamily:"sans-serif" },
};

