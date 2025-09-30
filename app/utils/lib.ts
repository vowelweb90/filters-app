export const json = (body: object | string | number, opts: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      ...(opts?.headers || {}),
    },
    ...(opts || {}),
  });
