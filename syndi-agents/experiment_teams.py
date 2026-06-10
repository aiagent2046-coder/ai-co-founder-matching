#!/usr/bin/env python3
"""Эксперимент: 3 команды по 5 агентов (психометрика / матрица души / контроль),
mutual-матчи внутри команд, диалоги о стартапе, сравнительный отчёт.
Фазы: cluster | match | talk | report  (или all)"""
import json, os, random, statistics, sys, time, itertools
from collections import defaultdict
import httpx

APP    = os.environ.get("SYNDI_APP_URL", "https://www.syndimatch.online")
SB     = os.environ.get("SUPABASE_URL")
ANON   = os.environ.get("SUPABASE_ANON_KEY")
AK     = os.environ.get("ANTHROPIC_API_KEY")
MODEL  = os.environ.get("MODEL", "claude-sonnet-4-5-20250929")
POOL_N = int(os.environ.get("POOL", "24"))
TEAM_N = 5
TURNS  = int(os.environ.get("TURNS", "6"))
TOPIC  = os.environ.get("TOPIC", "AI-сервис для удалённых команд")
STATE  = "experiment_state.json"

if not (SB and ANON): sys.exit("set $SUPABASE_URL and $SUPABASE_ANON_KEY")
H = httpx.Client(timeout=90)

def load_state():
    return json.load(open(STATE)) if os.path.exists(STATE) else {}
def save_state(st):
    json.dump(st, open(STATE, "w"), ensure_ascii=False, indent=2)

def login(email, password):
    r = H.post(f"{SB}/auth/v1/token?grant_type=password",
               headers={"apikey": ANON, "Content-Type": "application/json"},
               json={"email": email, "password": password})
    if r.status_code != 200: return None, None
    j = r.json()
    return j.get("access_token"), (j.get("user") or {}).get("id")

def discover(token, engine=None, limit=80):
    params = [f"limit={limit}"]
    if engine == "soul": params.append("engine=soul")
    url = f"{APP}/api/discover/match?" + "&".join(params)
    r = H.post(url, headers={"Authorization": f"Bearer {token}"})
    return (r.json().get("candidates") or []) if r.status_code == 200 else []

def swipe(token, to_user):
    return H.post(f"{APP}/api/swipe",
                  headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                  json={"to_user": to_user, "action": "like"}).status_code

def matches_list(token):
    r = H.get(f"{APP}/api/matches/list", headers={"Authorization": f"Bearer {token}"})
    return (r.json().get("matches") or []) if r.status_code == 200 else []

def get_messages(token, match_id):
    r = H.get(f"{APP}/api/messages?matchId={match_id}",
              headers={"Authorization": f"Bearer {token}"})
    return (r.json().get("messages") or []) if r.status_code == 200 else []

def send_message(token, match_id, content):
    return H.post(f"{APP}/api/messages",
                  headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                  json={"matchId": match_id, "content": content}).status_code

def claude(system, prompt):
    r = H.post("https://api.anthropic.com/v1/messages",
               headers={"x-api-key": AK, "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json"},
               json={"model": MODEL, "max_tokens": 220, "system": system,
                     "messages": [{"role": "user", "content": prompt}]})
    if r.status_code != 200:
        print(f"    claude HTTP {r.status_code}: {r.text[:120]}"); return None
    parts = r.json().get("content") or []
    return parts[0].get("text") if parts else None

def persona_system(p):
    bf = p.get("personality") or p.get("big_five") or {}
    em = p.get("emotions") or {}
    g  = lambda d, k: d.get(k, 50)
    return (
        f"Ты — {p['name']}, {p.get('role','фаундер')} в области {p.get('domain','технологий')}. "
        f"{(p.get('bio') or '')[:200]}\n"
        f"Психологический профиль (0-100): открытость {g(bf,'openness')}, добросовестность {g(bf,'conscientiousness')}, "
        f"экстраверсия {g(bf,'extraversion')}, доброжелательность {g(bf,'agreeableness')}, нейротизм {g(bf,'neuroticism')}.\n"
        f"Эмоциональные черты: эмпатия {g(em,'empathy')}, вспыльчивость {g(em,'anger')}, "
        f"хитрость {g(em,'cunning')}, честность {g(em,'honesty')}.\n"
        f"Ты общаешься в чате платформы для кофаундеров с потенциальным партнёром. "
        f"Вместе обсуждаете идею стартапа: «{TOPIC}».\n"
        f"Правила: отвечай по-русски, 2-4 предложения, без списков и эмодзи, строго в характере профиля "
        f"(низкая доброжелательность — споришь и давишь; высокая эмпатия — поддерживаешь; высокая открытость — смелые идеи; "
        f"высокая добросовестность — требуешь план). Двигай разговор к конкретике: ниша, MVP, роли, первый шаг."
    )

