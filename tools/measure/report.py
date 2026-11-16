"""
Le rapport de mesure en page HTML : un graphique par mesure, avec ce qu'il
faut en retenir et comment le lire. Monochrome, comme l'administration ; les
images sont dans la page, qui s'ouvre sans serveur.
"""

import base64
import html
import io
import re
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

INK = "#0f172a"
MUTED = "#94a3b8"
LINE = "#e2e8f0"

plt.rcParams.update(
    {
        "font.family": "sans-serif",
        "font.size": 10,
        "axes.edgecolor": LINE,
        "axes.labelcolor": "#475569",
        "xtick.color": "#64748b",
        "ytick.color": "#64748b",
        "axes.spines.top": False,
        "axes.spines.right": False,
        "axes.grid": True,
        "grid.color": "#f1f5f9",
        "grid.linewidth": 1,
    }
)


def paris(iso: str) -> str:
    """Une date de l'export, à l'heure de Paris (elle est notée en UTC)."""
    from datetime import datetime
    from zoneinfo import ZoneInfo

    at = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
    return at.astimezone(ZoneInfo("Europe/Paris")).strftime("%d/%m/%Y à %H:%M")


def pct(x: float) -> str:
    return f"{round(x * 100)} %"


def png(fig) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=160, bbox_inches="tight")
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode()


def percent_axis(axis) -> None:
    axis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: pct(v)))


def intervals_chart(items: list[dict], xlabel: str) -> str:
    """Un point par ligne, le taux, et son intervalle à 95 % en trait."""
    items = sorted(items, key=lambda r: r["rate"])
    fig, ax = plt.subplots(figsize=(7.5, 0.34 * len(items) + 0.9))
    ys = range(len(items))
    for y, r in zip(ys, items):
        ax.plot([r["low"], r["high"]], [y, y], color=MUTED, lw=2.5, solid_capstyle="round")
        ax.plot(r["rate"], y, "o", color=INK, ms=6)
        ax.text(1.02, y, f"{r['right']}/{r['total']}", va="center", fontsize=8, color="#64748b",
                transform=ax.get_yaxis_transform())
    ax.set_yticks(list(ys), [r["name"] for r in items])
    ax.set_xlim(0, 1)
    percent_axis(ax.xaxis)
    ax.set_xlabel(xlabel)
    ax.grid(axis="y", visible=False)
    return png(fig)


def calibration_chart(table: list[dict]) -> str:
    """La confiance annoncée contre la justesse observée. Sur la diagonale,
    le classeur dit vrai sur lui-même."""
    fig, ax = plt.subplots(figsize=(5, 5))
    ax.plot([0, 1], [0, 1], ls="--", color=MUTED, lw=1)
    total = sum(b["n"] for b in table)
    ax.plot([b["said"] for b in table], [b["seen"] for b in table], color=INK, lw=1.2)
    ax.scatter(
        [b["said"] for b in table],
        [b["seen"] for b in table],
        s=[30 + 600 * b["n"] / total for b in table],
        color=INK,
        zorder=3,
    )
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    percent_axis(ax.xaxis)
    percent_axis(ax.yaxis)
    ax.set_xlabel("Confiance annoncée par le classeur")
    ax.set_ylabel("Part de rangements justes")
    ax.text(0.04, 0.9, "au-dessus : plus juste qu'annoncé", fontsize=8, color=MUTED)
    ax.text(0.5, 0.08, "en dessous : trop sûr de lui", fontsize=8, color=MUTED)
    return png(fig)


MIN_POINT = 10


