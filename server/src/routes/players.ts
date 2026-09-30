import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validateQuery } from '../middleware/common';
import { getPublicPlayerList, searchCachedPlayers } from '../services/playerCache';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();
const playerSearchQuery = z.object({
  search: z.string().trim().max(100).default(''),
  suggest: z.enum(['0', '1']).default('0').transform((value) => value === '1'),
});

router.get(
  '/list',
  asyncHandler(async (req, res) => {
    const list = await getPublicPlayerList();
    const etag = `\"seiyuus-${list.version}\"`;
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.setHeader('X-Seiyuu-List-Version', list.version);
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    res.json(list);
  })
);

/**
 * 查声优 / 自动补全。
 * - ?search=xxx 模糊搜索姓名/事务所/罗马音
 * - ?suggest=1 仅返回 id+name(猜测输入补全用,不泄露属性)
 */
router.get(
  '/',
  rateLimit({
    name: 'seiyuu-search',
    limit: 10,
    windowSeconds: 60,
    failClosed: true,
  }),
  validateQuery(playerSearchQuery),
  asyncHandler(async (req, res) => {
    const { search, suggest } = req.query as unknown as z.infer<typeof playerSearchQuery>;

    const seiyuus = searchCachedPlayers(search, suggest ? 10 : 100);

    if (suggest) {
      return res.json(seiyuus.map((s) => ({ id: s.id, name: s.name })));
    }
    res.json(
      seiyuus.map((s) => ({
        id: s.id,
        name: s.name,
        romaji: s.romaji,
        birthPlace: s.birth_place,
        birthDate: s.birth_date ?? null,
        agency: s.agency,
        debutYear: s.debut_year,
        voiceCount: s.voice_count ?? 0,
        bloodType: s.blood_type,
        groups: s.groups ?? [],
        representativeCharacters: (s.representative_characters ?? []).map((r: { work: string; character: string }) =>
          r.work ? `${r.character}《${r.work}》` : r.character,
        ),
        fiveGroups: s.five_groups ?? [],
        difficulties: s.difficulties ?? [],
      }))
    );
  })
);

export default router;
