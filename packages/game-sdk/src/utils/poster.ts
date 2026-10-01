/**
 * 竖版分享海报（1080 × 1920 PNG）。
 *
 * 「我喜欢你」「声优粉宾果」「声优关系网」三个玩法的结果页共用这一套：
 * 外框背景、标题区、页脚、下载都在这里，各自只负责画中间那块内容。
 *
 * 为什么不用 html2canvas：一张 1080×1920 的图要重排整棵 DOM，中文字形和
 * 字体加载时机都不可控；直接画 canvas 既快又可控，也不用多一个依赖。
 * 照片全部来自同源 `/seiyuu/*.jpg`、二维码来自同源 `/qr/*.png`，
 * canvas 不会被污染，可以直接导出 PNG。
 *
 * 配色走浅色：分享到聊天窗里浅底比深底耐看，也和站点浅色主题一致。
 */

export const POSTER_WIDTH = 1080;
export const POSTER_HEIGHT = 1920;

/** 海报里的字体栈：优先系统中文字体，避免海报里出现豆腐块。 */
export const POSTER_FONT = [
  '"PingFang SC"',
  '"Hiragino Sans GB"',
  '"Microsoft YaHei"',
  '"Noto Sans SC"',
  'system-ui',
  'sans-serif',
].join(', ');

/** 海报配色：浅色底 + 橄榄绿强调色。 */
export const POSTER_COLORS = {
  bgFrom: '#fffdf8',
  bgTo: '#f2eaff',
  /** 强调色：浅底上要足够深才读得清。 */
  accent: '#6d8c00',
  /** 强调色的浅底（勾选格、标签底）。 */
  accentSoft: 'rgba(201, 234, 22, 0.42)',
  /** 画在强调色上的文字。 */
  onAccent: '#ffffff',
  text: '#241422',
  textSoft: 'rgba(36, 20, 34, 0.72)',
  textFaint: 'rgba(36, 20, 34, 0.46)',
  card: 'rgba(255, 255, 255, 0.86)',
  cardBorder: 'rgba(36, 20, 34, 0.14)',
  /** 照片 / 卡片的外圈描边。 */
  frame: 'rgba(36, 20, 34, 0.16)',
  /** 已勾选格子的底色。 */
  highlight: 'rgba(201, 234, 22, 0.42)',
  glowA: 'rgba(201, 234, 22, 0.34)',
  glowB: 'rgba(184, 142, 255, 0.26)',
} as const;

/** 安全边距：内容都画在这条线以内，比例感统一。 */
export const POSTER_PADDING = 76;

/** 里层内容区的宽度。 */
export const POSTER_CONTENT_WIDTH = POSTER_WIDTH - POSTER_PADDING * 2;

export interface PosterHeaderOptions {
  /** 顶部小字，一般放玩法英文名。 */
  kicker: string;
  /** 主标题。 */
  title: string;
  /** 副标题（可省略）。 */
  subtitle?: string;
}

export interface PosterQrOptions {
  /** 二维码图片（同源 `/qr/*.png`）。 */
  image: CanvasImageSource & { width: number; height: number };
  /** 边长，默认 132。 */
  size?: number;
  /** 二维码左边的提示文字，例如「扫码来玩」。 */
  caption?: string;
}

export type PosterFooterOptions = {
  /** 站点名。 */
  site: string;
  /** 底部提示，一般写访问方式。 */
  hint: string;
  /** 右下角二维码；不传就不画，页脚自动变矮。 */
  qr?: PosterQrOptions;
};

/** 建一张空白海报画布。 */
export function createPosterCanvas(): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  canvas.width = POSTER_WIDTH;
  canvas.height = POSTER_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建海报画布');
  ctx.textBaseline = 'alphabetic';
  return { canvas, ctx };
}

/** 圆角矩形路径（自己实现，不依赖 ctx.roundRect）。 */
export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** 画背景：浅色渐变底 + 上角两团柔光。 */
export function paintBackdrop(ctx: CanvasRenderingContext2D): void {
  const gradient = ctx.createLinearGradient(0, 0, POSTER_WIDTH * 0.65, POSTER_HEIGHT);
  gradient.addColorStop(0, POSTER_COLORS.bgFrom);
  gradient.addColorStop(1, POSTER_COLORS.bgTo);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);

  const glow = (x: number, y: number, radius: number, color: string) => {
    const radial = ctx.createRadialGradient(x, y, 0, x, y, radius);
    radial.addColorStop(0, color);
    radial.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);
  };
  glow(150, 90, 620, POSTER_COLORS.glowA);
  glow(POSTER_WIDTH - 40, 420, 580, POSTER_COLORS.glowB);
  glow(POSTER_WIDTH * 0.4, POSTER_HEIGHT, 760, 'rgba(255, 214, 232, 0.35)');
}

