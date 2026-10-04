/**
 * `React.lazy` with a `preload()` handle, so navigation links can start
 * loading a page's code on hover or focus (food-loading-states).
 */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

type PageModule = { default: ComponentType };

export type PreloadablePage = LazyExoticComponent<ComponentType> & { preload: () => Promise<PageModule> };

export function lazyPage(load: () => Promise<PageModule>): PreloadablePage {
  let pending: Promise<PageModule> | null = null;
  const preload = () => {
    pending ??= load().catch((cause: unknown) => {
      pending = null;
      throw cause;
    });
    return pending;
  };
  return Object.assign(lazy(preload), { preload });
}
