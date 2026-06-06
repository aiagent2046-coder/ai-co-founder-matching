"""
Bot v2 — работает напрямую с Supabase REST API, минуя Vercel endpoints.
Решает проблему rate limiting на /api/*.
"""

from __future__ import annotations

import asyncio
import json
import logging
import random
import time
from dataclasses import dataclass, field
from typing import Any, Optional

import httpx
from httpx import NetworkError, TimeoutException

logger = logging.getLogger("syndi-bot")

# Retry config
MAX_RETRIES = 3
BASE_DELAY = 2.0


BIG_FIVE_QUESTIONS = [
    {"trait": "openness", "q": "I have a rich imagination and vivid fantasies."},
    {"trait": "openness", "q": "I enjoy trying new and unconventional ideas."},
    {"trait": "openness", "q": "I appreciate artistic and creative experiences."},
    {"trait": "openness", "q": "I prefer variety to routine."},
    {"trait": "openness", "q": "I am curious about many different things."},
    {"trait": "openness", "q": "I enjoy thinking about abstract concepts."},
    {"trait": "openness", "q": "I like to visit new places and experience different cultures."},
    {"trait": "openness", "q": "I enjoy philosophical discussions."},
    {"trait": "openness", "q": "I am interested in learning about different perspectives."},
    {"trait": "openness", "q": "I enjoy creative problem solving."},
    {"trait": "conscientiousness", "q": "I am always prepared and organized."},
    {"trait": "conscientiousness", "q": "I pay attention to details."},
    {"trait": "conscientiousness", "q": "I like to plan ahead rather than being spontaneous."},
    {"trait": "conscientiousness", "q": "I complete tasks thoroughly."},
    {"trait": "conscientiousness", "q": "I am careful and meticulous in my work."},
    {"trait": "conscientiousness", "q": "I keep my belongings neat and organized."},
    {"trait": "conscientiousness", "q": "I follow through on my commitments."},
    {"trait": "conscientiousness", "q": "I set clear goals and work towards them systematically."},
    {"trait": "conscientiousness", "q": "I am reliable and dependable."},
    {"trait": "conscientiousness", "q": "I prefer structure and schedules."},
    {"trait": "extraversion", "q": "I am the life of the party."},
    {"trait": "extraversion", "q": "I feel comfortable around people."},
    {"trait": "extraversion", "q": "I start conversations easily."},
    {"trait": "extraversion", "q": "I have a lot of energy and enthusiasm."},
    {"trait": "extraversion", "q": "I enjoy being the center of attention."},
    {"trait": "extraversion", "q": "I am talkative in group settings."},
    {"trait": "extraversion", "q": "I make friends easily."},
    {"trait": "extraversion", "q": "I enjoy social gatherings and networking events."},
    {"trait": "extraversion", "q": "I express my opinions openly."},
    {"trait": "extraversion", "q": "I am assertive and proactive."},
    {"trait": "agreeableness", "q": "I am interested in people and their well-being."},
    {"trait": "agreeableness", "q": "I sympathize with others' feelings."},
    {"trait": "agreeableness", "q": "I take time to help others."},
    {"trait": "agreeableness", "q": "I am kind and considerate to almost everyone."},
    {"trait": "agreeableness", "q": "I cooperate well with others."},
    {"trait": "agreeableness", "q": "I value harmony in group settings."},
    {"trait": "agreeableness", "q": "I trust people and give them the benefit of the doubt."},
    {"trait": "agreeableness", "q": "I am compassionate and empathetic."},
    {"trait": "agreeableness", "q": "I avoid conflicts and seek compromise."},
    {"trait": "agreeableness", "q": "I care about making others feel comfortable."},
    {"trait": "neuroticism", "q": "I get stressed out easily."},
    {"trait": "neuroticism", "q": "I worry about things going wrong."},
    {"trait": "neuroticism", "q": "I am easily disturbed by negative events."},
    {"trait": "neuroticism", "q": "I experience mood swings."},
    {"trait": "neuroticism", "q": "I feel anxious before important events."},
    {"trait": "neuroticism", "q": "I am sensitive to criticism."},
    {"trait": "neuroticism", "q": "I often feel blue or down."},
    {"trait": "neuroticism", "q": "I panic easily in unexpected situations."},
    {"trait": "neuroticism", "q": "I dwell on mistakes and regrets."},
    {"trait": "neuroticism", "q": "I feel overwhelmed by responsibilities."},
]


