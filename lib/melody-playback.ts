export function playbackPause(milliseconds: number, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return Promise.resolve(false);
  return new Promise(resolve => {
    const finish = (completed: boolean) => { clearTimeout(timer); signal.removeEventListener("abort", abort); resolve(completed); };
    const abort = () => finish(false);
    const timer = setTimeout(() => finish(true), milliseconds);
    signal.addEventListener("abort", abort, { once: true });
  });
}

type SecretNumberPlayback = {
  numbers: readonly number[];
  introduction: () => Promise<boolean>;
  speakNumber: (number: number) => Promise<boolean>;
  highlight: (number: number | null) => void;
  tone: (number: number) => void;
  interval: number;
  gap: number;
  signal: AbortSignal;
  pause?: typeof playbackPause;
  now?: () => number;
};

/** Playback events determine progression; the interval is only a minimum visual pace. */
export async function playSecretNumber({ numbers, introduction, speakNumber, highlight, tone, interval, gap, signal, pause = playbackPause, now = () => performance.now() }: SecretNumberPlayback): Promise<boolean> {
  if (signal.aborted || !await introduction() || signal.aborted || !await pause(gap, signal)) return false;
  for (const number of numbers) {
    if (signal.aborted) return false;
    highlight(number); tone(number);
    const start = now();
    if (!await speakNumber(number) || signal.aborted) return false;
    if (!await pause(Math.max(0, interval - (now() - start)), signal)) return false;
    highlight(null);
    if (!await pause(gap, signal)) return false;
  }
  return !signal.aborted;
}
