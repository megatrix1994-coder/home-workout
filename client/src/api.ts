import { useEffect, useState } from 'react';

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string; statusCode?: number }
  | { status: 'ready'; data: T };

const RETRY_DELAY_MS = 300;

let unauthorizedListener: (() => void) | null = null;

export function onUnauthorized(listener: (() => void) | null) {
  unauthorizedListener = listener;
}

function noteStatus(response: Response) {
  if (response.status === 401) {
    unauthorizedListener?.();
  }
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

async function readBody<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  noteStatus(response);
  if (!response.ok) {
    throw Object.assign(new Error(body?.error?.message ?? 'Could not load this page.'), {
      statusCode: response.status,
    });
  }
  return body as T;
}

export function useApi<T>(path: string) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState({ status: 'loading' });

    async function load() {
      const first = await fetch(path, { signal: controller.signal });
      if (first.status !== 503) {
        return readBody<T>(first);
      }
      await wait(RETRY_DELAY_MS, controller.signal);
      return readBody<T>(await fetch(path, { signal: controller.signal }));
    }

    load()
      .then((data) => {
        if (active) {
          setState({ status: 'ready', data });
        }
      })
      .catch((error: unknown) => {
        if (
          !active ||
          (error instanceof DOMException && error.name === 'AbortError')
        ) {
          return;
        }
        const statusCode =
          typeof error === 'object' && error && 'statusCode' in error
            ? Number(error.statusCode)
            : undefined;
        setState({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Could not load this page.',
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

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  noteStatus(response);
  if (!response.ok) {
    throw Object.assign(
      new Error(body?.error?.message ?? 'Could not complete this request.'),
      {
        statusCode: response.status,
      },
    );
  }
  return body as T;
}