@dataclass
class BotState:
    user_id: Optional[str] = None
    access_token: Optional[str] = None
    founder_profile_id: Optional[int] = None
    onboarding_complete: bool = False
    candidates_seen: set[str] = field(default_factory=set)
    matches: list[dict] = field(default_factory=list)
    conversations: dict[str, list[dict]] = field(default_factory=dict)


class SyndiBot:
    def __init__(
        self,
        profile: dict[str, Any],
        supabase_url: str,
        supabase_anon_key: str,
    ) -> None:
        self.profile = profile
        self.state = BotState()
        self.supabase_url = supabase_url.rstrip("/")
        self.supabase_anon_key = supabase_anon_key
        self._client: Optional[httpx.AsyncClient] = None

    async def _client_(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            limits = httpx.Limits(max_connections=3, max_keepalive_connections=1)
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(30.0, connect=10.0),
                limits=limits,
            )
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def _with_retry(self, fn, description: str):
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                return await fn()
            except (NetworkError, TimeoutException) as e:
                delay = BASE_DELAY * (2 ** (attempt - 1)) + random.uniform(0, 1)
                if attempt < MAX_RETRIES:
                    logger.warning(f"[{self.profile['name']}] {description} retry {attempt}/{MAX_RETRIES} in {delay:.1f}s: {e}")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"[{self.profile['name']}] {description} failed: {e}")
                    raise
        return None

    # ── Auth ─────────────────────────────────────────────────────────────────

    async def signup(self) -> bool:
        async def _do():
            client = await self._client_()
            r = await client.post(
                f"{self.supabase_url}/auth/v1/signup",
                json={"email": self.profile["email"], "password": self.profile["password"],
                      "data": {"full_name": self.profile["name"]}},
                headers={"apikey": self.supabase_anon_key, "Content-Type": "application/json"},
            )
            if r.status_code in (200, 201):
                data = r.json()
                self.state.access_token = data.get("access_token")
                self.state.user_id = data.get("user", {}).get("id")
                return True
            if r.status_code == 422 and ("already" in r.text.lower() or "exists" in r.text.lower()):
                return await self.login()
            return False
        try:
            return await self._with_retry(_do, "Signup")
        except Exception:
            return False

    async def login(self) -> bool:
        async def _do():
            client = await self._client_()
            r = await client.post(
                f"{self.supabase_url}/auth/v1/token?grant_type=password",
                json={"email": self.profile["email"], "password": self.profile["password"]},
                headers={"apikey": self.supabase_anon_key, "Content-Type": "application/json"},
            )
            if r.status_code == 200:
                data = r.json()
                self.state.access_token = data.get("access_token")
                self.state.user_id = data.get("user", {}).get("id")
                return True
            return False
        try:
            return await self._with_retry(_do, "Login")
        except Exception:
            return False

    # ── Supabase REST helpers ────────────────────────────────────────────────

    def _auth_headers(self) -> dict:
        return {
            "apikey": self.supabase_anon_key,
            "Authorization": f"Bearer {self.state.access_token or self.supabase_anon_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    async def _supabase_post(self, table: str, data: dict) -> Optional[dict]:
        async def _do():
            client = await self._client_()
            r = await client.post(
                f"{self.supabase_url}/rest/v1/{table}",
                json=data, headers=self._auth_headers(),
            )
            if r.status_code in (200, 201):
                return r.json() if r.text else {}
            if r.status_code == 409:
                logger.debug(f"[{self.profile['name']}] {table}: duplicate, skipping")
                return {}
            logger.warning(f"[{self.profile['name']}] {table} POST -> {r.status_code}: {r.text[:200]}")
            return None
        try:
            return await self._with_retry(_do, f"POST {table}")
        except Exception:
            return None

    async def _supabase_patch(self, table: str, params: dict, data: dict) -> bool:
        async def _do():
            client = await self._client_()
            r = await client.patch(
                f"{self.supabase_url}/rest/v1/{table}",
                params=params, json=data, headers=self._auth_headers(),
            )
            return r.status_code in (200, 204)
        try:
            return await self._with_retry(_do, f"PATCH {table}")
        except Exception:
            return False

    async def _supabase_rpc(self, function: str, params: dict) -> Optional[dict]:
        async def _do():
            client = await self._client_()
            r = await client.post(
                f"{self.supabase_url}/rest/v1/rpc/{function}",
                json=params, headers=self._auth_headers(),
            )
            if r.status_code in (200, 201):
                return r.json() if r.text else {}
            logger.warning(f"[{self.profile['name']}] RPC {function} -> {r.status_code}: {r.text[:200]}")
            return None
        try:
            return await self._with_retry(_do, f"RPC {function}")
        except Exception:
            return None

    async def _supabase_get(self, table: str, params: dict = None) -> list:
        async def _do():
            client = await self._client_()
            r = await client.get(
                f"{self.supabase_url}/rest/v1/{table}",
                params=params or {}, headers=self._auth_headers(),
            )
            if r.status_code == 200:
                return r.json() if r.text else []
            logger.warning(f"[{self.profile['name']}] {table} GET -> {r.status_code}: {r.text[:200]}")
            return []
        try:
            return await self._with_retry(_do, f"GET {table}")
        except Exception:
            return []

    # ── Onboarding ───────────────────────────────────────────────────────────

    async def fill_profile(self) -> bool:
        await asyncio.sleep(random.uniform(0.5, 2))
        payload = {
            "user_id": self.state.user_id,
            "name": self.profile["name"],
            "role": self.profile["role"],
            "domain": self.profile["domain"],
            "location": self.profile["location"],
            "stage": self.profile["stage"],
            "bio": self.profile["bio"],
            "skills": self.profile["skills"],
            "looking_for": self.profile["looking_for"],
            "not_looking_for": self.profile["not_looking_for"],
            "can_teach": self.profile["can_teach"],
            "want_to_learn": self.profile["want_to_learn"],
            "goals": self.profile["goals"],
            "autonomy_level": min(5, max(1, self.profile["autonomy_level"])),
        }
        result = await self._supabase_post("founder_profiles", payload)
        if result:
            logger.info(f"[{self.profile['name']}] Profile saved")
            return True
        # Try update if already exists
        ok = await self._supabase_patch(
            "founder_profiles",
            {"user_id": f"eq.{self.state.user_id}"},
            {k: v for k, v in payload.items() if k != "user_id"},
        )
        if ok:
            logger.info(f"[{self.profile['name']}] Profile updated")
        return ok

    async def take_big_five_test(self) -> dict:
        await asyncio.sleep(random.uniform(0.5, 2))
        bf = self.profile["big_five"]
        rng = random.Random(self.profile["index"] * 1337)
        answers = []
        scores = {"openness": 0, "conscientiousness": 0, "extraversion": 0,
                  "agreeableness": 0, "neuroticism": 0}
        count = {k: 0 for k in scores}

        for i, q in enumerate(BIG_FIVE_QUESTIONS):
            trait = q["trait"]
            base = min(5, max(1, int(bf[trait] / 20) + 1))
            ans = min(5, max(1, base + rng.randint(-1, 1)))
            answers.append({"question_index": i, "answer": ans})
            scores[trait] += ans
            count[trait] += 1

        for trait in scores:
            if count[trait] > 0:
                avg = scores[trait] / count[trait]
                scores[trait] = round(((avg - 1) / 4) * 100)

        # Save via direct patch (skip Vercel endpoint)
        await self._supabase_patch(
            "founder_profiles",
            {"user_id": f"eq.{self.state.user_id}"},
            {"big_five": scores},
        )
        logger.info(f"[{self.profile['name']}] Big Five: O={scores['openness']} C={scores['conscientiousness']} E={scores['extraversion']} A={scores['agreeableness']} N={scores['neuroticism']}")
        return scores

    async def take_behavioral_test(self) -> dict:
        await asyncio.sleep(random.uniform(0.5, 2))
        bf = self.profile["big_five"]
        rng = random.Random(self.profile["index"] * 277)

        def noise(base):
            return min(5, max(1, base + rng.randint(-1, 1)))

        h_base = min(5, max(1, int((bf["agreeableness"] * 0.5 + bf["conscientiousness"] * 0.5) / 100 * 5)))
        q1, q2, q3 = noise(6 - h_base), noise(h_base), noise(6 - h_base)

        ach_raw = (bf["extraversion"] * 0.6 + (100 - bf["agreeableness"]) * 0.4) / 100 * 5
        q4 = noise(min(5, max(1, int(ach_raw))))
        uni_raw = (bf["agreeableness"] * 0.5 + bf["openness"] * 0.5) / 100 * 5
        q5 = noise(min(5, max(1, int(uni_raw))))
        sd_raw = (bf["openness"] * 0.6 + (100 - bf["conscientiousness"]) * 0.4) / 100 * 5
        q6 = noise(min(5, max(1, int(sd_raw))))

        e, a = bf["extraversion"] / 100, bf["agreeableness"] / 100
        if e > 0.6 and a < 0.4:
            q7, q8, q9 = "competing", "confront", "parallel"
        elif e > 0.6 and a > 0.6:
            q7, q8, q9 = "collaborating", "investigate", "merge"
        elif e < 0.4 and a > 0.6:
            q7, q8, q9 = "avoiding", "absorb", "concede"
        elif e < 0.4 and a < 0.4:
            q7, q8, q9 = "avoiding", "redistribute", "parallel"
        else:
            q7, q8, q9 = "compromising", "redistribute", "debate"

        o, c, n = bf["openness"] / 100, bf["conscientiousness"] / 100, bf["neuroticism"] / 100
        labels_10 = ["chaos", "cold", "no_ambition", "overthink"]
        q10 = labels_10[rng.randint(0, 3)] if max(c, a, e, n) < 0.6 else (
            "chaos" if c > 0.7 else "cold" if a > 0.7 else "no_ambition" if e > 0.7 else "overthink")

        labels_11 = ["do", "plan", "talk", "creative"]
        q11 = labels_11[rng.randint(0, 3)] if max(e, c, a, o) < 0.6 else (
            "do" if e > 0.6 and c < 0.4 else "plan" if c > 0.6 else "talk" if a > 0.6 else "creative")

        q12 = ("lawgiver" if c > 0.8 else "anarchist" if o > 0.6 and c < 0.5 else
               "executor" if c > 0.5 else "flexible")

        h_scores = [6 - q1, q2, 6 - q3]
        honesty_humility = round((sum(h_scores) / len(h_scores)) * 20)

        behavioral_profile = {
            "honesty_humility": honesty_humility,
            "values": {
                "achievement_power": round(q4 * 20),
                "universalism": round(q5 * 20),
                "self_direction": round(q6 * 20),
            },
            "conflict": {
                "primary_style": q7,
                "performance_response": q8,
                "strategy_response": q9,
            },
            "projective": {
                "partner_irritants": q10,
                "decision_style": q11,
                "rule_orientation": q12,
            },
        }

        await self._supabase_patch(
            "founder_profiles",
            {"user_id": f"eq.{self.state.user_id}"},
            {"behavioral_profile": behavioral_profile},
        )
        logger.info(f"[{self.profile['name']}] Behavioral: H={honesty_humility}, conflict={q7}")
        return behavioral_profile

    def _generate_embedding(self) -> list[float]:
        """Генерирует 1024-мерный pseudo-embedding на основе профиля.
        Детерминированный — одинаковые профили дают одинаковый embedding."""
        import hashlib
        # Seed from profile data
        seed_data = f"{self.profile['name']}|{self.profile['role']}|{self.profile['domain']}|{','.join(self.profile['skills'])}|{self.profile['bio'][:100]}"
        seed = int(hashlib.md5(seed_data.encode()).hexdigest(), 16)
        rng = random.Random(seed)
        # 1024-мерный вектор, нормальное распределение
        return [rng.gauss(0, 0.05) for _ in range(1024)]

    async def _save_embedding(self) -> bool:
        """Сохраняет embedding в профиль."""
        embedding = self._generate_embedding()
        ok = await self._supabase_patch(
            "founder_profiles",
            {"user_id": f"eq.{self.state.user_id}"},
            {"embedding": embedding},
        )
        if ok:
            logger.info(f"[{self.profile['name']}] Embedding saved ({len(embedding)}d)")
        return ok

    async def complete_onboarding(self) -> bool:
        await asyncio.sleep(random.uniform(0.5, 2))
        # Save embedding before completing
        await self._save_embedding()

        ok = await self._supabase_patch(
            "founder_profiles",
            {"user_id": f"eq.{self.state.user_id}"},
            {"onboarding_complete": True},
        )
        if ok:
            self.state.onboarding_complete = True
            logger.info(f"[{self.profile['name']}] Onboarding complete")
        return ok

    # ── Discover & Swipe (direct Supabase) ──────────────────────────────────

    async def get_candidates(self) -> list[dict]:
        """Получает кандидатов через match_founders RPC с embedding."""
        if not self.state.user_id:
            return []

        # Получаем наш embedding
        profiles = await self._supabase_get("founder_profiles", {
            "user_id": f"eq.{self.state.user_id}",
            "select": "embedding",
        })
        if not profiles or not profiles[0].get("embedding"):
            logger.info(f"[{self.profile['name']}] No embedding yet, skipping discover")
            return []

        embedding = profiles[0]["embedding"]
        # Parse embedding string to array if needed
        if isinstance(embedding, str):
            try:
                embedding = json.loads(embedding)
            except (json.JSONDecodeError, ValueError):
                logger.warning(f"[{self.profile['name']}] Could not parse embedding")
                return []

        result = await self._supabase_rpc("match_founders", {
            "query_embedding": embedding,
            "match_count": 20,
            "exclude_user_id": self.state.user_id,
        })
        if result and isinstance(result, list):
            filtered = [c for c in result
                       if c.get("user_id") != self.state.user_id
                       and c.get("user_id") not in self.state.candidates_seen]
            logger.info(f"[{self.profile['name']}] Got {len(filtered)} candidates")
            return filtered
        logger.info(f"[{self.profile['name']}] No candidates (RPC: {type(result).__name__})")
        return []

    async def _calculate_compatibility(self, candidate: dict) -> float:
        score = 0.0
        my_ocean = self.profile["big_five"]
        their_ocean = candidate.get("big_five", {})

        if their_ocean and isinstance(their_ocean, dict):
            ocean_diff = 0
            for trait in ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"]:
                diff = abs(my_ocean.get(trait, 50) - their_ocean.get(trait, 50)) / 100
                peak, sigma = 0.4, 0.25
                ocean_diff += max(0, min(1, 1 - abs(diff - peak) / sigma))
            score += (ocean_diff / 5) * 0.40
        else:
            score += 0.20

        # Domain
        if self.profile["domain"].lower() == candidate.get("domain", "").lower():
            score += 0.20
        else:
            score += 0.12

        # Skills
        my_skills = set(s.lower() for s in self.profile["skills"])
        their_skills = set(s.lower() for s in candidate.get("skills", []))
        if my_skills and their_skills:
            overlap = len(my_skills & their_skills)
            union = len(my_skills | their_skills)
            if union > 0:
                jaccard = overlap / union
                score += max(0, 1 - abs(jaccard - 0.3) * 1.5) * 0.20
        else:
            score += 0.10

        # Stage
        stages = {"idea": 0, "mvp": 1, "traction": 2, "scaling": 3, "revenue": 4}
        stage_diff = abs(stages.get(self.profile["stage"], 0) - stages.get(candidate.get("stage"), 0))
        score += max(0, (1 - stage_diff * 0.3)) * 0.10

        # Location
        if self.profile["location"] == candidate.get("location", ""):
            score += 0.10
        elif candidate.get("location"):
            score += 0.05

        return min(1.0, max(0.0, score))

    async def swipe(self, candidate: dict) -> dict:
        to_user = candidate.get("user_id") or candidate.get("id")
        if not to_user or to_user in self.state.candidates_seen:
            return {"action": "pass", "mutual": False}
        self.state.candidates_seen.add(to_user)

        compatibility = await self._calculate_compatibility(candidate)
        rng = random.Random(self.profile["index"] * 31 + hash(to_user) % 10000)
        threshold = 0.45 + rng.uniform(-0.05, 0.05)

        action = "like" if compatibility >= threshold else "pass"

        # Save swipe to swipes table
        result = await self._supabase_post("swipes", {
            "from_user": self.state.user_id,
            "to_user": to_user,
            "action": action,
        })

        mutual = False
        if result is not None and action == "like":
            # Check for mutual match: they liked us back
            mutual_swipes = await self._supabase_get("swipes", {
                "from_user": f"eq.{to_user}",
                "to_user": f"eq.{self.state.user_id}",
                "action": f"eq.like",
            })
            mutual = len(mutual_swipes) > 0
            if mutual:
                logger.info(f"[{self.profile['name']}] MUTUAL MATCH with {candidate.get('name', '?')}! (score: {compatibility:.2f})")
                self.state.matches.append(candidate)
            else:
                logger.info(f"[{self.profile['name']}] Liked {candidate.get('name', '?')} (score: {compatibility:.2f})")

        return {"action": action, "mutual": mutual, "score": compatibility}

    async def run_discover_session(self, max_swipes: int = 20) -> int:
        candidates = await self.get_candidates()
        if not candidates:
            return 0

        swiped = likes = 0
        for candidate in candidates[:max_swipes]:
            result = await self.swipe(candidate)
            swiped += 1
            if result.get("action") == "like":
                likes += 1
            await asyncio.sleep(random.uniform(0.5, 1.5))

        logger.info(f"[{self.profile['name']}] Session: {swiped} swiped, {likes} liked, {len(self.state.matches)} matches")
        return swiped

    # ── Chat ─────────────────────────────────────────────────────────────────

    async def get_matches(self) -> list[dict]:
        """Находит mutual matches через swipes."""
        # Find users we liked who also liked us back
        # Get all swipes where we were liked
        liked_us = await self._supabase_get("swipes", {
            "to_user": f"eq.{self.state.user_id}",
            "action": f"eq.like",
        })
        # Filter to those we also liked
        mutual = [s for s in liked_us if s["from_user"] in 
                  [m.get("user_id") or m.get("id") for m in self.state.matches] or
                  any(s["from_user"] == (c.get("user_id") or c.get("id")) 
                      for c in self.state.matches)]
        
        # Also check for new mutuals from candidates_seen
        for uid in self.state.candidates_seen:
            their_swipes = await self._supabase_get("swipes", {
                "from_user": f"eq.{uid}",
                "to_user": f"eq.{self.state.user_id}",
                "action": f"eq.like",
            })
            if their_swipes and uid not in [m.get("user_id") or m.get("id") for m in self.state.matches]:
                # Fetch their profile
                profiles = await self._supabase_get("founder_profiles", {
                    "user_id": f"eq.{uid}",
                })
                if profiles:
                    self.state.matches.append(profiles[0])

        logger.info(f"[{self.profile['name']}] Matches: {len(self.state.matches)} found")
        return self.state.matches

    async def send_message(self, match_id: str, text: str) -> bool:
        result = await self._supabase_post("messages", {
            "match_id": match_id,
            "sender_id": self.state.user_id,
            "content": text,
        })
        if result is not None:
            if match_id not in self.state.conversations:
                self.state.conversations[match_id] = []
            self.state.conversations[match_id].append({"from": "me", "text": text, "at": time.time()})
            return True
        return False

    async def chat_with_match(self, match: dict) -> None:
        match_id = match.get("id") or match.get("match_id")
        peer_name = match.get("peer_name", "Partner")
        if not match_id:
            return
        if match_id in self.state.conversations and len(self.state.conversations[match_id]) > 0:
            return

        opener = self._generate_opener(peer_name, match)
        success = await self.send_message(match_id, opener)
        if success:
            logger.info(f"[{self.profile['name']}] -> {peer_name}: {opener[:60]}...")

    def _generate_opener(self, peer_name: str, match: dict) -> str:
        openers = [
            f"Hey {peer_name}! Saw your profile in {match.get('domain', 'startups')} — really interesting. I'm building {self.profile['startup']['title']}. Would love to hear more!",
            f"Hi {peer_name}, the matching algorithm paired us, and looking at your background in {match.get('domain', 'the industry')}, I think there might be real synergy. I'm working on {self.profile['startup']['title']} — {self.profile['startup']['pitch'][:80]}...",
            f"{peer_name}, great to connect! Your profile caught my eye — especially the {match.get('role', 'work')} angle. I'm {self.profile['role']} for {self.profile['startup']['title']}. Curious to explore if our skills complement!",
            f"Hey {peer_name}! SyndiAI matched us with a pretty high score. I'm building something in {self.profile['domain']} — {self.profile['startup']['title']}. You seem to bring exactly the kind of {match.get('role', 'expertise')} that could be the missing piece.",
            f"Hi {peer_name}! The OCEAN compatibility looks promising :) I'm working on {self.profile['startup']['title']}. Would be great to jump on a quick call and see if there's founder-market fit between us!",
        ]
        rng = random.Random(self.profile["index"] * 17 + hash(peer_name) % 10000)
        return openers[rng.randint(0, len(openers) - 1)]

    # ── Full lifecycle ───────────────────────────────────────────────────────

    async def run_full_onboarding(self) -> bool:
        logger.info(f"\n{'='*50}\n[{self.profile['name']}] Starting onboarding\n{'='*50}")

        if "email" not in self.profile or not self.profile["email"]:
            self.profile["email"] = f"agent{self.profile['index']:03d}@syndi.demo"
        if "password" not in self.profile or not self.profile["password"]:
            self.profile["password"] = f"AgentDemo{self.profile['index']:03d}!"

        if not await self.signup():
            logger.error(f"[{self.profile['name']}] Auth failed, aborting")
            return False

        await asyncio.sleep(random.uniform(1, 5))
        if not await self.fill_profile():
            logger.warning(f"[{self.profile['name']}] Profile save issues, continuing...")

        await self.take_big_five_test()
        await self.take_behavioral_test()
        await self.complete_onboarding()
        logger.info(f"[{self.profile['name']}] Onboarding complete!")
        return True

    async def run_discover_and_chat(self, sessions: int = 3) -> None:
        logger.info(f"[{self.profile['name']}] === DISCOVER PHASE ===")
        await asyncio.sleep(random.uniform(15, 30))

        for i in range(sessions):
            logger.info(f"[{self.profile['name']}] --- Session {i+1}/{sessions} ---")
            await self.run_discover_session(max_swipes=15)

            matches = await self.get_matches()
            for match in matches[:5]:  # Chat with up to 5 matches per session
                await self.chat_with_match(match)
                await asyncio.sleep(random.uniform(1, 3))

            if i < sessions - 1:
                pause = random.uniform(5, 15)
                logger.info(f"[{self.profile['name']}] Pausing {pause:.0f}s...")
                await asyncio.sleep(pause)

        logger.info(f"[{self.profile['name']}] === DISCOVER: {len(self.state.matches)} matches, {len(self.state.conversations)} conversations ===")

    async def run(self) -> None:
        try:
            success = await self.run_full_onboarding()
            if not success:
                return
            await self.run_discover_and_chat(sessions=3)
            await self._save_state()
        except Exception as e:
            logger.error(f"[{self.profile['name']}] Bot failed: {e}", exc_info=True)
        finally:
            await self.close()

    async def _save_state(self) -> None:
        import os
        os.makedirs("profiles", exist_ok=True)
        state = {
            "name": self.profile["name"],
            "user_id": self.state.user_id,
            "onboarding_complete": self.state.onboarding_complete,
            "candidates_seen": len(self.state.candidates_seen),
            "matches": len(self.state.matches),
            "conversations": {k: len(v) for k, v in self.state.conversations.items()},
        }
        with open(f"profiles/bot_{self.profile['index']:03d}_state.json", "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2, ensure_ascii=False)