def pair_key(a, b): return "|".join(sorted([a, b]))

# ─────────────────────────── PHASE: cluster ───────────────────────────
def phase_cluster():
    profiles = json.load(open("profiles/all_profiles.json"))
    random.seed(42)
    pool = random.sample(profiles, min(POOL_N, len(profiles)))
    bots = {}
    print(f"Логиним пул из {len(pool)} ботов...")
    for p in pool:
        tok, uid = login(p["email"], p["password"])
        if tok and uid:
            bots[uid] = {"email": p["email"], "name": p["name"], "token": tok}
            print(f"  ✓ {p['name']}")
        else:
            print(f"  ✗ {p['name']}: login failed")
    uids = set(bots)

    edges_p, edges_s = defaultdict(list), defaultdict(list)
    print("\nСобираем попарные score'ы (2 движка × каждый бот)...")
    for uid, b in bots.items():
        for c in discover(b["token"]):
            if c.get("user_id") in uids:
                edges_p[pair_key(uid, c["user_id"])].append(c.get("match", 50))
        for c in discover(b["token"], engine="soul"):
            if c.get("user_id") in uids:
                edges_s[pair_key(uid, c["user_id"])].append(c.get("match", 50))
        print(f"  ✓ {b['name']}")
    ep = {k: statistics.mean(v) for k, v in edges_p.items()}
    es = {k: statistics.mean(v) for k, v in edges_s.items()}
    print(f"Рёбер: психометрика {len(ep)}, матрица {len(es)}")

    def avg_internal(team, edges):
        vals = [edges[pair_key(a, b)] for a, b in itertools.combinations(team, 2)
                if pair_key(a, b) in edges]
        total = len(list(itertools.combinations(team, 2)))
        return (statistics.mean(vals) if vals else 0), f"{len(vals)}/{total}"

    def greedy(edges, available):
        if len(available) < TEAM_N: sys.exit("мало ботов в пуле")
        best = max(((k, v) for k, v in edges.items()
                    if all(u in available for u in k.split("|"))),
                   key=lambda kv: kv[1], default=None)
        if not best: sys.exit("нет рёбер среди доступных")
        team = best[0].split("|")
        while len(team) < TEAM_N:
            cand = max((u for u in available if u not in team),
                       key=lambda u: statistics.mean(
                           [edges.get(pair_key(u, m), 50) for m in team]),
                       default=None)
            team.append(cand)
        return team

    avail = set(uids)
    team_p = greedy(ep, avail); avail -= set(team_p)
    team_s = greedy(es, avail); avail -= set(team_s)
    team_r = random.sample(sorted(avail), TEAM_N)

    st = {"bots": {u: {"email": bots[u]["email"], "name": bots[u]["name"]} for u in bots},
          "teams": {"P": team_p, "S": team_s, "R": team_r}}
    save_state(st)

    print("\n══ Составы команд ══")
    for label, team in (("P (психометрика)", team_p), ("S (матрица души)", team_s), ("R (контроль)", team_r)):
        names = ", ".join(bots[u]["name"] for u in team)
        ap, cp = avg_internal(team, ep)
        as_, cs = avg_internal(team, es)
        print(f"  {label}: {names}")
        print(f"      avg psycho={ap:.1f} (покрытие {cp})  avg soul={as_:.1f} (покрытие {cs})")

# ─────────────────────────── PHASE: match ───────────────────────────
def phase_match():
    st = load_state()
    profiles = {p["email"]: p for p in json.load(open("profiles/all_profiles.json"))}
    tokens = {}
    for uid, b in st["bots"].items():
        tok, _ = login(b["email"], profiles[b["email"]]["password"])
        tokens[uid] = tok
    st["matches"] = st.get("matches", {})
    for label, team in st["teams"].items():
        print(f"\nКоманда {label}: взаимные лайки...")
        for a, b in itertools.combinations(team, 2):
            swipe(tokens[a], b); swipe(tokens[b], a)
        time.sleep(1)
        ml = {}
        for m in matches_list(tokens[team[0]]): ml[m.get("peer_user_id")] = m.get("match_id")
        for a, b in itertools.combinations(team, 2):
            found = None
            for m in matches_list(tokens[a]):
                if m.get("peer_user_id") == b: found = m.get("match_id"); break
            st["matches"][pair_key(a, b)] = found
            mark = "✓" if found else "✗ НЕТ МАТЧА"
            print(f"  {mark} {st['bots'][a]['name']} × {st['bots'][b]['name']}")
    save_state(st)
    missing = [k for k, v in st["matches"].items() if not v]
    print(f"\nИтого пар: {len(st['matches'])}, без матча: {len(missing)}")

