/**
 * 声优所属事务所。
 *
 * 数据来源：
 * - 抓取：`scripts/fetch-seiyuu-agency.mjs`（Bangumi 人物条目的「事务所」字段 +
 *   事务所官网域名反推），产出 `tmp/seiyuu-agency-raw.json`；
 * - 补齐：日文维基百科条目首段的「…は、日本の声優。○×所属。」（`tmp/fetch-agency-wiki.mjs`）；
 * - 剩下几条按公开资料人工填。
 *
 * 事务所属会变动（转籍、退所、组合移管），这份表以 **2026 年 9 月**为准；
 * 自由身 / 查不到的写空串，不算「同事务所」，也不会参与关系网的同事务所题型。
 * 改完跑 `pnpm --prefix client exec vitest run src/config/seiyuuNetwork.test.ts` 复查。
 */

/** id -> 事务所名（空串 = 未收录或自由身）。 */
export const SEIYUU_AGENCIES: Record<string, string> = {
  /* ---------------- LoveLive! ---------------- */
  'aoyama-nagisa': 'クロコダイル',
  'maeda-kaori': 'アミューズクリエイティブスタジオ',
  'kito-akari': 'ラクーンドッグ',
  'sashide-maria': 'WITH LINE',
  'kubota-miyu': '81プロデュース',
  'tanaka-chiemi': 'ステイラック',
  'sagara-mayu': '', // 自由身
  'murakami-natsumi': 'YU-RIN PRO',
  'saito-shuka': 'ホーリーピーク',
  'aida-rikako': '賢プロダクション',
  'mimori-suzuko': '響',
  'kohara-konomi': '大沢事務所',
  'hanamiya-hina': '青二プロダクション',
  'date-sayuri': 'アポロベイ',
  'liyuu': 'ホリプロインターナショナル',
  'misaki-nako': 'ホーリーピーク',
  'payton-naomi': 'ソニー・ミュージックアーティスツ',
  'suzuhara-nozomi': 'アポロベイ',
  'yabushima-akane': 'アイムエンタープライズ',
  'okuma-wakana': '賢プロダクション',
  'emori-aya': 'ボックスコーポレーション',
  'yuina': 'スターライズ',
  'sakakura-hana': 'スタイルキューブ',
  'ohnishi-aguri': 'リンク・プラン',
  'hina-youmiya': '青二プロダクション',
  'kohinata-mika': 'アクロス エンタテインメント',
  'itou-miku': 'ボイスキット',

  /* ---------------- BanG Dream! ---------------- */
  'aiba-aina': '響',
  'aimi': '響',
  'itou-ayasa': '響',
  'kudou-haruka': '', // 自由身
  'nakajima-yuki': 'アース・スター エンターテイメント',
  'sakuragawa-meggu': '株式会社S',
  'misawa-sachika': 'スターダストプロモーション',
  'ozawa-ari': 'アイムエンタープライズ',
  'toyota-moe': 'スタイルキューブ',
  'shindou-amane': '響',
  'naota-hina': '東京俳優生活協同組合',
  'hayashi-koko': 'LIBERTE',
  'okada-mei': 'エースクルー・エンタテインメント',
  'sasaki-riko': 'ハニカムエンタテインメント',
  'watase-yuzuki': '響',
  'yonezawa-akane': 'プラチナムプロダクション',
  'tateishi-rin': '響',
  'aoki-hina': '響',
  'ohashi-ayaka': 'INSPIONエージェンシー',
  'takao-kanon': 'アース・スター エンターテイメント',
  'nishio-yuka': '響',
  'tsumugi-risa': '響',

  /* ---------------- 世界计划 ---------------- */
  'kino-hina': 'アミュレート',
  'motoizumi-rina': '81プロデュース',
  'tanabe-rui': 'ステイラック',
  'yoshioka-mayu': '81プロデュース',
  'noguchi-ruriko': 'アーツビジョン',
  'akina': '', // 未收录
  'isobe-karin': 'アミューズ',
  'suzuki-minori': '青二プロダクション',
  'satou-hinata': 'アミューズクリエイティブスタジオ',
  'shinohara-yu': 'アイムエンタープライズ',

  /* ---------------- 偶像大师 ---------------- */
  'nakamura-eriko': 'アーツビジョン',
  'asakura-azumi': 'アーツビジョン',
  'numakura-manami': 'アーツビジョン',
  'shimoda-asami': 'アーツビジョン',
  'ootsuka-yuka': 'm&i',
  'imai-asami': 'EARLY WING',
  'hasegawa-akiko': 'アーツビジョン',
  'hara-sayuri': '81プロデュース',
  'kuroki-honoka': 'スターダストプロモーション',
  'minato-miya': '東京俳優生活協同組合',

  /* ---------------- 学园偶像大师 ---------------- */
  'hanaiwa-kana': '東京俳優生活協同組合',
  'usui-yuri': 'アイムエンタープライズ',
  'takasago-mashiro': 'ソニー・ミュージックアーティスツ',
  'nagatsuki-aoi': 'アミュレート',
  'koshika-nao': 'アイムエンタープライズ',
  'iida-hikaru': 'プロ・フィット',
  'kawamura-rena': 'アイムエンタープライズ',
  'saitou-machico': 'ボイスキット',

  /* ---------------- 赛马娘 ---------------- */
  'tadokoro-azusa': 'INSPIONエージェンシー',
  'oozora-naomi': '青二プロダクション',
  'tatsumi-yuiko': 'アイムエンタープライズ',
  'tokui-sora': 'エイベックス・ピクチャーズ',
  'takano-marika': '青二プロダクション',
  'ueda-hitomi': '青二プロダクション',
  'yano-hinaki': 'ソニー・ミュージックアーティスツ',

  /* ---------------- 少女☆歌剧 ---------------- */
  'ikuta-teru': 'クイーンズアベニュー',
  'koyama-momoyo': 'スターダストプロモーション',
  'iwata-haruki': 'fennec',
  'tomita-maho': 'サンズエンタテインメント',

  /* ---------------- D4DJ ---------------- */
  'kurahashi-rei': '', // 未收录
  'takagi-miyu': '81プロデュース',
  'kozaki-kanon': '', // 自由身

  /* ---------------- 补齐 ---------------- */
  'koizumi-moeka': 'アミューズ',
  'uchida-shuu': 'ジャストプロ',
  'houmoto-akina': 'ジャストプロ',
  'inami-anju': 'ソニー・ミュージックアーティスツ',
  'furihata-ai': 'アクロス エンタテインメント',
  'kusunoki-tomoyo': 'ソニー・ミュージックアーティスツ',
  'nirei-kisara': 'ホーリーピーク',
  'ogura-yui': 'スタイルキューブ',
  'taneda-risa': '大沢事務所',
  'waki-azumi': '東京俳優生活協同組合',
  'ootsuka-sae': '', // 未收录
};

