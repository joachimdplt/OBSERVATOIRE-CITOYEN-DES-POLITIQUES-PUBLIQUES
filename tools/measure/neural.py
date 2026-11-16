# /// script
# requires-python = ">=3.11,<3.14"
# dependencies = ["numpy>=2", "scikit-learn>=1.5", "matplotlib>=3.9", "torch>=2.4"]
# ///
"""
Un réseau de neurones contre le classeur du rangement, sur vos cartes.

    cd backend && npx tsx src/scripts/export-training.ts
    uv run ../tools/measure/neural.py

Les deux modèles apprennent sur les mêmes rangements affichés et sont testés
de la même façon que le vrai classeur (test-vector-classifier.ts) : cinq
parts coupées par chapitre, et seuls les chapitres vérifiés par une personne
servent de référence. Trois tirages, en moyenne.

- La régression logistique : le classeur du rangement (une seule couche,
  softmax, entropie croisée).
- Le réseau de neurones, en PyTorch, construit comme dans le tutoriel
  DataCamp : un Dataset, un DataLoader par lots de 64, une classe
  NeuralNetwork à deux couches (Linear, ReLU, Linear). Une différence : le
  tutoriel a deux classes et une sortie sigmoïde ; nous avons 21 sujets,
  donc 21 sorties et l'entropie croisée (CrossEntropyLoss, qui contient le
  softmax).

Un modèle ne remplace le classeur que s'il fait mieux sur les deux critères :
la justesse et l'entropie croisée.
"""

import base64
import io
import json
import math
from pathlib import Path

import numpy as np

DATA = Path(__file__).parent / "data" / "training.json"
OUT = Path(__file__).parent / "data" / "neural.json"
DRAWS = 3


class TorchNetwork:
    """Le réseau de neurones du tutoriel, avec l'interface de scikit-learn
    (fit, predict_proba, classes_) pour passer par le même test."""

    def __init__(self, seed: int, hidden_dim=256, epochs=40, batch_size=64):
        self.seed, self.hidden_dim = seed, hidden_dim
        self.epochs, self.batch_size = epochs, batch_size

    def fit(self, x, y):
        import torch
        from torch import nn, optim
        from torch.utils.data import DataLoader, Dataset

        torch.manual_seed(self.seed)
        self.classes_ = np.unique(y)
        index = {c: i for i, c in enumerate(self.classes_)}
        target = np.array([index[c] for c in y])

        class Data(Dataset):
            def __init__(self, X, Y):
                self.X = torch.from_numpy(X.astype(np.float32))
                self.y = torch.from_numpy(Y.astype(np.int64))
                self.len = self.X.shape[0]

            def __getitem__(self, i):
                return self.X[i], self.y[i]

            def __len__(self):
                return self.len

        class NeuralNetwork(nn.Module):
            def __init__(self, input_dim, hidden_dim, output_dim):
                super().__init__()
                self.layer_1 = nn.Linear(input_dim, hidden_dim)
                nn.init.kaiming_uniform_(self.layer_1.weight, nonlinearity="relu")
                self.layer_2 = nn.Linear(hidden_dim, output_dim)

            def forward(self, x):
                x = torch.nn.functional.relu(self.layer_1(x))
                # Pas de sigmoïde : CrossEntropyLoss applique le softmax.
                return self.layer_2(x)

        loader = DataLoader(Data(x, target), batch_size=self.batch_size, shuffle=True)
        self.model = NeuralNetwork(x.shape[1], self.hidden_dim, len(self.classes_))
        loss_fn = nn.CrossEntropyLoss()
        optimizer = optim.Adam(self.model.parameters(), lr=1e-3, weight_decay=1e-4)
        self.model.train()
        # La perte moyenne de chaque époque, comme dans le tutoriel.
        self.loss_values = []
        for _ in range(self.epochs):
            total, n = 0.0, 0
            for X, Y in loader:
                optimizer.zero_grad()
                loss = loss_fn(self.model(X), Y)
                loss.backward()
                optimizer.step()
                total += loss.item() * len(Y)
                n += len(Y)
            self.loss_values.append(total / n)
        return self

    def predict_proba(self, x):
        import torch

        self.model.eval()
        with torch.no_grad():
            logits = self.model(torch.from_numpy(x.astype(np.float32)))
            return torch.softmax(logits, dim=1).numpy()


def models():
    from sklearn.linear_model import LogisticRegression

    return {
        "Régression logistique (le classeur)": lambda seed: LogisticRegression(
            C=10.0, max_iter=3000
        ),
        "Réseau de neurones (PyTorch, 1 couche cachée)": lambda seed: TorchNetwork(seed),
    }