def threshold_chart(thresholds: list[dict]) -> str:
    """Au-dessus de chaque seuil : la part des chapitres que le classeur
    range sans Qwen, et sa justesse. Un point appuyé sur moins de 10
    chapitres n'est pas tracé : sa marge ne dirait rien."""
    fig, ax = plt.subplots(figsize=(7, 3.8))
    ts = [t["t"] for t in thresholds]
    measured = [
        t for t in thresholds if t["accuracy"] and t["accuracy"]["total"] >= MIN_POINT
    ]
    if measured:
        mts = [t["t"] for t in measured]
        acc = [t["accuracy"] for t in measured]
        ax.fill_between(mts, [a["low"] for a in acc], [a["high"] for a in acc], color=LINE)
        ax.plot(mts, [a["rate"] for a in acc], "o-", color=INK, label="justesse (et sa marge)")
        for t, a in zip(mts, acc):
            ax.annotate(f"{a['right']}/{a['total']}", (t, a["rate"]), textcoords="offset points",
                        xytext=(0, 8), ha="center", fontsize=8, color=MUTED)
    ax.plot(ts, [t["coverage"] for t in thresholds], "s--", color=MUTED,
            label="part des chapitres rangés sans Qwen")
    ax.set_ylim(0, 1.08)
    percent_axis(ax.xaxis)
    percent_axis(ax.yaxis)
    ax.set_xticks(ts)
    ax.set_xlabel("Seuil de confiance du classeur")
    ax.legend(frameon=False, loc="lower left", bbox_to_anchor=(0, 1.0), ncol=2, fontsize=9)
    return png(fig)


def curve_chart(points: list[dict]) -> str:
    """La courbe d'apprentissage : la justesse du classeur à mesure que les
    verdicts s'accumulent. Une seule échelle."""
    fig, ax = plt.subplots(figsize=(7, 3.2))
    ns = [p["n"] for p in points]
    ax.fill_between(ns, [p["low"] for p in points], [p["high"] for p in points],
                    color=LINE, label="écart entre 5 tirages")
    ax.plot(ns, [p["rate"] for p in points], "o-", color=INK, label="justesse moyenne")
    ax.legend(frameon=False, loc="lower left", bbox_to_anchor=(0, 1.0), ncol=2, fontsize=9)
    ax.set_ylim(0, 1.02)
    percent_axis(ax.yaxis)
    ax.set_xlabel("Chapitres vérifiés servant à apprendre")
    ax.set_ylabel("Justesse")
    return png(fig)


def legend(*items: tuple[str, str]) -> str:
    """Une légende lisible : une notion par ligne, son nom en gras."""
    rows = "".join(f"<li><strong>{html.escape(k)}</strong> : {v}</li>" for k, v in items)
    return f'<ul class="legend">{rows}</ul>'


def section(title: str, lesson: str, image: str | None, extra: str = "") -> str:
    body = (
        f'<img alt="Graphique" src="data:image/png;base64,{image}">'
        if image
        else '<p class="empty">Non mesuré pour l\'instant.</p>'
    )
    return f"""
<section>
  <h2>{html.escape(title)}</h2>
  <div class="lesson">{lesson}</div>
  {extra}
  {body}
</section>"""


def real_threshold_chart(r: dict, chosen) -> str:
    """Le vrai classeur : au-dessus de chaque seuil, sa justesse et la part
    des chapitres qu'il range seul. Le seuil retenu est marqué."""
    rows = [t for t in r.get("thresholds") or [] if t["total"] >= MIN_POINT]
    fig, ax = plt.subplots(figsize=(7, 3.6))
    if rows:
        ts = [t["threshold"] for t in rows]
        ax.plot(ts, [t["right"] / t["total"] for t in rows], "o-", color=INK,
                label="justesse au-dessus du seuil")
        for t in rows:
            ax.annotate(f"{t['right']}/{t['total']}", (t["threshold"], t["right"] / t["total"]),
                        textcoords="offset points", xytext=(0, 8), ha="center",
                        fontsize=8, color=MUTED)
    ax.plot([t["threshold"] for t in r.get("thresholds") or []],
            [t["coverage"] for t in r.get("thresholds") or []], "s--", color=MUTED,
            label="part rangée sans Qwen")
    if chosen is not None:
        ax.axvline(chosen, color=INK, lw=0.8, ls=":")
        ax.annotate("seuil retenu", (chosen, 0.04), xytext=(4, 0), textcoords="offset points",
                    fontsize=8, color=INK)
    ax.set_ylim(0, 1.08)
    percent_axis(ax.xaxis)
    percent_axis(ax.yaxis)
    ax.set_xlabel("Le classeur range seul dès cette confiance")
    ax.legend(frameon=False, loc="lower left", bbox_to_anchor=(0, 1.0), ncol=2, fontsize=9)
    return png(fig)


