import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Crown,
  DoorOpen,
  Globe,
  LogIn,
  Play,
  Pause,
  RotateCcw,
  Swords,
  Timer,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getSocket } from '../api/socket';
import { api } from '../api/client';
import {
  OPTION_LETTERS,
  SONG_FRANCHISES,
  SONG_FRANCHISE_IDS,
  SONG_GROUP_FRANCHISE,
  createRound,
  formatSeconds,
  songsOfGroup,
  type SongDifficulty,
  type SongFranchiseId,
  type SongGroupId,
  type SongQuizQuestion,
} from '../config/songQuiz';
import {
  SQ_MULTI_MIN_PLAYERS,
  SQ_MULTI_ROOM_ID_LENGTH,
  SQ_MULTI_ROOM_ID_PATTERN,
  SQ_MULTI_ROUND_OPTIONS,
  clockOffset,
  previewSecondsFor,
  sortPlayers,
  type SqMultiMode,
  type SqMultiRoomView,
} from '../config/songQuizMulti';
import { SONG_FRANCHISE_LABELS, SONG_GROUP_LABELS, labelOf } from '../config/songQuiz/labels';
import { copyText } from '../utils/clipboard';

interface Preview {
  id: number;
  previewUrl: string;
  audioUrl?: string;
  artworkUrl: string;
}

/** 优先走本站转发（Apple 的 MIME 在部分浏览器会被拒）。 */
function sourceOf(preview?: Preview): string {
  return preview?.audioUrl || preview?.previewUrl || '';
}

type Ack = { code?: string; room?: SqMultiRoomView | null; ok?: boolean } | undefined;