def evaluate(make, x, y, groups, person, n_classes, seed):
    """Validation croisée en 5 parts sur les chapitres vérifiés ; chaque
    modèle apprend sur tout le reste. Renvoie justesse, entropie croisée, et
    la justesse et la couverture au seuil de 0,5."""
    rng = np.random.default_rng(seed)
    tested = np.array(sorted(set(groups[person])))
    rng.shuffle(tested)
    fold = {c: i % 5 for i, c in enumerate(tested)}
    right, losses, conf, tested_idx, curve = [], [], [], [], None
    for f in range(5):
        test_chapters = {c for c, k in fold.items() if k == f}
        is_test = np.array([g in test_chapters for g in groups])
        train = ~is_test
        test = is_test & person
        model = make(seed)
        model.fit(x[train], y[train])
        if curve is None:
            curve = getattr(model, "loss_values", None)
        proba = np.zeros((test.sum(), n_classes))
        proba[:, model.classes_] = model.predict_proba(x[test])
        yy = y[test]
        tested_idx += list(np.where(test)[0])
        right += list(proba.argmax(axis=1) == yy)
        losses += list(-np.log(np.clip(proba[np.arange(len(yy)), yy], 1e-12, 1)))
        conf += list(proba.max(axis=1))
    right, conf = np.array(right), np.array(conf)
    sure = conf >= 0.5
    return {
        "accuracy": float(right.mean()),
        "ce": float(np.mean(losses)),
        "sure_accuracy": float(right[sure].mean()) if sure.any() else None,
        "coverage": float(sure.mean()),
        "n": int(len(right)),
        "tested": tested_idx,
        "right": list(right),
        "curve": curve,
    }


def chapter_map(x, person, tested, right) -> str:
    """La carte des chapitres, comme les nuages de points des tutoriels : les
    1 024 nombres de chaque chapitre ramenés à deux par t-SNE, qui garde
    proches les chapitres de même sens. En gris, les rangements pour
    apprendre ; en foncé, vos cartes justes ; en cercle vide, les erreurs du
    classeur."""
    import base64
    import io

    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from sklearn.manifold import TSNE

    xy = TSNE(n_components=2, init="pca", random_state=0, perplexity=30).fit_transform(x)
    tested = np.array(tested)
    right = np.array(right, dtype=bool)
    fig, ax = plt.subplots(figsize=(7, 6))
    ax.scatter(xy[~person, 0], xy[~person, 1], s=6, color="#CBD5E1", linewidths=0,
               label=f"rangements pour apprendre ({int((~person).sum())})")
    ok = tested[right]
    ko = tested[~right]
    ax.scatter(xy[ok, 0], xy[ok, 1], s=14, color="#0B1A2A", linewidths=0,
               label=f"vos cartes, trouvées ({len(ok)})")
    ax.scatter(xy[ko, 0], xy[ko, 1], s=46, facecolors="none", edgecolors="#0B1A2A",
               linewidths=1.4, label=f"vos cartes, manquées ({len(ko)})")
    ax.set_xticks([])
    ax.set_yticks([])
    for side in ("top", "right", "left", "bottom"):
        ax.spines[side].set_visible(False)
    ax.legend(frameon=False, loc="lower left", bbox_to_anchor=(0, 1.0), ncol=1, fontsize=9)
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode()


def loss_chart(curve) -> str:
    """La perte du réseau, époque après époque : elle baisse tant qu'il
    apprend, puis plafonne."""
    import base64
    import io

    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(7, 3.2))
    ax.plot(range(1, len(curve) + 1), curve, color="#0B1A2A", lw=2)
    ax.set_xlabel("Époque")
    ax.set_ylabel("Entropie croisée")
    ax.set_ylim(0, max(curve) * 1.05)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    ax.grid(axis="y", color="#EEF1F4")
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode()


def learning_curve(x, y, groups, person, n_classes):
    """La courbe d'apprentissage du classeur : un échantillon de test fixe
    (un chapitre vérifié sur cinq, choisi par l'empreinte de son identifiant :
    il reste le même d'une mesure à l'autre), puis le classeur appris sur
    25, 50, 100… verdicts humains tirés au hasard parmi les autres, cinq
    tirages par taille. Rend, pour chaque taille, la justesse moyenne, la
    plus basse et la plus haute."""
    import hashlib

    from sklearn.linear_model import LogisticRegression

    def held(c):
        return int(hashlib.sha256(str(c).encode()).hexdigest(), 16) % 5 == 0

    test = person & np.array([held(g) for g in groups])
    pool = np.where(person & ~np.array([held(g) for g in groups]))[0]
    if test.sum() == 0 or len(pool) < 25:
        return None
    sizes = [n for n in (25, 50, 100, 150, 200, 300, 400, 500, 700, 1000) if n < len(pool)]
    sizes.append(len(pool))
    points = []
    for n in sizes:
        scores = []
        for seed in range(5 if n < len(pool) else 1):
            rng = np.random.default_rng(seed)
            pick = rng.choice(pool, size=n, replace=False)
            if len(set(y[pick])) < 2:
                continue
            model = LogisticRegression(C=10.0, max_iter=3000)
            model.fit(x[pick], y[pick])
            proba = np.zeros((test.sum(), n_classes))
            proba[:, model.classes_] = model.predict_proba(x[test])
            scores.append(float((proba.argmax(axis=1) == y[test]).mean()))
        if scores:
            points.append({"n": n, "mean": float(np.mean(scores)), "low": min(scores), "high": max(scores)})
    counts = np.bincount(y[test], minlength=n_classes)
    return {
        "points": points,
        "tested": int(test.sum()),
        "majority": float(counts.max() / counts.sum()),
        "chance": 1 / n_classes,
    }