def history_chart(history: list[dict]) -> str:
    """L'évolution du vrai classeur, mesure après mesure : sa justesse sur
    vos cartes. Une seule échelle ; l'entropie croisée est dans le texte."""
    from datetime import datetime

    pts = [h for h in history if (h.get("results") or {}).get("total")]
    fig, ax = plt.subplots(figsize=(7, 3.2))
    xs = list(range(1, len(pts) + 1))
    ys = [h["results"]["right"] / h["results"]["total"] for h in pts]
    ax.plot(xs, ys, "o-", color=INK)
    for x, h, y in zip(xs, pts, ys):
        ax.annotate(f"{h['results']['total']} cartes", (x, y), textcoords="offset points",
                    xytext=(0, 8), ha="center", fontsize=8, color=MUTED)
    ax.set_xticks(xs, [paris(h["measuredAt"])[:5] + "\n" + paris(h["measuredAt"])[-5:] for h in pts],
                  fontsize=8)
    ax.set_ylim(0, 1.08)
    percent_axis(ax.yaxis)
    ax.set_ylabel("Justesse (échantillon de test)")
    return png(fig)


def classifier_section(cl: dict, topics: dict, training: dict | None = None) -> str:
    """Le classeur du rangement, testé sur vos cartes : sa justesse, son
    entropie croisée, puis chaque sujet (trouvé, juste quand il le dit) et
    les confusions les plus fréquentes. Gardé avec le rapport : l'historique
    du classeur est celui des rapports archivés."""
    r = cl["results"]
    name = lambda code: html.escape(topics.get(code, code))
    # Les trois phrases du classeur : sa justesse, son seuil, sur quoi il
    # apprend. Elles étaient sur la page Mesure ; elles vivent ici.
    lines = [
        f"Justesse sur l’échantillon de test : <strong>{pct(r['right'] / r['total'])}</strong> "
        f"({r['right']} sur {r['total']} chapitres vérifiés, absents de l’apprentissage)."
    ]
    t = cl.get("threshold")
    if t is None:
        lines.append("Rangement automatique : aucun (aucun seuil n’atteint la justesse requise).")
    else:
        sentence = f"Seuil de rangement automatique : probabilité ≥ <strong>{str(t).replace('.', ',')}</strong>"
        if cl.get("total"):
            sentence += (
                f". Au-dessus du seuil : {pct(cl['total'] / r['total'])} des chapitres "
                f"({cl['total']} sur {r['total']}), justesse <strong>{pct(cl['right'] / cl['total'])}</strong> "
                f"({cl['right']} sur {cl['total']})"
            )
        lines.append(sentence + ". Sous le seuil : vote avec le modèle de langue (Qwen).")
    if training:
        missing = max(0, training["needs"] - training["verdicts"])
        learn = (
            f"Données d’apprentissage : verdicts humains uniquement ({training['verdicts']})."
            if training["source"] == "person"
            else f"Données d’apprentissage : rangements automatiques, jusqu’à {training['needs']} "
            f"verdicts humains (manquants : {missing})."
            if missing > 0
            else "Données d’apprentissage : verdicts humains à partir du prochain rangement."
        )
        if training.get("lastFiling"):
            learn += f" Dernier rangement : {html.escape(paris(training['lastFiling']))}."
        lines.append(f'<span class="muted">{learn}</span>')
    extra = (
        f' · entropie croisée {r["crossEntropy"]:.2f} (référence uniforme sur 21 sujets : {r["crossEntropyRandom"]:.2f} ; plus basse, meilleure calibration des probabilités)'.replace(".", ",")
        if r.get("crossEntropy") is not None
        else ""
    )
    head = "".join(f"<p>{l}</p>" for l in lines) + (
        f'<p class="muted">Mesuré le {html.escape(paris(cl["measuredAt"]))}{extra}.</p>'
    )
    def found(x):
        n = x["support"]
        k = round((x["recall"] or 0) * n)
        return f"{k} sur {n}"

    def said(x):
        # Le nombre de fois où il a dit ce sujet : trouvés ÷ justesse.
        k = round((x["recall"] or 0) * x["support"])
        if not x["precision"]:
            return "jamais dit" if k == 0 else ""
        return f"{k} sur {round(k / x['precision'])}"

    rows = "".join(
        f"<tr><td>{name(x['code'])}"
        f"{' <span class=\'muted\'>· moins de 10 cartes</span>' if x['support'] < 10 else ''}</td>"
        f"<td class='num'>{found(x)}</td>"
        f"<td class='num'>{'' if x['recall'] is None else pct(x['recall'])}</td>"
        f"<td class='num'>{said(x)}</td></tr>"
        for x in sorted(r.get("subjects") or [], key=lambda x: x["recall"] or 0)
    )
    table = (
        legend(
            ("Rappel", "part des chapitres vérifiés d’un sujet que le classeur attribue à ce sujet"),
            ("Précision", "part des attributions à un sujet qui sont justes"),
            ("Moins de 10 chapitres", "un chapitre de plus ou de moins change le pourcentage de plus de 10 points"),
        )
        + "<table><thead><tr><th>Sujet</th><th class='num'>Rappel</th>"
        "<th class='num'>En %</th><th class='num'>Précision</th>"
        f"</tr></thead><tbody>{rows}</tbody></table>"
        if rows
        else ""
    )
    confusions = "".join(
        f"<li>{name(c['right'])} (verdict) attribué à {name(c['got'])} (classeur) : "
        f"{c['count']} chapitre{'s' if c['count'] > 1 else ''}.</li>"
        for c in r.get("confusions") or []
    )
    chart = real_threshold_chart(r, cl.get("threshold"))
    chart_html = f'<img alt="Graphique" src="data:image/png;base64,{chart}">'
    return f"""
<section>
  <h2>Le classeur du rangement</h2>
  <p class="lesson">Échantillon de test : chapitres vérifiés par l’équipe, exclus de l’apprentissage du classeur testé.</p>
  {head}
  <h3>Seuil de rangement automatique</h3>
  {legend(
    ("Abscisse", "seuil de probabilité"),
    ("Trait plein", "justesse des chapitres au-dessus du seuil, effectifs indiqués"),
    ("Pointillés", "part des chapitres au-dessus du seuil"),
    ("Trait vertical", "seuil appliqué"),
  )}
  {chart_html}
  <h3>Sujet par sujet</h3>
  {table}
  {"<h3>Confusions les plus fréquentes</h3><ul class='plain'>" + confusions + "</ul>" if confusions else ""}
</section>"""