# ─────────────────────────── PHASE: talk ───────────────────────────
def phase_talk():
    if not AK: sys.exit("set $ANTHROPIC_API_KEY для генерации диалогов")
    st = load_state()
    profiles = {p["email"]: p for p in json.load(open("profiles/all_profiles.json"))}
    tokens = {}
    for uid, b in st["bots"].items():
        tok, _ = login(b["email"], profiles[b["email"]]["password"])
        tokens[uid] = tok

    for label, team in st["teams"].items():
        print(f"\n══ Команда {label}: диалоги ══")
        for a, b in itertools.combinations(team, 2):
            mid = st["matches"].get(pair_key(a, b))
            if not mid:
                print(f"  • {st['bots'][a]['name']} × {st['bots'][b]['name']}: нет матча, пропуск"); continue
            pa, pb = profiles[st["bots"][a]["email"]], profiles[st["bots"][b]["email"]]
            msgs = get_messages(tokens[a], mid)
            if len(msgs) >= TURNS:
                print(f"  • {pa['name']} × {pb['name']}: уже {len(msgs)} сообщений, пропуск"); continue
            if len(msgs) == 0:
                kickoff = (f"Привет, {pb['name']}! Рад мэтчу. Предлагаю обсудить идею стартапа: "
                           f"{TOPIC}. Как тебе направление и с чего бы ты начал?")
                send_message(tokens[a], mid, kickoff)
                msgs = get_messages(tokens[a], mid)
            founder_a = msgs[0]["sender_id"] if msgs else None
            while len(msgs) < TURNS:
                last_by_a = msgs[-1]["sender_id"] == founder_a
                speaker_uid, speaker_p = (b, pb) if last_by_a else (a, pa)
                transcript = "\n".join(
                    f"{pa['name'] if m['sender_id'] == founder_a else pb['name']}: {m['content']}"
                    for m in msgs)
                reply = claude(persona_system(speaker_p),
                               f"История диалога:\n{transcript}\n\nНапиши следующую реплику от лица {speaker_p['name']}.")
                if not reply: break
                send_message(tokens[speaker_uid], mid, reply.strip())
                time.sleep(0.6)
                msgs = get_messages(tokens[a], mid)
            print(f"  ✓ {pa['name']} × {pb['name']}: {len(msgs)} сообщений")

# ─────────────────────────── PHASE: report ───────────────────────────
def phase_report():
    st = load_state()
    profiles = {p["email"]: p for p in json.load(open("profiles/all_profiles.json"))}
    tokens = {}
    for uid, b in st["bots"].items():
        tok, _ = login(b["email"], profiles[b["email"]]["password"])
        tokens[uid] = tok
    os.makedirs("transcripts", exist_ok=True)
    agg = {}
    for label, team in st["teams"].items():
        lens, digits, questions, counts = [], 0, 0, 0
        for a, b in itertools.combinations(team, 2):
            mid = st["matches"].get(pair_key(a, b))
            if not mid: continue
            msgs = get_messages(tokens[a], mid)
            if not msgs: continue
            na, nb = st["bots"][a]["name"], st["bots"][b]["name"]
            fa = msgs[0]["sender_id"]
            with open(f"transcripts/team_{label}_{na}_{nb}.txt".replace(" ", "_"), "w") as f:
                for m in msgs:
                    who = na if m["sender_id"] == fa else nb
                    ai = " [auto-reply]" if m.get("is_ai_reply") else ""
                    f.write(f"{who}{ai}:\n{m['content']}\n\n")
            for m in msgs:
                counts += 1
                lens.append(len(m["content"]))
                if any(ch.isdigit() for ch in m["content"]): digits += 1
                if "?" in m["content"]: questions += 1
        agg[label] = {"messages": counts,
                      "avg_len": statistics.mean(lens) if lens else 0,
                      "digits_pct": 100 * digits / max(1, counts),
                      "questions_pct": 100 * questions / max(1, counts)}
    print("\n══ Сравнение команд ══")
    print(f"{'Team':6s} {'msgs':>5s} {'avg len':>8s} {'конкретика%':>12s} {'вопросы%':>9s}")
    for label, m in agg.items():
        print(f"{label:6s} {m['messages']:5d} {m['avg_len']:8.0f} {m['digits_pct']:12.0f} {m['questions_pct']:9.0f}")
    print("\nТранскрипты в ./transcripts/ — читать глазами обязательно, цифры лишь намёк.")

PHASES = {"cluster": phase_cluster, "match": phase_match, "talk": phase_talk, "report": phase_report}
arg = sys.argv[1] if len(sys.argv) > 1 else "all"
for ph in (PHASES if arg == "all" else {arg: PHASES[arg]}):
    print(f"\n────────── PHASE: {ph} ──────────")
    PHASES[ph]()
