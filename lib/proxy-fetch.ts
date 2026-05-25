import axios from 'axios';

const PROXY = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;

function getProxyConfig() {
  if (!PROXY) return false;
  const u = new URL(PROXY);
  return { host: u.hostname, port: parseInt(u.port), protocol: u.protocol };
}

// fetch-совместимая функция через axios + прокси
export async function proxyFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url     = input.toString();
  const method  = (init?.method ?? 'GET').toUpperCase();
  const headers = Object.fromEntries(new Headers(init?.headers ?? {}).entries());
  const body    = init?.body as string | undefined;

  try {
    const res: import('axios').AxiosResponse = await axios({
      url,
      method,
      headers,
      data:         body,
      proxy:        getProxyConfig() as any,
      responseType: 'arraybuffer',
      validateStatus: () => true, // не кидать ошибку на 4xx/5xx
    });

    // 204 No Content — нельзя передавать body
    const body = res.status === 204 ? null : res.data;
    return new Response(body, {
      status:  res.status,
      headers: res.headers as any,
    });
  } catch (e: any) {
    throw new TypeError(`proxyFetch failed: ${e.message}`);
  }
}
