#!/usr/bin/env python3
"""Сравнение двух движков: психометрика vs Матрица души.
Каждый бот запрашивает discover дважды (без параметра и ?engine=soul),
скрипт сравнивает распределения, корреляцию и reshuffle топ-5."""
import asyncio, json, os, random, statistics, sys
from collections import defaultdict
import httpx

APP_URL      = os.environ.get("SYNDI_APP_URL", "https://syndimatch.online")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
ANON_KEY     = os.environ.get("SUPABASE_ANON_KEY")
N_BOTS       = int(os.environ.get("N_BOTS", "15"))

if not (SUPABASE_URL and ANON_KEY):
    sys.exit("set $SUPABASE_URL and $SUPABASE_ANON_KEY")

async def login(client, email, password):
    r = await client.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": ANON_KEY, "Content-Type": "application/json"},
        json={"email": email, "password": password},
    )
    if r.status_code != 200:
        print(f"    HTTP {r.status_code}: {r.text[:120]}")
        return None
    return r.json().get("access_token")

async def discover(client, token, engine=None):
    url = f"{APP_URL}/api/discover/match" + ("?engine=soul" if engine == "soul" else "")
    r = await client.post(url, headers={"Authorization": f"Bearer {token}"})
    if r.status_code != 200: return []
    return r.json().get("candidates", []) or []

def quart(xs):
    q = statistics.quantiles(xs, n=4)
    return q[0], statistics.median(xs), q[2]

async def main():
    profiles = json.load(open("profiles/all_profiles.json"))
    random.seed(7)
    sample = random.sample(profiles, min(N_BOTS, len(profiles)))
    print(f"Sampling {len(sample)} bots\n")

    psycho_scores, soul_scores = [], []
    paired = []          # (psycho_match, soul_match) по одинаковым user_id
    reshuffle_bots = 0; total_bots = 0; swaps_total = 0
    comp_agg = defaultdict(list)
    bio_present = 0; bio_total = 0

    async with httpx.AsyncClient(timeout=60) as client:
        for p in sample:
            try:
                token = await login(client, p["email"], p["password"])
                if not token:
                    print(f"  ✗ {p['name']}: login failed"); continue
                ps = await discover(client, token)
                so = await discover(client, token, engine="soul")
                if not ps or not so:
                    print(f"  ✗ {p['name']}: psycho={len(ps)} soul={len(so)} candidates"); continue

                ps_map = {c["user_id"]: c for c in ps}
                so_map = {c["user_id"]: c for c in so}
                common = set(ps_map) & set(so_map)

                for uid in common:
                    pm = ps_map[uid].get("match", 0)
                    sm = so_map[uid].get("match", 0)
                    psycho_scores.append(pm); soul_scores.append(sm)
                    paired.append((pm, sm))
                    comps = so_map[uid].get("soul_components") or {}
                    for k in ("mbti", "enneagram", "element"):
                        if comps.get(k) is not None: comp_agg[k].append(comps[k])
                    bio_total += 1
                    if comps.get("biorhythm") is not None:
                        bio_present += 1
                        comp_agg["biorhythm"].append(comps["biorhythm"])

                top_ps = [c["user_id"] for c in sorted(ps, key=lambda c: -c.get("match", 0))[:5]]
                top_so = [c["user_id"] for c in sorted(so, key=lambda c: -c.get("match", 0))[:5]]
                moved = [u for u in top_so if u not in top_ps]
                total_bots += 1
                if moved:
                    reshuffle_bots += 1
                    swaps_total += len(moved)
                print(f"  ✓ {p['name']}: {len(common)} pairs, top-5 swaps: {len(moved)}")
            except Exception as e:
                print(f"  ✗ {p['name']}: {type(e).__name__}: {str(e)[:80]}")

    if not paired:
        sys.exit("no data")

    print(f"\n══ Distributions ({len(paired)} candidate-rows) ══")
    for name, xs in (("PSYCHO", psycho_scores), ("SOUL", soul_scores)):
        q1, med, q3 = quart(xs)
        print(f"  {name:7s}: min={min(xs):5.1f}  q1={q1:5.1f}  median={med:5.1f}  q3={q3:5.1f}  max={max(xs):5.1f}  std={statistics.stdev(xs):4.1f}")

    mp = statistics.mean([a for a, _ in paired]); ms = statistics.mean([b for _, b in paired])
    cov = sum((a - mp) * (b - ms) for a, b in paired) / len(paired)
    sp = statistics.stdev([a for a, _ in paired]); ss = statistics.stdev([b for _, b in paired])
    if sp and ss:
        print(f"\n══ Correlation psycho × soul: r = {cov / (sp * ss):.3f} ══")
        print("  (≈0 — движки видят кандидатов независимо; ≈1 — дублируют друг друга)")

    print(f"\n══ Top-5 reshuffle: {reshuffle_bots}/{total_bots} bots, {swaps_total} swaps total ══")

    print(f"\n══ Soul components (медианы) ══")
    for k in ("mbti", "enneagram", "element", "biorhythm"):
        if comp_agg[k]:
            print(f"  {k:10s}: median={statistics.median(comp_agg[k]):5.1f}  std={statistics.stdev(comp_agg[k]) if len(comp_agg[k])>1 else 0:4.1f}")
    print(f"  biorhythm coverage: {bio_present}/{bio_total} pairs ({100*bio_present/max(1,bio_total):.0f}%)")

asyncio.run(main())
