// URL state of list pages (UI-12): filters, search and page live in the query string, so links keep the view.

import { useSearchParams } from 'react-router-dom';

export function useUrlParam(name: string, fallback = ''): [string, (value: string) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(name) ?? fallback;
  const set = (next: string) => {
    setParams(
      (current) => {
        const copy = new URLSearchParams(current);
        if (next === '' || next === fallback) copy.delete(name);
        else copy.set(name, next);
        if (name !== 'page') copy.delete('page');
        return copy;
      },
      { replace: true },
    );
  };
  return [value, set];
}
