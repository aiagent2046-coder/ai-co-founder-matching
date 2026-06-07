#!/usr/bin/env python3
"""Patch: emotions + onboarding_done + matches table write + founder_id capture."""
import pathlib, re, sys

# ════ 1. personalities.py: эмоции ════════════════════════════════════════════
p = pathlib.Path("syndi-agents/personalities.py")
s = p.read_text(encoding="utf-8")

old = ('    looking_for = random.sample(LOOKING_FOR_OPTIONS, min(random.randint(2, 4), len(LOOKING_FOR_OPTIONS)))\n'
       '    not_looking_for = random.sample(NOT_LOOKING_FOR_OPTIONS, min(random.randint(2, 3), len(NOT_LOOKING_FOR_OPTIONS)))\n\n'
       '    return {')
new = ('    looking_for = random.sample(LOOKING_FOR_OPTIONS, min(random.randint(2, 4), len(LOOKING_FOR_OPTIONS)))\n'
       '    not_looking_for = random.sample(NOT_LOOKING_FOR_OPTIONS, min(random.randint(2, 3), len(NOT_LOOKING_FOR_OPTIONS)))\n\n'
       '    # Эмоциональные черты — НЕЗАВИСИМЫЕ от OCEAN, дают независимый сигнал в behavioral.\n'
       '    emotions = {\n'
       '        "empathy": random.randint(20, 90),\n'
       '        "anger":   random.randint(10, 80),\n'
       '        "cunning": random.randint(10, 80),\n'
       '        "lying":   random.randint(10, 70),\n'
       '        "honesty": random.randint(30, 95),\n'
       '    }\n\n'
       '    return {')
if old not in s: sys.exit("personalities.py: anchor #1 не найден")
s = s.replace(old, new, 1)

old = '        "autonomy_level": random.randint(1, 5),\n    }'
new = '        "autonomy_level": random.randint(1, 5),\n        "emotions": emotions,\n    }'
if old not in s: sys.exit("personalities.py: anchor #2 не найден")
s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")
print("✓ personalities.py: emotions добавлены")

# ════ 2. bot_v2.py: 5 точечных правок ════════════════════════════════════════
p = pathlib.Path("syndi-agents/bot_v2.py")
s = p.read_text(encoding="utf-8")

# 2.1 BotState — добавить founder_id
m = re.search(r"(class BotState:[^@]*?user_id: Optional\[str\] = None\n)", s)
if not m: sys.exit("bot_v2.py: BotState не найден")
s = s[:m.end()] + "    founder_id: Optional[str] = None  # founder_profiles.id для matches\n" + s[m.end():]
print("✓ BotState: добавлен founder_id")

# 2.2a fill_profile: захват founder_id после POST
old = ('        result = await self._supabase_post("founder_profiles", payload)\n'
       '        if result:\n'
       '            logger.info(f"[{self.profile[\'name\']}] Profile saved")\n'
       '            return True')
new = ('        result = await self._supabase_post("founder_profiles", payload)\n'
       '        if result:\n'
       '            if isinstance(result, list) and result:\n'
       '                self.state.founder_id = result[0].get("id")\n'
       '            elif isinstance(result, dict):\n'
       '                self.state.founder_id = result.get("id")\n'
       '            logger.info(f"[{self.profile[\'name\']}] Profile saved (founder_id={self.state.founder_id})")\n'
       '            return True')
if old not in s: sys.exit("bot_v2.py: fill_profile POST не найден")
s = s.replace(old, new, 1)
print("✓ fill_profile: founder_id из POST")

# 2.2b fill_profile: захват founder_id и через update path (+ helper _fetch_founder_id)
old = ('        ok = await self._supabase_patch(\n'
       '            "founder_profiles",\n'
       '            {"user_id": f"eq.{self.state.user_id}"},\n'
       '            {k: v for k, v in payload.items() if k != "user_id"},\n'
       '        )\n'
       '        if ok:\n'
       '            logger.info(f"[{self.profile[\'name\']}] Profile updated")\n'
       '        return ok\n\n'
       '    async def take_big_five_test(self) -> dict:')
