import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { renderAtRoute } from '../test/render';
import { setAutoAdvance } from '../store/quizFlow';
import { QUIZ_MODES, SCALE, createQuiz, resultCodeOf, type WhoQuestion } from '../config/whoYouAre';
import WhoYouAre from './WhoYouAre';

const TOTAL = QUIZ_MODES.fast.questions;

// 偏好是模块级状态，跑完一例恢复默认，避免影响后面的用例
afterEach(() => setAutoAdvance(true));

/** 选中一题后会停留一小段时间再翻页，等进度文案刷新即可。 */
async function waitForQuestion(step: number) {
  await screen.findByText(`第 ${step} / ${TOTAL} 题`, {}, { timeout: 8000 });
}

async function startQuiz(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '开始测试' }));
  await waitForQuestion(1);
}

/** 造一枚成绩码（缺省全答「同意」）。 */
function codeFor(seed: number, answers: Record<string, number>, duration: number) {
  const quiz = createQuiz(seed, 'fast');
  const filled: Record<string, number> = {};
  quiz.questions.forEach((question: WhoQuestion) => {
    filled[question.id] = answers[question.id] ?? 2;
  });
  return resultCodeOf(quiz, filled, duration);
}

describe('WhoYouAre', () => {
  it('开始后进入第一题，显示题组编号与进度', async () => {
    const user = userEvent.setup();
    renderAtRoute(<WhoYouAre />);

    await startQuiz(user);
    expect(screen.getByText(/已答 0 题/)).toBeInTheDocument();
    expect(screen.getByText(/本局题组 #\d+/)).toBeInTheDocument();
  });

  it(`可以切换到 PRO 模式（${QUIZ_MODES.pro.questions} 题）`, async () => {
    const user = userEvent.setup();
    renderAtRoute(<WhoYouAre />);

    await user.click(screen.getByRole('button', { name: /PRO 模式/ }));
    await user.click(screen.getByRole('button', { name: '开始测试' }));
    await screen.findByText(`第 1 / ${QUIZ_MODES.pro.questions} 题`);
  });

  it('输入非法成绩码会提示无法识别', async () => {
    const user = userEvent.setup();
    renderAtRoute(<WhoYouAre />);

    await user.type(screen.getByLabelText('查询成绩'), 'not-a-code');
    await user.click(screen.getByRole('button', { name: '查询' }));
    expect(await screen.findByText(/成绩码无法识别/)).toBeInTheDocument();
  });

  it('输入成绩码可以还原那一局的结果与排行榜', async () => {
    const user = userEvent.setup();
    renderAtRoute(<WhoYouAre />);

    await user.type(screen.getByLabelText('查询成绩'), codeFor(13579, {}, 30_000));
    await user.click(screen.getByRole('button', { name: '查询' }));

    expect(await screen.findByText(/还原/)).toBeInTheDocument();
    expect(screen.getByText('最像你的声优')).toBeInTheDocument();
    expect(screen.getByText('相似度排行榜')).toBeInTheDocument();
    expect(screen.getByText('最不像你的声优')).toBeInTheDocument();
    // 排行榜给 7 位，前三名带奖牌样式
    expect(document.querySelectorAll('.wy-rank')).toHaveLength(7);
    expect(document.querySelectorAll('.wy-rank.is-rank-1')).toHaveLength(1);
    expect(document.querySelectorAll('.wy-rank.is-rank-2')).toHaveLength(1);
    expect(document.querySelectorAll('.wy-rank.is-rank-3')).toHaveLength(1);
    expect(document.querySelectorAll('.wy-rank.is-podium')).toHaveLength(3);
  });

  it(
    '答完最后一题会进入结果页，并给出成绩码',
    async () => {
      const user = userEvent.setup();
      renderAtRoute(<WhoYouAre />);

      await startQuiz(user);
      for (let step = 1; step <= TOTAL; step += 1) {
        // 「同意」是第二个选项，固定选它即可推到最后一题
        await user.click(screen.getAllByRole('button', { name: /^(强烈同意|同意|中立|不同意|强烈反对)$/ })[1]);
        if (step < TOTAL) {
          await waitForQuestion(step + 1);
        }
      }

      // 最后一题**不自动交卷**：停在原题，必须由玩家点「查看结果」
      expect(screen.getByText(`第 ${TOTAL} / ${TOTAL} 题`)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: '查看结果' }));

      expect(await screen.findByText('测试结果', {}, { timeout: 8000 })).toBeInTheDocument();
      expect(screen.getByText('你的六维坐标')).toBeInTheDocument();
      expect(screen.getByText(/WF\d{5}-/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '分享到 QQ' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '复制结果' })).toBeInTheDocument();
    },
    // 20 题每题都有 170ms 的翻页延迟，全量并行跑时容易撞到默认 5s 上限
    30_000,
  );

  it('翻到下一题时不会残留上一题的选中态', async () => {
    const user = userEvent.setup();
    renderAtRoute(<WhoYouAre />);

    await startQuiz(user);
    const options = screen.getAllByRole('button', { name: /^(强烈同意|同意|中立|不同意|强烈反对)$/ });
    // 选「强烈同意」（第一项），它带 is-selected
    await user.click(options[0]);
    await screen.findByText(`第 2 / ${TOTAL} 题`);

    expect(screen.queryByRole('button', { name: '强烈同意' })).not.toHaveClass('is-selected');
    expect(screen.queryByRole('button', { name: '同意' })).not.toHaveClass('is-selected');
  });

  it('五个档位都能点，且第一题的选择会被记录', async () => {
    const user = userEvent.setup();
    renderAtRoute(<WhoYouAre />);

    await startQuiz(user);
    expect(SCALE.length).toBe(5);
    const options = screen.getAllByRole('button', { name: /^(强烈同意|同意|中立|不同意|强烈反对)$/ });
    expect(options.length).toBe(5);

    await user.click(options[2]);
    await screen.findByText(`第 2 / ${TOTAL} 题`);
    expect(screen.getByText(/已答 1 题/)).toBeInTheDocument();
  });

  it('关掉自动换题后停在原题，靠自己点下一题 / 查看结果', async () => {
    setAutoAdvance(false);
    const user = userEvent.setup();
    renderAtRoute(<WhoYouAre />);

    await startQuiz(user);
    const options = screen.getAllByRole('button', { name: /^(强烈同意|同意|中立|不同意|强烈反对)$/ });
    await user.click(options[1]);

    // 不会自己翻页
    expect(screen.getByText(`第 1 / ${TOTAL} 题`)).toBeInTheDocument();
    expect(screen.getByText(/已答 1 题/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '下一题' }));
    expect(await screen.findByText(`第 2 / ${TOTAL} 题`)).toBeInTheDocument();
  });

  it('关掉自动换题时，最后一题答完给「查看结果」出口', async () => {
    setAutoAdvance(false);
    const user = userEvent.setup();
    renderAtRoute(<WhoYouAre />);

    await startQuiz(user);
    for (let step = 1; step <= TOTAL; step += 1) {
      await user.click(screen.getAllByRole('button', { name: /^(强烈同意|同意|中立|不同意|强烈反对)$/ })[1]);
      if (step < TOTAL) {
        await user.click(screen.getByRole('button', { name: '下一题' }));
        await waitForQuestion(step + 1);
      }
    }

    await user.click(screen.getByRole('button', { name: '查看结果' }));
    expect(await screen.findByText('测试结果', {}, { timeout: 8000 })).toBeInTheDocument();
  }, 30_000);
});
