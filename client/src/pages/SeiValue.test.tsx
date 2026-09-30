import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { renderAtRoute } from '../test/render';
import { setAutoAdvance } from '../store/quizFlow';
import { QUIZ_MODES, createQuiz, resultCodeOf, type QuizQuestion } from '../config/seivalue';
import SeiValue from './SeiValue';

const TOTAL = QUIZ_MODES.fast.questions;

// 偏好是模块级状态，跑完一例恢复默认，避免影响后面的用例
afterEach(() => setAutoAdvance(true));

/** 选中一题后会停留一小段时间再翻页，这里等提示文案出现即可。 */
async function waitForQuestion(step: number) {
  await screen.findByText(`第 ${step} / ${TOTAL} 题`);
}

async function startQuiz(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '开始测试' }));
  await waitForQuestion(1);
}

/** 造一枚成绩码。 */
function codeFor(seed: number, answers: Record<string, number>, duration: number) {
  const quiz = createQuiz(seed, 'fast');
  const filled: Record<string, number> = {};
  quiz.questions.forEach((question: QuizQuestion) => {
    filled[question.id] = answers[question.id] ?? 2;
  });
  return resultCodeOf(quiz, filled, duration);
}

describe('SeiValue', () => {
  it('开始后进入第一题，并显示本局题组编号', async () => {
    const user = userEvent.setup();
    renderAtRoute(<SeiValue />);

    await startQuiz(user);
    expect(screen.getByText(/已答 0 题/)).toBeInTheDocument();
    expect(screen.getByText(/本局题组 #\d+/)).toBeInTheDocument();
  });

  it('可以切换到 PRO 模式', async () => {
    const user = userEvent.setup();
    renderAtRoute(<SeiValue />);

    await user.click(screen.getByRole('button', { name: /PRO 模式/ }));
    await user.click(screen.getByRole('button', { name: '开始测试' }));
    await screen.findByText(`第 1 / ${QUIZ_MODES.pro.questions} 题`);
  });

  it('输入非法成绩码会提示无法识别', async () => {
    const user = userEvent.setup();
    renderAtRoute(<SeiValue />);

    await user.type(screen.getByLabelText('查询成绩'), 'not-a-code');
    await user.click(screen.getByRole('button', { name: '查询' }));
    expect(await screen.findByText(/成绩码无法识别/)).toBeInTheDocument();
  });

  it('输入成绩码可以还原那一局的结果', async () => {
    const user = userEvent.setup();
    renderAtRoute(<SeiValue />);

    await user.type(screen.getByLabelText('查询成绩'), codeFor(13579, {}, 30_000));
    await user.click(screen.getByRole('button', { name: '查询' }));

    expect(await screen.findByText(/稀有度 · 传说/)).toBeInTheDocument();
    expect(screen.getByText(/这份成绩码|还原/)).toBeInTheDocument();
  });

  it('翻到下一题时不会残留上一题的选中态', async () => {
    const user = userEvent.setup();
    renderAtRoute(<SeiValue />);

    await startQuiz(user);

    await user.click(screen.getByRole('button', { name: '强烈同意' }));
    await waitForQuestion(2);

    // 上一题选的"强烈同意"不能在第二题继续高亮
    const options = screen.getAllByRole('button', { name: /^(强烈同意|同意|中立|不同意|强烈反对)$/ });
    options.slice(0, 5).forEach((option) => {
      expect(option.className).not.toContain('is-selected');
      expect(option).toHaveAttribute('aria-pressed', 'false');
    });
    expect(screen.getByText(/已答 1 题/)).toBeInTheDocument();
  });

  it('可以跳过不想答的题', async () => {
    const user = userEvent.setup();
    renderAtRoute(<SeiValue />);

    await startQuiz(user);
    await user.click(screen.getByRole('button', { name: '跳过这题' }));
    await waitForQuestion(2);
    expect(screen.getByText(/已答 0 题/)).toBeInTheDocument();

    // 回到上一题可以看到它仍然是未作答状态
    await user.click(screen.getByRole('button', { name: '上一题' }));
    await waitForQuestion(1);
  });

  it(
    '答完全部题目后给出流派名称、稀有度与推荐声优',
    async () => {
      const user = userEvent.setup();
      renderAtRoute(<SeiValue />);

      await startQuiz(user);

      for (let step = 1; step < TOTAL; step += 1) {
        await user.click(screen.getByRole('button', { name: '强烈同意' }));
        await waitForQuestion(step + 1);
      }
      await user.click(screen.getByRole('button', { name: '强烈同意' }));
      // 最后一题**不自动交卷**：停在原题，必须由玩家点「查看结果」
      expect(screen.getByText(`第 ${TOTAL} / ${TOTAL} 题`)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: '查看结果' }));

      await waitFor(() => {
        expect(screen.getByText('测试结果')).toBeInTheDocument();
      });
      // 全选强烈同意会命中传说彩蛋
      expect(screen.getByText(/稀有度 · 传说/)).toBeInTheDocument();
      expect(document.querySelector('.sv-result')).toHaveAttribute('data-rarity', 'legendary');
      expect(screen.getByText('你可能喜欢的声优')).toBeInTheDocument();
      expect(screen.getByText(/本次答题统计/)).toBeInTheDocument();
      // 成绩码与成绩单入口
      expect(document.querySelector('.sv-code-row code')?.textContent).toMatch(/^F\d{5}-/);

      await user.click(screen.getByRole('button', { name: '重新测试' }));
      await waitForQuestion(1);
    },
    30_000,
  );

  it('关掉自动换题后停在原题，靠自己点下一题 / 查看结果', async () => {
    setAutoAdvance(false);
    const user = userEvent.setup();
    renderAtRoute(<SeiValue />);

    await startQuiz(user);
    await user.click(screen.getByRole('button', { name: '强烈同意' }));

    // 不会自己翻页
    await waitForQuestion(1);
    expect(screen.getByText(/已答 1 题/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '下一题' }));
    await waitForQuestion(2);
    expect(screen.getByText(/已答 1 题/)).toBeInTheDocument();
  });

  it('关掉自动换题时，最后一题答完给「查看结果」出口', async () => {
    setAutoAdvance(false);
    const user = userEvent.setup();
    renderAtRoute(<SeiValue />);

    await startQuiz(user);
    for (let step = 1; step < TOTAL; step += 1) {
      await user.click(screen.getByRole('button', { name: '强烈同意' }));
      await user.click(screen.getByRole('button', { name: '下一题' }));
      await waitForQuestion(step + 1);
    }

    await user.click(screen.getByRole('button', { name: '强烈同意' }));
    await user.click(screen.getByRole('button', { name: '查看结果' }));
    await waitFor(() => {
      expect(screen.getByText('测试结果')).toBeInTheDocument();
    });
  }, 30_000);
});
