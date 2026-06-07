#!/usr/bin/env python3
"""Сравнение распределений match-score'ов: формула OFF vs ON.
Не требует переключения env-флага — оба значения вычисляются локально из vector/ocean/behavioral."""
import asyncio, json, statistics, random, os, sys
from collections import defaultdict
from pathlib import Path
import httpx

APP_URL      = os.environ.get("SYNDI_APP_URL", "https://ai-co-founder-matching.vercel.app")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
ANON_KEY     = os.environ.get("SUPABASE_ANON_KEY")
N_BOTS       = int(os.environ.get("N_BOTS", "10"))

if not (SUPABASE_URL and ANON_KEY):
    sys.exit("set $SUPABASE_URL and $SUPABASE_ANON_KEY")

# Формулы (как в роуте /api/discover/match)
def hybrid_off(c): return c["vector_score"] * 0.6 + c["ocean_score"] * 0.4
def hybrid_on(c):  return c["vector_score"] * 0.4 + c["ocean_score"] * 0.4 + c["behavioral_score"] * 0.2

async def login(client, email, password):
    r = await client.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": ANON_KEY, "Content-Type": "application/json"},
        json={"email": email, "password": password},
    )
    if r.status_code != 200:
        print(f"    HTTP {r.status_code}: {r.text[:200]}")
        return None
    return r.json().get("access_token")

async def discover(client, token):
    r = await client.post(
        f"{APP_URL}/api/discover/match",
        headers={"Authorization": f"Bearer {token}"},
    )
    if r.status_code != 200: return []
    return r.json().get("candidates", []) or []

async def main():
    profiles = json.load(open("profiles/all_profiles.json"))
    random.seed(42)
    sample = random.sample(profiles, min(N_BOTS, len(profiles)))
    print(f"Sampling {len(sample)} bots\n")

    all_rows = []
    async with httpx.AsyncClient(timeout=60) as client:
        for p in sample:
            try:
                token = await login(client, p["email"], p["password"])
                if not token:
                    print(f"  ✗ {p['name']}: login failed"); continue
                cands = await discover(client, token)
                for c in cands:
                    c.setdefault("vector_score", 0)
                    c.setdefault("ocean_score", 0)
                    c.setdefault("behavioral_score", 50)
                    c["_bot"] = p["name"]
                    all_rows.append(c)
                print(f"  ✓ {p['name']}: {len(cands)} candidates")
            except Exception as e:
                print(f"  ✗ {p['name']}: {type(e).__name__}: {str(e)[:80]}"); continue

    if not all_rows:
        sys.exit("no data")

    print(f"\n══ Aggregate distributions ({len(all_rows)} candidate-rows) ══")
    s_off = [hybrid_off(c) for c in all_rows]
    s_on  = [hybrid_on(c)  for c in all_rows]
    s_beh = [c["behavioral_score"] for c in all_rows]

    def show(name, xs):
        return (f"{name:7s}: min={min(xs):5.1f}  q1={statistics.quantiles(xs,n=4)[0]:5.1f}  "
                f"median={statistics.median(xs):5.1f}  q3={statistics.quantiles(xs,n=4)[2]:5.1f}  "
                f"max={max(xs):5.1f}  std={statistics.stdev(xs):4.1f}")

    print("  " + show("OFF",   s_off))
    print("  " + show("ON",    s_on))
    print("  " + show("BEHAV", s_beh))

    # Top-5 changes per bot
    by_bot = defaultdict(list)
    for c in all_rows: by_bot[c["_bot"]].append(c)
    bots_changed = 0; total_swaps = 0
    print(f"\n══ Top-5 ranking changes (по каждому боту) ══")
    for bot, cands in by_bot.items():
        if len(cands) < 5: continue
        off5 = [c["user_id"] for c in sorted(cands, key=hybrid_off, reverse=True)[:5]]
        on5  = [c["user_id"] for c in sorted(cands, key=hybrid_on,  reverse=True)[:5]]
        moved_in = [u for u in on5 if u not in off5]
        if moved_in:
            bots_changed += 1
            total_swaps += len(moved_in)
            print(f"  {bot:25s} ↺ {len(moved_in)} candidate(s) entered top-5")
    print(f"\n  Total: {bots_changed}/{len(by_bot)} bots had top-5 reshuffled, {total_swaps} swaps")

    # Behavioral score histogram
    print(f"\n══ Behavioral score histogram ══")
    buckets = [0]*10
    for s in s_beh: buckets[min(9, int(s/10))] += 1
    maxc = max(buckets) or 1
    for i, c in enumerate(buckets):
        bar = "█" * int(c * 40 / maxc)
        print(f"  {i*10:3d}-{i*10+9:3d}: {bar} {c}")

    # Correlation between behavioral and ocean (sanity: должно быть слабым после emotion-патча)
    if len(all_rows) > 5:
        b = s_beh
        o = [c["ocean_score"] for c in all_rows]
        mean_b, mean_o = statistics.mean(b), statistics.mean(o)
        cov = sum((bi-mean_b)*(oi-mean_o) for bi, oi in zip(b, o)) / len(b)
        sd_b, sd_o = statistics.stdev(b), statistics.stdev(o)
        if sd_b and sd_o:
            corr = cov / (sd_b * sd_o)
            print(f"\n══ Correlation behavioral × ocean: r = {corr:.3f} ══")
            print(f"  (близко к 0 = независимые сигналы ✓; близко к 1 = коллинеарны ✗)")

asyncio.run(main())
