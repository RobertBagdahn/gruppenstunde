// Presentation mode lives in the URL (?praesentation=1), so a shared link keeps it on (design, feedback spec).

import { useSearchParams } from 'react-router-dom';

export const PRESENTATION_PARAM = 'praesentation';

export function usePresentationMode(): [boolean, (on: boolean) => void] {
  const [params, setParams] = useSearchParams();
  const on = params.get(PRESENTATION_PARAM) === '1';
  const set = (next: boolean) => {
    setParams(
      (current) => {
        const copy = new URLSearchParams(current);
        if (next) copy.set(PRESENTATION_PARAM, '1');
        else copy.delete(PRESENTATION_PARAM);
        return copy;
      },
      { replace: true },
    );
  };
  return [on, set];
}
