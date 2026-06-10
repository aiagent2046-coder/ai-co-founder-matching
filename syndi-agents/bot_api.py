"""SyndiBot — клиент через наши Next.js API endpoints, а не через Supabase REST.
Тестирует реальный путь юзера: Zod-валидацию, rate-limits, auto-reply, наш scoring."""
from __future__ import annotations

import asyncio
import logging
import random
from dataclasses import dataclass, field
from typing import Any, Optional

import httpx

logger = logging.getLogger("syndi-bot")

DEFAULT_APP_URL = "https://syndimatch.online"


@dataclass
class BotState:
    user_id: Optional[str] = None
    founder_id: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    onboarding_complete: bool = False
    candidates_seen: set = field(default_factory=set)
    matches: list = field(default_factory=list)
    conversations: dict = field(default_factory=dict)


class SyndiBot:
    """API-driven бот. Совместим с двухфазным orchestrator."""

    def __init__(self, profile, supabase_url, supabase_anon_key, app_url=None):
        import os
        self.profile = profile
        self.supabase_url = supabase_url.rstrip("/")
        self.supabase_anon_key = supabase_anon_key
        self.app_url = (app_url or os.environ.get("SYNDI_APP_URL") or DEFAULT_APP_URL).rstrip("/")
        self.state = BotState()
        self._client: Optional[httpx.AsyncClient] = None

    async def _http(self):
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=90.0)
        return self._client

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None

    # ── Retry helper (429 backoff + 5xx retry) ────────────────────────────────

    async def _retry(self, fn, what, max_attempts=4):
        for attempt in range(1, max_attempts + 1):
            try:
                return await fn()
            except httpx.HTTPStatusError as e:
                code = e.response.status_code
                body = e.response.text[:300]
                if code == 429:
                    wait = 2 ** attempt + random.uniform(0, 2)
                    logger.warning(f"[{self.profile['name']}] {what} 429, retry in {wait:.1f}s")
                    await asyncio.sleep(wait)
                elif 500 <= code < 600:
                    wait = 2 ** attempt
                    logger.warning(f"[{self.profile['name']}] {what} {code}, retry in {wait:.1f}s")
                    await asyncio.sleep(wait)
                else:
                    logger.error(f"[{self.profile['name']}] {what} {code}: {body}")
                    return None
            except (httpx.RequestError, asyncio.TimeoutError) as e:
                wait = 2 ** attempt
                logger.warning(f"[{self.profile['name']}] {what} network: {e}, retry {wait:.1f}s")
                await asyncio.sleep(wait)
        logger.error(f"[{self.profile['name']}] {what} failed after {max_attempts} attempts")
        return None

    # ── Auth: Supabase direct (нет signup-роута в нашем app) ─────────────────

    async def signup(self) -> bool:
        async def _do():
            r = await (await self._http()).post(
                f"{self.supabase_url}/auth/v1/signup",
                headers={"apikey": self.supabase_anon_key, "Content-Type": "application/json"},
                json={"email": self.profile["email"], "password": self.profile["password"]},
            )
            r.raise_for_status()
            d = r.json()
            self.state.user_id = (d.get("user") or {}).get("id") or d.get("id")
            self.state.access_token = d.get("access_token") or (d.get("session") or {}).get("access_token")
            self.state.refresh_token = d.get("refresh_token") or (d.get("session") or {}).get("refresh_token")
            return bool(self.state.access_token and self.state.user_id)
        return bool(await self._retry(_do, "signup"))

    async def login(self) -> bool:
        async def _do():
            r = await (await self._http()).post(
                f"{self.supabase_url}/auth/v1/token?grant_type=password",
                headers={"apikey": self.supabase_anon_key, "Content-Type": "application/json"},
                json={"email": self.profile["email"], "password": self.profile["password"]},
            )
            r.raise_for_status()
            d = r.json()
            self.state.user_id = (d.get("user") or {}).get("id")
            self.state.access_token = d.get("access_token")
            self.state.refresh_token = d.get("refresh_token")
            return bool(self.state.access_token)
        return bool(await self._retry(_do, "login"))

    # ── Vercel API helpers ───────────────────────────────────────────────────

    def _headers(self):
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.state.access_token or ''}",
        }

    async def _api_post(self, path, body):
        async def _do():
            r = await (await self._http()).post(f"{self.app_url}{path}", headers=self._headers(), json=body)
            r.raise_for_status()
            return r.json() if r.text else {}
        return await self._retry(_do, f"POST {path}")

    async def _api_get(self, path, params=None):
        async def _do():
            r = await (await self._http()).get(f"{self.app_url}{path}", headers=self._headers(), params=params)
            r.raise_for_status()
            return r.json() if r.text else {}
        return await self._retry(_do, f"GET {path}")

    # ── Onboarding через наш API ─────────────────────────────────────────────

    async def fill_profile(self) -> bool:
        # ВАЖНО: route принимает подмножество полей и camelCase для lookingFor
        body = {
            "name":     self.profile["name"],
            "role":     self.profile["role"],
            "bio":      self.profile["bio"],
            "skills":   self.profile["skills"],
            "lookingFor": self.profile["looking_for"],
            "birthYear": random.randint(1970, 2004),
            "birthMonth": random.randint(1, 12),
            "birthDay": random.randint(1, 28),
            "stage":    self.profile["stage"],
            "domain":   self.profile["domain"],
            "location": self.profile["location"],
        }
        result = await self._api_post("/api/onboarding/profile", body)
        if result and result.get("ok"):
            logger.info(f"[{self.profile['name']}] Profile saved")
            return True
        return False

    async def take_big_five(self) -> bool:
        bf = self.profile["big_five"]
        result = await self._api_post("/api/onboarding/bigfive", {
            "scores": {
                "openness":          bf["openness"],
                "conscientiousness": bf["conscientiousness"],
                "extraversion":      bf["extraversion"],
                "agreeableness":     bf["agreeableness"],
                "neuroticism":       bf["neuroticism"],
            },
        })
        return bool(result and result.get("ok"))

    async def take_behavioral(self) -> bool:
        e = self.profile.get("emotions", {"empathy":50,"anger":50,"cunning":50,"lying":50,"honesty":50})
        bf = self.profile["big_five"]
        rng = random.Random(self.profile["index"] * 277)

        def lk(s):
            return max(1, min(5, int(round(s / 25.0 + rng.choice([-0.5,0,0,0,0.5]) + 1))))

        def w(opts):
            ks = list(opts.keys())
            return rng.choices(ks, weights=[max(1.0, opts[k]) for k in ks], k=1)[0]

        q1 = lk((e["lying"] + e["cunning"] + (100-e["honesty"])) / 3)
        q2 = lk((e["empathy"] + e["honesty"]) / 2)
        q3 = lk((e["cunning"] + (100-e["honesty"])) / 2)
        q4 = lk((bf["extraversion"] + (100-bf["agreeableness"])) / 2)
        q5 = lk((e["empathy"] + bf["openness"]) / 2)
        q6 = lk((bf["openness"] + (100-bf["conscientiousness"])) / 2)
        q7 = w({
            "competing":     (e["anger"]+(100-e["empathy"]))/2,
            "collaborating": (e["empathy"]+e["honesty"])/2,
            "compromising":  100-abs(e["anger"]-50)-abs(e["empathy"]-50),
            "avoiding":      (100-e["anger"])*0.7,
        })
        q8 = w({
            "confront":    e["anger"],
            "investigate": e["empathy"],
            "redistribute":60.0,
            "absorb":      e["cunning"],
        })
        q9 = w({
            "parallel": e["cunning"],
            "debate":   (e["honesty"]+e["anger"])/2,
            "merge":    e["empathy"],
            "concede":  (100-e["anger"])*(100-e["cunning"])/100,
        })
        q10 = w({
            "chaos":       e["honesty"],
            "cold":        e["empathy"],
            "no_ambition": e["anger"],
            "overthink":   100-e["anger"],
        })
        q11 = w({
            "do":       bf["extraversion"]+(100-bf["conscientiousness"]),
            "plan":     bf["conscientiousness"]*1.5,
            "talk":     (bf["agreeableness"]+bf["extraversion"])/2,
            "creative": bf["openness"]+(100-bf["conscientiousness"]),
        })
        q12 = w({
            "lawgiver":  (bf["conscientiousness"]+e["honesty"])/2,
            "flexible":  (100-e["honesty"]+e["cunning"])/2,
            "anarchist": (e["anger"]+(100-bf["conscientiousness"]))/2,
            "executor":  (e["honesty"]+bf["conscientiousness"])/2,
        })

        bp = {
            "honesty_humility": round(sum([6-q1, q2, 6-q3])/3 * 20),
            "values":     {"achievement_power": q4*20, "universalism": q5*20, "self_direction": q6*20},
            "conflict":   {"primary_style": q7, "performance_response": q8, "strategy_response": q9},
            "projective": {"partner_irritants": q10, "decision_style": q11, "rule_orientation": q12},
        }
        result = await self._api_post("/api/onboarding/behavioral", {"behavioral_profile": bp})
        if result and result.get("ok"):
            logger.info(f"[{self.profile['name']}] Behavioral: H={bp['honesty_humility']}, q7={q7}")
            return True
        return False

    async def recompute_embedding(self) -> bool:
        # /api/discover/match не работает без этого
        result = await self._api_post("/api/embedding/recompute", {})
        if result and result.get("ok"):
            logger.info(f"[{self.profile['name']}] Embedding computed (dim={result.get('dim')})")
            return True
        return False

    async def complete_onboarding(self) -> bool:
        result = await self._api_post("/api/onboarding/complete", {})
        if result and result.get("ok"):
            self.state.onboarding_complete = True
            return True
        return False

    async def run_full_onboarding(self) -> bool:
        logger.info(f"[{self.profile['name']}] === ONBOARDING (via API) ===")
        if not await self.signup():
            logger.error(f"[{self.profile['name']}] signup failed")
            return False
        await asyncio.sleep(random.uniform(1, 3))
        if not await self.fill_profile():
            logger.error(f"[{self.profile['name']}] profile failed")
            return False
        await self.take_big_five()
        await asyncio.sleep(random.uniform(0.5, 1.5))
        await self.take_behavioral()
        await asyncio.sleep(random.uniform(0.5, 1.5))
        await self.recompute_embedding()
        await asyncio.sleep(random.uniform(0.5, 1.5))
        ok = await self.complete_onboarding()
        if ok:
            logger.info(f"[{self.profile['name']}] Onboarding complete ✓")
        return ok

    # ── Discover, swipe — через наши API ─────────────────────────────────────

    async def get_candidates(self) -> list:
        result = await self._api_post("/api/discover/match", {})
        if not result:
            return []
        cands = result.get("candidates", []) or []
        filtered = [c for c in cands if (c.get("user_id") or c.get("id")) not in self.state.candidates_seen]
        logger.info(f"[{self.profile['name']}] Got {len(filtered)} candidates (of {len(cands)})")
        return filtered

    def _compat(self, candidate):
        score = 0.0
        my = self.profile["big_five"]
        their = candidate.get("big_five") or {}
        if their:
            diffs = []
            for t in ["openness","conscientiousness","extraversion","agreeableness","neuroticism"]:
                d = abs(my.get(t, 50) - their.get(t, 50)) / 100
                diffs.append(max(0, min(1, 1 - abs(d - 0.4) / 0.25)))
            score += (sum(diffs)/5) * 0.40
        else:
            score += 0.20
        if (candidate.get("domain") or "").lower() == self.profile["domain"].lower():
            score += 0.20
        else:
            score += 0.12
        my_sk = set(s.lower() for s in self.profile["skills"])
        their_sk = set((s or "").lower() for s in (candidate.get("skills") or []))
        if my_sk and their_sk:
            j = len(my_sk & their_sk) / max(1, len(my_sk | their_sk))
            score += max(0, 1 - abs(j - 0.3) * 1.5) * 0.20
        else:
            score += 0.10
        return min(1.0, max(0.0, score))

    async def swipe(self, candidate) -> dict:
        to_user = candidate.get("user_id") or candidate.get("id")
        if not to_user or to_user in self.state.candidates_seen:
            return {"action":"pass","mutual":False}
        self.state.candidates_seen.add(to_user)
        compat = self._compat(candidate)
        thresh = 0.45 + random.uniform(-0.05, 0.05)
        action = "like" if compat >= thresh else "pass"

        # /api/swipe сам создаёт строку в matches при mutual + триггерит auto-reply
        result = await self._api_post("/api/swipe", {"to_user": to_user, "action": action})
        mutual = bool(result and result.get("mutual"))
        if mutual:
            self.state.matches.append({
                "user_id": to_user,
                "name":    candidate.get("name"),
                "match_id":result.get("match_id"),
            })
            logger.info(f"[{self.profile['name']}] ✓ MUTUAL with {candidate.get('name')} (compat={compat:.2f})")
        return {"action": action, "mutual": mutual}

    async def run_discover_session(self, max_swipes=15) -> int:
        cands = await self.get_candidates()
        if not cands:
            return 0
        for c in cands[:max_swipes]:
            await self.swipe(c)
            await asyncio.sleep(random.uniform(0.4, 1.2))
        return min(len(cands), max_swipes)

    # ── Chat ─────────────────────────────────────────────────────────────────

    async def get_matches_list(self) -> list:
        result = await self._api_get("/api/matches/list")
        return result.get("matches", []) if result else []

    async def send_message(self, match_id, content) -> bool:
        result = await self._api_post("/api/messages", {"matchId": match_id, "content": content})
        return bool(result and not result.get("error"))

    async def chat_with_matches(self) -> int:
        matches = await self.get_matches_list()
        sent = 0
        for m in matches[:3]:
            mid = m.get("id") or m.get("match_id")
            if not mid:
                continue
            peer = m.get("peer_name") or m.get("name") or "founder"
            opener = f"Привет, {peer}! Расскажи, на чём сейчас сфокусирован?"
            if await self.send_message(mid, opener):
                sent += 1
                self.state.conversations[mid] = [opener]
            await asyncio.sleep(random.uniform(1, 3))
        return sent

    # ── Lifecycle (для двухфазного orchestrator) ─────────────────────────────

    async def run_onboard_only(self) -> None:
        try:
            await self.run_full_onboarding()
        except Exception as e:
            logger.error(f"[{self.profile['name']}] Onboard error: {e}")
        finally:
            await self.close()

    async def run_discover_only(self) -> None:
        try:
            if not self.state.access_token:
                if not await self.login():
                    return
            for i in range(3):
                logger.info(f"[{self.profile['name']}] Session {i+1}/3")
                await self.run_discover_session(max_swipes=15)
                await asyncio.sleep(random.uniform(3, 8))
            sent = await self.chat_with_matches()
            if sent:
                logger.info(f"[{self.profile['name']}] Sent {sent} opener(s)")
        except Exception as e:
            logger.error(f"[{self.profile['name']}] Discover error: {e}")
        finally:
            await self.close()
