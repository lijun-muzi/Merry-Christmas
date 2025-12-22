import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useRef, useState } from 'react';
import CountdownOverlay from './components/CountdownOverlay';
import MusicPlayer from './components/MusicPlayer';
import SnowLayer from './components/SnowLayer';
import TreeScene from './components/TreeScene';

function App() {
  const [blessingState, setBlessingState] = useState<'hidden' | 'shown' | 'hiding'>('hidden');
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [showCountdown, setShowCountdown] = useState(true);
  const blessTimerRef = useRef<number | null>(null);
  const blessHideTimerRef = useRef<number | null>(null);
  const blessRafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (blessTimerRef.current) {
        window.clearTimeout(blessTimerRef.current);
      }
      if (blessHideTimerRef.current) {
        window.clearTimeout(blessHideTimerRef.current);
      }
      if (blessRafRef.current) {
        cancelAnimationFrame(blessRafRef.current);
      }
    };
  }, []);

  const handleBlessingClick = () => {
    if (blessTimerRef.current) {
      window.clearTimeout(blessTimerRef.current);
    }
    if (blessHideTimerRef.current) {
      window.clearTimeout(blessHideTimerRef.current);
    }
    if (blessRafRef.current) {
      cancelAnimationFrame(blessRafRef.current);
    }
    setBlessingState('shown');
    setBubbleVisible(false);
    blessRafRef.current = requestAnimationFrame(() => {
      setBubbleVisible(true);
    });
    if (blessTimerRef.current) {
      window.clearTimeout(blessTimerRef.current);
    }
    blessTimerRef.current = window.setTimeout(() => {
      setBlessingState('hiding');
      setBubbleVisible(false);
      blessHideTimerRef.current = window.setTimeout(() => {
        setBlessingState('hidden');
      }, 350);
    }, 1500);
  };

  return (
    <div className="app-shell">
      <div className="hero-gradient" />
      <div className="corner-orb right" />
      <div className="corner-orb left" />
      {!showCountdown && <SnowLayer count={300} />}
      {showCountdown && <CountdownOverlay onComplete={() => setShowCountdown(false)} />}

      <div className="ui-overlay">
        <div>
          <div className="branding">祝·小面包</div>
          <p className="tagline">
            希望你在圣诞节这天、以及以后都能天天开心。愿你的每个清晨都有光、每个夜晚都有安宁，
            所想皆如愿，所行皆坦途。
          </p>
        </div>
        <div className="scene-title">
          <h1>Merry Christmas</h1>
          <p>May this season wrap you in warmth, and may joy find you in every little moment.</p>
        </div>
        <div className="bottom-stack">
          <MusicPlayer />
          <div className="controls">
            <div className="controls-meta-wrap">
              <button type="button" className="controls-meta" onClick={handleBlessingClick}>
                by：李俊
              </button>
              {blessingState !== 'hidden' && (
                <div
                  className={`controls-bubble${
                    blessingState === 'hiding' ? ' is-hiding' : bubbleVisible ? ' is-visible' : ''
                  }`}
                >
                  只要你愿意，“喜欢你”我可以一直说给你听！
                </div>
              )}
            </div>
            <div className="controls-row">
              <span className="badge">拖拽旋转 / 滚轮缩放</span>
              <span className="badge">指针悬停提升流光</span>
            </div>
          </div>
        </div>
      </div>

      <div className="canvas-wrapper">
        <Canvas
          shadows
          gl={{ antialias: true, toneMappingExposure: 1.1 }}
          dpr={[1, 2.2]}
          camera={{ position: [0, 1.7, 8.5], fov: 45, near: 0.1, far: 50 }}
        >
          <color attach="background" args={["#0a2520"]} />
          <Suspense fallback={null}>
            <TreeScene />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}

export default App;
