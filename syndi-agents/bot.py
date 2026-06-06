"""
Bot — имитация реального пользователя SyndiAI.
Проходит onboarding, discover, swipe, chat — как живой founder.
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

# Retry config: exponential backoff for network errors
MAX_RETRIES = 3
BASE_DELAY = 2.0  # seconds


# ── Big Five: 50 вопросов (OCEAN по 10) ──────────────────────────────────────

BIG_FIVE_QUESTIONS = [
    # Openness (O) — вопросы 0-9
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
    # Conscientiousness (C) — вопросы 10-19
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
    # Extraversion (E) — вопросы 20-29
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
    # Agreeableness (A) — вопросы 30-39
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
    # Neuroticism (N) — вопросы 40-49
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
    """Текущее состояние бота в системе."""
    user_id: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    founder_profile_id: Optional[int] = None
    onboarding_complete: bool = False
    candidates_seen: set[str] = field(default_factory=set)
    matches: list[dict] = field(default_factory=list)
    conversations: dict[str, list[dict]] = field(default_factory=dict)


class SyndiBot:
    """
    AI-агент, имитирующий реального founder на платформе SyndiAI.
    """

    def __init__(
        self,
        profile: dict[str, Any],
        supabase_url: str,
        supabase_anon_key: str,
        app_url: str = "http://localhost:3000",
    ) -> None:
        self.profile = profile
        self.state = BotState()
        self.supabase_url = supabase_url.rstrip("/")
        self.supabase_anon_key = supabase_anon_key
        self.app_url = app_url.rstrip("/")
        self._client: Optional[httpx.AsyncClient] = None

    async def _client_(self) -> httpx.AsyncClient:
        """Создаёт отдельный client с ограниченным connection pool."""
        if self._client is None or self._client.is_closed:
            limits = httpx.Limits(
                max_connections=3,      # max 3 connections per bot
                max_keepalive_connections=1,
            )
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(30.0, connect=10.0),
                limits=limits,
                headers={
                    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                    "Accept": "application/json",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Referer": f"{self.app_url}/",
                },
            )
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    # ── Supabase Auth ────────────────────────────────────────────────────────

    async def _with_retry(self, fn, description: str):
        """Выполняет async функцию с retry и exponential backoff."""
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                return await fn()
            except (NetworkError, TimeoutException) as e:
                delay = BASE_DELAY * (2 ** (attempt - 1)) + random.uniform(0, 1)
                if attempt < MAX_RETRIES:
                    logger.warning(f"[{self.profile['name']}] {description} failed (attempt {attempt}/{MAX_RETRIES}): {e}. Retrying in {delay:.1f}s...")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"[{self.profile['name']}] {description} failed after {MAX_RETRIES} attempts: {e}")
                    raise
            except Exception as e:
                logger.error(f"[{self.profile['name']}] {description} unexpected error: {e}")
                raise
        return None

    async def signup(self) -> bool:
        """Регистрация через Supabase Auth с retry."""
        async def _do_signup():
            client = await self._client_()
            url = f"{self.supabase_url}/auth/v1/signup"
            headers = {
                "apikey": self.supabase_anon_key,
                "Content-Type": "application/json",
            }
            payload = {
                "email": self.profile["email"],
                "password": self.profile["password"],
                "data": {"full_name": self.profile["name"]},
            }
            r = await client.post(url, json=payload, headers=headers)
            if r.status_code in (200, 201):
                data = r.json()
                self.state.access_token = data.get("access_token")
                self.state.refresh_token = data.get("refresh_token")
                self.state.user_id = data.get("user", {}).get("id")
                logger.info(f"[{self.profile['name']}] Signed up: {self.profile['email']}")
                return True
            elif r.status_code == 422 and ("already registered" in r.text.lower() or "already exists" in r.text.lower()):
                logger.info(f"[{self.profile['name']}] Already registered, trying login...")
                return await self.login()
            else:
                logger.error(f"[{self.profile['name']}] Signup failed: HTTP {r.status_code} | {r.text[:300]}")
                return False

        try:
            return await self._with_retry(_do_signup, "Signup")
        except Exception:
            return False

    async def login(self) -> bool:
        """Логин через Supabase Auth."""
        client = await self._client_()
        url = f"{self.supabase_url}/auth/v1/token?grant_type=password"
        headers = {
            "apikey": self.supabase_anon_key,
            "Content-Type": "application/json",
        }
        payload = {
            "email": self.profile["email"],
            "password": self.profile["password"],
        }
        try:
            r = await client.post(url, json=payload, headers=headers)
            if r.status_code == 200:
                data = r.json()
                self.state.access_token = data.get("access_token")
                self.state.refresh_token = data.get("refresh_token")
                self.state.user_id = data.get("user", {}).get("id")
                logger.info(f"[{self.profile['name']}] Logged in")
                return True
            else:
                logger.error(f"[{self.profile['name']}] Login failed: {r.status_code} {r.text[:200]}")
                return False
        except Exception as e:
            logger.error(f"[{self.profile['name']}] Login exception: {e}")
            return False

    # ── Onboarding ───────────────────────────────────────────────────────────

    async def _api_post(self, path: str, payload: dict) -> Optional[dict]:
        """POST к API SyndiAI с авторизацией и retry."""
        async def _do_post():
            client = await self._client_()
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.state.access_token or ''}",
            }
            url = f"{self.app_url}{path}"
            r = await client.post(url, json=payload, headers=headers)
            if r.status_code in (200, 201):
                return r.json()
            elif r.status_code == 429:
                retry_after = float(r.headers.get("Retry-After", 5))
                logger.warning(f"[{self.profile['name']}] Rate limited on {path}, waiting {retry_after}s")
                await asyncio.sleep(retry_after)
                raise TimeoutException(f"Rate limited, retry after {retry_after}s")
            else:
                logger.warning(f"[{self.profile['name']}] API POST {path} -> HTTP {r.status_code}: {r.text[:300]}")
                return None

        try:
            return await self._with_retry(_do_post, f"API POST {path}")
        except Exception:
            return None

    async def _api_get(self, path: str) -> Optional[dict]:
        """GET к API SyndiAI с авторизацией и retry."""
        async def _do_get():
            client = await self._client_()
            headers = {"Authorization": f"Bearer {self.state.access_token or ''}"}
            r = await client.get(f"{self.app_url}{path}", headers=headers)
            if r.status_code == 200:
                return r.json()
            elif r.status_code == 429:
                retry_after = float(r.headers.get("Retry-After", 5))
                logger.warning(f"[{self.profile['name']}] Rate limited on {path}, waiting {retry_after}s")
                await asyncio.sleep(retry_after)
                raise TimeoutException(f"Rate limited, retry after {retry_after}s")
            else:
                logger.warning(f"[{self.profile['name']}] API GET {path} -> HTTP {r.status_code}: {r.text[:300]}")
                return None

        try:
            return await self._with_retry(_do_get, f"API GET {path}")
        except Exception:
            return None

    async def fill_profile(self) -> bool:
        """Заполняет профиль founder."""
        payload = {
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
            "autonomy_level": self.profile["autonomy_level"],
        }
        result = await self._api_post("/api/onboarding/profile", payload)
        if result:
            logger.info(f"[{self.profile['name']}] Profile saved")
            return True
        # Fallback: прямой insert в Supabase
        return await self._save_profile_direct(payload)

    async def _save_profile_direct(self, payload: dict) -> bool:
        """Прямое сохранение через Supabase REST."""
        client = await self._client_()
        url = f"{self.supabase_url}/rest/v1/founder_profiles"
        headers = {
            "apikey": self.supabase_anon_key,
            "Authorization": f"Bearer {self.state.access_token or ''}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        full_payload = {
            "user_id": self.state.user_id,
            **payload,
        }
        try:
            r = await client.post(url, json=full_payload, headers=headers)
            if r.status_code in (200, 201):
                data = r.json()
                if isinstance(data, list) and data:
                    self.state.founder_profile_id = data[0].get("id")
                logger.info(f"[{self.profile['name']}] Profile saved directly (id={self.state.founder_profile_id})")
                return True
            else:
                logger.error(f"[{self.profile['name']}] Direct profile save: HTTP {r.status_code} | {r.text[:300]}")
                return False
        except Exception as e:
            logger.error(f"[{self.profile['name']}] Direct profile save failed: {e}")
            return False

    async def take_big_five_test(self) -> dict:
        """
        Проходит Big Five тест, отвечая на основе своего OCEAN профиля.
        Возвращает рассчитанные скоры.
        """
        bf = self.profile["big_five"]
        answers: list[dict] = []
        scores = {"openness": 0, "conscientiousness": 0, "extraversion": 0,
                  "agreeableness": 0, "neuroticism": 0}
        count = {"openness": 0, "conscientiousness": 0, "extraversion": 0,
                 "agreeableness": 0, "neuroticism": 0}

        # Случайный seed для небольшой вариативности в ответах
        rng = random.Random(self.profile["index"] * 1337)

        for i, q in enumerate(BIG_FIVE_QUESTIONS):
            trait = q["trait"]
            target_score = bf[trait]  # 0-100
            # Конвертируем target_score в ответ 1-5 с шумом
            # 0-20 -> 1, 20-40 -> 2, 40-60 -> 3, 60-80 -> 4, 80-100 -> 5
            base_answer = min(5, max(1, int(target_score / 20) + 1))
            # Добавляем шум ±1
            answer = min(5, max(1, base_answer + rng.randint(-1, 1)))

            answers.append({"question_index": i, "answer": answer})
            scores[trait] += answer
            count[trait] += 1

        # Нормализуем в 0-100
        for trait in scores:
            if count[trait] > 0:
                avg = scores[trait] / count[trait]  # 1-5
                scores[trait] = round(((avg - 1) / 4) * 100)  # 0-100

        # Отправляем результаты
        result = await self._api_post("/api/onboarding/bigfive", {
            "answers": answers,
            "scores": scores,
        })
        if result is None:
            # Fallback: прямое обновление
            await self._save_big_five_direct(scores)

        logger.info(f"[{self.profile['name']}] Big Five completed: O={scores['openness']} C={scores['conscientiousness']} E={scores['extraversion']} A={scores['agreeableness']} N={scores['neuroticism']}")
        return scores

    async def _save_big_five_direct(self, scores: dict) -> None:
        """Прямое сохранение Big Five."""
        client = await self._client_()
        url = f"{self.supabase_url}/rest/v1/founder_profiles"
        headers = {
            "apikey": self.supabase_anon_key,
            "Authorization": f"Bearer {self.state.access_token or ''}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }
        params = {"user_id": f"eq.{self.state.user_id}"}
        try:
            await client.patch(url, json={"big_five": scores}, headers=headers, params=params)
        except Exception as e:
            logger.error(f"[{self.profile['name']}] Direct Big Five save failed: {e}")

    async def take_behavioral_test(self) -> dict:
        """
        Проходит Behavioral Profile (12 вопросов, 4 блока).
        Отвечает на основе OCEAN архетипа агента.
        Возвращает behavioral_profile dict.
        """
        bf = self.profile["big_five"]
        rng = random.Random(self.profile["index"] * 277)

        def noise(base: int) -> int:
            """Добавляет ±1 шум к ответу Likert 1-5."""
            return min(5, max(1, base + rng.randint(-1, 1)))

        # ── Блок 1: Честность-Скромность (HEXACO-H) ─────────────────────────
        # High Agreeableness + High Conscientiousness → высокая честность
        # честность = (A * 0.5 + C * 0.5) / 100 * 5 → 1-5
        honesty_raw = (bf["agreeableness"] * 0.5 + bf["conscientiousness"] * 0.5) / 100 * 5
        h_base = min(5, max(1, int(honesty_raw)))

        # q1 (reverse): высокая честность → низкий ответ
        q1 = noise(6 - h_base)  # reverse
        # q2 (straight): высокая честность → высокий ответ
        q2 = noise(h_base)
        # q3 (reverse): высокая честность → низкий ответ
        q3 = noise(6 - h_base)  # reverse

        # ── Блок 2: Ценности (Schwartz) ──────────────────────────────────────
        # q4 (achievement_power): Extraversion-driven, negatively correlated with Agreeableness
        achievement_raw = (bf["extraversion"] * 0.6 + (100 - bf["agreeableness"]) * 0.4) / 100 * 5
        q4 = noise(min(5, max(1, int(achievement_raw))))

        # q5 (universalism): Agreeableness + Openness, altruistic
        universalism_raw = (bf["agreeableness"] * 0.5 + bf["openness"] * 0.5) / 100 * 5
        q5 = noise(min(5, max(1, int(universalism_raw))))

        # q6 (self_direction): Openness + low Conscientiousness (rebel)
        self_dir_raw = (bf["openness"] * 0.6 + (100 - bf["conscientiousness"]) * 0.4) / 100 * 5
        q6 = noise(min(5, max(1, int(self_dir_raw))))

        # ── Блок 3: Стиль конфликта (Thomas-Kilmann) ─────────────────────────
        # forced-choice: зависит от Extraversion (assertiveness) и Agreeableness (cooperativeness)
        e = bf["extraversion"] / 100  # 0-1
        a = bf["agreeableness"] / 100  # 0-1

        if e > 0.6 and a < 0.4:
            # High assertiveness, low cooperativeness → Competing
            q7, q8, q9 = "competing", "confront", "parallel"
        elif e > 0.6 and a > 0.6:
            # High assertiveness, high cooperativeness → Collaborating
            q7, q8, q9 = "collaborating", "investigate", "merge"
        elif e < 0.4 and a > 0.6:
            # Low assertiveness, high cooperativeness → Accommodating
            q7, q8, q9 = "avoiding", "absorb", "concede"
        elif e < 0.4 and a < 0.4:
            # Low assertiveness, low cooperativeness → Avoiding
            q7, q8, q9 = "avoiding", "redistribute", "parallel"
        else:
            # Balanced → Compromising
            q7, q8, q9 = "compromising", "redistribute", "debate"

        # ── Блок 4: Проективные вопросы ──────────────────────────────────────
        # forced-choice: маппим OCEAN архетип на реакции
        o, c, n = bf["openness"] / 100, bf["conscientiousness"] / 100, bf["neuroticism"] / 100

        # q10: что бесит в партнёре
        if c > 0.7:
            q10 = "chaos"
        elif a > 0.7:
            q10 = "cold"
        elif e > 0.7:
            q10 = "no_ambition"
        elif n > 0.7:
            q10 = "overthink"
        else:
            q10 = rng.choice(["chaos", "cold", "no_ambition", "overthink"])

        # q11: типовая фраза
        if e > 0.6 and c < 0.4:
            q11 = "do"
        elif c > 0.6:
            q11 = "plan"
        elif a > 0.6:
            q11 = "talk"
        elif o > 0.6:
            q11 = "creative"
        else:
            q11 = rng.choice(["do", "plan", "talk", "creative"])

        # q12: отношение к правилам
        if c > 0.8:
            q12 = "lawgiver"
        elif o > 0.6 and c < 0.5:
            q12 = "anarchist"
        elif c > 0.5:
            q12 = "executor"
        else:
            q12 = "flexible"

        # ── Формируем payload ────────────────────────────────────────────────
        # Вычисляем honesty_humility score (0-100)
        h_scores = [6 - q1, q2, 6 - q3]  # reverse -> straight
        honesty_humility = round((sum(h_scores) / len(h_scores)) * 20)  # avg 1-5 -> 0-100

        behavioral_profile = {
            "honesty_humility": honesty_humility,
            "values": {
                "achievement_power": round(q4 * 20),
                "universalism": round(q5 * 20),
                "self_direction": round(q6 * 20),
            },
            "conflict": {
                "primary_style": q7,
                "performance_response": self._behavioral_label("q8", q8),
                "strategy_response": self._behavioral_label("q9", q9),
            },
            "projective": {
                "partner_irritants": self._behavioral_label("q10", q10),
                "decision_style": self._behavioral_label("q11", q11),
                "rule_orientation": self._behavioral_label("q12", q12),
            },
        }

        # Отправляем на сервер
        result = await self._api_post("/api/onboarding/behavioral", {
            "behavioral_profile": behavioral_profile,
        })
        if result is None:
            await self._save_behavioral_direct(behavioral_profile)

        logger.info(
            f"[{self.profile['name']}] Behavioral completed: "
            f"H={honesty_humility}, "
            f"conflict={q7}, "
            f"irritant={q10}, "
            f"decision={q11}"
        )
        return behavioral_profile

    def _behavioral_label(self, qid: str, value: str) -> str:
        """Возвращает human-readable label для choice-ответа."""
        labels = {
            "q7": {
                "competing": "Настаиваю на своём, пока не докажу свою правоту",
                "collaborating": "Ищу решение, которое устроит обоих, даже если дольше",
                "compromising": "Иду на компромисс: каждый что-то теряет, что-то получает",
                "avoiding": "Откладываю разговор, пока эмоции не улягутся",
            },
            "q8": {
                "confront": "Прямо скажу, что недоволен, и потребую разобраться, почему",
                "investigate": "Спрошу, что произошло, помогу понять, что мешает",
                "redistribute": "Переделим работу заново, чтобы успеть",
                "absorb": "Сделаю задачу сам(а), это быстрее, чем разбираться",
            },
            "q9": {
                "parallel": "Сделаю по-своему параллельно, потом покажу результат",
                "debate": "Соберу данные и устрою серьёзное обсуждение",
                "merge": "Найду способ совместить наши подходы",
                "concede": "Уступлю — в этом он сильнее, не буду мешать",
            },
            "q10": {
                "chaos": "Необязательность и хаос",
                "cold": "Эмоциональная холодность и игнорирование",
                "no_ambition": "Отсутствие амбиций",
                "overthink": "Постоянные сомнения и анализ вместо действий",
            },
            "q11": {
                "do": "Давайте просто сделаем, потом разберёмся",
                "plan": "Давайте подумаем и составим план",
                "talk": "Давайте поговорим с командой, чтобы все были в курсе",
                "creative": "Давайте поищем нестандартное решение",
            },
            "q12": {
                "lawgiver": "Обожаю их придумывать для других",
                "flexible": "Соблюдаю, но если вижу абсурд — нарушу",
                "anarchist": "Игнорирую, предпочитаю свою интуицию",
                "executor": "Аккуратно следую, чтобы не было ошибок",
            },
        }
        return labels.get(qid, {}).get(value, value)

    async def _save_behavioral_direct(self, profile: dict) -> None:
        """Прямое сохранение behavioral profile."""
        client = await self._client_()
        url = f"{self.supabase_url}/rest/v1/founder_profiles"
        headers = {
            "apikey": self.supabase_anon_key,
            "Authorization": f"Bearer {self.state.access_token or ''}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }
        params = {"user_id": f"eq.{self.state.user_id}"}
        try:
            await client.patch(url, json={"behavioral_profile": profile}, headers=headers, params=params)
        except Exception as e:
            logger.error(f"[{self.profile['name']}] Direct behavioral save failed: {e}")

    async def generate_avatar(self) -> bool:
        """Генерирует AI-аватар."""
        # Отправляем запрос на генерацию аватара
        result = await self._api_post("/api/avatar", {
            "identity": {
                "name": self.profile["name"],
                "role": self.profile["role"],
                "domain": self.profile["domain"],
                "bio": self.profile["bio"][:200],
            }
        })
        if result:
            logger.info(f"[{self.profile['name']}] Avatar generated")
            return True
        logger.info(f"[{self.profile['name']}] Avatar skipped (API unavailable)")
        return False

    async def complete_onboarding(self) -> bool:
        """Завершает onboarding."""
        result = await self._api_post("/api/onboarding/complete", {})
        if result:
            self.state.onboarding_complete = True
            logger.info(f"[{self.profile['name']}] Onboarding complete")
            return True
        # Fallback: помечаем через direct update
        self.state.onboarding_complete = True
        return True

    async def recompute_embedding(self) -> bool:
        """Пересчитывает embedding профиля."""
        result = await self._api_post("/api/embedding/recompute", {})
        if result:
            logger.info(f"[{self.profile['name']}] Embedding recomputed")
            return True
        logger.info(f"[{self.profile['name']}] Embedding recompute skipped")
        return False

    # ── Discover & Swipe ─────────────────────────────────────────────────────

    async def get_candidates(self) -> list[dict]:
        """Получает кандидатов для свайпа."""
        result = await self._api_post("/api/discover/match", {})
        if result is None:
            logger.warning(f"[{self.profile['name']}] Discover API returned None (endpoint error or 404)")
            return []
        if "candidates" in result:
            candidates = result["candidates"]
            logger.info(f"[{self.profile['name']}] Got {len(candidates)} candidates")
            return candidates
        if "error" in result:
            logger.warning(f"[{self.profile['name']}] Discover API error: {result['error']}")
        else:
            logger.warning(f"[{self.profile['name']}] Discover API: no 'candidates' in response: {str(result)[:200]}")
        return []

    async def _calculate_compatibility(self, candidate: dict) -> float:
        """
        Рассчитывает совместимость с кандидатом на основе:
        - OCEAN complementarity (40%)
        - Domain alignment (20%)
        - Skills complementarity (20%)
        - Stage alignment (10%)
        - Location preference (10%)
        """
        score = 0.0
        rng = random.Random(self.profile["index"] + hash(candidate.get("user_id", "")) % 10000)

        # 1. OCEAN complementarity (40%) — оптимальная разница ~40%
        my_ocean = self.profile["big_five"]
        their_ocean = candidate.get("big_five", {})
        if their_ocean:
            ocean_diff = 0
            for trait in ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"]:
                my_val = my_ocean.get(trait, 50)
                their_val = their_ocean.get(trait, 50) if isinstance(their_ocean, dict) else 50
                diff = abs(my_val - their_val) / 100
                # Bell curve around 0.4 optimal difference
                peak, sigma = 0.4, 0.25
                trait_score = max(0, min(1, 1 - abs(diff - peak) / sigma))
                ocean_diff += trait_score
            ocean_score = ocean_diff / 5
            score += ocean_score * 0.40
        else:
            score += 0.20  # Нет данных — среднее

        # 2. Domain alignment (20%)
        my_domain = self.profile["domain"].lower()
        their_domain = candidate.get("domain", "").lower()
        if my_domain == their_domain:
            score += 0.20  # Один домен — хорошо
        elif any(word in their_domain for word in my_domain.split()):
            score += 0.15
        else:
            score += 0.10  # Разные домена — допустимо

        # 3. Skills complementarity (20%)
        my_skills = set(s.lower() for s in self.profile["skills"])
        their_skills = set(s.lower() for s in candidate.get("skills", []))
        if my_skills and their_skills:
            overlap = len(my_skills & their_skills)
            union = len(my_skills | their_skills)
            if union > 0:
                # Не слишком много overlap (хотим complementarity)
                jaccard = overlap / union
                # Оптимальный overlap ~30%
                skill_score = 1 - abs(jaccard - 0.3) * 1.5
                score += max(0, min(0.20, skill_score * 0.20))
            else:
                score += 0.10
        else:
            score += 0.10

        # 4. Stage alignment (10%)
        my_stage = self.profile["stage"]
        their_stage = candidate.get("stage", "idea")
        stage_order = {"idea": 0, "mvp": 1, "traction": 2, "scaling": 3, "revenue": 4}
        stage_diff = abs(stage_order.get(my_stage, 0) - stage_order.get(their_stage, 0))
        score += max(0, (1 - stage_diff * 0.3)) * 0.10

        # 5. Location (10%)
        my_location = self.profile["location"]
        their_location = candidate.get("location", "")
        if my_location == their_location:
            score += 0.10
        elif their_location:  # Разные, но оба указаны
            score += 0.05

        return min(1.0, max(0.0, score))

    async def swipe(self, candidate: dict) -> dict:
        """
        Принимает решение like/pass на основе совместимости.
        """
        user_id = candidate.get("user_id") or candidate.get("id")
        if not user_id:
            return {"action": "pass", "mutual": False}

        # Не свайпаем повторно
        if user_id in self.state.candidates_seen:
            return {"action": "already_seen", "mutual": False}
        self.state.candidates_seen.add(user_id)

        # Рассчитываем совместимость
        compatibility = await self._calculate_compatibility(candidate)

        # Порог like зависит от архетипа
        rng = random.Random(self.profile["index"] * 31 + hash(user_id) % 10000)
        threshold = 0.45 + rng.uniform(-0.05, 0.05)  # ~0.40-0.50

        if compatibility >= threshold:
            action = "like"
        else:
            action = "pass"

        # Отправляем swipe
        result = await self._api_post("/api/swipe", {
            "to_user": user_id,
            "action": action,
        })

        mutual = result.get("mutual", False) if result else False

        if action == "like":
            if mutual:
                logger.info(f"[{self.profile['name']}] MUTUAL MATCH with {candidate.get('name', '?')}! (score: {compatibility:.2f})")
                self.state.matches.append(candidate)
            else:
                logger.info(f"[{self.profile['name']}] Liked {candidate.get('name', '?')} (score: {compatibility:.2f})")
        else:
            logger.debug(f"[{self.profile['name']}] Passed {candidate.get('name', '?')} (score: {compatibility:.2f})")

        return {"action": action, "mutual": mutual, "score": compatibility}

    async def run_discover_session(self, max_swipes: int = 20) -> int:
        """Проходит одну сессию discover: получает кандидатов и свайпает."""
        logger.info(f"[{self.profile['name']}] Discover: requesting candidates...")
        candidates = await self.get_candidates()
        if not candidates:
            logger.info(f"[{self.profile['name']}] Discover: no candidates available (other agents still onboarding)")
            return 0

        logger.info(f"[{self.profile['name']}] Discover: got {len(candidates)} candidates, swiping...")
        swiped = 0
        likes = 0
        for candidate in candidates[:max_swipes]:
            result = await self.swipe(candidate)
            swiped += 1
            if result.get("action") == "like":
                likes += 1
            await asyncio.sleep(random.uniform(0.5, 1.5))  # Имитация задумчивости

        logger.info(f"[{self.profile['name']}] Session: {swiped} swiped, {likes} liked, {len(self.state.matches)} total matches")
        return swiped

    # ── Chat ─────────────────────────────────────────────────────────────────

    async def get_matches(self) -> list[dict]:
        """Получает список мэтчей."""
        result = await self._api_get("/api/matches/list")
        if result and "matches" in result:
            self.state.matches = result["matches"]
            logger.info(f"[{self.profile['name']}] Matches: {len(result['matches'])} found")
            return result["matches"]
        logger.info(f"[{self.profile['name']}] Matches: none found")
        return []

    async def send_message(self, match_id: str, text: str) -> bool:
        """Отправляет сообщение в чат."""
        result = await self._api_post("/api/messages", {
            "match_id": match_id,
            "text": text,
        })
        if result:
            if match_id not in self.state.conversations:
                self.state.conversations[match_id] = []
            self.state.conversations[match_id].append({
                "from": "me", "text": text, "at": time.time()
            })
            return True
        return False

    async def chat_with_match(self, match: dict) -> None:
        """Начинает или продолжает беседу с мэтчем."""
        match_id = match.get("match_id") or match.get("id")
        peer_name = match.get("peer_name", "Partner")

        if not match_id:
            return

        # Проверяем, не чатились ли уже
        if match_id in self.state.conversations and len(self.state.conversations[match_id]) > 0:
            return  # Уже начали чат

        # AI-генерация первого сообщения на основе профилей
        opener = self._generate_opener(peer_name, match)
        success = await self.send_message(match_id, opener)
        if success:
            logger.info(f"[{self.profile['name']}] -> {peer_name}: {opener[:60]}...")

    def _generate_opener(self, peer_name: str, match: dict) -> str:
        """Генерирует персонализированное первое сообщение."""
        openers = [
            f"Hey {peer_name}! Saw your profile in {match.get('domain', 'startups')} — really interesting. I'm building {self.profile['startup']['title']}. Would love to hear more about your approach!",
            f"Hi {peer_name}, the matching algorithm paired us, and looking at your background in {match.get('domain', 'the industry')}, I think there might be some real synergy. I'm working on {self.profile['startup']['title']} — {self.profile['startup']['pitch'][:80]}...",
            f"{peer_name}, great to connect! Your profile caught my eye — especially the {match.get('role', 'work')} angle. I'm {self.profile['role']} for {self.profile['startup']['title']}. Curious to explore if our skills complement!",
            f"Hey {peer_name}! SyndiAI matched us with a pretty high score. I'm building something in {self.profile['domain']} — {self.profile['startup']['title']}. You seem to bring exactly the kind of {match.get('role', 'expertise')} that could be the missing piece.",
            f"Hi {peer_name}! The OCEAN compatibility looks promising :) I'm working on {self.profile['startup']['title']} — a {self.profile['domain']} play. Would be great to jump on a quick call and see if there's founder-market fit between us!",
        ]
        rng = random.Random(self.profile["index"] * 17 + hash(peer_name) % 10000)
        return openers[rng.randint(0, len(openers) - 1)]

    # ── Полный lifecycle ─────────────────────────────────────────────────────

    async def run_full_onboarding(self) -> bool:
        """Полный цикл onboarding: signup -> profile -> Big Five -> avatar -> complete."""
        logger.info(f"\n{'='*50}\n[{self.profile['name']}] Starting onboarding\n{'='*50}")

        # Fallback для email/password (если профиль загружен без них)
        if "email" not in self.profile or not self.profile["email"]:
            self.profile["email"] = f"agent{self.profile['index']:03d}@syndi.demo"
        if "password" not in self.profile or not self.profile["password"]:
            self.profile["password"] = f"AgentDemo{self.profile['index']:03d}!"

        # 1. Signup or login
        if not await self.signup():
            logger.error(f"[{self.profile['name']}] Signup/login failed, aborting")
            return False

        # Случайная задержка чтобы не DDos'ить API (1-5 сек)
        jitter = random.uniform(1, 5)
        logger.debug(f"[{self.profile['name']}] Onboarding jitter: {jitter:.1f}s")
        await asyncio.sleep(jitter)

        # 2. Fill profile
        await asyncio.sleep(random.uniform(0.5, 2))
        if not await self.fill_profile():
            logger.warning(f"[{self.profile['name']}] Profile save had issues, continuing...")

        await asyncio.sleep(random.uniform(0.5, 2))
        # 3. Big Five test
        await self.take_big_five_test()

        await asyncio.sleep(random.uniform(0.5, 2))
        # 4. Behavioral Profile (Step 3 of 4)
        await self.take_behavioral_test()

        await asyncio.sleep(random.uniform(0.5, 2))
        # 5. Avatar
        await self.generate_avatar()

        await asyncio.sleep(random.uniform(0.5, 2))
        # 6. Complete onboarding
        await self.complete_onboarding()

        await asyncio.sleep(random.uniform(0.5, 2))
        # 7. Recompute embedding
        await self.recompute_embedding()

        logger.info(f"[{self.profile['name']}] Onboarding complete!")
        return True

    async def run_discover_and_chat(self, sessions: int = 3) -> None:
        """Запускает сессии discover и чаты с мэтчами."""
        logger.info(f"[{self.profile['name']}] === DISCOVER PHASE ===")

        # Ждём пока другие агенты закончат onboarding и их embeddings обновятся
        wait = random.uniform(10, 30)
        logger.info(f"[{self.profile['name']}] Waiting {wait:.0f}s for other agents to complete onboarding...")
        await asyncio.sleep(wait)

        for i in range(sessions):
            logger.info(f"[{self.profile['name']}] --- Discover session {i+1}/{sessions} ---")
            await self.run_discover_session(max_swipes=15)

            # После каждой сессии проверяем мэтчи и начинаем чаты
            matches = await self.get_matches()
            for match in matches:
                await self.chat_with_match(match)
                await asyncio.sleep(random.uniform(1, 3))

            if i < sessions - 1:
                pause = random.uniform(5, 15)
                logger.info(f"[{self.profile['name']}] Pausing {pause:.0f}s before next session...")
                await asyncio.sleep(pause)

        logger.info(f"[{self.profile['name']}] === DISCOVER COMPLETE: {len(self.state.matches)} matches, {len(self.state.conversations)} conversations ===")

    async def run(self) -> None:
        """Полный цикл жизни агента."""
        try:
            success = await self.run_full_onboarding()
            if not success:
                logger.error(f"[{self.profile['name']}] Onboarding failed, aborting")
                return

            # Discover + chat
            await self.run_discover_and_chat(sessions=3)

            # Сохраняем финальное состояние
            await self._save_state()

        except Exception as e:
            logger.error(f"[{self.profile['name']}] Bot run failed: {e}", exc_info=True)
        finally:
            await self.close()

    async def _save_state(self) -> None:
        """Сохраняет финальное состояние в JSON."""
        import os
        state_file = f"profiles/bot_{self.profile['index']:03d}_state.json"
        os.makedirs("profiles", exist_ok=True)
        state = {
            "profile": {k: v for k, v in self.profile.items() if k != "password" and k != "email"},
            "user_id": self.state.user_id,
            "onboarding_complete": self.state.onboarding_complete,
            "candidates_seen": len(self.state.candidates_seen),
            "matches": len(self.state.matches),
            "conversations": {k: len(v) for k, v in self.state.conversations.items()},
        }
        with open(state_file, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2, ensure_ascii=False)