/** 画顶部标题区，返回内容区的起始 y。 */
export function drawPosterHeader(ctx: CanvasRenderingContext2D, options: PosterHeaderOptions): number {
  const pad = POSTER_PADDING;
  let y = pad + 26;

  ctx.textAlign = 'left';
  ctx.fillStyle = POSTER_COLORS.accent;
  ctx.font = `800 26px ${POSTER_FONT}`;
  ctx.fillText(options.kicker.toUpperCase(), pad, y);
  y += 30;

  // 标题下方一条强调短线
  ctx.fillStyle = POSTER_COLORS.accent;
  ctx.fillRect(pad, y, 88, 6);
  y += 44;

  ctx.fillStyle = POSTER_COLORS.text;
  ctx.font = `800 76px ${POSTER_FONT}`;
  ctx.fillText(options.title, pad, y + 46);
  y += 92;

  if (options.subtitle) {
    ctx.fillStyle = POSTER_COLORS.textSoft;
    ctx.font = `500 30px ${POSTER_FONT}`;
    for (const line of wrapText(ctx, options.subtitle, POSTER_CONTENT_WIDTH)) {
      ctx.fillText(line, pad, y + 30);
      y += 44;
    }
  }

  return y + 26;
}

export interface PosterChipsOptions {
  /** 左边缘，默认 POSTER_PADDING。 */
  x?: number;
  /** 第一行标签的上沿。 */
  y: number;
  /** 单行可用宽度，默认内容区宽度。 */
  maxWidth?: number;
  /** 字号，默认 26。 */
  size?: number;
  /** 最多画几行，默认 2；放不下的标签直接丢掉。 */
  maxLines?: number;
}

/**
 * 画一排小标签（企划名、特质名、玩法标签…），返回占用的高度。
 *
 * 海报上「一堆短词」的地方不少，写在公共层省得每张海报各写一遍换行逻辑。
 */
export function drawPosterChips(
  ctx: CanvasRenderingContext2D,
  tags: string[],
  options: PosterChipsOptions,
): number {
  const size = options.size ?? 26;
  const x0 = options.x ?? POSTER_PADDING;
  const maxWidth = options.maxWidth ?? POSTER_CONTENT_WIDTH;
  const maxLines = options.maxLines ?? 2;
  const chipHeight = size + 20;
  const gapX = 14;
  const gapY = 12;
  let cursorX = x0;
  let cursorY = options.y;
  let lines = 1;

  ctx.textAlign = 'left';
  ctx.font = `700 ${size}px ${POSTER_FONT}`;
  for (const raw of tags) {
    const text = raw.trim();
    if (!text) continue;
    const textWidth = ctx.measureText(text).width;
    const chipWidth = Math.min(maxWidth, textWidth + size * 1.1);
    if (cursorX + chipWidth > x0 + maxWidth && cursorX > x0) {
      lines += 1;
      if (lines > maxLines) break;
      cursorX = x0;
      cursorY += chipHeight + gapY;
    }
    roundRectPath(ctx, cursorX, cursorY, chipWidth, chipHeight, chipHeight / 2);
    ctx.fillStyle = POSTER_COLORS.accentSoft;
    ctx.fill();
    ctx.strokeStyle = POSTER_COLORS.cardBorder;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = POSTER_COLORS.text;
    ctx.font = `700 ${size}px ${POSTER_FONT}`;
    ctx.fillText(text, cursorX + (chipWidth - textWidth) / 2, cursorY + chipHeight / 2 + size * 0.36);
    cursorX += chipWidth + gapX;
  }

  ctx.textAlign = 'left';
  return (lines - 1) * (chipHeight + gapY) + chipHeight;
}

