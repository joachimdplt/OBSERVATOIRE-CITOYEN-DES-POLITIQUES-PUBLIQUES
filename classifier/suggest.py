"""
Propose les sujets CAP les plus proches de chaque chapitre de programme.

Entrée (JSON sur l'entrée standard) :
  {"topics": [{"code": "331", "text": "..."}], "units": [{"id": "...", "text": "..."}], "k": 3}
Sortie (JSON sur la sortie standard) :
  [{"id": "...", "suggestions": [{"code": "331", "score": 0.61}, ...]}, ...]

Le modèle (BGE-M3, licence MIT) compare le texte d'un chapitre, en français,
à la description officielle de chaque sous-sujet, en anglais. Le score est une
similarité cosinus : il classe les sujets, il ne dit pas si le rangement est
juste. Une personne valide chaque proposition.
"""
import json
import sys

from sentence_transformers import SentenceTransformer

MODEL = "BAAI/bge-m3"


def main() -> None:
    request = json.load(sys.stdin)
    k = int(request.get("k", 3))
    model = SentenceTransformer(MODEL, device="cpu")
    topics = request["topics"]
    units = request["units"]
    topic_vectors = model.encode(
        [t["text"] for t in topics], normalize_embeddings=True, batch_size=16
    )
    unit_vectors = model.encode(
        [u["text"] for u in units], normalize_embeddings=True, batch_size=8
    )
    scores = unit_vectors @ topic_vectors.T
    out = []
    for unit, row in zip(units, scores):
        best = row.argsort()[::-1][:k]
        out.append(
            {
                "id": unit["id"],
                "suggestions": [
                    {"code": topics[i]["code"], "score": round(float(row[i]), 4)}
                    for i in best
                ],
            }
        )
    json.dump({"model": MODEL, "results": out}, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
