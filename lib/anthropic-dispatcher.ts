import { ProxyAgent, type Dispatcher } from 'undici';

// Прокси для вызовов Anthropic: если задан ANTHROPIC_PROXY_URL — трафик к Claude
// идёт через forward-прокси (tinyproxy на не-RU IP), иначе прямой вызов (как раньше).
let agent: Dispatcher | undefined;
let resolved = false;

export function anthropicDispatcher(): Dispatcher | undefined {
  if (!resolved) {
    const url = process.env.ANTHROPIC_PROXY_URL;
    if (url) agent = new ProxyAgent(url);
    resolved = true;
  }
  return agent;
}
