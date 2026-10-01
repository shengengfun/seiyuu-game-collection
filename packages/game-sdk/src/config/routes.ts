/**
 * 站点级路由常量。
 * 门户(声优情报站)挂在根路径,每个小游戏各占一个二级路径。
 */
export const SITE_HOME = '/';
/** 声优猜:声优猜测游戏主菜单 */
export const SEIYU_GUESS_HOME = '/seiyu-guess';
/** SeiValue 测试 */
export const SEIVALUE_HOME = '/seivalue';
/** 你是哪个声优:你和哪位女声优最像 */
export const WHO_YOU_ARE_HOME = '/seiyu-who-you-are';
/** 声优问答:搜声优 → 答 TA 的个人题库 → 给等级与评语 */
export const SEIYUU_QUIZ_HOME = '/seiyuu-quiz';
/** 猜歌:听 30 秒试听,四选一猜歌名(按企划分组) */
export const SONG_QUIZ_HOME = '/song-quiz';
/** 喜欢或讨厌:对女声优投喜欢 / 讨厌,投票后才能看比例与评论 */
export const SUKIKIRAI_HOME = '/seiyuu-sukikirai';
/** 喜欢或讨厌的人物页(投票页)。 */
export function sukikiraiSeiyuuPath(id: string): string {
  return `${SUKIKIRAI_HOME}/${id}`;
}
/** 我喜欢你:从全体名册里选出最喜欢的 9 位。 */
export const LIKE_YOU_HOME = '/seiyu-like-you';
/** 声优粉宾果:5×5 行为检定点卡。 */
export const SEIYUU_BINGO_HOME = '/seiyuu-bingo';
/** 声优关系网:共演 / 同企划连线。 */
export const SEIYUU_NETWORK_HOME = '/seiyuu-network';/** 声优人生重开：8 个岔路口选出一条人生，配一位最像的现役声优。 */
export const SEIYUU_LIFE_HOME = '/seiyuu-life';
/** 声优事务所经营：12 个月签新人接委托，出一张事务所年报。 */
export const SEIYUU_AGENCY_HOME = '/seiyuu-agency';
/** 声优简历找茬：限时挑出资料卡里被改错的栏目。 */
export const SEIYUU_RESUME_HOME = '/seiyuu-resume';/** 登录页(注册 / 登录同一个页面,用 tab 切换)。 */
export const LOGIN_HOME = '/login';
/** 忘记密码:邮箱验证码换新密码。 */
export const PASSWORD_RESET_HOME = '/password-reset';
/** 邮箱验证链接的落地页(链接式绑定邮箱用)。 */
export const EMAIL_VERIFY_HOME = '/email-verify';
/** 旧路径,保留重定向,避免老链接 404 */
export const SEIYU_8VALUES_HOME = '/seiyu-8values';
