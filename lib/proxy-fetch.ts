// На Vercel прокси не нужен — прямой интернет доступ
export async function proxyFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, init);
}
