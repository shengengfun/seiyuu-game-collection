/**
 * 触发 playerCache 缓存刷新:
 * 1. 在 redis 中删除旧版本 VERSION_KEY,递增到新版本
 * 2. 发布 INVALIDATE_CHANNEL 广播
 *
 * 运行: npx tsx scripts/invalidate-cache.ts
 */
import { redis, redisPublisher, redisKey } from '../src/redis';

async function main() {
  const versions = ['seiyuus:revision:v1', 'seiyuus:revision:v2', 'seiyuus:revision:v3', 'seiyuus:revision'];
  const pattern = redisKey('seiyuus:revision*');
  // 1. 删除所有版本缓存键
  const existing = await redis.keys(pattern);
  if (existing.length) {
    console.log('删除版本缓存键:', existing);
    await redis.del(...existing);
  }
  // 2. 发广播让 dev server 刷新
  await redisPublisher.publish(redisKey('seiyuus:invalidate'), JSON.stringify({ reason: 'manual-invalidate', ts: Date.now() }));
  console.log('已发布 invalidate 广播');
  redis.quit();
  redisPublisher.quit();
  console.log('完成。dev server 应该会在几秒内重新加载数据库缓存。');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