/** id -> 同事务所的其他人（懒加载）。 */
let peersCache: Map<string, string[]> | null = null;

function buildPeers(): Map<string, string[]> {
  const byAgency = new Map<string, string[]>();
  for (const [id, agency] of Object.entries(SEIYUU_AGENCIES)) {
    if (!agency) continue;
    const list = byAgency.get(agency) ?? [];
    list.push(id);
    byAgency.set(agency, list);
  }
  const peers = new Map<string, string[]>();
  for (const [id, agency] of Object.entries(SEIYUU_AGENCIES)) {
    if (!agency) {
      peers.set(id, []);
      continue;
    }
    peers.set(id, (byAgency.get(agency) ?? []).filter((other) => other !== id));
  }
  return peers;
}

/** 事务所名；未收录 / 自由身返回空串。 */
export function agencyOf(id: string): string {
  return SEIYUU_AGENCIES[id] ?? '';
}

/** 同事务所的其他人。 */
export function agencyPeersOf(id: string): string[] {
  if (!peersCache) peersCache = buildPeers();
  return peersCache.get(id) ?? [];
}

/** 收录了事务所的声优数量（给测试和统计用）。 */
export function agencyCoverage(): number {
  return Object.values(SEIYUU_AGENCIES).filter(Boolean).length;
}