new = ('        ok = await self._supabase_patch(\n'
       '            "founder_profiles",\n'
       '            {"user_id": f"eq.{self.state.user_id}"},\n'
       '            {k: v for k, v in payload.items() if k != "user_id"},\n'
       '        )\n'
       '        if ok:\n'
       '            logger.info(f"[{self.profile[\'name\']}] Profile updated")\n'
       '        if not self.state.founder_id:\n'
       '            await self._fetch_founder_id()\n'
       '        return ok\n\n'
       '    async def _fetch_founder_id(self) -> None:\n'
       '        rows = await self._supabase_get(\n'
       '            "founder_profiles",\n'
       '            {"user_id": f"eq.{self.state.user_id}", "select": "id"},\n'
       '        )\n'
       '        if rows and isinstance(rows, list) and rows:\n'
       '            self.state.founder_id = rows[0].get("id")\n\n'
       '    async def take_big_five_test(self) -> dict:')
if old not in s: sys.exit("bot_v2.py: fill_profile end не найден")
s = s.replace(old, new, 1)
print("✓ fill_profile: + _fetch_founder_id")

# 2.3 complete_onboarding: имя колонки
old = '{"onboarding_complete": True}'
new = '{"onboarding_done": True}'
if old not in s: sys.exit("bot_v2.py: onboarding_complete не найден")
s = s.replace(old, new, 1)
print("✓ complete_onboarding: колонка onboarding_done")

# 2.4 take_behavioral_test: полная замена на emotion-driven
new_func = '''    async def take_behavioral_test(self) -> dict:
        await asyncio.sleep(random.uniform(0.5, 2))
        bf = self.profile["big_five"]
        e = self.profile.get("emotions", {"empathy":50,"anger":50,"cunning":50,"lying":50,"honesty":50})
        rng = random.Random(self.profile["index"] * 277)

        def likert(score_0_100: float) -> int:
            base = score_0_100 / 25.0
            noise = rng.choice([-0.5, 0, 0, 0, 0.5])
            return max(1, min(5, int(round(base + noise + 1))))

        def weighted(choices: dict) -> str:
            keys = list(choices.keys())
            weights = [max(1.0, choices[k]) for k in keys]
            return rng.choices(keys, weights=weights, k=1)[0]

        # Honesty-Humility (q1, q3 reverse → высокая = склонность к нечестности)
        q1 = likert((e["lying"] + e["cunning"] + (100 - e["honesty"])) / 3)
        q2 = likert((e["empathy"] + e["honesty"]) / 2)
        q3 = likert((e["cunning"] + (100 - e["honesty"])) / 2)
        # Values
        q4 = likert((bf["extraversion"] + (100 - bf["agreeableness"])) / 2)
        q5 = likert((e["empathy"] + bf["openness"]) / 2)
        q6 = likert((bf["openness"] + (100 - bf["conscientiousness"])) / 2)
        # Conflict (forced-choice; чисто эмоции)
        q7 = weighted({
            "competing":     (e["anger"] + (100 - e["empathy"])) / 2,
            "collaborating": (e["empathy"] + e["honesty"]) / 2,
            "compromising":  100 - abs(e["anger"] - 50) - abs(e["empathy"] - 50),
            "avoiding":      (100 - e["anger"]) * 0.7,
        })
        q8 = weighted({
            "confront":     e["anger"],
            "investigate":  e["empathy"],
            "redistribute": 60.0,
            "absorb":       e["cunning"],
        })
        q9 = weighted({
            "parallel": e["cunning"],
            "debate":   (e["honesty"] + e["anger"]) / 2,
            "merge":    e["empathy"],
            "concede":  (100 - e["anger"]) * (100 - e["cunning"]) / 100,
        })
        # Projective
        q10 = weighted({
            "chaos":       e["honesty"],
            "cold":        e["empathy"],
            "no_ambition": e["anger"],
            "overthink":   100 - e["anger"],
        })
        q11 = weighted({
            "do":       bf["extraversion"] + (100 - bf["conscientiousness"]),
            "plan":     bf["conscientiousness"] * 1.5,
            "talk":     (bf["agreeableness"] + bf["extraversion"]) / 2,
            "creative": bf["openness"] + (100 - bf["conscientiousness"]),
        })
        q12 = weighted({
            "lawgiver":  (bf["conscientiousness"] + e["honesty"]) / 2,
            "flexible":  (100 - e["honesty"] + e["cunning"]) / 2,
            "anarchist": (e["anger"] + (100 - bf["conscientiousness"])) / 2,
            "executor":  (e["honesty"] + bf["conscientiousness"]) / 2,
        })

        h_scores = [6 - q1, q2, 6 - q3]
        honesty_humility = round((sum(h_scores) / len(h_scores)) * 20)

        behavioral_profile = {
            "honesty_humility": honesty_humility,
            "values": {
                "achievement_power": round(q4 * 20),
                "universalism":      round(q5 * 20),
                "self_direction":    round(q6 * 20),
            },
            "conflict": {
                "primary_style":        q7,
                "performance_response": q8,
                "strategy_response":    q9,
            },
            "projective": {
                "partner_irritants": q10,
                "decision_style":    q11,
                "rule_orientation":  q12,
            },
        }

        await self._supabase_patch(
            "founder_profiles",
            {"user_id": f"eq.{self.state.user_id}"},
            {"behavioral_profile": behavioral_profile},
        )
        logger.info(f"[{self.profile['name']}] Behavioral: H={honesty_humility}, conflict={q7}, e:emp={e['empathy']}/ang={e['anger']}/cun={e['cunning']}")
        return behavioral_profile
'''

