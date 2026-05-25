// Глобальный прокси для всех HTTP запросов из Node.js
const { setGlobalDispatcher, ProxyAgent } = require('undici');

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxyUrl) {
  try {
    const dispatcher = new ProxyAgent({ uri: proxyUrl });
    setGlobalDispatcher(dispatcher);
    console.log('[proxy] Global proxy set:', proxyUrl);
  } catch(e) {
    console.warn('[proxy] Failed to set proxy:', e.message);
  }
}
