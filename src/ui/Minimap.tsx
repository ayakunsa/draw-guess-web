import React from 'react';
import type { Camera, Viewport } from '../camera';

interface Props { camera: Camera; viewport: Viewport; world: { x: number; y: number; w: number; h: number }; }

export const Minimap: React.FC<Props> = ({ camera, viewport, world }) => {
  const scale = 160 / Math.max(world.w, world.h);
  const sx = (wx: number) => (wx - world.x) * scale;
  const sy = (wy: number) => (wy - world.y) * scale;
  const left = (0 - camera.x) / camera.k, top = (0 - camera.y) / camera.k;
  const w = viewport.width / camera.k, h = viewport.height / camera.k;
  return (
    <div className="absolute bottom-4 right-4 w-[168px] h-[168px] rounded-xl bg-paper/95 border border-ink/20 shadow-lg overflow-hidden">
      <div className="absolute left-1 top-1 font-mono text-[9px] text-ink-soft">画桌小地图</div>
      <div className="absolute left-2 top-5 w-[152px] h-[152px] rounded bg-mat/10">
        <div className="absolute border-2 border-vermilion rounded-sm" style={{ left: sx(left), top: sy(top), width: w * scale, height: h * scale }} />
      </div>
    </div>
  );
};
