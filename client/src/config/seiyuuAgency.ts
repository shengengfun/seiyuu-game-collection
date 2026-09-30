/**
 * 「声优事务所经营」的统一出口。
 *
 * 实现拆在三个文件里，页面与测试只认这一个入口：
 * - `agencyTypes.ts`：类型 / 常量 / 加成合并
 * - `agencyData.ts`：委托、事件、彩蛋、道具、特质、称号的数据表
 * - `agencySim.ts`：状态机与结算
 */

export * from './agencySim';
