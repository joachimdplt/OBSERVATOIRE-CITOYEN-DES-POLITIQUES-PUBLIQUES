"""
Le rapport de mesure en page HTML : un graphique par mesure, avec ce qu'il
faut en retenir et comment le lire. Monochrome, comme l'administration ; les
images sont dans la page, qui s'ouvre sans serveur.
"""

import base64
import html
import io
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


def threshold_chart(thresholds: list[dict]) -> str:
    """Le compromis du seuil : plus il monte, plus le classeur a raison, et
    moins il range seul."""
    fig, ax = plt.subplots(figsize=(7, 3.6))
    ts = [t["t"] for t in thresholds]
    acc = [t["accuracy"] for t in thresholds]
    ax.fill_between(ts, [a["low"] for a in acc], [a["high"] for a in acc], color=LINE)
    ax.plot(ts, [a["rate"] for a in acc], "o-", color=INK, label="justesse (et sa marge)")
    ax.plot(ts, [t["coverage"] for t in thresholds], "s--", color=MUTED,
            label="part des chapitres rangés sans Qwen")
    ax.set_ylim(0, 1.02)
    percent_axis(ax.xaxis)
    percent_axis(ax.yaxis)
    ax.set_xticks(ts)
    ax.set_xlabel("Seuil de confiance du classeur")
    ax.legend(frameon=False, loc="lower left", fontsize=9)
    return png(fig)


def section(title: str, lesson: str, how: str, image: str | None, extra: str = "") -> str:
    body = (
        f'<img alt="{html.escape(title)}" src="data:image/png;base64,{image}">'
        if image
        else '<p class="empty">Non mesuré pour l\'instant.</p>'
    )
    return f"""
<section>
  <h2>{html.escape(title)}</h2>
  <p class="lesson"><strong>À retenir :</strong> {lesson}</p>
  {extra}
  {body}
  <p class="how"><strong>Comment lire :</strong> {how}</p>
</section>"""


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
            "1. Rangements justes, par candidat",
            "comparez les intervalles, pas les pourcentages : deux candidats dont les "
            "traits se chevauchent ne sont pas distinguables.",
            "le point est le taux mesuré, le trait l'intervalle à 95 %. Le nombre à "
            "droite : justes sur cartes vérifiées.",
            intervals_chart(results["candidates"], "Part des rangements justes"),
        ))
        parts.append(section(
            "2. Chaque voix du vote",
            "une voix est fiable quand le sujet qu'elle donnait a été validé.",
            "pour chaque voix, les rangements où elle donnait le sujet retenu, et la part "
            "de ceux que vous avez validés.",
            intervals_chart(results["voices"], "Part validée quand la voix donnait ce sujet"),
        ))
        stored = results.get("stored")
        parts.append(section(
            "3. Le classeur tel qu'il a rangé",
            "« sûr à 70 % » doit vouloir dire « juste 7 fois sur 10 ».",
            "chaque rond est un groupe de rangements de même confiance ; sa taille, le "
            "nombre de rangements. Sur la diagonale, le classeur dit vrai sur lui-même.",
            calibration_chart(stored["bins"]) if stored else None,
            f'<p class="figure">Écart moyen de calibration : {stored["ece"] * 100:.1f} points</p>'
            if stored else
            '<p class="figure">La confiance du classeur est gardée depuis le 16 novembre '
            "2026, pour les rangements faits depuis.</p>",
        ))
        rt = results.get("retrained")
        figures = ""
        if rt:
            figures = (
                f'<p class="figure">Entropie croisée : <strong>{rt["ce"]:.2f}</strong> '
                f'(au hasard : {rt["ce_random"]:.2f}) · juste sans seuil : '
                f'{pct(rt["overall"]["rate"])} · {rt["n"]} blocs, {rt["chapters"]} chapitres, '
                f'{rt["subjects"]} sujets</p>'
            )
        parts.append(section(
            "4. Le seuil de confiance : le compromis",
            "plus le seuil monte, plus le classeur a raison, et moins il range seul. "
            "L'entropie croisée, − log p(bon sujet) en moyenne, résume tout : plus elle "
            "est basse, mieux le classeur connaît le bon sujet.",
            "le trait plein est la justesse au-dessus du seuil, la bande sa marge ; le "
            "trait pointillé, la part des chapitres que le classeur range sans Qwen.",
            threshold_chart(rt["thresholds"]) if rt else None,
            figures,
        ))
        if rt:
            parts.append(section(
                "5. Le classeur réentraîné : sa calibration",
                "un classeur bien calibré permet de choisir un seuil qui veut dire ce "
                "qu'il dit.",
                "même lecture que le graphique 3, sur le classeur réentraîné et testé sur "
                "des chapitres qu'il n'a jamais vus.",
                calibration_chart(rt["bins"]),
                f'<p class="figure">Écart moyen de calibration : {rt["ece"] * 100:.1f} points</p>',
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
  .how {{ color: #64748b; font-size: 13px; }}
  .demo {{ border: 1px solid #0f172a; border-radius: 10px; padding: 12px 16px; }}
  .empty {{ color: #64748b; }}
</style>
</head>
<body>
<main>
  <h1>Mesure du rangement</h1>
  <p class="meta">Export du {html.escape(str(results["exportedAt"])[:16].replace("T", " à "))}
  · {results["rows"]} rangements décidés</p>
  {"".join(parts)}
</main>
</body>
</html>
"""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(page, encoding="utf-8")
