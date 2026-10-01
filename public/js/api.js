/** Fetch wrapper. Throws on any non-2xx so no caller can silently ignore a failure. */

export class ApiError extends Error {
  constructor({ code, message, field }) {
    super(message);
    this.code = code;
    this.field = field;
  }
}

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (cause) {
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: `Cannot reach the server: ${cause.message}`,
      field: null,
    });
  }

  if (res.status === 204) return null;

  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(payload?.error ?? { code: 'UNKNOWN', message: res.statusText, field: null });
  }
  return payload;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
};
