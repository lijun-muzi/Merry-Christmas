import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import MusicPlayer from './components/MusicPlayer';
import TreeScene from './components/TreeScene';

function App() {
  return (
    <div className="app-shell">
      <div className="hero-gradient" />
      <div className="corner-orb right" />
      <div className="corner-orb left" />

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
          <div className="controls">
            <span className="badge">拖拽旋转 / 滚轮缩放</span>
            <span className="badge">指针悬停提升流光</span>
          </div>
          <MusicPlayer />
        </div>
      </div>

      <div className="canvas-wrapper">
        <Canvas
          shadows
          gl={{ antialias: true, toneMappingExposure: 1.1 }}
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
