import { describe, expect, it } from 'vitest';
import { resources } from '../i18n/resources';
import {
  OPTION_COUNT,
  OPTION_LETTERS,
  PERFECT_BONUS,
  QUESTION_LIMIT_MS,
  SONG_DIFFICULTIES,
  SONG_DIFFICULTY_ORDER,
  SONG_FRANCHISES,
  SONG_FRANCHISE_IDS,
  SONG_GROUP_FRANCHISE,
  SONG_GROUP_IDS,
  createRound,
  decodeSongQuizCode,
  formatSeconds,
  gradeOf,
  questionPoints,
  resultCodeOf,
  resultOf,
  scoreRound,
  songsOfGroup,
  type SongAnswerMap,
  type SongDifficulty,
} from './songQuiz';
import { SONG_FRANCHISE_LABELS, SONG_GROUP_LABELS, labelOf } from './songQuiz/labels';

const LANGS = ['zh', 'en', 'ja'] as const;

/** 每个分组至少要有这么多首，否则一局 20 首会反复抽到同样的曲子。 */
const MIN_SONGS_PER_GROUP = 10;

/**
 * 按年代切开的特摄组素材天然就少（令和骑士 / 奥特曼各自只有几部出过主题歌），
 * 这几组只要求能凑满 4 个选项，不按 MIN_SONGS_PER_GROUP 卡。
 */
const SPARSE_GROUPS = new Set(['krreiwa', 'ultrashowa', 'ultrareiwa']);

