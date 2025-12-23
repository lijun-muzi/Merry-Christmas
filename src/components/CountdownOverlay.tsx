import { useEffect, useMemo, useRef, useState } from 'react';
import SnowLayer from './SnowLayer';

const TOTAL_SECONDS = 5 * 60;
const FLIP_DURATION_MS = 900;

type CountdownOverlayProps = {
  onComplete: () => void;
};

const padTwo = (value: number) => String(value).padStart(2, '0');

const FlipDigit = ({ value }: { value: string }) => {
  const [current, setCurrent] = useState(value);
  const [previous, setPrevious] = useState(value);
  const [flipToken, setFlipToken] = useState(0);
  const timerRef = useRef<number | null>(null);
  const currentRef = useRef(value);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      setCurrent(value);
      setPrevious(value);
      currentRef.current = value;
      return;
    }
    if (value === currentRef.current) return;
    setPrevious(currentRef.current);
    setCurrent(value);
    currentRef.current = value;
    setFlipToken((token) => token + 1);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setPrevious(value);
    }, FLIP_DURATION_MS);
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <div className="flip-digit">
      <div className={`flip-card${flipToken > 0 ? ' is-flipping' : ''}`} key={flipToken}>
        <div className="flip-face front">
          <span className="flip-digit-text">{previous}</span>
        </div>
        <div className="flip-face back">
          <span className="flip-digit-text">{current}</span>
        </div>
      </div>
    </div>
  );
};

export default function CountdownOverlay({ onComplete }: CountdownOverlayProps) {
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const doneRef = useRef(false);

  useEffect(() => {
    const startedAt = Date.now();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const next = Math.max(0, TOTAL_SECONDS - elapsed);
      setSecondsLeft(next);
      if (next === 0 && !doneRef.current) {
        doneRef.current = true;
        onComplete();
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [onComplete]);

  const display = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    return `${padTwo(minutes)}:${padTwo(seconds)}`;
  }, [secondsLeft]);

  const [m1, m2, s1, s2] = display.replace(':', '').split('');

  return (
    <div className="countdown-overlay">
      <SnowLayer count={220} />
      <div className="countdown-content">
        <div className="flip-clock" aria-label={`倒计时 ${display}`}>
          <FlipDigit value={m1} />
          <FlipDigit value={m2} />
          <span className="flip-colon">:</span>
          <FlipDigit value={s1} />
          <FlipDigit value={s2} />
        </div>
        <div className="countdown-hint">请耐心等待哦～</div>
      </div>
    </div>
  );
}