OUTCOMES = {
    "corrected": "rangé dans un autre sujet",
    "no_topic": "sans sujet de politique publique",
    "dismissed": "pas une position du candidat",
    "vanished": "texte disparu à la relecture",
    "split": "chapitre découpé",
    "pending": "en attente",
}


def journal_section(j: dict) -> str:
    """Le journal de la chaîne : les corrections faites par l'outil, avec
    leur raison ; l'issue des refus, jour par jour ; les changements du code
    de lecture et de rangement."""
    # Une règle corrige en série ; une raison écrite pour un seul chapitre est
    # une décision au cas par cas de l'assistant : elles sont comptées ensemble.
    raw = j.get("corrections") or []
    rules = [c for c in raw if c["count"] >= 3]
    single = {}
    for c in raw:
        if c["count"] < 3:
            single[c["date"]] = single.get(c["date"], 0) + c["count"]
    rules += [
        {"date": d, "reason": "Décisions au cas par cas de l’assistant (une raison par chapitre)", "count": n}
        for d, n in single.items()
    ]
    corrections = sorted(rules, key=lambda c: (c["date"], c["count"]), reverse=True)
    rows = "".join(
        f"<tr><td>{html.escape(c['date'])}</td><td>{html.escape(c['reason'])}</td>"
        f"<td class='num'>{c['count']}</td></tr>"
        for c in corrections
    )
    fixes = (
        "<table><thead><tr><th>Date</th><th>Correction</th><th class='num'>Rangements</th>"
        f"</tr></thead><tbody>{rows}</tbody></table>"
        if rows
        else "<p class='empty'>Aucune correction de l’outil.</p>"
    )
    keys = list(OUTCOMES)
    days = sorted(j.get("refusals") or [], key=lambda r: r["date"])
    head = "".join(f"<th class='num'>{html.escape(OUTCOMES[k])}</th>" for k in keys)
    body = "".join(
        f"<tr><td>{html.escape(d['date'])}</td>"
        + "".join(f"<td class='num'>{d['outcomes'].get(k, '')}</td>" for k in keys)
        + f"<td class='num'>{sum(d['outcomes'].values())}</td></tr>"
        for d in days
    )
    refusals = (
        f"<table><thead><tr><th>Jour du refus</th>{head}<th class='num'>Total</th></tr></thead>"
        f"<tbody>{body}</tbody></table>"
        if body
        else ""
    )
    commits = "".join(
        f"<li>{html.escape(c['date'])} · {html.escape(c['subject'])}</li>" for c in j.get("commits") or []
    )
    return f"""
<section>
  <h2>Le journal de la chaîne</h2>
  {legend(
      ("Objet", "les corrections de lecture et de rangement, et leur effet sur les refus"),
      ("Corrections de l’outil", "rangements retirés, déplacés ou fermés par le compte de l’outil, avec leur raison"),
      ("Issue des refus", "pour chaque refus d’une personne, ce qu’il est devenu ; « texte disparu » et « chapitre découpé » signalent une erreur de lecture corrigée depuis"),
      ("Code", "changements enregistrés des fichiers de lecture et de rangement ; fichiers modifiés non enregistrés : " + str(j.get("uncommitted", 0))),
  )}
  <h3>Corrections de l’outil</h3>
  {fixes}
  <h3>Issue des refus, par jour</h3>
  {refusals}
  <h3>Changements du code</h3>
  {"<ul class='plain'>" + commits + "</ul>" if commits else "<p class='empty'>Aucun changement enregistré sur la période.</p>"}
</section>"""