export default function SongQuizMulti({
  group,
  difficulty,
}: {
  group: SongGroupId;
  difficulty: SongDifficulty;
}) {
  const { t, i18n } = useTranslation();
  const [room, setRoom] = useState<SqMultiRoomView | null>(null);
  /** 开房前房主选定的企划与分组（默认沿用单人页选的那个分组）。 */
  const [lobbyFranchise, setLobbyFranchise] = useState<SongFranchiseId>(() => SONG_GROUP_FRANCHISE[group]);
  const [lobbyGroup, setLobbyGroup] = useState<SongGroupId>(group);
  const [mode, setMode] = useState<SqMultiMode>('rush');
  const [rounds, setRounds] = useState<number>(5);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const [picked, setPicked] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [offset, setOffset] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const questionStartedAt = useRef(Date.now());

  const socket = getSocket();
  const questionIndex = room?.questionIndex ?? -1;
  const questionCount = room?.questionCount ?? rounds;
  const seed = room?.seed ?? null;
  const roomGroup = (room?.group ?? lobbyGroup) as SongGroupId;
  const roomDifficulty = (room?.difficulty ?? difficulty) as SongDifficulty;

  /** 同一 seed + 同样的题量 = 每个人本地的题目完全一致。 */
  const round = useMemo(
    () => (seed === null ? null : createRound(roomGroup, seed, roomDifficulty, questionCount)),
    [seed, roomGroup, roomDifficulty, questionCount],
  );
  const question: SongQuizQuestion | undefined =
    round && questionIndex >= 0 ? round.questions[questionIndex] : undefined;
  const currentResult = room?.results.find((item) => item.index === questionIndex);
  const revealed = Boolean(currentResult);
  const previewSeconds = previewSecondsFor(room?.mode ?? mode, Math.max(0, questionIndex));
  const remainingMs =
    room?.status === 'playing' && room.questionEndsAt
      ? Math.max(0, room.questionEndsAt - (now + offset))
      : 0;
  const players = room ? sortPlayers(room.players) : [];
  const me = room?.players.find((item) => item.me);
  const isHost = Boolean(me?.host);
  const readyToStart =
    room?.status === 'waiting' &&
    room.players.filter((item) => item.connected).length >= SQ_MULTI_MIN_PLAYERS &&
    room.players.filter((item) => item.connected).every((item) => item.host || item.ready);

  const applyRoom = useCallback((next: SqMultiRoomView | null) => {
    setRoom(next);
    if (next) setOffset(clockOffset(next.serverTime));
  }, []);

  const fail = useCallback(
    (result: Ack) => {
      const codeName = result?.code;
      if (!codeName) return false;
      setError(t(`songQuiz.multi.errors.${codeName}` as const, { defaultValue: t('songQuiz.multi.errors.UNKNOWN') }));
      return true;
    },
    [t],
  );

  const emit = useCallback(
    (event: string, payload: Record<string, unknown> = {}) =>
      new Promise<Ack>((resolve) => {
        socket.emit(event, payload, (result: Ack) => resolve(result));
      }),
    [socket],
  );

  /* ------------------------------------------------------------ socket 接线 */

  useEffect(() => {
    const onRoom = (payload: SqMultiRoomView) => {
      setError('');
      applyRoom(payload);
    };
    socket.on('sq:room', onRoom);
    // 刷新页面 / 断线重连：把还在的房间找回来
    void emit('sq:sync').then((result) => {
      if (result?.room) applyRoom(result.room);
    });
    const onConnect = () => {
      void emit('sq:sync').then((result) => {
        if (result?.room) applyRoom(result.room);
      });
    };
    socket.on('connect', onConnect);
    return () => {
      socket.off('sq:room', onRoom);
      socket.off('connect', onConnect);
    };
  }, [socket, emit, applyRoom]);

  /* ------------------------------------------------------------ 倒计时 */

  useEffect(() => {
    if (room?.status !== 'playing') return;
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, [room?.status]);

  /* --------------------------------------------------- 每题：载入试听 / 重置 */

  useEffect(() => {
    setPicked(null);
    setElapsed(0);
    setPlaying(false);
    audioRef.current?.pause();
    if (!question) {
      setPreview(null);
      setPreviewState('idle');
      return;
    }
    questionStartedAt.current = Date.now();
    let cancelled = false;
    setPreviewState('loading');
    void api
      .get<{ items: Preview[] }>('/song-quiz/previews', { params: { ids: String(question.song.id) } })
      .then((response) => {
        if (cancelled) return;
        const found = response.data.items.find((item) => item.id === question.song.id) ?? null;
        setPreview(found);
        setPreviewState(found ? 'ready' : 'failed');
      })
      .catch(() => {
        if (!cancelled) setPreviewState('failed');
      });
    return () => {
      cancelled = true;
    };
  }, [question]);

  /* ------------------------------------------------------------ 播放控制 */

  const play = useCallback(
    async (fromStart = false) => {
      const audio = audioRef.current;
      const source = sourceOf(preview ?? undefined);
      if (!audio || !source) return;
      if (audio.src !== source) audio.src = source;
      if (fromStart) audio.currentTime = 0;
      try {
        await audio.play();
      } catch {
        /* 自动播放被拦时由用户点播放按钮 */
      }
    },
    [preview],
  );

  useEffect(() => {
    // 每题自动开播一次（渐进揭示模式下只听前 previewSeconds 秒）
    if (!question || previewState !== 'ready' || !preview) return;
    void play(true);
  }, [question, previewState, preview, play]);

  /* ------------------------------------------------------------ 作答 */

  const answer = useCallback(
    (pick: number) => {
      if (!question || revealed || picked !== null || !room || room.status !== 'playing') return;
      const correct = pick === question.answer;
      const ms = Math.max(0, Date.now() - questionStartedAt.current);
      setPicked(pick);
      audioRef.current?.pause();
      setPlaying(false);
      void emit('sq:answer', { index: questionIndex, pick, correct, ms }).then((result) => {
        fail(result);
      });
    },
    [question, revealed, picked, room, questionIndex, emit, fail],
  );

  /* ------------------------------------------------------------ 动作 */

  const run = useCallback(
    async (event: string, payload: Record<string, unknown>, keepRoom = true) => {
      setBusy(true);
      setError('');
      try {
        const result = await emit(event, payload);
        if (result?.code) {
          fail(result);
          if (result.code === 'ALREADY_IN_ROOM' && result.room) applyRoom(result.room);
          return;
        }
        if (!keepRoom) applyRoom(null);
        else if (result?.room) applyRoom(result.room);
      } finally {
        setBusy(false);
      }
    },
    [emit, fail, applyRoom],
  );

  const createRoom = () =>
    run('sq:create', { mode, group: lobbyGroup, difficulty, rounds });
  const matchRoom = () => run('sq:match', { mode, group: lobbyGroup, difficulty, rounds });
  const joinRoom = () => {
    const value = code.trim().toUpperCase();
    if (!SQ_MULTI_ROOM_ID_PATTERN.test(value)) {
      setError(t('songQuiz.multi.errors.INVALID_CODE'));
      return;
    }
    void run('sq:join', { roomId: value });
  };
  const leaveRoom = () => run('sq:leave', {}, false);
  const toggleReady = () => run('sq:ready', { ready: !me?.ready });
  const startGame = () => run('sq:start', {});
  const rematch = () => run('sq:rematch', {});

  const copyCode = () => {
    if (!room) return;
    void copyText(room.id).then((ok) => {
      setCopied(ok);
      if (ok) window.setTimeout(() => setCopied(false), 2000);
    });
  };

  const groupLabel = (id: string) =>
    SONG_GROUP_LABELS[id as keyof typeof SONG_GROUP_LABELS]
      ? labelOf(SONG_GROUP_LABELS[id as keyof typeof SONG_GROUP_LABELS], i18n.language)
      : id;
  const franchiseLabel = (id: SongFranchiseId) => labelOf(SONG_FRANCHISE_LABELS[id], i18n.language);
  /** 当前企划下的分组（界面顺序）。 */
  const lobbyGroups = SONG_FRANCHISES[lobbyFranchise].groups;

  /* ------------------------------------------------------------ 大厅 */

  if (!room) {
    return (
      <section className="sgm-lobby">
        <p className="muted">{t('songQuiz.multi.intro')}</p>

        <div className="sgm-options">
          <fieldset className="sg-franchise">
            <legend>{t('songQuiz.franchiseLabel')}</legend>
            <div className="sg-chips" role="group" aria-label={t('songQuiz.franchiseLabel')}>
              {SONG_FRANCHISE_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`sg-chip${lobbyFranchise === id ? ' is-active' : ''}`}
                  style={{ ['--sg-color' as string]: SONG_FRANCHISES[id].color }}
                  aria-pressed={lobbyFranchise === id}
                  onClick={() => {
                    setLobbyFranchise(id);
                    const first = SONG_FRANCHISES[id].groups[0];
                    if (first) setLobbyGroup(first);
                  }}
                >
                  {franchiseLabel(id)}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="sg-groups">
            <legend>{t('songQuiz.groupLabel')}</legend>
            <div className="sg-group-grid">
              {lobbyGroups.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`sg-group${lobbyGroup === id ? ' is-active' : ''}`}
                  style={{ ['--sg-color' as string]: SONG_FRANCHISES[lobbyFranchise].color }}
                  aria-pressed={lobbyGroup === id}
                  onClick={() => setLobbyGroup(id)}
                >
                  <span className="sg-group-name">{groupLabel(id)}</span>
                  <span className="sg-group-count">
                    {t('songQuiz.songsCount', { count: songsOfGroup(id).length })}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="sgm-field">
            <span className="sgm-field-label">{t('songQuiz.multi.modeLabel')}</span>
            <div className="sgm-chips" role="group" aria-label={t('songQuiz.multi.modeLabel')}>
              <button
                type="button"
                className={`sg-chip${mode === 'rush' ? ' is-active' : ''}`}
                aria-pressed={mode === 'rush'}
                onClick={() => setMode('rush')}
              >
                <Swords size={14} />
                {t('songQuiz.multi.modes.rush.name')}
              </button>
              <button
                type="button"
                className={`sg-chip${mode === 'reveal' ? ' is-active' : ''}`}
                aria-pressed={mode === 'reveal'}
                onClick={() => setMode('reveal')}
              >
                <Timer size={14} />
                {t('songQuiz.multi.modes.reveal.name')}
              </button>
            </div>
          </div>
          <div className="sgm-field">
            <span className="sgm-field-label">{t('songQuiz.multi.roundsLabel')}</span>
            <div className="sgm-chips" role="group" aria-label={t('songQuiz.multi.roundsLabel')}>
              {SQ_MULTI_ROUND_OPTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`sg-chip${rounds === item ? ' is-active' : ''}`}
                  aria-pressed={rounds === item}
                  onClick={() => setRounds(item)}
                >
                  {t('songQuiz.difficulties.count', { count: item })}
                </button>
              ))}
            </div>
          </div>
          <p className="muted sgm-summary">
            {t('songQuiz.multi.summary', {
              group: groupLabel(lobbyGroup),
              songs: songsOfGroup(lobbyGroup).length,
              rounds,
            })}
          </p>
        </div>

        <div className="sgm-actions">
          <button type="button" className="btn btn-success" onClick={createRoom} disabled={busy}>
            <Users size={15} />
            {t('songQuiz.multi.create')}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => void matchRoom()}
            disabled={busy || songsOfGroup(lobbyGroup).length < 5}
          >
            <Globe size={15} />
            {t('songQuiz.multi.match')}
          </button>
        </div>

        <div className="sgm-join">
          <label htmlFor="sgm-room-code">{t('songQuiz.multi.joinLabel')}</label>
          <div className="sgm-join-row">
            <input
              id="sgm-room-code"
              className="sgm-code-input"
              value={code}
              maxLength={SQ_MULTI_ROOM_ID_LENGTH}
              placeholder={t('songQuiz.multi.codePlaceholder')}
              onChange={(event) => {
                setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                setError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') joinRoom();
              }}
            />
            <button type="button" className="btn" onClick={joinRoom} disabled={busy || !code}>
              <LogIn size={15} />
              {t('songQuiz.multi.join')}
            </button>
          </div>
        </div>

        {error && <p className="sg-failed">{error}</p>}
        <p className="muted sgm-note">{t('songQuiz.multi.note')}</p>
      </section>
    );
  }

  /* ------------------------------------------------------------ 等待开局 */

  return (
    <section className="sgm-room">
      <header className="sgm-room-head">
        <span className="sgm-room-mode">
          {t(`songQuiz.multi.modes.${room.mode}.name`)}
          {' · '}
          {groupLabel(room.group)}
          {' · '}
          {t('songQuiz.difficulties.count', { count: room.questionCount })}
        </span>
        <span className="sgm-code">
          <span className="sgm-code-label">{t('songQuiz.multi.roomCode')}</span>
          <b>{room.id}</b>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={copyCode}
            aria-label={t('songQuiz.multi.copyCode')}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={leaveRoom}>
          <DoorOpen size={14} />
          {t('songQuiz.multi.leave')}
        </button>
      </header>

      {room.status === 'waiting' && (
        <>
          <p className="muted">{t('songQuiz.multi.waitingHint', { count: SQ_MULTI_MIN_PLAYERS })}</p>
          <ul className="sgm-players sgm-waiting">
            {room.players.map((player) => (
              <li key={player.key} className={player.me ? 'is-me' : undefined}>
                <span className="sgm-player-name">
                  {player.name}
                  {player.host && <Crown size={12} />}
                </span>
                {!player.connected && <span className="sgm-badge is-off">{t('songQuiz.multi.offline')}</span>}
                <span className={`sgm-ready${player.ready ? ' is-ready' : ''}`}>
                  {player.ready ? t('songQuiz.multi.ready') : t('songQuiz.multi.notReady')}
                </span>
              </li>
            ))}
          </ul>
          <div className="sgm-ready-actions">
            {isHost ? (
              <button type="button" className="btn btn-success" onClick={startGame} disabled={!readyToStart || busy}>
                <Play size={15} />
                {t('songQuiz.multi.start')}
              </button>
            ) : (
              <button
                type="button"
                className={`btn${me?.ready ? ' btn-ghost' : ' btn-success'}`}
                onClick={toggleReady}
                disabled={busy}
              >
                <UserPlus size={15} />
                {me?.ready ? t('songQuiz.multi.cancelReady') : t('songQuiz.multi.setReady')}
              </button>
            )}
          </div>
        </>
      )}

      {room.status === 'playing' && (
        <>
          <div className="sgm-hud">
            <span className="sgm-hud-progress">
              {t('songQuiz.progress', { current: questionIndex + 1, total: room.questionCount })}
            </span>
            <span className="sgm-hud-timer">
              <Timer size={14} />
              {(remainingMs / 1000).toFixed(1)}
            </span>
            <span className="sgm-hud-preview">
              {t('songQuiz.multi.allowListen', { seconds: previewSeconds })}
            </span>
          </div>

          <ol className="sgm-players">
            {room.players.map((player) => (
              <li key={player.key} className={player.me ? 'is-me' : undefined}>
                <span className="sgm-player-name">
                  {player.name}
                  {player.host && <Crown size={12} />}
                </span>
                {player.connected ? (
                  <span className={`sgm-player-state${player.answered ? ' is-answered' : ''}`}>
                    {player.answered ? t('songQuiz.multi.answered') : t('songQuiz.multi.thinking')}
                  </span>
                ) : (
                  <span className="sgm-player-state">{t('songQuiz.multi.offline')}</span>
                )}
                <span className="sgm-player-score">{player.score}</span>
              </li>
            ))}
          </ol>

          {question ? (
            <>
              <div className="sg-player">
                <div className="sg-player-row">
                  <button
                    type="button"
                    className="sg-play"
                    aria-label={playing ? t('songQuiz.pause') : t('songQuiz.play')}
                    disabled={!sourceOf(preview ?? undefined)}
                    onClick={() => {
                      if (playing) {
                        audioRef.current?.pause();
                        setPlaying(false);
                        return;
                      }
                      void play(elapsed >= previewSeconds ? true : false);
                    }}
                  >
                    {playing ? <Pause size={22} /> : <Play size={22} />}
                  </button>
                  <span className="sg-player-track">
                    <span
                      className="sg-player-elapsed"
                      style={{ width: `${Math.min(100, (elapsed / previewSeconds) * 100)}%` }}
                    />
                    <span
                      className="sgm-player-limit"
                      style={{ left: `${Math.min(100, (previewSeconds / 30) * 100)}%` }}
                      aria-hidden="true"
                    />
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={!sourceOf(preview ?? undefined)}
                    onClick={() => {
                      setElapsed(0);
                      void play(true);
                    }}
                  >
                    <RotateCcw size={14} />
                    {t('songQuiz.replay')}
                  </button>
                </div>
                {previewState === 'loading' && <p className="muted sg-player-note">{t('songQuiz.loading')}</p>}
                {previewState === 'failed' && (
                  <p className="sg-failed sg-player-note">{t('songQuiz.previewUnavailable')}</p>
                )}
              </div>

              <div className="sg-options">
                {question.options.map((option, optionIndex) => {
                  const isPicked = picked === optionIndex;
                  const isAnswer = optionIndex === question.answer;
                  const className = [
                    'sg-option',
                    isPicked ? 'is-selected' : '',
                    revealed && isAnswer ? 'is-correct' : '',
                    revealed && isPicked && !isAnswer ? 'is-wrong' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <button
                      key={`${question.song.id}-${optionIndex}`}
                      type="button"
                      className={className}
                      aria-pressed={isPicked}
                      disabled={revealed || picked !== null}
                      onClick={() => answer(optionIndex)}
                    >
                      <span className="sg-option-letter" aria-hidden="true">
                        {OPTION_LETTERS[optionIndex] ?? optionIndex + 1}
                      </span>
                      <span className="sg-option-text">{option}</span>
                    </button>
                  );
                })}
              </div>

              {picked !== null && !revealed && (
                <p className="muted sgm-waiting-others">{t('songQuiz.multi.waitingOthers')}</p>
              )}

              {revealed && currentResult && (
                <div className="sgm-result">
                  <p className={picked === question.answer ? 'sg-flash-ok' : 'sg-flash-no'}>
                    {picked === question.answer
                      ? t('songQuiz.expert.right')
                      : t('songQuiz.expert.wrong', {
                          answer: question.song.title,
                          artist: question.song.artist,
                        })}
                  </p>
                  <ul className="sgm-result-rows">
                    {[...currentResult.rows]
                      .sort((a, b) => b.delta - a.delta || (a.ms ?? 1e9) - (b.ms ?? 1e9))
                      .map((row) => (
                        <li key={row.key} className={row.correct ? 'is-ok' : 'is-no'}>
                          <span className="sgm-result-name">{row.name}</span>
                          <span className="sgm-result-pick">
                            {row.pick === null
                              ? t('songQuiz.result.unanswered')
                              : `${OPTION_LETTERS[row.pick] ?? row.pick}`}
                          </span>
                          <span className="sgm-result-speed">
                            {row.ms === null ? '—' : formatSeconds(row.ms)}
                          </span>
                          <span className="sgm-result-delta">{row.delta > 0 ? `+${row.delta}` : '0'}</span>
                        </li>
                      ))}
                  </ul>
                  <p className="muted sgm-next-hint">{t('songQuiz.multi.nextHint')}</p>
                </div>
              )}
            </>
          ) : (
            <p className="muted">{t('songQuiz.loading')}</p>
          )}
        </>
      )}

      {room.status === 'finished' && (
        <>
          <h3 className="sgm-over-title">
            <Trophy size={18} />
            {t('songQuiz.multi.overTitle')}
          </h3>
          <ol className="sgm-standings">
            {players.map((player, index) => (
              <li key={player.key} className={player.me ? 'is-me' : undefined}>
                <span className="sgm-rank">{index + 1}</span>
                <span className="sgm-rank-name">{player.name}</span>
                <span className="sgm-rank-correct">
                  {t('songQuiz.result.correctLabel', { correct: player.correct, total: room.questionCount })}
                </span>
                <span className="sgm-rank-score">{player.score}</span>
              </li>
            ))}
          </ol>
          <div className="sgm-ready-actions">
            {isHost ? (
              <button type="button" className="btn btn-success" onClick={rematch} disabled={busy}>
                <RotateCcw size={15} />
                {t('songQuiz.result.retry')}
              </button>
            ) : (
              <span className="muted">{t('songQuiz.multi.waitingHost')}</span>
            )}
            <button type="button" className="btn btn-ghost" onClick={leaveRoom}>
              <DoorOpen size={14} />
              {t('songQuiz.multi.leave')}
            </button>
          </div>
          <p className="muted sgm-note">{t('songQuiz.multi.overNote')}</p>
        </>
      )}

      {error && <p className="sg-failed">{error}</p>}

      <audio
        ref={audioRef}
        preload="auto"
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => {
          // 转发地址在某些浏览器上解不了时退回 Apple 直链
          const audio = audioRef.current;
          if (!audio || !preview?.previewUrl) return;
          if (audio.src !== preview.previewUrl) {
            audio.src = preview.previewUrl;
            void audio.play().catch(() => undefined);
          }
        }}
        onTimeUpdate={(event) => {
          const value = event.currentTarget.currentTime;
          setElapsed(value);
          // 渐进揭示：只允许听前 previewSeconds 秒
          if (value >= previewSeconds) {
            event.currentTarget.pause();
            setPlaying(false);
          }
        }}
      />
    </section>
  );
}
