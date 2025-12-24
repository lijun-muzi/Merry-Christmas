import { useEffect, useMemo, useRef, useState } from 'react';
import SnowLayer from './SnowLayer';

const TARGET_TIME_MS = Date.UTC(2025, 11, 24, 14, 40, 0); // Beijing 2025-12-24 22:40:00
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
  const getRemainingSeconds = () => Math.max(0, Math.floor((TARGET_TIME_MS - Date.now()) / 1000));
  const [secondsLeft, setSecondsLeft] = useState(getRemainingSeconds);
  const doneRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      const next = getRemainingSeconds();
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
    const hours = Math.floor(secondsLeft / 3600);
    const minutes = Math.floor((secondsLeft % 3600) / 60);
    const seconds = secondsLeft % 60;
    return {
      hours: String(hours).padStart(2, '0'),
      minutes: padTwo(minutes),
      seconds: padTwo(seconds),
    };
  }, [secondsLeft]);

  const displayText = `${display.hours}:${display.minutes}:${display.seconds}`;
  const hoursDigits = display.hours.split('');
  const [m1, m2] = display.minutes.split('');
  const [s1, s2] = display.seconds.split('');

  return (
    <div className="countdown-overlay">
      <SnowLayer count={220} />
      <div className="countdown-content">
        <div className="flip-clock" aria-label={`倒计时 ${displayText}`}>
          {hoursDigits.map((digit, index) => (
            <FlipDigit key={`h-${index}`} value={digit} />
          ))}
          <span className="flip-colon">:</span>
          <FlipDigit value={m1} />
          <FlipDigit value={m2} />
          <span className="flip-colon">:</span>
          <FlipDigit value={s1} />
          <FlipDigit value={s2} />
        </div>
        <div className="countdown-hint">
          <span>祝灵智</span>
          <span>-岁岁平 岁岁安-</span>
        </div>
      </div>
    </div>
  );
}
