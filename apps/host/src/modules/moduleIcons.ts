import {
  Building2,
  Compass,
  Gamepad2,
  Grid3x3,
  Heart,
  ListChecks,
  Music,
  Network,
  Scale,
  ScanSearch,
  Sparkles,
  Sprout,
  type LucideIcon,
} from 'lucide-react';

/**
 * 模块 `module.json` 里 `icon` 字段可用图标的白名单。
 *
 * 这里显式列出（而不是 `import * as Icons from 'lucide-react'`），
 * 是为了让打包器只留下真正用到的那几个图标。
 * 新增模块用了新图标时，记得在这里登记。
 */
export const MODULE_ICONS: Record<string, LucideIcon> = {
  Building2,
  Compass,
  Gamepad2,
  Grid3x3,
  Heart,
  ListChecks,
  Music,
  Network,
  Scale,
  ScanSearch,
  Sparkles,
  Sprout,
};

export function moduleIcon(name: string | undefined): LucideIcon {
  return (name && MODULE_ICONS[name]) || Sparkles;
}
