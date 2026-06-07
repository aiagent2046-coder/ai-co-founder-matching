#!/usr/bin/env python3
"""
SyndiAI Agent Fleet — запуск 100 AI-агентов для демонстрации платформы.

Usage:
    # Генерация профилей
    python run.py generate --count 100

    # Полный цикл (onboarding + discover + chat)
    python run.py full --supabase-url https://xxx.supabase.co --anon-key xxx

    # Только onboarding
    python run.py onboard --supabase-url https://xxx.supabase.co --anon-key xxx

    # Только discover + swipe
    python run.py discover --supabase-url https://xxx.supabase.co --anon-key xxx

    # Показать статистику
    python run.py stats
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys

from orchestrator import Orchestrator
from personalities import generate_all

# ── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-20s | %(levelname)-7s | %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("fleet.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger("syndi-fleet")


# ── CLI ──────────────────────────────────────────────────────────────────────

def env_or_prompt(var_name: str, prompt_text: str) -> str:
    """Берёт значение из env или спрашивает пользователя."""
    value = os.environ.get(var_name)
    if value:
        return value
    value = input(f"{prompt_text}: ").strip()
    if not value:
        logger.error(f"{var_name} is required")
        sys.exit(1)
    return value


def cmd_generate(args: argparse.Namespace) -> None:
    """Генерирует профили без запуска."""
    logger.info(f"Generating {args.count} founder profiles...")
    orch = Orchestrator(
        supabase_url="",
        supabase_anon_key="",
    )
    profiles = orch.generate_profiles(args.count)
    logger.info(f"Generated {len(profiles)} profiles")
    logger.info("Profiles saved to: profiles/all_profiles.json")
    logger.info("CSV overview: profiles/overview.csv")


def _get_profiles(args: argparse.Namespace) -> list[dict]:
    """Загружает или генерирует профили."""
    profiles_path = "profiles/all_profiles.json"
    if os.path.exists(profiles_path) and not args.regenerate:
        logger.info(f"Loading existing profiles from {profiles_path}")
        with open(profiles_path, encoding="utf-8") as f:
            return json.load(f)
    logger.info("Generating new profiles...")
    orch = Orchestrator(supabase_url="", supabase_anon_key="")
    return orch.generate_profiles(args.count)


def _get_credentials(args: argparse.Namespace) -> tuple[str, str]:
    """Получает креденшелы Supabase."""
    supabase_url = args.supabase_url or env_or_prompt("SUPABASE_URL", "Supabase project URL (https://xxx.supabase.co)")
    anon_key = args.anon_key or env_or_prompt("SUPABASE_ANON_KEY", "Supabase anon/public key")
    return supabase_url, anon_key


async def cmd_two_phase(args: argparse.Namespace) -> None:
    """Двухфазный запуск: все онбордятся -> все свайпят."""
    profiles = _get_profiles(args)
    supabase_url, anon_key = _get_credentials(args)
    orch = Orchestrator(
        supabase_url=supabase_url,
        supabase_anon_key=anon_key,
        concurrency=getattr(args, "concurrency", 5),
    )
    await orch.run_two_phase(profiles)


async def cmd_full(args: argparse.Namespace) -> None:
    """Полный цикл."""
    profiles = _get_profiles(args)
    supabase_url, anon_key = _get_credentials(args)

    orch = Orchestrator(
        supabase_url=supabase_url,
        supabase_anon_key=anon_key,
        concurrency=args.concurrency,
    )

    stats = await orch.run(profiles[:args.count])

    logger.info(f"\n{'='*50}")
    logger.info(f"SUCCESS RATE: {stats.success_rate:.1f}%")
    logger.info(f"SWIPES: {stats.total_swipes}")
    logger.info(f"MATCHES: {stats.total_matches}")
    logger.info(f"MESSAGES: {stats.total_messages}")
    logger.info(f"DURATION: {stats.duration:.1f}s")
    logger.info(f"{'='*50}")


def cmd_stats(args: argparse.Namespace) -> None:
    """Показывает статистику последнего прогона."""
    stats_path = "profiles/run_stats.json"
    if not os.path.exists(stats_path):
        logger.error(f"No stats file found at {stats_path}")
        return

    with open(stats_path, encoding="utf-8") as f:
        stats = json.load(f)

    print(f"\n  {'='*50}")
    print(f"   SYNDI AI AGENT FLEET — RUN STATISTICS")
    print(f"  {'='*50}")
    print(f"   Total agents:      {stats['total_agents']}")
    print(f"   Onboarded:         {stats['onboarded']} ({stats['success_rate_percent']}%)")
    print(f"   Failed:            {stats['failed']}")
    print(f"   Total swipes:      {stats.get('total_swipes', 0)}")
    print(f"   Total matches:     {stats['total_matches']}")
    print(f"   Total messages:    {stats.get('total_messages', 0)}")
    print(f"   Duration:          {stats['duration_seconds']}s")
    print(f"  {'='*50}\n")

    if stats.get("errors"):
        print(f"  Errors ({len(stats['errors'])}):")
        for e in stats["errors"][:5]:
            print(f"    - {e}")
        print()


async def cmd_onboard(args: argparse.Namespace) -> None:
    """Только onboarding."""
    profiles = _get_profiles(args)
    supabase_url, anon_key, app_url = _get_credentials(args)

    orch = Orchestrator(supabase_url=supabase_url, supabase_anon_key=anon_key, app_url=app_url)
    # TODO: implement partial run
    logger.info("Onboard mode: use 'full' command (onboarding is part of full run)")
    stats = await orch.run(profiles[:args.count])
    logger.info(f"Onboarded: {stats.onboarded}/{stats.total}")


async def cmd_discover(args: argparse.Namespace) -> None:
    """Только discover + swipe."""
    logger.info("Discover mode: use 'full' command (discover is part of full run)")
    await cmd_full(args)


# ── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="SyndiAI Agent Fleet — 100 AI founders for demo",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run.py generate --count 100
  python run.py full --supabase-url https://xxx.supabase.co --anon-key xxx
  python run.py stats
        """,
    )
    subparsers = parser.add_subparsers(dest="command", help="Command")

    # generate
    gen_parser = subparsers.add_parser("generate", help="Generate profiles only")
    gen_parser.add_argument("--count", type=int, default=100, help="Number of profiles (default: 100)")
    gen_parser.set_defaults(func=lambda a: cmd_generate(a))

    # full
    full_parser = subparsers.add_parser("full", help="Full lifecycle: onboard + discover + chat")
    full_parser.add_argument("--count", type=int, default=100, help="Number of bots (default: 100)")
    full_parser.add_argument("--supabase-url", default=os.environ.get("SUPABASE_URL"), help="Supabase URL")
    full_parser.add_argument("--anon-key", default=os.environ.get("SUPABASE_ANON_KEY"), help="Supabase anon key")
    full_parser.add_argument("--app-url", default=os.environ.get("APP_URL", "http://localhost:3000"), help="App URL")
    full_parser.add_argument("--concurrency", type=int, default=5, help="Max concurrent bots (default: 5)")
    full_parser.add_argument("--regenerate", action="store_true", help="Regenerate profiles even if exists")
    full_parser.set_defaults(func=lambda a: asyncio.run(cmd_full(a)))

    # Two-phase: onboard all -> discover all
    tp_parser = subparsers.add_parser("two-phase", help="Two-phase: onboard all, then discover all")
    tp_parser.add_argument("--supabase-url", default=None)
    tp_parser.add_argument("--anon-key", default=None)
    tp_parser.add_argument("--count", type=int, default=100)
    tp_parser.add_argument("--regenerate", action="store_true")
    tp_parser.set_defaults(func=lambda a: asyncio.run(cmd_two_phase(a)))

    # onboard
    on_parser = subparsers.add_parser("onboard", help="Onboarding only")
    on_parser.add_argument("--count", type=int, default=100)
    on_parser.add_argument("--supabase-url", default=os.environ.get("SUPABASE_URL"))
    on_parser.add_argument("--anon-key", default=os.environ.get("SUPABASE_ANON_KEY"))
    on_parser.add_argument("--app-url", default=os.environ.get("APP_URL", "http://localhost:3000"))
    on_parser.set_defaults(func=lambda a: asyncio.run(cmd_onboard(a)))

    # discover
    dis_parser = subparsers.add_parser("discover", help="Discover + swipe only")
    dis_parser.add_argument("--count", type=int, default=100)
    dis_parser.add_argument("--supabase-url", default=os.environ.get("SUPABASE_URL"))
    dis_parser.add_argument("--anon-key", default=os.environ.get("SUPABASE_ANON_KEY"))
    dis_parser.add_argument("--app-url", default=os.environ.get("APP_URL", "http://localhost:3000"))
    dis_parser.set_defaults(func=lambda a: asyncio.run(cmd_discover(a)))

    # stats
    stat_parser = subparsers.add_parser("stats", help="Show run statistics")
    stat_parser.set_defaults(func=lambda a: cmd_stats(a))

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    if asyncio.iscoroutinefunction(args.func):
        asyncio.run(args.func(args))
    else:
        args.func(args)


if __name__ == "__main__":
    main()