def neural_section(nn: dict) -> str:
    """Le réseau de neurones contre le classeur, sur les mêmes cartes : il ne
    remplace le classeur que s'il fait mieux en justesse et en entropie
    croisée."""
    def cell(v, kind):
        if v is None:
            return "non mesuré"
        return pct(v) if kind == "pct" else f"{v:.2f}".replace(".", ",")

    def count(r):
        n = r.get("n") or 0
        return f" ({round(r['accuracy'] * n)} sur {n})" if n and r["accuracy"] is not None else ""

    rows = "".join(
        f"<tr><td>{html.escape(name)}</td>"
        f"<td class='num'>{cell(r['accuracy'], 'pct')}{count(r)}</td>"
        f"<td class='num'>{cell(r['ce'], 'ce')}</td>"
        f"<td class='num'>{cell(r['sure_accuracy'], 'pct')}</td>"
        f"<td class='num'>{cell(r['coverage'], 'pct')}</td></tr>"
        for name, r in nn["results"].items()
    )
    models = list(nn["results"].values())
    verdict = ""
    if len(models) == 2 and all(m.get("n") for m in models):
        a, b = models
        n = a["n"]
        gap = (b["accuracy"] - a["accuracy"]) * 100
        margin = 1.96 * ((a["accuracy"] * (1 - a["accuracy"]) / n) ** 0.5) * 100
        cards = round(abs(b["accuracy"] - a["accuracy"]) * n)
        verdict = legend(
            ("Écart de justesse", f"{gap:+.1f} point{'s' if abs(gap) >= 2 else ''} ({cards} chapitre{'s' if cards > 1 else ''} sur {n})"),
            ("Intervalle de confiance à 95 %", f"± {margin:.1f} points pour chaque mesure"),
            ("Lecture", "écart inférieur à l’intervalle" if abs(gap) < margin else "écart supérieur à l’intervalle"),
            ("Entropie croisée", f"{b['ce']:.2f} (réseau) contre {a['ce']:.2f} (classeur)"),
            ("Usage", "le réseau n’est pas utilisé pour le rangement ; il est mesuré à chaque mise à jour"),
        )
        verdict = re.sub(r"(\d)\.(\d)", r"\1,\2", verdict)
    loss_legend = legend(
        ("Abscisse", "époque : un passage complet sur les données d’apprentissage"),
        ("Ordonnée", "perte, l’entropie croisée sur les données d’apprentissage"),
        ("Lecture", "sa baisse traduit l’ajustement aux données d’apprentissage, pas la justesse sur l’échantillon de test"),
    )
    when = f" · mesuré le {html.escape(paris(nn['measuredAt']))}" if nn.get("measuredAt") else ""
    return f"""
<section>
  <h2>Réseau de neurones contre le classeur</h2>
  {legend(
    ("Données", f"mêmes données d’apprentissage, mêmes chapitres de test{when}"),
    ("Protocole", "validation croisée à 5 plis : chaque pli est testé par un modèle appris sans lui"),
    ("À noter", "protocole distinct du test du classeur plus haut, d’où des valeurs différentes"),
  )}
  {legend(
    ("Justesse", "part des chapitres attribués au bon sujet"),
    ("Entropie croisée", "écart moyen entre les probabilités attribuées et le sujet vérifié ; plus basse, meilleure calibration"),
    ("Justesse à p ≥ 0,5", "justesse parmi les chapitres dont la probabilité maximale atteint 0,5"),
    ("Couverture à p ≥ 0,5", "part de ces chapitres"),
  )}
  <table><thead><tr><th>Modèle</th><th class='num'>Justesse</th><th class='num'>Entropie croisée</th>
  <th class='num'>Justesse à p ≥ 0,5</th><th class='num'>Couverture à p ≥ 0,5</th></tr></thead>
  <tbody>{rows}</tbody></table>
  {verdict}
  {f'<h3>La perte du réseau pendant son apprentissage</h3>{loss_legend}<img alt="Graphique" src="data:image/png;base64,{nn["loss"]}">' if nn.get("loss") else ""}
</section>""" + (
        (
            f"""
<section>
  <h2>La courbe d’apprentissage</h2>
  {legend(
      ("Question", "la justesse augmente-t-elle avec le nombre de verdicts humains ?"),
      ("Test", f"échantillon fixe de {nn['learning']['tested']} chapitres vérifiés, le même d’une mesure à l’autre (un sur cinq, choisi par l’empreinte de son identifiant)"),
      ("Apprentissage", "le classeur appris sur 25, 50, 100… verdicts tirés au hasard parmi les autres ; cinq tirages par taille"),
      ("Trait", "justesse moyenne ; bande grisée : du tirage le plus bas au plus haut"),
      ("Références", f"hasard {round(nn['learning']['chance'] * 100)} % ; sujet le plus fréquent {round(nn['learning']['majority'] * 100)} %"),
      ("Lecture", "une courbe qui monte : le classeur apprend des verdicts ; une courbe plate : il plafonne, d’autres données ou un autre modèle sont nécessaires"),
  )}
  <img alt="Graphique" src="data:image/png;base64,{nn['learningChart']}">
</section>"""
            if nn.get("learningChart")
            else ""
        )
        +         f"""
<section>
  <h2>La carte des chapitres</h2>
  {legend(
    ("Point", "un chapitre"),
    ("Méthode", "projection t-SNE en deux dimensions des vecteurs de sens (1 024 composantes)"),
    ("Lecture", "la proximité locale est conservée ; les distances entre groupes éloignés ne sont pas interprétables"),
    ("Gris", "données d’apprentissage"),
    ("Point plein", "chapitre vérifié attribué au bon sujet"),
    ("Cercle vide", "chapitre vérifié attribué à un autre sujet"),
    ("Zone grise sans point", "aucun chapitre vérifié"),
  )}
  <img alt="Graphique" src="data:image/png;base64,{nn['map']}">
</section>"""
        if nn.get("map")
        else ""
    )


