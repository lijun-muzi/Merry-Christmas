import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import TreeScene from './components/TreeScene';

function App() {
  return (
    <div className="app-shell">
      <div className="hero-gradient" />
      <div className="corner-orb right" />
      <div className="corner-orb left" />

      <div className="ui-overlay">
        <div>
          <div className="branding">ARIX • LUMINAIRE</div>
          <p className="tagline">
            Arix Signature Interactive Christmas Tree —— 深祖母绿的冷静与金属金的高光交叠，
            让圣诞的层叠光晕以电影级的质感在指尖流动。
          </p>
        </div>
        <div className="scene-title">
          <h1>Golden Aurora Tree</h1>
          <p>互动旋转 · 光晕耀金 · 沉浸声光场</p>
        </div>
        <div className="controls">
          <span className="badge">拖拽旋转 / 滚轮缩放</span>
          <span className="badge">指针悬停提升流光</span>
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
