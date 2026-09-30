import { describe, expect, it, vi } from 'vitest';
import {
  PREVIEW_MAX_IDS,
  mapLookupResults,
  parsePreviewIds,
  resolvePreviews,
} from './songQuiz';

describe('猜歌试听接口：参数解析', () => {
  it('去重、去非法、保持顺序', () => {
    expect(parsePreviewIds('3, 1,3,abc,-2,0,2')).toEqual([3, 1, 2]);
    expect(parsePreviewIds('   ')).toEqual([]);
    expect(parsePreviewIds('1.5,7')).toEqual([7]);
  });
});

describe('猜歌试听接口：Apple 响应解析', () => {
  it('只保留有试听地址的歌曲条目', () => {
    const items = mapLookupResults({
      resultCount: 3,
      results: [
        { wrapperType: 'track', trackId: 11, previewUrl: 'https://cdn/a.m4a', artworkUrl100: 'https://art/a.jpg' },
        { wrapperType: 'track', trackId: 12, previewUrl: '' },
        { wrapperType: 'collection', collectionId: 13, previewUrl: 'https://cdn/b.m4a' },
        { trackId: 'x', previewUrl: 'https://cdn/c.m4a' },
      ],
    });
    expect(items).toEqual([
      { id: 11, previewUrl: 'https://cdn/a.m4a', artworkUrl: 'https://art/a.jpg' },
    ]);
  });

  it('响应形状不对时返回空数组', () => {
    expect(mapLookupResults(null)).toEqual([]);
    expect(mapLookupResults({ results: 'nope' })).toEqual([]);
  });
});

describe('猜歌试听接口：批量换取', () => {
  const jsonResponse = (payload: unknown) =>
    ({ ok: true, json: async () => payload }) as unknown as Response;

  it('一次请求拿多条，并命中进程内缓存', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        results: [
          { trackId: 21, previewUrl: 'https://cdn/21.m4a' },
          { trackId: 22, previewUrl: 'https://cdn/22.m4a' },
        ],
      }),
    ) as unknown as typeof fetch;

    const first = await resolvePreviews([21, 22], fetchImpl);
    expect(first.map((item) => item.id).sort()).toEqual([21, 22]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    // 第二次同 id 全部走缓存，不再打 Apple
    const second = await resolvePreviews([21, 22], fetchImpl);
    expect(second).toHaveLength(2);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('Apple 异常时返回已缓存的部分，不抛错', async () => {
    const failing = vi.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;
    const items = await resolvePreviews([99_999_901], failing);
    expect(items).toEqual([]);
  });

  it('整批里混进无效 id 时，有效的照样能拿到试听（并记下负缓存）', async () => {
    /** Apple 的行为：id 列表里只要有一个查不到，整批就返回 400。 */
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const ids = (String(url).match(/id=([\d,]+)/)?.[1] ?? '').split(',').map(Number);
      if (ids.includes(777_001)) {
        return { ok: false, status: 400, json: async () => ({}) } as unknown as Response;
      }
      return {
        ok: true,
        json: async () => ({ results: ids.map((id) => ({ trackId: id, previewUrl: `https://cdn/${id}` })) }),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const items = await resolvePreviews([777_001, 777_002, 777_003], fetchImpl);
    expect(items.map((item) => item.id)).toEqual([777_002, 777_003]);

    // 再来一次同样的请求：有效的走缓存、无效的走负缓存，不该再打 Apple
    const calls = (fetchImpl as unknown as { mock: { calls: unknown[] } }).mock.calls.length;
    const again = await resolvePreviews([777_001, 777_002, 777_003], fetchImpl);
    expect(again.map((item) => item.id)).toEqual([777_002, 777_003]);
    expect((fetchImpl as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(calls);
  });

  it('上限与客户端最长一局（20 首）留有余量', () => {
    expect(PREVIEW_MAX_IDS).toBeGreaterThanOrEqual(20);
  });
});