pat = re.compile(r"    async def take_behavioral_test\(self\) -> dict:.*?(?=    def _generate_embedding)", re.DOTALL)
if not pat.search(s): sys.exit("bot_v2.py: take_behavioral_test не найдена")
s = pat.sub(new_func + "\n", s)
print("✓ take_behavioral_test: emotion-driven")

# 2.5 swipe: при mutual теперь пишем в matches
old = ('            if mutual:\n'
       '                logger.info(f"[{self.profile[\'name\']}] MUTUAL MATCH with {candidate.get(\'name\', \'?\')}! (score: {compatibility:.2f})")\n'
       '                self.state.matches.append(candidate)\n'
       '            else:')
new = ('            if mutual:\n'
       '                logger.info(f"[{self.profile[\'name\']}] MUTUAL MATCH with {candidate.get(\'name\', \'?\')}! (score: {compatibility:.2f})")\n'
       '                self.state.matches.append(candidate)\n'
       '                # пишем строку в matches (то, что делает наш /api/swipe)\n'
       '                peer_fid = candidate.get("id")\n'
       '                if not peer_fid:\n'
       '                    peer_rows = await self._supabase_get("founder_profiles", {"user_id": f"eq.{to_user}", "select": "id"})\n'
       '                    peer_fid = peer_rows[0].get("id") if peer_rows else None\n'
       '                if self.state.founder_id and peer_fid:\n'
       '                    a, b = sorted([self.state.founder_id, peer_fid])\n'
       '                    await self._supabase_post("matches", {\n'
       '                        "founder1_id": a,\n'
       '                        "founder2_id": b,\n'
       '                        "score": int(compatibility * 100),\n'
       '                        "status": "active",\n'
       '                    })\n'
       '            else:')
if old not in s: sys.exit("bot_v2.py: swipe mutual-block не найден")
s = s.replace(old, new, 1)
print("✓ swipe: при mutual → INSERT в matches")

p.write_text(s, encoding="utf-8")
print()
print("Готово.")
print("Дальше: 1) cleanup старых ботов в Supabase (см. README или SQL ниже)")
print("        2) python run.py generate --count 100  (перегенерация с emotions)")
print("        3) python run.py full ...")
