import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sparkles, Stars, useTexture } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Vignette, DepthOfField } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Suspense, useEffect, useMemo, useRef, type RefObject } from 'react';
import {
  CatmullRomCurve3,
  Color,
  CanvasTexture,
  Group,
  InstancedMesh,
  LinearFilter,
  LinearMipMapLinearFilter,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  Vector3,
} from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

function SceneLights() {
  return (
    <>
      <color attach="background" args={["#081a16"]} />
      <ambientLight intensity={0.3} color={new Color('#b8f3d5')} />
      <directionalLight
        position={[4, 6, 6]}
        intensity={1.8}
        color={new Color('#ffe4a3')}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <spotLight
        position={[-3, 5.5, -2]}
        angle={0.6}
        penumbra={0.5}
        intensity={1.1}
        color={new Color('#8df0c1')}
      />
      <pointLight position={[0, 3.8, 0]} intensity={1.6} distance={10} color={new Color('#f5d76e')} />
    </>
  );
}

function OrnamentField({ count = 120, explodeRef }: { count?: number; explodeRef: React.RefObject<number> }) {
  const ornaments = useMemo(() => {
    const list: { position: Vector3; scale: number; gold: boolean; red: boolean }[] = [];
    const height = 4.0;
    for (let i = 0; i < count; i += 1) {
      const baseBoost = Math.random() < 0.3 ? Math.random() * 0.8 : 0;
      const t = Math.pow(Math.random(), 0.9);
      const h = Math.min(height, t * height + baseBoost * 0.6);
      const radius = 1.8 * (1 - h / height) + 0.1;
      const angle = Math.random() * Math.PI * 2;
      const spread = 0.88 + Math.random() * 0.16;
      const x = Math.cos(angle) * radius * spread;
      const z = Math.sin(angle) * radius * spread;
      const y = h - 1.5;
      const gold = Math.random() > 0.3;
      const red = !gold && Math.random() > 0.35;
      list.push({ position: new Vector3(x, y, z), scale: 0.06 + Math.random() * 0.08, gold, red });
    }
    return list;
  }, [count]);

  return (
    <group name="ornaments">
      {ornaments.map((o, idx) => (
        <mesh
          key={idx}
          position={o.position}
          scale={o.scale * (1 - (explodeRef.current ?? 0) * 0.8)}
          castShadow
          receiveShadow
        >
          <sphereGeometry args={[1, 24, 24]} />
          <meshPhysicalMaterial
            color={o.gold ? '#f7e2a7' : o.red ? '#b5121b' : '#0f4c3b'}
            emissive={o.gold ? '#f5d76e' : o.red ? '#b5121b' : '#0c332b'}
            emissiveIntensity={(o.gold ? 0.6 : o.red ? 0.45 : 0.35) * (1 - (explodeRef.current ?? 0))}
            metalness={0.95}
            roughness={0.2}
            clearcoat={0.4}
            clearcoatRoughness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

function FoliagePoints({ explodeRef, count = 1800 }: { explodeRef: React.RefObject<number>; count?: number }) {
  const instancedRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const positions = useMemo(() => {
    const pts: { pos: Vector3; scale: number }[] = [];
    const height = 4.1;
    for (let i = 0; i < count; i += 1) {
      const rand = Math.random();
      const baseBoost = rand < 0.28 ? Math.random() * 1.0 : 0;
      const t = Math.pow(Math.random(), 0.9);
      const h = Math.min(height, t * height + baseBoost * 0.6);
      const radius = 2.0 * (1 - h / height) + 0.1;
      const angle = Math.random() * Math.PI * 2;
      const r = radius * (0.45 + Math.random() * 0.6);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = h - 1.5; // slightly lower to cover base
      pts.push({ pos: new Vector3(x, y, z), scale: 0.022 + Math.random() * 0.03 });
    }
    return pts;
  }, [count]);

  useFrame(() => {
    const f = explodeRef.current ?? 0;
    positions.forEach((p, i) => {
      dummy.position.copy(p.pos);
      dummy.scale.setScalar(p.scale * (1 - f * 0.85));
      dummy.updateMatrix();
      instancedRef.current?.setMatrixAt(i, dummy.matrix);
    });
    if (instancedRef.current) {
      instancedRef.current.instanceMatrix.needsUpdate = true;
      instancedRef.current.visible = (explodeRef.current ?? 0) < 0.98;
    }
  });

  return (
    <instancedMesh ref={instancedRef} args={[undefined, undefined, count]} castShadow>
      <sphereGeometry args={[1, 6, 6]} />
      <meshStandardMaterial
        color="#0d5c4b"
        emissive="#0f7a63"
        emissiveIntensity={0.45}
        metalness={0.4}
        roughness={0.8}
      />
    </instancedMesh>
  );
}

function LightSpecks({ explodeRef, count = 640 }: { explodeRef: React.RefObject<number>; count?: number }) {
  const instancedRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const positions = useMemo(() => {
    const pts: { pos: Vector3; scale: number }[] = [];
    const height = 4.1;
    for (let i = 0; i < count; i += 1) {
      const rand = Math.random();
      const baseBoost = rand < 0.25 ? Math.random() * 0.9 : 0;
      const t = Math.pow(Math.random(), 0.9);
      const h = Math.min(height, t * height + baseBoost * 0.5);
      const radius = 2.0 * (1 - h / height);
      const angle = Math.random() * Math.PI * 2;
      const r = radius * (0.5 + Math.random() * 0.5);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = h - 1.45 + (Math.random() - 0.5) * 0.06;
      pts.push({ pos: new Vector3(x, y, z), scale: 0.014 + Math.random() * 0.02 });
    }
    return pts;
  }, [count]);

  useFrame(() => {
    const f = explodeRef.current ?? 0;
    positions.forEach((p, i) => {
      dummy.position.copy(p.pos);
      dummy.scale.setScalar(p.scale * (1 - f * 0.9));
      dummy.updateMatrix();
      instancedRef.current?.setMatrixAt(i, dummy.matrix);
    });
    if (instancedRef.current) {
      instancedRef.current.instanceMatrix.needsUpdate = true;
      instancedRef.current.visible = (explodeRef.current ?? 0) < 0.98;
    }
  });

  return (
    <instancedMesh ref={instancedRef} args={[undefined, undefined, count]} castShadow>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial
        color="#f8e7a0"
        emissive="#f5d76e"
        emissiveIntensity={0.7}
        metalness={0.8}
        roughness={0.2}
      />
    </instancedMesh>
  );
}

function GiftBoxes({ explodeRef, count = 36 }: { explodeRef: React.RefObject<number>; count?: number }) {
  const instancedRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const positions = useMemo(() => {
    const pts: { pos: Vector3; rotY: number; scale: number }[] = [];
    for (let i = 0; i < count; i += 1) {
      const t = Math.pow(Math.random(), 0.8);
      const h = t * 3.6;
      const radius = 1.4 * (1 - h / 3.6);
      const angle = Math.random() * Math.PI * 2;
      const r = radius * (0.7 + Math.random() * 0.5);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = h - 1.3;
      pts.push({ pos: new Vector3(x, y, z), rotY: Math.random() * Math.PI * 2, scale: 0.08 + Math.random() * 0.04 });
    }
    return pts;
  }, [count]);

  useFrame(() => {
    const f = explodeRef.current ?? 0;
    positions.forEach((p, i) => {
      dummy.position.copy(p.pos);
      dummy.scale.setScalar(p.scale * (1 - f));
      dummy.rotation.set(0.2 * Math.sin(i), p.rotY, 0.2 * Math.cos(i));
      dummy.updateMatrix();
      instancedRef.current?.setMatrixAt(i, dummy.matrix);
    });
    if (instancedRef.current) {
      instancedRef.current.instanceMatrix.needsUpdate = true;
      instancedRef.current.visible = (explodeRef.current ?? 0) < 0.98;
    }
  });

  return (
    <instancedMesh ref={instancedRef} args={[undefined, undefined, count]} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#b5121b"
        emissive="#f5d76e"
        emissiveIntensity={0.4}
        metalness={0.65}
        roughness={0.35}
      />
    </instancedMesh>
  );
}

type PhotoCardProps = {
  texture: Texture;
  position: Vector3;
  rotation: Vector3;
  focusPosition: Vector3;
  focusRotation: Vector3;
  scale: number;
  phase: number;
  explodeRef: React.RefObject<number>;
  collapseRef: React.RefObject<number>;
};

function PhotoCard({
  texture,
  position,
  rotation,
  focusPosition,
  focusRotation,
  scale,
  phase,
  explodeRef,
  collapseRef,
}: PhotoCardProps) {
  const ref = useRef<Group>(null);
  const tempPos = useMemo(() => new Vector3(), []);
  const { camera } = useThree();
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    const target = collapseRef.current ?? 0;
    const f = explodeRef.current ?? 0;
    const blend = Math.min(1, Math.max(0, f + (target - f) * 0.4));
    const smooth = blend * blend * (3 - 2 * blend);
    const floatAmp = 0.08 * (1 - smooth * 0.5);

    tempPos.copy(position).lerp(focusPosition, smooth);
    tempPos.y += Math.sin(t * 0.8 + phase) * floatAmp;
    ref.current.position.copy(tempPos);

    const baseSpin = t * (0.2 - smooth * 0.14);
    const rotX = rotation.x + (focusRotation.x - rotation.x) * smooth;
    const rotY = rotation.y + (focusRotation.y - rotation.y) * smooth + baseSpin;
    const rotZ = rotation.z + (focusRotation.z - rotation.z) * smooth;
    ref.current.rotation.set(rotX, rotY, rotZ);

    if (smooth > 0.35) {
      ref.current.lookAt(camera.position);
      ref.current.rotateZ(rotZ * 0.35);
    }

    const s = scale * (1 + smooth * 0.55);
    ref.current.scale.setScalar(Math.max(0.001, s));
  });

  const frameWidth = 1.08;
  const frameHeight = 1.5;
  const frameDepth = 0.05;
  const matteWidth = 1.0;
  const matteHeight = 1.42;
  const maxPhotoWidth = 0.92;
  const maxPhotoHeight = 1.3;
  const photoOffset = frameDepth * 0.55;
  const bowOffsetX = frameWidth * 0.42;
  const bowOffsetY = frameHeight * 0.42;
  const bowOffsetZ = frameDepth * 0.6;
  const photoSize = useMemo(() => {
    const image = texture.image as { width?: number; height?: number } | undefined;
    if (image?.width && image?.height) {
      const aspect = image.width / image.height;
      const maxAspect = maxPhotoWidth / maxPhotoHeight;
      if (aspect >= maxAspect) {
        return { width: maxPhotoWidth, height: maxPhotoWidth / aspect };
      }
      return { width: maxPhotoHeight * aspect, height: maxPhotoHeight };
    }
    return { width: maxPhotoWidth, height: maxPhotoHeight };
  }, [texture, maxPhotoWidth, maxPhotoHeight]);

  return (
    <group ref={ref} castShadow>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[frameWidth, frameHeight, frameDepth]} />
        <meshPhysicalMaterial color="#f1d38a" metalness={0.25} roughness={0.4} clearcoat={0.35} />
      </mesh>
      <mesh position={[0, 0, frameDepth * 0.2]} castShadow receiveShadow>
        <boxGeometry args={[matteWidth, matteHeight, frameDepth * 0.4]} />
        <meshStandardMaterial color="#f7f2e8" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0, photoOffset]} castShadow>
        <planeGeometry args={[photoSize.width, photoSize.height]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -photoOffset]} rotation={[0, Math.PI, 0]} castShadow>
        <planeGeometry args={[photoSize.width, photoSize.height]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

function FloatingPhotos({
  explodeRef,
  collapseRef,
  focusCenter,
}: {
  explodeRef: React.RefObject<number>;
  collapseRef: React.RefObject<number>;
  focusCenter: [number, number, number];
}) {
  const photoModules = useMemo(
    () =>
      import.meta.glob('/images/*.{jpg,JPG,jpeg,JPEG,png,PNG}', {
        eager: true,
        import: 'default',
      }) as Record<string, string>,
    []
  );
  const photoUrls = useMemo(() => Object.values(photoModules).sort(), [photoModules]);
  const textures = useTexture(photoUrls) as Texture[];
  const { gl } = useThree();

  useEffect(() => {
    textures.forEach((texture) => {
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = gl.capabilities.getMaxAnisotropy();
      texture.minFilter = LinearMipMapLinearFilter;
      texture.magFilter = LinearFilter;
      texture.needsUpdate = true;
    });
  }, [textures, gl]);

  const positions = useMemo(() => {
    const pts: { pos: Vector3; rot: Vector3; scale: number; phase: number }[] = [];
    const count = Math.max(1, photoUrls.length);
    for (let i = 0; i < count; i += 1) {
      const radius = 2.4 + Math.random() * 0.9;
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = Math.random() * 2.0 - 0.2;
      pts.push({
        pos: new Vector3(x, y, z),
        rot: new Vector3((Math.random() - 0.5) * 0.3, angle + Math.PI, (Math.random() - 0.5) * 0.2),
        scale: 0.3 + Math.random() * 0.08,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return pts;
  }, [photoUrls.length]);

  const focusRing = useMemo(() => {
    const count = Math.max(1, photoUrls.length);
    const radius = Math.min(2.9, 1.7 + count * 0.04);
    const baseY = focusCenter[1];
    const items: { pos: Vector3; rot: Vector3 }[] = [];
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      const yJitter = (Math.sin(i * 1.7) + Math.cos(i * 0.9)) * 0.18 + (Math.random() - 0.5) * 0.18;
      const rJitter = Math.sin(i * 1.3) * 0.16 + (Math.random() - 0.5) * 0.12;
      const r = Math.max(0.6, radius + rJitter);
      items.push({
        pos: new Vector3(Math.cos(angle) * r, baseY + yJitter, Math.sin(angle) * r),
        rot: new Vector3(0.04, angle + Math.PI, 0),
      });
    }
    return items;
  }, [photoUrls.length, focusCenter]);

  if (photoUrls.length === 0) return null;

  return (
    <group name="photo-cards">
      {positions.map((p, idx) => (
        <PhotoCard
          key={photoUrls[idx] ?? idx}
          texture={textures[idx % textures.length]}
          position={p.pos}
          rotation={p.rot}
          focusPosition={focusRing[idx % focusRing.length].pos}
          focusRotation={focusRing[idx % focusRing.length].rot}
          scale={p.scale}
          phase={p.phase}
          explodeRef={explodeRef}
          collapseRef={collapseRef}
        />
      ))}
    </group>
  );
}

function CoreSilhouette({ explodeRef }: { explodeRef: React.RefObject<number> }) {
  const matRef = useRef<MeshPhysicalMaterial>(null);
  useFrame(() => {
    const f = explodeRef.current ?? 0;
    if (matRef.current) {
      matRef.current.opacity = 1 - f * 0.25;
      matRef.current.visible = matRef.current.opacity > 0.05;
    }
  });
  return (
    <mesh position={[0, 0, 0]} castShadow receiveShadow>
      <coneGeometry args={[1.9, 4.3, 18, 1, false]} />
      <meshPhysicalMaterial
        ref={matRef}
        color="#0b3c32"
        emissive="#0a2c25"
        emissiveIntensity={0.18}
        metalness={0.35}
        roughness={0.55}
        transparent={false}
      />
    </mesh>
  );
}

function GoldenRibbon({ explodeRef }: { explodeRef: React.RefObject<number> }) {
  const curve = useMemo(() => {
    const pts: Vector3[] = [];
    const turns = 3.8;
    const height = 4.2;
    const baseRadius = 1.75;
    const steps = 250;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const angle = turns * Math.PI * 2 * t;
      const radius = baseRadius * (1 - t * 0.7);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = t * height - 1.6;
      pts.push(new Vector3(x, y, z));
    }
    return new CatmullRomCurve3(pts);
  }, []);

  return (
    <mesh castShadow>
      <tubeGeometry args={[curve, 400, 0.08, 12, false]} />
      <meshPhysicalMaterial
        color={new Color('#f5d76e')}
        emissive={new Color('#f7e2a7')}
        emissiveIntensity={0.8}
        metalness={1}
        roughness={0.15}
        clearcoat={0.8}
        reflectivity={1}
        transparent
        opacity={1 - (explodeRef.current ?? 0)}
      />
    </mesh>
  );
}

function StarTop({ explodeRef }: { explodeRef: React.RefObject<number> }) {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 1.2;
      ref.current.rotation.x += delta * 0.4;
      const f = explodeRef.current ?? 0;
      ref.current.visible = f < 0.95;
    }
  });
  return (
    <mesh ref={ref} position={[0, 2.6, 0]} scale={0.26} castShadow>
      <octahedronGeometry args={[1, 0]} />
      <meshPhysicalMaterial
        color="#ffe8b8"
        emissive="#f9e8a1"
        emissiveIntensity={1}
        metalness={1}
        roughness={0.1}
        clearcoat={1}
      />
    </mesh>
  );
}

