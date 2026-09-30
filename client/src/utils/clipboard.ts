/**
 * 复制文本到剪贴板。
 *
 * 优先用 `navigator.clipboard`（需要 https 或 localhost），失败时退回老式的
 * `document.execCommand('copy')`，这样在 http 局域网访问时也还能用。
 */
export async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* 落到下面的兜底 */
  }
  try {
    const area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
