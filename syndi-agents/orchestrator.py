"""
Orchestrator — управляет запуском 100 AI-агентов SyndiAI.
Генерирует профили, запускает ботов параллельно, собирает статистику.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Any

from personalities import generate_all
from bot_api import SyndiBot

logger = logging.getLogger("syndi-orchestrator")


@dataclass
class RunStats:
    """Статистика прогона."""
    total: int = 0
    onboarded: int = 0
    failed: int = 0
    total_swipes: int = 0
    total_matches: int = 0
    total_messages: int = 0
    start_time: float = 0.0
    end_time: float = 0.0
    errors: list[str] = field(default_factory=list)

    @property
    def duration(self) -> float:
        return self.end_time - self.start_time

    @property
    def success_rate(self) -> float:
        if self.total == 0:
            return 0.0
        return self.onboarded / self.total * 100

    def to_dict(self) -> dict:
        return {
            "total_agents": self.total,
            "onboarded": self.onboarded,
            "failed": self.failed,
            "total_swipes": self.total_swipes,
            "total_matches": self.total_matches,
            "total_conversations": self.total_messages,
            "duration_seconds": round(self.duration, 1),
            "success_rate_percent": round(self.success_rate, 1),
            "errors": self.errors[:10],  # Первые 10 ошибок
        }


class Orchestrator:
    """Управляет fleet из N AI-агентов."""

    def __init__(
        self,
        supabase_url: str,
        supabase_anon_key: str,
        app_url: str = "",
        concurrency: int = 5,
    ) -> None:
        self.supabase_url = supabase_url
        self.supabase_anon_key = supabase_anon_key
        self.app_url = "Supabase Direct"
        self.concurrency = concurrency
        self.stats = RunStats()

    def generate_profiles(self, count: int = 100) -> list[dict[str, Any]]:
        """Генерирует N уникальных профилей и сохраняет на диск."""
        logger.info(f"Generating {count} founder profiles...")
        profiles = generate_all(count)

        # Сохраняем
        os.makedirs("profiles", exist_ok=True)
        with open("profiles/all_profiles.json", "w", encoding="utf-8") as f:
            # Сохраняем полные профили (пароли demo-only, нужны для login)
            json.dump(profiles, f, indent=2, ensure_ascii=False)

        # Сохраняем CSV для удобного просмотра
        self._save_csv(profiles)

        logger.info(f"Profiles saved: {count} total")
        return profiles

    def _save_csv(self, profiles: list[dict]) -> None:
        """Сохраняет сводную CSV."""
        import csv
        csv_path = "profiles/overview.csv"
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                "#", "Name", "Role", "Domain", "Location", "Stage",
                "Archetype", "O", "C", "E", "A", "N",
                "Startup", "Match Score Target",
            ])
            for p in profiles:
                bf = p["big_five"]
                writer.writerow([
                    p["index"], p["name"], p["role"], p["domain"], p["location"], p["stage"],
                    p["archetype"], bf["openness"], bf["conscientiousness"], bf["extraversion"],
                    bf["agreeableness"], bf["neuroticism"],
                    p["startup"]["title"],
                    f"{random.uniform(0.4, 0.6):.2f}",
                ])
        logger.info(f"CSV overview saved: {csv_path}")

    async def run_two_phase(self, profiles: list) -> None:
        """Двухфазный: сначала все онбордятся, потом все свайпят."""
        import time as _time
        sem = asyncio.Semaphore(self.concurrency)
        self.stats.total = len(profiles)
        self.stats.start_time = _time.time()

        async def _onboard(profile):
            async with sem:
                bot = SyndiBot(
                    profile=profile,
                    supabase_url=self.supabase_url,
                    supabase_anon_key=self.supabase_anon_key,
                )
                await bot.run_onboard_only()
                state = {
                    "name": profile["name"],
                    "user_id": bot.state.user_id,
                    "onboarding_complete": bot.state.onboarding_complete,
                    "candidates_seen": len(bot.state.candidates_seen) if isinstance(bot.state.candidates_seen, set) else bot.state.candidates_seen,
                    "matches": len(bot.state.matches) if isinstance(bot.state.matches, list) else bot.state.matches,
                    "conversations": bot.state.conversations if isinstance(bot.state.conversations, dict) else {},
                }
                import json as _json; __import__("os").makedirs("profiles", exist_ok=True)
                with open(f"profiles/bot_{profile['index']:03d}_state.json", "w") as _f:
                    _json.dump(state, _f, indent=2, ensure_ascii=False)
                if state.get("onboarding_complete"):
                    self.stats.onboarded += 1
                else:
                    self.stats.failed += 1
                return state

        async def _discover(profile):
            async with sem:
                bot = SyndiBot(
                    profile=profile,
                    supabase_url=self.supabase_url,
                    supabase_anon_key=self.supabase_anon_key,
                )
                await bot.run_discover_only()
                state = {
                    "name": profile["name"],
                    "user_id": bot.state.user_id,
                    "onboarding_complete": bot.state.onboarding_complete,
                    "candidates_seen": len(bot.state.candidates_seen) if isinstance(bot.state.candidates_seen, set) else bot.state.candidates_seen,
                    "matches": len(bot.state.matches) if isinstance(bot.state.matches, list) else bot.state.matches,
                    "conversations": bot.state.conversations if isinstance(bot.state.conversations, dict) else {},
                }
                import json as _json; __import__("os").makedirs("profiles", exist_ok=True)
                with open(f"profiles/bot_{profile['index']:03d}_state.json", "w") as _f:
                    _json.dump(state, _f, indent=2, ensure_ascii=False)
                matches = state.get("matches", [])
                if isinstance(matches, list):
                    self.stats.total_matches += len(matches)
                convos = state.get("conversations", {})
                if isinstance(convos, dict):
                    self.stats.total_messages += len(convos)
                return state

        # Фаза 1
        logger.info(f"{'='*60}")
        logger.info(f"  PHASE 1: ONBOARDING {len(profiles)} bots")
        logger.info(f"{'='*60}")
        await asyncio.gather(*[_onboard(p) for p in profiles])
        logger.info(f"  Phase 1 done: {self.stats.onboarded} onboarded, {self.stats.failed} failed")

        # Фаза 2
        logger.info(f"{'='*60}")
        logger.info(f"  PHASE 2: DISCOVER ({self.stats.onboarded} bots in pool)")
        logger.info(f"{'='*60}")
        await asyncio.gather(*[_discover(p) for p in profiles])
        self.stats.end_time = _time.time()
        logger.info(f"  Phase 2 done: {self.stats.total_matches} matches, {self.stats.total_messages} messages")
        logger.info(f"=== DONE: {self.stats.onboarded} onboarded, {self.stats.total_matches} matches, {self.stats.total_messages} msgs ===")

    async def _run_single_bot(self, profile: dict[str, Any]) -> dict:
        """Запускает одного бота и возвращает результат."""
        bot = SyndiBot(
            profile=profile,
            supabase_url=self.supabase_url,
            supabase_anon_key=self.supabase_anon_key,
        )
        try:
            await bot.run()
            total_messages = sum(len(v) for v in bot.state.conversations.values())
            return {
                "index": profile["index"],
                "name": profile["name"],
                "status": "success",
                "matches": len(bot.state.matches),
                "conversations": len(bot.state.conversations),
                "total_messages": total_messages,
                "candidates_seen": len(bot.state.candidates_seen),
            }
        except Exception as e:
            logger.error(f"[{profile['name']}] Bot crashed: {e}")
            return {
                "index": profile["index"],
                "name": profile["name"],
                "status": "failed",
                "error": str(e),
            }
        finally:
            await bot.close()

    async def run(self, profiles: list[dict[str, Any]]) -> RunStats:
        """Запускает всех ботов с ограниченной concurrency."""
        self.stats = RunStats()
        self.stats.total = len(profiles)
        self.stats.start_time = time.time()

        logger.info(f"\n{'#'*60}")
        logger.info(f"  SYNDI AI AGENT FLEET — {len(profiles)} bots")
        logger.info(f"  Target: {self.app_url}")
        logger.info(f"  Concurrency: {self.concurrency}")
        logger.info(f"{'#'*60}\n")

        # Semaphore для ограничения concurrency
        semaphore = asyncio.Semaphore(self.concurrency)

        async def _run_with_semaphore(profile: dict) -> dict:
            async with semaphore:
                # Небольшая случайная задержка перед стартом (jitter)
                await asyncio.sleep(random.uniform(0, 1))
                return await self._run_single_bot(profile)

        # Запускаем все
        tasks = [_run_with_semaphore(p) for p in profiles]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Собираем статистику
        for result in results:
            if isinstance(result, Exception):
                self.stats.failed += 1
                self.stats.errors.append(str(result))
                continue

            if result.get("status") == "success":
                self.stats.onboarded += 1
                self.stats.total_swipes += result.get("candidates_seen", 0)
                self.stats.total_matches += result.get("matches", 0)
                self.stats.total_messages += result.get("total_messages", 0)
            else:
                self.stats.failed += 1
                if "error" in result:
                    self.stats.errors.append(f"{result['name']}: {result['error']}")

        self.stats.end_time = time.time()

        # Сохраняем статистику
        self._save_stats()

        return self.stats

    def _save_stats(self) -> None:
        """Сохраняет итоговую статистику."""
        stats_path = "profiles/run_stats.json"
        with open(stats_path, "w", encoding="utf-8") as f:
            json.dump(self.stats.to_dict(), f, indent=2, ensure_ascii=False)

        logger.info(f"\n{'='*60}")
        logger.info(f"  RUN COMPLETE")
        logger.info(f"{'='*60}")
        logger.info(f"  Total agents:   {self.stats.total}")
        logger.info(f"  Onboarded:      {self.stats.onboarded} ({self.stats.success_rate:.0f}%)")
        logger.info(f"  Failed:         {self.stats.failed}")
        logger.info(f"  Total swipes:   {self.stats.total_swipes}")
        logger.info(f"  Total matches:  {self.stats.total_matches}")
        logger.info(f"  Total messages: {self.stats.total_messages}")
        logger.info(f"  Duration:       {self.stats.duration:.1f}s")
        logger.info(f"  Stats saved:    {stats_path}")
        logger.info(f"{'='*60}\n")


import random  # для CSV generation
