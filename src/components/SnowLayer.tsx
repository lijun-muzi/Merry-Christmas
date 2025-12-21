import { useMemo } from 'react';

type Snowflake = {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  drift: number;
};

type SnowLayerProps = {
  count?: number;
};

const SnowLayer = ({ count = 70 }: SnowLayerProps) => {
  const flakes = useMemo<Snowflake[]>(
    () =>
      Array.from({ length: count }, (_, index) => ({
        id: index,
        left: Math.random() * 100,
        size: 2 + Math.random() * 4,
        duration: 12 + Math.random() * 14,
        delay: -Math.random() * 20,
        opacity: 0.35 + Math.random() * 0.5,
        drift: (Math.random() * 2 - 1) * 24,
      })),
    [count]
  );

  return (
    <div className="snow-layer" aria-hidden="true">
      {flakes.map((flake) => (
        <span
          key={flake.id}
          className="snowflake"
          style={
            {
              left: `${flake.left}%`,
              '--snow-size': `${flake.size}px`,
              '--snow-duration': `${flake.duration}s`,
              '--snow-delay': `${flake.delay}s`,
              '--snow-opacity': flake.opacity,
              '--snow-drift': `${flake.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};

export default SnowLayer;