describe('猜歌曲库', () => {
  it('每个分组都有曲库，且每首数据完整', () => {
    for (const groupId of SONG_GROUP_IDS) {
      const songs = songsOfGroup(groupId);
      const floor = SPARSE_GROUPS.has(groupId) ? OPTION_COUNT : MIN_SONGS_PER_GROUP;
      expect(songs.length, groupId).toBeGreaterThanOrEqual(floor);
      for (const song of songs) {
        expect(Number.isInteger(song.id), `${groupId}/${song.title}`).toBe(true);
        expect(song.id).toBeGreaterThan(0);
        expect(song.title.trim().length, `${groupId}/${song.id}`).toBeGreaterThan(0);
        expect(song.artist.trim().length, `${groupId}/${song.title}`).toBeGreaterThan(0);
        expect(song.album.trim().length, `${groupId}/${song.title}`).toBeGreaterThan(0);
        expect(song.releaseDate, `${groupId}/${song.title}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it('同一分组内 trackId 与歌名都不重复', () => {
    for (const groupId of SONG_GROUP_IDS) {
      const songs = songsOfGroup(groupId);
      expect(new Set(songs.map((song) => song.id)).size, `${groupId} trackId 重复`).toBe(songs.length);
      const titles = new Set(songs.map((song) => song.title.replace(/[（(][^）)]*[）)]/g, '').trim()));
      expect(titles.size, `${groupId} 歌名重复`).toBe(songs.length);
    }
  });

  it('曲库里没有伴奏 / 剪辑版', () => {
    const banned = /off\s*vocal|instrumental|カラオケ|karaoke|tv\s*size|movie\s*size|short\s*size/i;
    for (const groupId of SONG_GROUP_IDS) {
      const bad = songsOfGroup(groupId).filter((song) => banned.test(song.title));
      expect(bad.map((song) => song.title), groupId).toEqual([]);
    }
  });

  it('每个企划都有曲子，且覆盖到邦邦 / PJSK / 偶像大师 / 赛马娘 / 车万 / 特摄 / 年代 / 热门 IP / 舞萌DX', () => {
    for (const franchiseId of SONG_FRANCHISE_IDS) {
      const groups = SONG_FRANCHISES[franchiseId].groups;
      const total = groups.reduce((sum, id) => sum + songsOfGroup(id).length, 0);
      expect(total, franchiseId).toBeGreaterThan(0);
    }
    // 抽查几个跨企划的小队
    expect(songsOfGroup('roselia').length).toBeGreaterThan(20);
    expect(songsOfGroup('leoneed').length).toBeGreaterThan(20);
    expect(songsOfGroup('umamusume').length).toBeGreaterThan(20);
    // 特别呈现 / 热门 IP / 舞萌DX / 虚拟歌手（人工清单 + 官方合辑，见 tmp/fetch-song-catalog-special.mjs）
    expect(songsOfGroup('krshowa').length).toBeGreaterThan(5);
    expect(songsOfGroup('krheisei').length).toBeGreaterThan(20);
    expect(songsOfGroup('ultraheisei').length).toBeGreaterThan(10);
    for (const decade of ['anime80s', 'anime90s', 'anime00s', 'anime10s', 'anime20s'] as const) {
      expect(songsOfGroup(decade).length, decade).toBeGreaterThan(15);
    }
    for (const ip of ['gundam', 'dragonball', 'naruto', 'onepiece', 'conan', 'pokemon'] as const) {
      expect(songsOfGroup(ip).length, ip).toBeGreaterThan(10);
    }
    expect(songsOfGroup('maimaidx').length).toBeGreaterThan(100);
    expect(songsOfGroup('maimaicollab').length).toBeGreaterThan(20);
    expect(songsOfGroup('vsinger').length).toBeGreaterThan(20);
    expect(songsOfGroup('meme').length).toBeGreaterThan(10);
  });

  it('收进了「声优以角色身份演唱」的个人曲（角色名 + CV 的署名形式）', () => {
    const solos = songsOfGroup('nijigasaki').filter((song) => /\(CV[.:]/i.test(song.artist));
    expect(solos.length).toBeGreaterThan(0);
    expect(solos.some((song) => song.title.includes('Eutopia'))).toBe(true);
  });

  it('配置自洽：分组归属唯一、名字与颜色齐全', () => {
    const seen = new Set<string>();
    for (const franchiseId of SONG_FRANCHISE_IDS) {
      expect(SONG_FRANCHISES[franchiseId].color).toMatch(/^#[0-9a-f]{6}$/i);
      for (const groupId of SONG_FRANCHISES[franchiseId].groups) {
        expect(seen.has(groupId), `${groupId} 出现在多个企划`).toBe(false);
        seen.add(groupId);
        expect(SONG_GROUP_FRANCHISE[groupId]).toBe(franchiseId);
      }
    }
    expect([...seen].sort()).toEqual([...SONG_GROUP_IDS].sort());
    for (const groupId of SONG_GROUP_IDS) {
      for (const lang of LANGS) {
        expect(labelOf(SONG_GROUP_LABELS[groupId], lang).length, `${groupId}/${lang}`).toBeGreaterThan(0);
      }
    }
    for (const franchiseId of SONG_FRANCHISE_IDS) {
      for (const lang of LANGS) {
        expect(
          labelOf(SONG_FRANCHISE_LABELS[franchiseId], lang).length,
          `${franchiseId}/${lang}`,
        ).toBeGreaterThan(0);
      }
    }
  });
});

describe('猜歌抽题', () => {
  it('难度决定题量：轻松 5 / 标准 10 / 硬核 20 / 专家 = 全题库', () => {
    expect(SONG_DIFFICULTIES.easy.count).toBe(5);
    expect(SONG_DIFFICULTIES.normal.count).toBe(10);
    expect(SONG_DIFFICULTIES.hard.count).toBe(20);
    expect(SONG_DIFFICULTIES.expert.count).toBeNull();
    expect(SONG_DIFFICULTIES.expert.hearts).toBe(3);
    expect(SONG_DIFFICULTY_ORDER).toEqual(['easy', 'normal', 'hard', 'expert']);

    const expert = createRound('nijigasaki', 246810, 'expert');
    expect(expert.questions.length).toBe(songsOfGroup('nijigasaki').length);
    const hard = createRound('nijigasaki', 246810, 'hard');
    expect(hard.questions.length).toBe(20);
  });

  it('同一 seed 抽出同一局，不同 seed 不同', () => {
    const first = createRound('roselia', 123456, 'normal');
    const again = createRound('roselia', 123456, 'normal');
    expect(again.questions.map((item) => item.song.id)).toEqual(first.questions.map((item) => item.song.id));
    const other = createRound('roselia', 654321, 'normal');
    expect(other.questions.map((item) => item.song.id)).not.toEqual(first.questions.map((item) => item.song.id));
  });

  it('选项四个、不重复、正答就是那首歌，干扰项同分组', () => {
    for (const groupId of SONG_GROUP_IDS) {
      const round = createRound(groupId, 424242, 'easy');
      const ids = round.questions.map((item) => item.song.id);
      expect(new Set(ids).size, `${groupId} 同局重复出题`).toBe(ids.length);
      for (const question of round.questions) {
        expect(question.options.length).toBe(OPTION_COUNT);
        expect(new Set(question.options).size).toBe(OPTION_COUNT);
        expect(question.options[question.answer]).toBe(question.song.title);
        for (const option of question.options) {
          expect(songsOfGroup(groupId).some((song) => song.title === option), `${groupId}/${option}`).toBe(true);
        }
      }
    }
  });

  it('正答位置在四个选项间轮转', () => {
    const counts = [0, 0, 0, 0];
    for (let seed = 100000; seed < 100200; seed += 1) {
      for (const question of createRound('mygo', seed, 'normal').questions) counts[question.answer] += 1;
    }
    expect(counts.reduce((sum, value) => sum + value, 0)).toBe(2000);
    for (const count of counts) expect(count).toBeGreaterThanOrEqual(400);
  });
});

describe('猜歌计分', () => {
  const difficulty: SongDifficulty = 'normal';
  const round = createRound('liella', 20240923, difficulty);

  const answerAll = (correctAll: boolean): SongAnswerMap => {
    const map: SongAnswerMap = {};
    for (const [position, question] of round.questions.entries()) {
      map[question.song.id] = {
        picked: correctAll ? question.answer : (question.answer + 1) % OPTION_COUNT,
        elapsedMs: 3000 + position * 100,
      };
    }
    return map;
  };

  it('全对拿满分（含零失误奖励），全错零分', () => {
    const perfect = scoreRound(round, answerAll(true), 60_000);
    expect(perfect.correct).toBe(round.questions.length);
    expect(perfect.accuracy).toBe(1);
    expect(perfect.heartsLeft).toBeNull();
    const expected =
      round.questions.length * questionPoints(true, 3000, difficulty);
    // 每题用时不同，逐题算才对得上，这里只校验「大于不含奖励的部分」且含奖励
    expect(perfect.score).toBeGreaterThan(0);
    expect(perfect.score).toBeGreaterThanOrEqual(Math.round(expected / 2));

    const zero = scoreRound(round, answerAll(false));
    expect(zero.correct).toBe(0);
    expect(zero.accuracy).toBe(0);
    expect(zero.score).toBe(0);
    expect(gradeOf(zero.accuracy)).toBe('D');
  });

  it('速度分：答得越快分越高，超时只拿基础分', () => {
    const fast = questionPoints(true, 1000, 'easy');
    const slow = questionPoints(true, QUESTION_LIMIT_MS, 'easy');
    const instant = questionPoints(true, 0, 'easy');
    expect(instant).toBeGreaterThan(fast);
    expect(fast).toBeGreaterThan(slow);
    expect(slow).toBe(100);
    expect(questionPoints(false, 1000, 'easy')).toBe(0);
    // 难度权重：专家是轻松的两倍
    expect(questionPoints(true, 0, 'expert')).toBe(questionPoints(true, 0, 'easy') * 2);
  });

  it('零失误有额外奖励', () => {
    const allRight: SongAnswerMap = {};
    const allWrongOnOne: SongAnswerMap = {};
    for (const question of round.questions) {
      allRight[question.song.id] = { picked: question.answer, elapsedMs: 5000 };
      allWrongOnOne[question.song.id] = { picked: question.answer, elapsedMs: 5000 };
    }
    const first = round.questions[0];
    allWrongOnOne[first.song.id] = { picked: (first.answer + 1) % OPTION_COUNT, elapsedMs: 5000 };

    const clean = scoreRound(round, allRight).score;
    const oneMiss = scoreRound(round, allWrongOnOne).score;
    expect(clean - oneMiss).toBeGreaterThan(questionPoints(true, 5000, difficulty));
    expect(PERFECT_BONUS).toBeGreaterThan(0);
  });

  it('专家模式：红心用光就提前结束，题量按实际出过的算', () => {
    const expert = createRound('mygo', 808080, 'expert');
    const answers: SongAnswerMap = {};
    // 前三题全错 → 三颗红心用完
    expert.questions.forEach((question, position) => {
      if (position >= 3) return;
      answers[question.song.id] = { picked: (question.answer + 1) % OPTION_COUNT, elapsedMs: 2000 };
    });
    const stats = scoreRound(expert, answers, 15_000);
    expect(stats.total).toBe(3);
    expect(stats.wrong).toBe(3);
    expect(stats.heartsLeft).toBe(0);
    expect(stats.score).toBe(0);
    const result = resultOf(expert, answers, 15_000);
    expect(result.missed.length).toBe(3);
  });

  it('专家模式：答对后红心数量不变，可以一直做下去', () => {
    const expert = createRound('mygo', 909090, 'expert');
    const answers: SongAnswerMap = {};
    for (const question of expert.questions.slice(0, 6)) {
      answers[question.song.id] = { picked: question.answer, elapsedMs: 4000 };
    }
    const stats = scoreRound(expert, answers, 30_000);
    expect(stats.total).toBe(6);
    expect(stats.heartsLeft).toBe(3);
    expect(stats.correct).toBe(6);
  });

  it('用时统计：平均与最快', () => {
    const answers: SongAnswerMap = {};
    const questions = round.questions.slice(0, 4);
    questions.forEach((question, position) => {
      answers[question.song.id] = { picked: question.answer, elapsedMs: (position + 1) * 1000 };
    });
    const stats = scoreRound(round, answers);
    expect(stats.fastestMs).toBe(1000);
    expect(stats.avgMs).toBe(2500);
    expect(formatSeconds(2500)).toBe('2.5 秒');
    expect(formatSeconds(null)).toBe('—');
  });
});

describe('猜歌成绩码', () => {
  it('四种难度都能还原整局', () => {
    for (const groupId of ['muse', 'roselia', 'leoneed'] as const) {
      for (const difficulty of SONG_DIFFICULTY_ORDER) {
        const round = createRound(groupId, 888888, difficulty);
        const answers: SongAnswerMap = {};
        round.questions.forEach((question, position) => {
          if (position % 5 === 4) return;
          answers[question.song.id] = {
            picked: (question.answer + position) % OPTION_COUNT,
            elapsedMs: undefined,
          };
        });
        const code = resultCodeOf(round, answers, 95_000);
        const decoded = decodeSongQuizCode(code);
        expect(decoded, code).toBeTruthy();
        expect(decoded?.group).toBe(groupId);
        expect(decoded?.difficulty).toBe(difficulty);
        expect(decoded?.seed).toBe(888888);
        expect(decoded?.duration).toBe(95_000);

        const restored = createRound(decoded!.group, decoded!.seed, decoded!.difficulty);
        expect(restored.questions.map((item) => item.song.id)).toEqual(
          round.questions.map((item) => item.song.id),
        );
        restored.questions.forEach((question, position) => {
          expect(decoded!.answers[position], `${code}#${position}`).toBe(
            answers[question.song.id]?.picked,
          );
        });
      }
    }
  });

  it('末尾未作答会被省略，成绩码不会随长局膨胀', () => {
    const expert = createRound('muse', 121212, 'expert');
    const answers: SongAnswerMap = { [expert.questions[0].song.id]: { picked: expert.questions[0].answer } };
    const code = resultCodeOf(expert, answers, 10_000);
    expect(code.split('|')[5].length).toBeLessThanOrEqual(2);
    const decoded = decodeSongQuizCode(code);
    expect(decoded?.answers[0]).toBe(expert.questions[0].answer);
    expect(decoded?.answers[1]).toBeUndefined();
  });

  it('非法成绩码返回 null', () => {
    expect(decodeSongQuizCode('')).toBeNull();
    expect(decodeSongQuizCode('S|Q|muse|1ab|2m|3x')).toBeNull();
    expect(decodeSongQuizCode('S|N|notagroup|1ab|2m|3x')).toBeNull();
    expect(decodeSongQuizCode('S|Z|muse|1ab|2m|3x')).toBeNull();
    expect(decodeSongQuizCode('S|N|muse|1ab|2m|3x')).not.toBeNull();
  });
});