/** 画页脚（含右下角二维码），返回页脚上沿的 y。 */
export function drawPosterFooter(
  ctx: CanvasRenderingContext2D,
  options: PosterFooterOptions,
): number {
  const pad = POSTER_PADDING;
  const base = POSTER_HEIGHT - pad;
  const qrSize = options.qr ? (options.qr.size ?? 132) : 0;
  const blockHeight = options.qr ? qrSize + 76 : 132;
  const dividerY = base - blockHeight;

  ctx.fillStyle = POSTER_COLORS.cardBorder;
  ctx.fillRect(pad, dividerY, POSTER_CONTENT_WIDTH, 2);

  const textWidth = options.qr ? POSTER_CONTENT_WIDTH - qrSize - 32 : POSTER_CONTENT_WIDTH;

  ctx.textAlign = 'left';
  ctx.fillStyle = POSTER_COLORS.text;
  ctx.font = `700 32px ${POSTER_FONT}`;
  ctx.fillText(options.site, pad, dividerY + 62);

  ctx.fillStyle = POSTER_COLORS.textFaint;
  ctx.font = `500 26px ${POSTER_FONT}`;
  const hintLines = wrapText(ctx, options.hint, textWidth).slice(0, 2);
  hintLines.forEach((line, index) => {
    ctx.fillText(line, pad, dividerY + 106 + index * 36);
  });

  if (options.qr) {
    const x = pad + POSTER_CONTENT_WIDTH - qrSize;
    const y = dividerY + (blockHeight - qrSize) / 2;
    // 二维码自带白边，外面再包一层白卡片，避免落在浅紫底上脏边
    ctx.fillStyle = '#ffffff';
    roundRectPath(ctx, x - 8, y - 8, qrSize + 16, qrSize + 16, 12);
    ctx.fill();
    ctx.drawImage(options.qr.image, x, y, qrSize, qrSize);
    if (options.qr.caption) {
      ctx.textAlign = 'right';
      ctx.fillStyle = POSTER_COLORS.textSoft;
      ctx.font = `600 24px ${POSTER_FONT}`;
      ctx.fillText(options.qr.caption, x - 20, y + qrSize / 2 + 8);
      ctx.textAlign = 'left';
    }
  }

  return dividerY;
}

