#!/usr/bin/env python3
"""Patch: двухфазный запуск (onboard all → discover all)."""
import pathlib, sys

# ════ 1. bot_v2.py: run_onboard_only + run_discover_only ════
p = pathlib.Path("syndi-agents/bot_v2.py")
s = p.read_text(encoding="utf-8")

anchor = "    async def run(self) -> None:"
if anchor not in s:
    sys.exit("bot_v2.py: run() не найден")

# Проверяем, не вставлены ли уже
if "run_onboard_only" in s:
    print("bot_v2.py: run_onboard_only уже есть, пропускаем")
else:
    insert = '''    async def run_onboard_only(self) -> None:
        """Фаза 1: только онбординг (без discover)."""
        try:
            success = await self.run_full_onboarding()
            if not success:
                logger.error(f"[{self.profile['name']}] Onboard failed")
        except Exception as e:
            logger.error(f"[{self.profile['name']}] Onboard error: {e}")
        finally:
            await self.close()

    async def run_discover_only(self) -> None:
        """Фаза 2: discover+chat (после того как ВСЕ боты в пуле)."""
        try:
            if not self.state.user_id:
                if not await self.login():
                    return
            if not self.state.founder_id:
                await self._fetch_founder_id()
            await self.run_discover_and_chat(sessions=3)
        except Exception as e:
            logger.error(f"[{self.profile['name']}] Discover error: {e}")
        finally:
            await self.close()

'''
    s = s.replace(anchor, insert + anchor, 1)
    p.write_text(s, encoding="utf-8")
    print("✓ bot_v2.py: run_onboard_only + run_discover_only")

# ════ 2. orchestrator.py: run_two_phase ════
p = pathlib.Path("syndi-agents/orchestrator.py")
s = p.read_text(encoding="utf-8")

if "run_two_phase" in s:
    print("orchestrator.py: run_two_phase уже есть, пропускаем")
else:
    anchor2 = "    async def _run_single_bot(self, profile"
    if anchor2 not in s:
        sys.exit("orchestrator.py: _run_single_bot не найден")

    insert2 = '''    async def run_two_phase(self, profiles: list) -> None:
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
                state = bot.get_state()
                self._save_bot_state(profile["index"], state)
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
                state = bot.get_state()
                self._save_bot_state(profile["index"], state)
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
        self._print_final_stats()

'''
    s = s.replace(anchor2, insert2 + anchor2, 1)
    p.write_text(s, encoding="utf-8")
    print("✓ orchestrator.py: run_two_phase")

# ════ 3. run.py: команда two-phase ════
p = pathlib.Path("syndi-agents/run.py")
s = p.read_text(encoding="utf-8")

if "two-phase" in s or "two_phase" in s:
    print("run.py: two-phase уже есть, пропускаем")
else:
    # Добавляем функцию cmd_two_phase перед cmd_full
    anchor3 = "async def cmd_full(args: argparse.Namespace) -> None:"
    if anchor3 not in s:
        sys.exit("run.py: cmd_full не найден")

    func = '''async def cmd_two_phase(args: argparse.Namespace) -> None:
    """Двухфазный запуск: все онбордятся -> все свайпят."""
    profiles = _get_profiles(args)
    supabase_url, anon_key = _get_credentials(args)
    orch = Orchestrator(
        supabase_url=supabase_url,
        supabase_anon_key=anon_key,
        concurrency=getattr(args, "concurrency", 5),
    )
    await orch.run_two_phase(profiles)


'''
    s = s.replace(anchor3, func + anchor3, 1)

    # Добавляем subparser — ищем где создаются subparsers
    # Проще всего: найти строку с add_parser("full") и перед ней добавить
    if 'add_parser("full"' in s:
        sp_code = '''    sp = sub.add_parser("two-phase", help="All onboard first, then all discover")
    sp.add_argument("--supabase-url", default=None)
    sp.add_argument("--anon-key", default=None)
    sp.add_argument("--count", type=int, default=100)
    sp.add_argument("--regenerate", action="store_true")

    '''
        s = s.replace('    sub.add_parser("full"', sp_code + '    sub.add_parser("full"', 1)

    # Добавляем в dispatch map
    if '"full": cmd_full' in s:
        s = s.replace('"full": cmd_full', '"two-phase": cmd_two_phase,\n        "full": cmd_full', 1)
    elif '"full":' in s:
        pass  # другой формат, пропускаем

    p.write_text(s, encoding="utf-8")
    print("✓ run.py: команда two-phase")

print()
print("Готово. Запуск: cd syndi-agents && python3 run.py two-phase ...")