def write_report(results: dict, path: Path) -> None:
    parts = []
    if results["demo"]:
        parts.append(
            '<p class="demo">Démonstration : la référence est faite des décisions de '
            "l'assistant. Ces graphiques montrent le fonctionnement de l'outil ; ils ne "
            "mesurent rien.</p>"
        )
    if not results["rows"]:
        parts.append(
            '<p class="empty">Aucun verdict de personne pour l\'instant. Passez par les '
            "cartes de l'admin (menu Vérification), puis relancez la mesure.</p>"
        )
    else:
        parts.append(section(
            "Rangements justes, par candidat",
            "Le point est le taux, le trait sa marge à 95 %.",
            intervals_chart(results["candidates"], "Part des rangements justes"),
        ))
    cl = results.get("classifier")
    if cl and cl.get("results"):
        parts.append(classifier_section(cl, results.get("topics") or {}, results.get("training")))
    if results.get("journal"):
        parts.append(journal_section(results["journal"]))
    nn = results.get("neural")
    if nn:
        parts.append(neural_section(nn))
    history = results.get("history") or []
    if len([h for h in history if (h.get("results") or {}).get("total")]) >= 2:
        parts.append(section(
            "L’évolution du classeur",
            legend(
                ("Point", "une mise à jour"),
                ("Ordonnée", "justesse sur l’échantillon de test"),
                ("Effectif", "indiqué au-dessus de chaque point ; deux effectifs différents = deux échantillons différents"),
            ),
            history_chart(history),
        ))
    page = f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mesure du rangement</title>
