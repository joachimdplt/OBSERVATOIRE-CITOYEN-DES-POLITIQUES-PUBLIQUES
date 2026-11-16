# /// script
# requires-python = ">=3.11,<3.14"
# dependencies = ["numpy>=2", "scikit-learn>=1.5", "matplotlib>=3.9"]
# ///
"""
L'outil de mesure du rangement, à partir des verdicts des cartes.

    cd backend && npm run measure         vos verdicts
    cd backend && npm run measure:demo    essai sur les décisions de l'assistant

Quatre mesures, de la plus simple à la plus fine :

1. Le taux de rangements justes, par candidat, avec sa marge à 95 %.
2. La fiabilité de chaque voix du vote (grille, classeur, Qwen, titre,
   rubrique) quand elle donnait le sujet retenu.
3. La calibration du classeur tel qu'il a rangé : quand il se disait sûr
   à 70 %, avait-il raison 7 fois sur 10 ?
4. Le classeur réentraîné sur les seuls verdicts de personnes, testé en
   validation croisée par chapitre : entropie croisée, justesse par seuil,
   calibration.

Les tableaux s'affichent dans le terminal ; les graphiques sont dans
tools/measure/data/rapport.html, qui s'ouvre dans le navigateur.

Seuls les verdicts de personnes mesurent quelque chose. Avec --demo à
l'export, les décisions de l'assistant servent de référence : l'outil
tourne, mais la mesure est circulaire.
"""

import json
import math
import sys
import webbrowser
from collections import defaultdict
from pathlib import Path

import numpy as np

from report import write_report

HERE = Path(__file__).parent
DATA = HERE / "data" / "checks.json"
REPORT = (HERE / "data" / "rapport.html").resolve()
Z = 1.96
MIN_ROWS = 50
THRESHOLDS = (0.5, 0.6, 0.7, 0.8, 0.9)
VOICES = {
    "grille": "Grille (cosinus)",
    "classeur": "Classeur appris",
    "modele": "Qwen",
    "voisins": "Voisins",
    "titre": "Titre du document",
    "rubrique": "Titre + rubrique",
}


def pct(x: float) -> str:
    return f"{round(x * 100)} %"


def interval(right: int, total: int) -> dict | None:
    """Le taux et son intervalle à 95 %, comme dans l'admin (règle de trois
    aux bords, où la formule ne vaut plus). Rien sans carte : « non
    mesuré », jamais zéro."""
    if total == 0:
        return None
    p = right / total
    if right == total:
        low, high = max(0.0, 1 - 3 / total), 1.0
    elif right == 0:
        low, high = 0.0, min(1.0, 3 / total)
    else:
        m = Z * math.sqrt(p * (1 - p) / total)
        low, high = max(0.0, p - m), min(1.0, p + m)
    return {"right": right, "total": total, "rate": p, "low": low, "high": high}


def say(r: dict | None) -> str:
    if r is None:
        return "non mesuré"
    return (
        f"{r['right']}/{r['total']} = {pct(r['rate'])} "
        f"(entre {pct(r['low'])} et {pct(r['high'])})"
    )


def title(text: str, lesson: str) -> None:
    print(f"\n{text}\n{'-' * len(text)}")
    print(f"À retenir : {lesson}\n")


def by_candidate(rows: list[dict]) -> list[dict]:
    title(
        "1. Rangements justes, par candidat",
        "un taux sur 20 cartes a une marge d'environ 20 points ; "
        "comparez les intervalles, pas les pourcentages.",
    )
    groups: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        groups[r["candidate"]].append(r)
    out = []
    for name, rs in sorted(groups.items(), key=lambda kv: -len(kv[1])):
        r = interval(sum(x["verdict"] == "accepted" for x in rs), len(rs))
        print(f"  {name:<24} {say(r)}")
        out.append({"name": name, **r})
    all_ = interval(sum(r["verdict"] == "accepted" for r in rows), len(rows))
    print(f"\n  {'Ensemble':<24} {say(all_)}")
    return out


def by_voice(rows: list[dict]) -> list[dict]:
    title(
        "2. Chaque voix du vote, quand elle donnait le sujet retenu",
        "une voix souvent d'accord avec un rangement refusé est une voix "
        "qui se trompe ; une voix muette ne compte pas.",
    )
    out = []
    for method, label in VOICES.items():
        agreed = [
            r
            for r in rows
            if any(
                p.get("method") == method and p.get("code") == r["code"]
                for p in r["proposals"]
            )
        ]
        r = interval(sum(x["verdict"] == "accepted" for x in agreed), len(agreed))
        print(f"  {label:<20} {say(r)}")
        if r:
            out.append({"name": label, **r})
    return out


def bins(conf: np.ndarray, right: np.ndarray) -> tuple[list[dict], float]:
    """Le tableau de calibration, et l'écart moyen (ECE) entre la confiance
    annoncée et la justesse observée."""
    edges = np.linspace(0, 1, 11)
    out, ece = [], 0.0
    print(f"  {'confiance':<12}{'blocs':>6}{'annoncée':>10}{'observée':>10}")
    for lo, hi in zip(edges[:-1], edges[1:]):
        inside = (conf >= lo) & (conf < hi if hi < 1 else conf <= hi)
        n = int(inside.sum())
        if n == 0:
            continue
        said, seen = float(conf[inside].mean()), float(right[inside].mean())
        ece += n / len(conf) * abs(said - seen)
        out.append({"lo": float(lo), "hi": float(hi), "n": n, "said": said, "seen": seen})
        print(f"  {pct(lo):>4} à {pct(hi):<5}{n:>6}{pct(said):>10}{pct(seen):>10}")
    print(f"\n  Écart moyen de calibration (ECE) : {ece * 100:.1f} points")
    return out, ece


