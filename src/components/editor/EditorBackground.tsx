import React, { useState, useEffect } from 'react';
import type { Theme } from '../../core/themes/types';
import { pluginManager } from '../../core/plugins/PluginManager';

export type BackgroundEffect = 'solid' | 'aurora' | 'grain' | 'grid' | 'ruled';

interface Props {
  theme: Theme;
  effect: BackgroundEffect;
  intensity: number; // 0.1 to 1.0
}

export const EditorBackground: React.FC<Props> = React.memo(({ theme, effect, intensity }) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    return pluginManager.subscribe(() => setTick((t) => t + 1));
  }, []);

  if (effect === 'solid') return null;

  const renderers = pluginManager.getBackgroundRenderers();
  const targetRenderer = renderers.find((r) => r.id === effect);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none">
      {targetRenderer ? targetRenderer.render(theme, intensity) : null}
    </div>
  );
});


