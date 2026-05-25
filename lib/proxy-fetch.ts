import axios, { AxiosResponse } from 'axios';

const PROXY = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;

function getProxyConfig() {
  if (!PROXY) return false;
  try {
    const u = new URL(PROXY);
    return { host: u.hostname, port: parseInt(u.port), protocol: u.protocol };
  } catch {
    return false;
  }
}

export async function proxyFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url     = input.toString();
  const method  = (init?.method ?? 'GET').toUpperCase();
  const headers = Object.fromEntries(new Headers(init?.headers ?? {}).entries());
  const body    = init?.body as string | undefined;

  const res: AxiosResponse = await axios({
    url,
    method,
    headers,
    data:         body,
    proxy:        getProxyConfig() as any,
    responseType: 'arraybuffer',
    validateStatus: () => true,
  });

  const responseBody = res.status === 204 ? null : res.data;
  return new Response(responseBody, {
    status:  res.status,
    headers: res.headers as any,
  });
}