def stored_calibration(rows: list[dict]) -> dict | None:
    title(
        "3. Le classeur tel qu'il a rangé",
        "« sûr à 70 % » doit vouloir dire « juste 7 fois sur 10 » ; "
        "sinon le seuil de 70 % ne protège de rien.",
    )
    conf, right, loss = [], [], []
    for r in rows:
        for p in r["proposals"]:
            if p.get("method") == "classeur" and "p" in p and p.get("code") == r["code"]:
                ok = r["verdict"] == "accepted"
                conf.append(p["p"])
                right.append(ok)
                if ok:
                    loss.append(-math.log(p["p"]))
    if not conf:
        print(
            "  Non mesuré : la confiance du classeur n'est gardée que depuis le "
            "16 novembre 2026,\n  pour les rangements faits depuis."
        )
        return None
    table, ece = bins(np.array(conf), np.array(right, dtype=float))
    ce = float(np.mean(loss)) if loss else None
    if ce is not None:
        print(f"  Entropie croisée sur les rangements justes : {ce:.3f}")
    return {"bins": table, "ece": ece, "ce": ce, "n": len(conf)}


def retrained(rows: list[dict]) -> dict | None:
    title(
        "4. Le classeur réentraîné sur les seuls verdicts",
        "l'entropie croisée vaut − log p(bon sujet) en moyenne ; au hasard "
        "elle vaudrait log(nombre de sujets). Plus bas, c'est mieux.",
    )
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import GroupKFold

    # Le bon sujet est connu quand la personne a validé, ou a reclassé.
    for r in rows:
        r["truth"] = r["code"] if r["verdict"] == "accepted" else r.get("correctedCode")
    known = [r for r in rows if r["truth"] and r["vector"]]
    if len(known) < MIN_ROWS:
        print(
            f"  Non mesuré : {len(known)} rangements au sujet connu avec un vecteur, "
            f"il en faut au moins {MIN_ROWS}."
        )
        return None
    x = np.array([r["vector"] for r in known], dtype=np.float32)
    codes = sorted({r["truth"] for r in known}, key=int)
    index = {c: i for i, c in enumerate(codes)}
    y = np.array([index[r["truth"]] for r in known])
    groups = np.array([r["chapter"] for r in known])

    # Validation croisée en 5 parts, coupée par chapitre : deux blocs d'un
    # même chapitre ne sont jamais l'un à l'entraînement, l'autre au test.
    proba = np.zeros((len(known), len(codes)))
    for train, test in GroupKFold(n_splits=5).split(x, y, groups):
        model = LogisticRegression(C=10.0, max_iter=3000)
        model.fit(x[train], y[train])
        proba[np.ix_(test, model.classes_)] = model.predict_proba(x[test])

    p_true = np.clip(proba[np.arange(len(y)), y], 1e-12, 1)
    conf = proba.max(axis=1)
    right = (proba.argmax(axis=1) == y).astype(float)
    ce, ce_random = float(-np.log(p_true).mean()), math.log(len(codes))
    overall = interval(int(right.sum()), len(right))
    print(f"  {len(known)} blocs, {len(codes)} sujets, {len(set(groups))} chapitres")
    print(f"  Entropie croisée : {ce:.3f} (au hasard : {ce_random:.3f})")
    print(f"  Juste sans seuil : {say(overall)}\n")
    print(f"  {'seuil':<8}{'rangés seuls':>14}  justesse")
    thresholds = []
    for t in THRESHOLDS:
        kept = conf >= t
        n = int(kept.sum())
        r = interval(int(right[kept].sum()), n)
        print(f"  ≥ {pct(t):<6}{pct(n / len(conf)):>14}  {say(r)}")
        thresholds.append({"t": t, "coverage": n / len(conf), "accuracy": r})
    print()
    table, ece = bins(conf, right)
    print(
        "\n  Limite : un refus n'entre ici qu'une fois reclassé dans le bon sujet."
    )
    return {
        "n": len(known),
        "subjects": len(codes),
        "chapters": len(set(groups)),
        "ce": ce,
        "ce_random": ce_random,
        "overall": overall,
        "thresholds": thresholds,
        "bins": table,
        "ece": ece,
    }


def main() -> None:
    if not DATA.exists():
        sys.exit("Lancez : cd backend && npm run measure")
    data = json.loads(DATA.read_text())
    rows = data["rows"]
    if data["demo"]:
        print(
            "DÉMONSTRATION : la référence est faite des décisions de l'assistant.\n"
            "Les chiffres ci-dessous montrent le fonctionnement de l'outil ; "
            "ils ne mesurent rien."
        )
    results = {"demo": data["demo"], "exportedAt": data["exportedAt"], "rows": len(rows)}
    if rows:
        results["candidates"] = by_candidate(rows)
        results["voices"] = by_voice(rows)
        results["stored"] = stored_calibration(rows)
        results["retrained"] = retrained(rows)
    else:
        print("Aucun verdict de personne pour l'instant : passez par les cartes.")
    write_report(results, REPORT)
    print(f"\nGraphiques : {REPORT}")
    if "--no-open" not in sys.argv:
        webbrowser.open(REPORT.as_uri())


if __name__ == "__main__":
    main()