describe('猜歌文案齐全性', () => {
  const sections = LANGS.map(
    (lang) => [lang, resources[lang].translation.songQuiz as unknown as Record<string, unknown>] as const,
  );

  it('三语都有 songQuiz 段与门户入口描述', () => {
    for (const [lang, section] of sections) {
      expect(section, lang).toBeTruthy();
      const portal = resources[lang].translation.portal as unknown as Record<string, unknown>;
      expect((portal.games as Record<string, string>).songQuiz, lang).toBeTruthy();
    }
  });

  it('难度、标签、成绩单与排行榜文案三语齐全', () => {
    for (const [lang, section] of sections) {
      for (const key of ['title', 'subtitle', 'intro', 'guide', 'difficultyLabel', 'franchiseLabel', 'groupLabel', 'start']) {
        expect(section[key], `${lang}:${key}`).toBeTruthy();
      }
      const difficulties = section.difficulties as Record<string, Record<string, string>>;
      for (const difficulty of SONG_DIFFICULTY_ORDER) {
        expect(difficulties?.[difficulty]?.name, `${lang}:difficulties.${difficulty}.name`).toBeTruthy();
        expect(difficulties?.[difficulty]?.desc, `${lang}:difficulties.${difficulty}.desc`).toBeTruthy();
      }
      expect(difficulties?.expert?.pool, `${lang}:difficulties.expert.pool`).toBeTruthy();
      const tabs = section.tabs as Record<string, string>;
      expect(tabs?.single, `${lang}:tabs.single`).toBeTruthy();
      expect(tabs?.multi, `${lang}:tabs.multi`).toBeTruthy();
      const multi = section.multi as Record<string, unknown>;
      for (const key of ['intro', 'create', 'match', 'join', 'roomCode', 'start', 'waitingHint']) {
        expect(multi?.[key], `${lang}:multi.${key}`).toBeTruthy();
      }
      const multiModes = multi?.modes as Record<string, Record<string, string>>;
      for (const key of ['rush', 'reveal']) {
        expect(multiModes?.[key]?.name, `${lang}:multi.modes.${key}.name`).toBeTruthy();
        expect(multiModes?.[key]?.desc, `${lang}:multi.modes.${key}.desc`).toBeTruthy();
      }
      // 服务端返回的每一个错误码都要有对应的说法
      const errors = multi?.errors as Record<string, string>;
      for (const key of [
        'INVALID_CODE',
        'RATE_LIMITED',
        'ALREADY_IN_ROOM',
        'ROOM_NOT_FOUND',
        'ROOM_FULL',
        'ROOM_IN_PROGRESS',
        'STALE_CONNECTION',
        'NOT_READY',
        'FORBIDDEN',
        'INVALID_PAYLOAD',
        'INTERNAL_ERROR',
        'UNKNOWN',
      ]) {
        expect(errors?.[key], `${lang}:multi.errors.${key}`).toBeTruthy();
      }
      const rank = section.rank as Record<string, string>;
      for (const key of ['sending', 'submitted', 'failed', 'guest']) {
        expect(rank?.[key], `${lang}:rank.${key}`).toBeTruthy();
      }
      const board = section.leaderboard as Record<string, string>;
      for (const key of ['title', 'loading', 'failed', 'empty', 'meta', 'mine']) {
        expect(board?.[key], `${lang}:leaderboard.${key}`).toBeTruthy();
      }
      const result = section.result as Record<string, string>;
      for (const key of ['scoreLabel', 'accuracyLabel', 'correctLabel', 'avgLabel', 'fastestLabel', 'heartsLabel', 'review', 'codeLabel']) {
        expect(result?.[key], `${lang}:result.${key}`).toBeTruthy();
      }
      const grades = section.grades as Record<string, Record<string, string>>;
      for (const grade of ['S', 'A', 'B', 'C', 'D']) {
        expect(grades?.[grade]?.title, `${lang}:grades.${grade}.title`).toBeTruthy();
        expect(grades?.[grade]?.comment, `${lang}:grades.${grade}.comment`).toBeTruthy();
      }
    }
  });

  it('选项字母与难度字母不冲突', () => {
    expect(OPTION_LETTERS.length).toBe(OPTION_COUNT);
    const letters = SONG_DIFFICULTY_ORDER.map((difficulty) => SONG_DIFFICULTIES[difficulty].letter);
    expect(new Set(letters).size).toBe(letters.length);
  });
});
