import { useEffect, useState } from 'react';
import type { GameModuleManifest } from '@seiyuu/game-sdk';
import { loadRegistry, peekRegistry } from './registry';

interface ModulesState {
  modules: GameModuleManifest[];
  loading: boolean;
  error: unknown;
}

/** 读模块注册表：门户列表与路由兜底都靠它。 */
export function useModules(): ModulesState {
  const snapshot = peekRegistry();
  const [state, setState] = useState<ModulesState>({
    modules: snapshot?.modules ?? [],
    loading: !snapshot,
    error: null,
  });

  useEffect(() => {
    let disposed = false;
    loadRegistry()
      .then((registry) => {
        if (disposed) return;
        setState({ modules: registry.modules, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (disposed) return;
        setState((previous) => ({ ...previous, loading: false, error }));
      });
    return () => {
      disposed = true;
    };
  }, []);

  return state;
}
