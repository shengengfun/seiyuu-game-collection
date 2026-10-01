import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderAtRoute } from '../test/render';
import { QUIZ_ENTRIES, QUIZ_MODES, createRound, resultCodeOf } from './model/seiyuuQuiz/index';
import SeiyuuQuiz from './SeiyuuQuiz';

const FAST = QUIZ_MODES.fast.pick ?? 0;
const ENTRY = QUIZ_ENTRIES[0];
const BANK_LABEL = `${ENTRY.identity.name}`;

/** 选中一题后会停留一小段时间再翻页（exam 模式不公布对错）。 */
async function waitForQuestion(step: number, total: number) {
  await screen.findByText(`第 ${step} / ${total} 题`, {}, { timeout: 8000 });
}

/** 张张卡片都写「开始答题」，所以取第一张的按钮。 */
function startButton() {
  return screen.getAllByRole('button', { name: /开始答题/ })[0];
}

async function startQuiz(user: ReturnType<typeof userEvent.setup>, mode = '快速') {
  await user.click(screen.getByRole('button', { name: new RegExp(`^${mode}`) }));
  await user.click(startButton());
}

/** 从题库直接取一局的正确答案（用于造成绩码）。 */
function codeFor(seed: number, duration: number, wrongAll = false) {
  const round = createRound(ENTRY.bank, seed, 'fast');
  const answers: Record<string, number> = {};
  round.questions.forEach((question) => {
    answers[question.id] = wrongAll ? (question.answer + 1) % question.options.length : question.answer;
  });
  return resultCodeOf(round, answers, duration);
}

describe('SeiyuuQuiz', () => {
  it('列出可考的声优，并能按关键词搜索', async () => {
    const user = userEvent.setup();
    renderAtRoute(<SeiyuuQuiz />);

    expect(startButton()).toBeInTheDocument();
    // 搜一个肯定不存在的关键词，应该给出空态提示
    await user.type(screen.getByLabelText('搜索声优'), '不存在的声优名字');
    expect(await screen.findByText(/没有匹配的声优/)).toBeInTheDocument();

    // 换成第一位声优的名字，卡片应该出现
    await user.clear(screen.getByLabelText('搜索声优'));
    await user.type(screen.getByLabelText('搜索声优'), ENTRY.identity.name);
    expect(await screen.findByText(BANK_LABEL)).toBeInTheDocument();
  });

  it('开始答题后进入第一题，不公布对错', async () => {
    const user = userEvent.setup();
    renderAtRoute(<SeiyuuQuiz />);

    await startQuiz(user);
    await waitForQuestion(1, FAST);
    expect(screen.getByText(/已答 0 题/)).toBeInTheDocument();
    // 答题过程中不应出现解析文案
    expect(screen.queryByText('错题回顾')).not.toBeInTheDocument();
  });

  it('选完一题会自动翻到下一题，并能退回上一题', async () => {
    const user = userEvent.setup();
    renderAtRoute(<SeiyuuQuiz />);

    await startQuiz(user);
    await waitForQuestion(1, FAST);
    const options = screen.getAllByRole('button', { pressed: false }).filter((button) =>
      /^(A|B|C|D)/.test(button.textContent?.trim() ?? ''),
    );
    await user.click(options[0]);
    await waitForQuestion(2, FAST);

    await user.click(screen.getByRole('button', { name: /上一题/ }));
    await waitForQuestion(1, FAST);
  });

  it('交卷后给出分数、等级与错题解析', async () => {
    const user = userEvent.setup();
    renderAtRoute(<SeiyuuQuiz />);

    await startQuiz(user, '真爱');
    const total = Math.min(QUIZ_MODES.love.pick ?? 0, ENTRY.bank.questions.length);
    await waitForQuestion(1, total);

    // 每题都选第一个选项（题库里正答位置已轮转，必然会有错题）
    for (let step = 1; step <= total; step += 1) {
      const first = screen
        .getAllByRole('button')
        .find((button) => /^A/.test(button.textContent?.trim() ?? ''));
      if (!first) break;
      await user.click(first);
      if (step < total) await waitForQuestion(step + 1, total);
    }

    await user.click(screen.getByRole('button', { name: /交卷/ }));
    const result = await screen.findByText('各难度表现');
    expect(result).toBeInTheDocument();
    expect(screen.getByText('错题回顾')).toBeInTheDocument();
    // 全选第一项必然有错题，回顾里会给出正确答案与解析
    expect(screen.getAllByText(/正确答案：/).length).toBeGreaterThan(0);
    // 逐题真实点击（每题目 170ms 翻页延迟），全量并行跑时容易顶到默认 5s
  }, 20000);

  it('输入成绩码可以还原那一局的成绩单', async () => {
    const user = userEvent.setup();
    renderAtRoute(<SeiyuuQuiz />);

    await user.type(screen.getByLabelText('查询成绩'), codeFor(24680, 45_000));
    await user.click(screen.getByRole('button', { name: '查询' }));

    const heading = await screen.findByText('各难度表现');
    expect(heading).toBeInTheDocument();
    expect(screen.getByText('全对！这套题库被你彻底拿下了。')).toBeInTheDocument();
    expect(screen.getByText('没有错题，全部答对。')).toBeInTheDocument();
  }, 20000);

  it('输入非法成绩码会提示无效', async () => {
    const user = userEvent.setup();
    renderAtRoute(<SeiyuuQuiz />);

    await user.type(screen.getByLabelText('查询成绩'), 'Q|F|not-a-bank|1|1|1');
    await user.click(screen.getByRole('button', { name: '查询' }));
    expect(await screen.findByText(/成绩码无效/)).toBeInTheDocument();
  });

  it('全错时给出 D 等级与错题列表', async () => {
    const user = userEvent.setup();
    renderAtRoute(<SeiyuuQuiz />);

    await user.type(screen.getByLabelText('查询成绩'), codeFor(11111, 20_000, true));
    await user.click(screen.getByRole('button', { name: '查询' }));

    const sheet = await screen.findByText('各难度表现');
    expect(sheet).toBeInTheDocument();
    const missed = screen.getAllByText(/正确答案：/);
    expect(missed.length).toBeGreaterThan(0);
    expect(screen.getByText('完全的陌生人')).toBeInTheDocument();
  });
});