<style>
  body {{ margin: 0; background: #fff; color: #0f172a;
         font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, sans-serif; }}
  main {{ max-width: 760px; margin: 0 auto; padding: 40px 16px 80px; }}
  h1 {{ font-size: 24px; margin: 0 0 4px; letter-spacing: -0.01em; }}
  .meta {{ color: #94a3b8; font-size: 13px; margin: 0 0 32px; }}
  section {{ border-top: 1px solid #e2e8f0; padding: 28px 0; }}
  h2 {{ font-size: 18px; margin: 0 0 8px; }}
  img {{ width: 100%; height: auto; margin: 12px 0; }}
  .lesson, .figure {{ margin: 6px 0; }}
  ul.legend {{ list-style: none; padding: 0; margin: 8px 0 12px; font-size: 14px; line-height: 1.55; }}
  ul.legend li {{ margin: 2px 0; }}
  .how {{ color: #64748b; font-size: 13px; }}
  .demo {{ border: 1px solid #0f172a; border-radius: 10px; padding: 12px 16px; }}
  .empty {{ color: #64748b; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 12px; }}
  th {{ text-align: left; color: #64748b; font-weight: 600; font-size: 12px; padding: 4px 0; }}
  td {{ padding: 4px 0; border-top: 1px solid #eef1f4; }}
  .num {{ text-align: right; font-variant-numeric: tabular-nums; padding-left: 12px; }}
  .muted {{ color: #64748b; }}
  h3 {{ font-size: 14px; margin: 18px 0 6px; }}
  ul.plain {{ list-style: none; padding: 0; margin: 0; font-size: 14px; }}
  ul.plain li {{ padding: 3px 0; }}
</style>
</head>
<body>
<main>
  <p class="meta">Export du {html.escape(paris(results["exportedAt"]))}
  · {results["rows"]} rangements décidés</p>
  {"".join(parts)}
</main>
</body>
</html>
"""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(page, encoding="utf-8")