function NeonStar({ explodeRef }: { explodeRef: React.RefObject<number> }) {
  const path = useMemo(() => {
    const rOuter = 0.55;
    const rInner = 0.24;
    const points: Vector3[] = [];
    for (let i = 0; i < 10; i += 1) {
      const r = i % 2 === 0 ? rOuter : rInner;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      points.push(new Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
    }
    points.push(points[0].clone());
    return new CatmullRomCurve3(points, false);
  }, []);
  const opacity = 0.85 * (1 - (explodeRef.current ?? 0));
  return (
    <mesh position={[0, 3.3, 0]}>
      <tubeGeometry args={[path, 120, 0.05, 12, false]} />
      <meshStandardMaterial
        color="#ff3b3b"
        emissive="#ff3b3b"
        emissiveIntensity={1.8}
        metalness={0.6}
        roughness={0.25}
        transparent
        opacity={opacity}
      />
    </mesh>
  );
}

function ExplosionVoxels({
  controlsRef,
  explodeRef,
  collapseRef,
  count = 420,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl>;
  explodeRef: React.RefObject<number>;
  collapseRef: React.RefObject<number>;
  count?: number;
}) {
  const createGiftTexture = (base: string, stripe: string, accent: string) => {
    if (typeof document === 'undefined') return undefined;
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = stripe;
    ctx.lineWidth = size * 0.12;
    for (let x = -size; x < size * 2; x += size * 0.35) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + size, size);
      ctx.stroke();
    }

    ctx.fillStyle = accent;
    const dot = size * 0.05;
    for (let y = dot; y < size; y += size * 0.2) {
      for (let x = dot; x < size; x += size * 0.2) {
        ctx.beginPath();
        ctx.arc(x, y, dot * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const texture = new CanvasTexture(canvas);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  };

  const createRibbonedSphereTexture = (base: string, ribbon: string, accent: string) => {
    if (typeof document === 'undefined') return undefined;
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = ribbon;
    const band = size * 0.18;
    ctx.fillRect(0, size * 0.5 - band / 2, size, band);
    ctx.fillRect(size * 0.5 - band / 2, 0, band, size);

    ctx.strokeStyle = accent;
    ctx.lineWidth = size * 0.015;
    for (let i = 0; i < 6; i += 1) {
      const offset = (i / 6) * size;
      ctx.beginPath();
      ctx.moveTo(-size * 0.1 + offset, 0);
      ctx.lineTo(size * 0.9 + offset, size);
      ctx.stroke();
    }

    ctx.fillStyle = accent;
    for (let i = 0; i < 18; i += 1) {
      ctx.beginPath();
      ctx.arc(Math.random() * size, Math.random() * size, size * 0.012, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new CanvasTexture(canvas);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  };

  const createFestiveSphereTexture = (base: string, ribbon: string, accent: string, sparkle: string) => {
    if (typeof document === 'undefined') return undefined;
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.arc(size * 0.35, size * 0.35, size * 0.45, 0, Math.PI * 2);
    ctx.fill();

    const band = size * 0.2;
    ctx.fillStyle = ribbon;
    ctx.fillRect(0, size * 0.5 - band / 2, size, band);
    ctx.fillRect(size * 0.5 - band / 2, 0, band, size);

    ctx.strokeStyle = accent;
    ctx.lineWidth = size * 0.018;
    ctx.strokeRect(0, size * 0.5 - band / 2, size, band);
    ctx.strokeRect(size * 0.5 - band / 2, 0, band, size);

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.ellipse(size * 0.5 - band * 0.18, size * 0.5, band * 0.28, band * 0.2, 0, 0, Math.PI * 2);
    ctx.ellipse(size * 0.5 + band * 0.18, size * 0.5, band * 0.28, band * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = sparkle;
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.5, band * 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = sparkle;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = size * 0.012;
    for (let i = -size; i < size * 2; i += size * 0.22) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = sparkle;
    for (let i = 0; i < 28; i += 1) {
      ctx.beginPath();
      ctx.arc(Math.random() * size, Math.random() * size, size * 0.012, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new CanvasTexture(canvas);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  };

  const giftTextures = useMemo(
    () => ({
      gold: createGiftTexture('#d4b246', '#b5121b', '#fff2cc'),
      red: createGiftTexture('#b5121b', '#f5d76e', '#ffecc0'),
    }),
    []
  );

  const sphereTextures = useMemo(
    () => ({
      gold: createFestiveSphereTexture('#f1d38a', '#b5121b', '#0f4c3b', '#fff2cc'),
      red: createRibbonedSphereTexture('#b5121b', '#f5d76e', '#ffecc0'),
    }),
    []
  );

  const base = useMemo(() => {
    const pts: { pos: Vector3; dir: Vector3; size: number }[] = [];
    for (let i = 0; i < count; i += 1) {
      const h = Math.random() * 3.6;
      const radius = 1.8 * (1 - h / 4) * (0.6 + Math.random() * 0.6);
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * radius * (0.9 + Math.random() * 0.15);
      const z = Math.sin(angle) * radius * (0.9 + Math.random() * 0.15);
      const y = h - 1.3;
      const pos = new Vector3(x, y, z);
      const dir = pos
        .clone()
        .add(new Vector3((Math.random() - 0.5) * 0.8, Math.random() * 1.2, (Math.random() - 0.5) * 0.8))
        .normalize();
      pts.push({ pos, dir, size: 0.035 + Math.random() * 0.07 });
    }
    return pts;
  }, [count]);

  const matrix = useMemo(() => new Matrix4(), []);
  const dummy = useMemo(() => new Object3D(), []);

  // extra burst sets
  const makeBurst = (num: number, sizeMin: number, sizeMax: number, height = 3.8) => {
    const arr: { pos: Vector3; dir: Vector3; size: number; rot?: Vector3 }[] = [];
    for (let i = 0; i < num; i += 1) {
      const h = Math.random() * height;
      const radius = 2.0 * (1 - h / height) * (0.6 + Math.random() * 0.6);
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * radius * (0.9 + Math.random() * 0.15);
      const z = Math.sin(angle) * radius * (0.9 + Math.random() * 0.15);
      const y = h - 1.4;
      const pos = new Vector3(x, y, z);
      const dir = pos
        .clone()
        .add(new Vector3((Math.random() - 0.5) * 0.8, Math.random() * 1.2, (Math.random() - 0.5) * 0.8))
        .normalize();
      const size = sizeMin + Math.random() * (sizeMax - sizeMin);
      arr.push({ pos, dir, size });
    }
    return arr;
  };

  const makeBoxes = (num: number, sizeMin: number, sizeMax: number, height = 3.8) => {
    const arr: { pos: Vector3; dir: Vector3; size: number; rot?: Vector3 }[] = [];
    for (let i = 0; i < num; i += 1) {
      const h = Math.random() * height;
      const radius = 2.0 * (1 - h / height) * (0.6 + Math.random() * 0.6);
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * radius * (0.9 + Math.random() * 0.15);
      const z = Math.sin(angle) * radius * (0.9 + Math.random() * 0.15);
      const y = h - 1.4;
      const pos = new Vector3(x, y, z);
      const dir = pos
        .clone()
        .add(new Vector3((Math.random() - 0.5) * 0.8, Math.random() * 1.2, (Math.random() - 0.5) * 0.8))
        .normalize();
      const size = sizeMin + Math.random() * (sizeMax - sizeMin);
      const rot = new Vector3(Math.random() * 0.5, Math.random() * Math.PI * 2, Math.random() * 0.5);
      arr.push({ pos, dir, size, rot });
    }
    return arr;
  };

  const goldSpheres = useMemo(() => makeBurst(80, 0.04, 0.08), []);
  const redSpheres = useMemo(() => makeBurst(80, 0.045, 0.085), []);
  const whiteSpheres = useMemo(() => makeBurst(160, 0.035, 0.07), []);
  const goldBoxes = useMemo(() => makeBoxes(75, 0.05, 0.1), []);
  const redBoxes = useMemo(() => makeBoxes(53, 0.05, 0.09), []);
  const snowFlakes = useMemo(() => makeBurst(600, 0.01, 0.02, 4.2), []);
  const goldCards = useMemo(() => {
    const arr: { pos: Vector3; dir: Vector3; size: number; rot: Vector3 }[] = [];
    for (let i = 0; i < 25; i += 1) {
      const base = makeBurst(1, 0.08, 0.12, 3.8)[0];
      arr.push({ ...base, rot: new Vector3(Math.random() * 0.4, Math.random() * Math.PI * 2, Math.random() * 0.3) });
    }
    return arr;
  }, []);

  const goldSphereRef = useRef<InstancedMesh>(null);
  const redSphereRef = useRef<InstancedMesh>(null);
  const whiteSphereRef = useRef<InstancedMesh>(null);
  const goldBoxRef = useRef<InstancedMesh>(null);
  const redBoxRef = useRef<InstancedMesh>(null);
  const goldRibbonXRef = useRef<InstancedMesh>(null);
  const goldRibbonYRef = useRef<InstancedMesh>(null);
  const redRibbonXRef = useRef<InstancedMesh>(null);
  const redRibbonYRef = useRef<InstancedMesh>(null);
  const snowRef = useRef<InstancedMesh>(null);
  const cardRef = useRef<InstancedMesh>(null);

  const updateBurst = (items: { pos: Vector3; dir: Vector3; size: number; rot?: Vector3 }[], ref: RefObject<InstancedMesh>) => {
    if (!ref.current) return;
    items.forEach((p, i) => {
      const offset = p.dir.clone().multiplyScalar(3 * explodeRef.current);
      dummy.position.copy(p.pos.clone().add(offset));
      dummy.scale.setScalar(p.size * (1 + explodeRef.current * 1.6));
      if (p.rot) dummy.rotation.set(p.rot.x, p.rot.y, p.rot.z);
      dummy.lookAt(offset.x * 2, offset.y * 2, offset.z * 2);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  };

  const updateRibbons = (
    items: { pos: Vector3; dir: Vector3; size: number; rot?: Vector3 }[],
    ref: RefObject<InstancedMesh>,
    axis: 'x' | 'y'
  ) => {
    if (!ref.current) return;
    items.forEach((p, i) => {
      const offset = p.dir.clone().multiplyScalar(3 * explodeRef.current);
      dummy.position.copy(p.pos.clone().add(offset));
      const long = p.size * 1.6; // overhang to be visible
      const thick = p.size * 0.4; // thicker ribbon
      if (axis === 'x') {
        dummy.scale.set(long, thick, thick);
      } else {
        dummy.scale.set(thick, long, thick);
      }
      dummy.position.z += thick * 0.7; // lift ribbon outward to avoid z-fight and让绑带凸出
      if (p.rot) dummy.rotation.set(p.rot.x, p.rot.y, p.rot.z);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  };

  useFrame(() => {
    const dist = controlsRef.current?.getDistance?.() ?? 6;
    const start = 6.5; // 开始炸散的距离（越近越炸）
    const end = 4.5; // 完全炸散的距离
    const target = Math.min(1, Math.max(0, (start - dist) / (start - end)));
    collapseRef.current = target;
    explodeRef.current = explodeRef.current ?? 0;
    explodeRef.current += (target - explodeRef.current) * 0.08;

    base.forEach((p, i) => {
      const offset = p.dir.clone().multiplyScalar(3 * explodeRef.current);
      dummy.position.copy(p.pos.clone().add(offset));
      dummy.scale.setScalar(p.size * (1 + explodeRef.current * 1.6));
      dummy.lookAt(offset.x * 2, offset.y * 2, offset.z * 2);
      dummy.updateMatrix();
      matrix.copy(dummy.matrix);
      (instancedRef.current as InstancedMesh).setMatrixAt(i, matrix);
    });
    if (instancedRef.current) {
      instancedRef.current.instanceMatrix.needsUpdate = true;
    }

    updateBurst(goldSpheres, goldSphereRef);
    updateBurst(redSpheres, redSphereRef);
    updateBurst(whiteSpheres, whiteSphereRef);
    updateBurst(goldBoxes, goldBoxRef);
    updateBurst(redBoxes, redBoxRef);
    updateRibbons(goldBoxes, goldRibbonXRef, 'x');
    updateRibbons(goldBoxes, goldRibbonYRef, 'y');
    updateRibbons(redBoxes, redRibbonXRef, 'x');
    updateRibbons(redBoxes, redRibbonYRef, 'y');
    updateBurst(snowFlakes, snowRef);
    updateBurst(goldCards, cardRef);
  });

  const instancedRef = useRef<InstancedMesh>(null);

  return (
    <>
      <instancedMesh ref={instancedRef} args={[undefined, undefined, count]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>

      <instancedMesh ref={goldSphereRef} args={[undefined, undefined, goldSpheres.length]} castShadow receiveShadow>
        <sphereGeometry args={[1, 12, 12]} />
        <meshPhysicalMaterial
          map={sphereTextures.gold}
          color="#ffffff"
          emissive="#f5d76e"
          emissiveIntensity={0.45}
          metalness={0.8}
          roughness={0.25}
          clearcoat={0.6}
          clearcoatRoughness={0.22}
        />
      </instancedMesh>

      <instancedMesh ref={redSphereRef} args={[undefined, undefined, redSpheres.length]} castShadow receiveShadow>
        <sphereGeometry args={[1, 12, 12]} />
        <meshPhysicalMaterial
          map={sphereTextures.red}
          color="#ffffff"
          emissive="#b5121b"
          emissiveIntensity={0.38}
          metalness={0.75}
          roughness={0.28}
          clearcoat={0.55}
          clearcoatRoughness={0.25}
        />
      </instancedMesh>

      <instancedMesh ref={whiteSphereRef} args={[undefined, undefined, whiteSpheres.length]} castShadow receiveShadow>
        <sphereGeometry args={[1, 12, 12]} />
        <meshStandardMaterial color="#f7f7f7" emissive="#f7f7f7" emissiveIntensity={0.4} metalness={0.6} roughness={0.35} />
      </instancedMesh>

      <instancedMesh ref={goldBoxRef} args={[undefined, undefined, goldBoxes.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial
          map={giftTextures.gold}
          color="#ffffff"
          emissive="#cba53a"
          emissiveIntensity={0.2}
          metalness={0.55}
          roughness={0.42}
          clearcoat={0.6}
          clearcoatRoughness={0.25}
        />
      </instancedMesh>

      <instancedMesh ref={goldRibbonXRef} args={[undefined, undefined, goldBoxes.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#b5121b" emissive="#ff3b3b" emissiveIntensity={1.1} metalness={0.15} roughness={0.35} />
      </instancedMesh>
      <instancedMesh ref={goldRibbonYRef} args={[undefined, undefined, goldBoxes.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#b5121b" emissive="#ff3b3b" emissiveIntensity={1.1} metalness={0.15} roughness={0.35} />
      </instancedMesh>

      <instancedMesh ref={redBoxRef} args={[undefined, undefined, redBoxes.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial
          map={giftTextures.red}
          color="#ffffff"
          emissive="#9a0f17"
          emissiveIntensity={0.18}
          metalness={0.5}
          roughness={0.45}
          clearcoat={0.55}
          clearcoatRoughness={0.3}
        />
      </instancedMesh>

      <instancedMesh ref={redRibbonXRef} args={[undefined, undefined, redBoxes.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#f5d76e" emissive="#ffe49a" emissiveIntensity={1.05} metalness={0.15} roughness={0.35} />
      </instancedMesh>
      <instancedMesh ref={redRibbonYRef} args={[undefined, undefined, redBoxes.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#f5d76e" emissive="#ffe49a" emissiveIntensity={1.05} metalness={0.15} roughness={0.35} />
      </instancedMesh>

      <instancedMesh ref={snowRef} args={[undefined, undefined, snowFlakes.length]} castShadow receiveShadow>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>

      <instancedMesh ref={cardRef} args={[undefined, undefined, goldCards.length]} castShadow receiveShadow>
        <planeGeometry args={[1, 1.4]} />
        <meshStandardMaterial color="#f5d76e" emissive="#f5d76e" emissiveIntensity={0.3} metalness={0.6} roughness={0.4} side={2} />
      </instancedMesh>
    </>
  );
}

function TreeBody({
  explodeRef,
  collapseRef,
}: {
  explodeRef: React.RefObject<number>;
  collapseRef: React.RefObject<number>;
}) {
  const ref = useRef<Group>(null);
  const matLower = useRef<MeshPhysicalMaterial>(null);
  const matUpper = useRef<MeshPhysicalMaterial>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.12;
      const hide = collapseRef.current ?? 0;
      ref.current.visible = hide < 0.55;
    }
    const f = explodeRef.current ?? 0;
    if (matLower.current) {
      matLower.current.transparent = true;
      matLower.current.opacity = 1 - f;
    }
    if (matUpper.current) {
      matUpper.current.transparent = true;
      matUpper.current.opacity = 1 - f;
    }
  });

  return (
    <group ref={ref} position={[0, 0.3, 0]}>
      <CoreSilhouette explodeRef={explodeRef} />
      <FoliagePoints explodeRef={explodeRef} />
      <LightSpecks explodeRef={explodeRef} />
      <GiftBoxes explodeRef={explodeRef} />
      <OrnamentField explodeRef={explodeRef} />
      <GoldenRibbon explodeRef={explodeRef} />
      <StarTop explodeRef={explodeRef} />
      <NeonStar explodeRef={explodeRef} />

      <Sparkles
        count={220}
        speed={0.38}
        scale={[3.6, 5.2, 3.6]}
        size={2.8}
        opacity={0.45}
        color="#f5d76e"
        position={[0, 1, 0]}
      />
    </group>
  );
}

function Ground() {
  return (
    <group position={[0, -1.9, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[6, 64]} />
        <meshStandardMaterial
          color="#0b251f"
          metalness={0.6}
          roughness={0.35}
          emissive="#0b1f1a"
          emissiveIntensity={0.4}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.02, 0]}>
        <ringGeometry args={[2, 2.8, 64]} />
        <meshPhysicalMaterial
          color="#f5d76e"
          emissive="#f1d38a"
          emissiveIntensity={0.8}
          metalness={1}
          roughness={0.2}
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  );
}

function Atmosphere() {
  return (
    <group>
      <Stars radius={40} depth={20} count={1800} factor={0.2} saturation={0.2} fade />
    </group>
  );
}

function PostEffects() {
  return (
    <EffectComposer multisampling={4}>
      <Bloom
        intensity={1.05}
        luminanceThreshold={0.22}
        luminanceSmoothing={0.35}
        mipmapBlur
      />
      <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={[0.0007, 0.0007]} />
      <DepthOfField focusDistance={0.017} focalLength={0.03} bokehScale={2.8} height={480} />
      <Vignette eskil={false} offset={0.22} darkness={0.85} />
    </EffectComposer>
  );
}

function TreeScene() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const explodeRef = useRef(0);
  const collapseRef = useRef(0);
  const treePos: [number, number, number] = [-0.1, 0.3, 0];
  const treeScale = 0.84;
  const treeTarget: [number, number, number] = [treePos[0], treePos[1] + 0.5, treePos[2]];
  const photoFocusCenter: [number, number, number] = [
    treeTarget[0] - treePos[0],
    treeTarget[1] - treePos[1],
    treeTarget[2] - treePos[2],
  ];
  return (
    <>
      <SceneLights />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.12}
        minDistance={3.8}
        maxDistance={9}
        maxPolarAngle={Math.PI / 1.8}
        target={treeTarget}
      />
      <Suspense fallback={null}>
        <group position={treePos} scale={treeScale}>
          <TreeBody explodeRef={explodeRef} collapseRef={collapseRef} />
          <FloatingPhotos explodeRef={explodeRef} collapseRef={collapseRef} focusCenter={photoFocusCenter} />
          <Ground />
          <ExplosionVoxels controlsRef={controlsRef} explodeRef={explodeRef} collapseRef={collapseRef} />
        </group>
        <Atmosphere />
      </Suspense>
      <PostEffects />
    </>
  );
}

export default TreeScene;
