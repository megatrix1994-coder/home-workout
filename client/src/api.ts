import { useEffect, useState } from 'react';

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string; statusCode?: number }
  | { status: 'ready'; data: T };

export function useApi<T>(path: string) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState({ status: 'loading' });

    fetch(path, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        if (!response.ok) {
          throw Object.assign(new Error(body?.error?.message ?? 'Could not load this page.'), {
            statusCode: response.status,
          });
        }
        return body as T;
      })
      .then((data) => {
        if (active) {
          setState({ status: 'ready', data });
        }
      })
      .catch((error: unknown) => {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) {
          return;
        }
        const statusCode =
          typeof error === 'object' && error && 'statusCode' in error
            ? Number(error.statusCode)
            : undefined;
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Could not load this page.',
          statusCode,
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [path, attempt]);

  return {
    ...state,
    retry: () => setAttempt((value) => value + 1),
  };
}