def learning_chart(lc) -> str:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(7, 3.6))
    ns = [p["n"] for p in lc["points"]]
    ax.fill_between(ns, [p["low"] for p in lc["points"]], [p["high"] for p in lc["points"]],
                    color="#0B1A2A", alpha=0.12, lw=0)
    ax.plot(ns, [p["mean"] for p in lc["points"]], "o-", color="#0B1A2A", lw=2)
    for p in lc["points"]:
        ax.annotate(f"{round(p['mean'] * 100)} %", (p["n"], p["mean"]), textcoords="offset points",
                    xytext=(0, 8), ha="center", fontsize=8, color="#5B6470")
    ax.axhline(lc["majority"], color="#5B6470", lw=1, ls="--")
    ax.annotate("sujet le plus fréquent", (ns[0], lc["majority"]), xytext=(2, 4),
                textcoords="offset points", fontsize=8, color="#5B6470")
    ax.axhline(lc["chance"], color="#5B6470", lw=1, ls=":")
    ax.annotate("hasard", (ns[0], lc["chance"]), xytext=(2, 4), textcoords="offset points",
                fontsize=8, color="#5B6470")
    ax.set_ylim(0, 1.05)
    ax.yaxis.set_major_formatter(matplotlib.ticker.PercentFormatter(1.0))
    ax.set_xlabel("Verdicts humains utilisés pour l’apprentissage")
    ax.set_ylabel("Justesse (test fixe)")
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    buf = io.BytesIO()
    fig.tight_layout()
    fig.savefig(buf, format="png", dpi=150)
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode()


def main() -> None:
    rows = json.loads(DATA.read_text())
    x = np.array([r["vector"] for r in rows], dtype=np.float32)
    codes = sorted({r["code"] for r in rows}, key=int)
    index = {c: i for i, c in enumerate(codes)}
    y = np.array([index[r["code"]] for r in rows])
    groups = np.array([r["chapter"] for r in rows])
    person = np.array([r["person"] for r in rows])
    print(
        f"{len(rows)} rangements pour apprendre, {person.sum()} vérifiés par une "
        f"personne pour tester, {len(codes)} sujets.\n"
    )
    pct = lambda v: "non mesuré" if v is None else f"{round(v * 100)} %"
    results = {}
    for name, make in models().items():
        runs = [evaluate(make, x, y, groups, person, len(codes), s) for s in range(DRAWS)]
        mean = lambda k: (
            None
            if any(r[k] is None for r in runs)
            else float(np.mean([r[k] for r in runs]))
        )
        res = {k: mean(k) for k in ("accuracy", "ce", "sure_accuracy", "coverage")}
        res["n"] = runs[0]["n"]
        if "logistique" in name:
            first = runs[0]
        else:
            curve = runs[0]["curve"]
        results[name] = res
        print(f"{name}")
        print(f"  justesse            {pct(res['accuracy'])}")
        print(f"  entropie croisée    {res['ce']:.2f} (au hasard : {math.log(len(codes)):.2f})")
        print(
            f"  sûr à 50 % ou plus  {pct(res['sure_accuracy'])} de justes, "
            f"{pct(res['coverage'])} des chapitres\n"
        )
    base, net = results.values()
    better = net["accuracy"] > base["accuracy"] and net["ce"] < base["ce"]
    verdict = (
        "Le réseau de neurones fait mieux sur les deux critères."
        if better
        else "Le réseau de neurones ne fait pas mieux sur les deux critères : "
        "on garde le classeur actuel."
    )
    print(verdict)
    from datetime import datetime, timezone

    chart = chapter_map(x, person, first["tested"], first["right"])
    lc = learning_curve(x, y, groups, person, len(codes))

    OUT.write_text(
        json.dumps(
            {
                "results": results,
                "better": better,
                "measuredAt": datetime.now(timezone.utc).isoformat(),
                "learn": int(len(rows)),
                "tested": int(person.sum()),
                "map": chart,
                "loss": loss_chart(curve) if curve else None,
                "learning": lc,
                "learningChart": learning_chart(lc) if lc else None,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
