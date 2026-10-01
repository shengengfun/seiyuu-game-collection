/**
 * QQ 分享（三个小游戏的结果页共用）。
 *
 * 官方分享页 `connect.qq.com/widget/shareqq` 与手Q的 `mqqapi://share/to_fri`
 * 都是公开接口，**不需要 AppID、也不需要域名备案**，所以开箱可用。
 * 若配置了 `VITE_QQ_APP_ID`（QQ互联「网站应用」的 AppID，见 `.env`），
 * 唤起 App 时会额外带上 share_id；没有该变量也照常工作。
 */

/** 唤起 QQ 之后等多久还停在页面里，就认为没装 QQ，回退到官方分享页。 */
const APP_FALLBACK_DELAY = 1600;

const QQ_SHARE_PAGE = 'https://connect.qq.com/widget/shareqq/index.html';

const QQ_APP_ID = ((import.meta.env.VITE_QQ_APP_ID as string | undefined) ?? '').trim();

export interface QqSharePayload {
  /** 分享出去的链接，必须是绝对地址。 */
  url: string;
  /** 卡片标题。 */
  title: string;
  /** 卡片描述（成绩码之类可以塞在这里）。 */
  summary: string;
  /** 卡片缩略图，必须是公网可访问的绝对地址。 */
  pic?: string;
  /** 卡片来源名，一般传站点名。 */
  site: string;
}

/** 桌面端与移动端回退都打开这个页面。 */
export function qqSharePageUrl({ url, title, summary, pic, site }: QqSharePayload): string {
  const params = new URLSearchParams({ url, title, summary, site });
  if (pic) params.set('pics', pic);
  return `${QQ_SHARE_PAGE}?${params.toString()}`;
}

/** 手机 QQ 的分享 scheme：直接拉起 App 的分享面板。 */
function qqAppShareUrl({ url, title, summary, pic, site }: QqSharePayload): string {
  const params = new URLSearchParams({
    src_type: 'web',
    version: '1',
    file_type: 'news',
    url,
    title,
    description: summary,
    app_name: site,
    source_name: site,
  });
  if (pic) params.set('image_url', pic);
  if (QQ_APP_ID) params.set('share_id', QQ_APP_ID);
  return `mqqapi://share/to_fri?${params.toString()}`;
}

function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|HarmonyOS|Mobile/i.test(navigator.userAgent);
}

function openPage(url: string): void {
  const opened = window.open(url, '_blank', 'noopener,noreferrer,width=760,height=640');
  // 移动端可能拦掉「非用户手势期间」弹出的窗口，那就直接跳过去（可以后退回来）。
  if (!opened) window.location.href = url;
}

/**
 * 分享到 QQ。
 *
 * 桌面端：直接开官方分享页。
 * 移动端：先试 mqqapi 唤起 QQ App；1.6 秒后页面仍在前台（没装 QQ / 被系统拦掉）
 * 就回退到官方分享页。
 */
export function shareToQq(payload: QqSharePayload): void {
  if (!isMobile()) {
    openPage(qqSharePageUrl(payload));
    return;
  }

  let leftPage = false;
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') leftPage = true;
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.setTimeout(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (!leftPage && document.visibilityState === 'visible') {
      openPage(qqSharePageUrl(payload));
    }
  }, APP_FALLBACK_DELAY);

  // 唤起 App：没装 QQ 时这一句不会让页面跳走，交给上面的定时器兜底。
  window.location.href = qqAppShareUrl(payload);
}