/** 按最大宽度把一段文字折行（中英混排按字符量测）。 */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = '';
  for (const char of Array.from(text)) {
    if (char === '\n') {
      lines.push(line);
      line = '';
      continue;
    }
    const next = line + char;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = char;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export interface CoverImageOptions {
  /** 圆角半径；传 'circle' 画成正圆。 */
  radius?: number | 'circle';
  /** 外圈描边。 */
  ring?: { color: string; width: number };
  /** 竖直对齐：人像照用 top 才能保住脸，默认居中。 */
  align?: 'top' | 'center';
}

/** 按 cover 方式把图片画进指定矩形（可选圆角 / 圆形裁剪 + 描边）。 */
export function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  width: number,
  height: number,
  options: CoverImageOptions = {},
): void {
  const { radius = 0, ring, align = 'center' } = options;
  const sourceWidth = image.width;
  const sourceHeight = image.height;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const dx = x + (width - drawWidth) / 2;
  const dy = align === 'top' ? y : y + (height - drawHeight) / 2;

  ctx.save();
  if (radius === 'circle') {
    ctx.beginPath();
    ctx.arc(x + width / 2, y + height / 2, Math.min(width, height) / 2, 0, Math.PI * 2);
  } else {
    roundRectPath(ctx, x, y, width, height, radius);
  }
  ctx.clip();
  ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
  ctx.restore();

  if (ring) {
    ctx.save();
    ctx.lineWidth = ring.width;
    ctx.strokeStyle = ring.color;
    if (radius === 'circle') {
      ctx.beginPath();
      ctx.arc(x + width / 2, y + height / 2, Math.min(width, height) / 2 - ring.width / 2, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      roundRectPath(ctx, x + ring.width / 2, y + ring.width / 2, width - ring.width, height - ring.width, radius);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** 画一个居中的单行文字，超宽时自动缩字号。 */
export function drawFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  baselineY: number,
  fontSize: number,
  fontWeight: number,
  maxWidth: number,
  color: string,
): void {
  let size = fontSize;
  let font = `${fontWeight} ${size}px ${POSTER_FONT}`;
  ctx.font = font;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    font = `${fontWeight} ${size}px ${POSTER_FONT}`;
    ctx.font = font;
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.fillText(text, centerX, baselineY);
  ctx.textAlign = 'left';
}

/** 加载图片；失败返回 null（海报缺一张图不应该整张作废）。 */
export function loadPosterImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

/** 并发加载多张图片，顺序与入参一致。 */
export function loadPosterImages(srcs: string[]): Promise<(HTMLImageElement | null)[]> {
  return Promise.all(srcs.map(loadPosterImage));
}

/** 二维码路径（素材由 `node scripts/build-qr.mjs` 生成）。 */
export function qrImagePath(name: string): string {
  return `/qr/${name}.png`;
}

export interface ScorePosterInput {
  /** 顶部小字。 */
  kicker: string;
  /** 字母等级（大写），画成圆形徽章；不传就不画。 */
  grade?: string;
  /** 等级称号，当大标题用。 */
  gradeTitle: string;
  scoreLabel: string;
  score: number;
  /** 两列排布的统计项（label / value）。 */
  stats: { label: string; value: string }[];
  comment: string;
  site: string;
  hint: string;
  qrCaption: string;
  /** 二维码文件名（`client/public/qr/<name>.png`）。 */
  qrName: string;
  /** 副标题（难度 / 模式 / 分组…）。 */
  subtitle?: string;
  /** 标签行（chip）。 */
  tags?: string[];
  /** 进度条（正确率 / 完成度）。 */
  progress?: { label: string; percent: number; note?: string };
  /** 亮点清单（答对的曲子 / 高光时刻），最多画 5 条。 */
  highlights?: { title: string; note?: string }[];
  /** 亮点区标题。 */
  highlightsTitle?: string;
  /** 圆形头像墙（照片路径，`/seiyuu/<id>.jpg` 等）。 */
  avatars?: string[];
}

/** 通用「成绩单」竖版海报：等级章 + 大分数 + 进度条 + 统计 + 亮点清单。 */
export async function renderScorePoster(input: ScorePosterInput): Promise<HTMLCanvasElement> {
  await waitForPosterFonts();
  const { canvas, ctx } = createPosterCanvas();
  paintBackdrop(ctx);

  const top = drawPosterHeader(ctx, { kicker: input.kicker, title: input.gradeTitle });
  const qrImage = await loadPosterImage(qrImagePath(input.qrName));
  const bottom = drawPosterFooter(ctx, {
    site: input.site,
    hint: input.hint,
    qr: qrImage ? { image: qrImage, caption: input.qrCaption } : undefined,
  });

  const pad = POSTER_PADDING;
  const width = POSTER_CONTENT_WIDTH;
  const centerX = pad + width / 2;
  const avatars = input.avatars?.length ? await loadPosterImages(input.avatars.slice(0, 6)) : [];

  let y = top + 12;

  // 副标题 + 标签
  if (input.subtitle) {
    drawFittedText(ctx, input.subtitle, centerX, y + 30, 27, 600, width, POSTER_COLORS.textSoft);
    y += 48;
  }
  if (input.tags?.length) {
    ctx.textAlign = 'left';
    ctx.font = `700 22px ${POSTER_FONT}`;
    const tagTexts = input.tags.map((tag) => `# ${tag}`);
    const gap = 16;
    const widths = tagTexts.map((tag) => ctx.measureText(tag).width + 30);
    const totalWidth = widths.reduce((sum, item) => sum + item, 0) + gap * (tagTexts.length - 1);
    let x = pad + Math.max(0, (width - totalWidth) / 2);
    tagTexts.forEach((tag, index) => {
      const tagWidth = widths[index];
      ctx.fillStyle = POSTER_COLORS.accentSoft;
      ctx.globalAlpha = 0.14;
      roundRectPath(ctx, x, y, tagWidth, 40, 20);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = POSTER_COLORS.accent;
      ctx.fillText(tag, x + 15, y + 28);
      x += tagWidth + gap;
    });
    y += 62;
  }
  y += 18;

  // 等级章 + 大分数（横排）
  const scoreBlockHeight = 240;
  const scoreCenterY = y + scoreBlockHeight / 2;
  if (input.grade) {
    const r = 78;
    ctx.beginPath();
    ctx.arc(centerX - 190, scoreCenterY, r, 0, Math.PI * 2);
    ctx.fillStyle = POSTER_COLORS.highlight;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = POSTER_COLORS.accent;
    ctx.stroke();
    drawFittedText(ctx, input.grade, centerX - 190, scoreCenterY + 30, 96, 900, r * 1.5, POSTER_COLORS.accent);
  }
  ctx.textAlign = 'left';
  const scoreLeft = input.grade ? centerX - 60 : pad;
  ctx.fillStyle = POSTER_COLORS.textSoft;
  ctx.font = `600 26px ${POSTER_FONT}`;
  ctx.fillText(input.scoreLabel, scoreLeft, scoreCenterY - 42);
  ctx.fillStyle = POSTER_COLORS.text;
  ctx.font = `900 124px ${POSTER_FONT}`;
  ctx.fillText(String(input.score), scoreLeft, scoreCenterY + 62);

  // 头像墙（有就画在分数右侧）
  if (avatars.length) {
    const size = 62;
    const overlap = 22;
    let ax = pad + width - size - (avatars.length - 1) * (size - overlap);
    avatars.forEach((image) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(ax + size / 2, scoreCenterY, size / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = POSTER_COLORS.highlight;
      ctx.fillRect(ax, scoreCenterY - size / 2, size, size);
      if (image) ctx.drawImage(image, ax, scoreCenterY - size / 2, size, size);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(ax + size / 2, scoreCenterY, size / 2, 0, Math.PI * 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = POSTER_COLORS.card;
      ctx.stroke();
      ax += size - overlap;
    });
  }
  y += scoreBlockHeight + 12;

  // 进度条
  if (input.progress) {
    const percent = Math.max(0, Math.min(100, input.progress.percent));
    ctx.textAlign = 'left';
    ctx.fillStyle = POSTER_COLORS.textSoft;
    ctx.font = `700 26px ${POSTER_FONT}`;
    ctx.fillText(input.progress.label, pad, y + 30);
    if (input.progress.note) {
      ctx.textAlign = 'right';
      ctx.fillStyle = POSTER_COLORS.accent;
      ctx.fillText(input.progress.note, pad + width, y + 30);
    }
    ctx.textAlign = 'left';
    const barY = y + 52;
    const barHeight = 22;
    ctx.fillStyle = POSTER_COLORS.cardBorder;
    roundRectPath(ctx, pad, barY, width, barHeight, barHeight / 2);
    ctx.fill();
    ctx.fillStyle = POSTER_COLORS.accent;
    roundRectPath(ctx, pad, barY, Math.max(barHeight, (width * percent) / 100), barHeight, barHeight / 2);
    ctx.fill();
    y += 100;
  }

  // 统计格（两列）
  const statRows = Math.ceil(input.stats.length / 2);
  const statsHeight = statRows * 92;
  input.stats.forEach((stat, index) => {
    const x = pad + (index % 2) * (width / 2);
    const rowY = y + Math.floor(index / 2) * 92;
    ctx.textAlign = 'left';
    ctx.fillStyle = POSTER_COLORS.textFaint;
    ctx.font = `600 23px ${POSTER_FONT}`;
    ctx.fillText(stat.label, x, rowY + 32);
    ctx.fillStyle = POSTER_COLORS.text;
    ctx.font = `800 38px ${POSTER_FONT}`;
    ctx.fillText(stat.value, x, rowY + 78);
  });
  y += statsHeight + 18;

  // 亮点清单
  if (input.highlights?.length) {
    ctx.textAlign = 'left';
    ctx.fillStyle = POSTER_COLORS.accent;
    ctx.font = `800 26px ${POSTER_FONT}`;
    ctx.fillText(input.highlightsTitle ?? '', pad, y + 26);
    y += 50;
    ctx.font = `600 25px ${POSTER_FONT}`;
    input.highlights.slice(0, 5).forEach((item, index) => {
      ctx.fillStyle = POSTER_COLORS.textFaint;
      ctx.fillText(`${index + 1}`, pad, y + 26);
      ctx.fillStyle = POSTER_COLORS.text;
      const [titleLine] = wrapText(ctx, item.title, width - 46);
      ctx.fillText(titleLine, pad + 40, y + 26);
      if (item.note) {
        ctx.fillStyle = POSTER_COLORS.textSoft;
        ctx.font = `500 21px ${POSTER_FONT}`;
        const [noteLine] = wrapText(ctx, item.note, width - 46);
        ctx.fillText(noteLine, pad + 40, y + 58);
        ctx.font = `600 25px ${POSTER_FONT}`;
      }
      y += 68;
    });
    y += 10;
  }

  // 评语
  ctx.textAlign = 'center';
  ctx.font = `500 26px ${POSTER_FONT}`;
  ctx.fillStyle = POSTER_COLORS.textSoft;
  const lines = wrapText(ctx, input.comment, width).slice(0, 3);
  lines.forEach((line, index) => ctx.fillText(line, centerX, y + 24 + index * 40));
  ctx.textAlign = 'left';

  return canvas;
}

/** 等字体就绪，避免海报第一帧用回退字体测量导致折行错位。 */
export async function waitForPosterFonts(): Promise<void> {
  try {
    await document.fonts?.ready;
  } catch {
    /* 老浏览器没有 FontFaceSet，忽略即可 */
  }
}

/** canvas → Blob，失败时抛错。 */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('导出图片失败'));
    }, 'image/png');
  });
}

/** 生成 `前缀-YYYYMMDD-HHmm.png` 形式的文件名。 */
export function posterFileName(prefix: string, now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `${prefix}-${stamp}.png`;
}

/** 触发下载。移动端如果拦掉 download 属性，会退化成打开图片（可长按保存）。 */
export async function downloadPoster(canvas: HTMLCanvasElement, fileName: string): Promise<void> {
  const blob = await canvasToBlob(canvas);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
