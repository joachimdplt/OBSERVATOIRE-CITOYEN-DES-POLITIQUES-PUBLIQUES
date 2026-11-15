# Classeur des sujets

Propose, pour chaque chapitre de programme, les sous-sujets les plus proches
de la grille du Comparative Agendas Project, par similarité avec leurs
descriptions officielles. Modèle : BAAI/bge-m3 (licence MIT), en local.

Installation : `uv venv --python 3.12 .venv && uv pip install --python .venv/bin/python sentence-transformers torch`

Le backend l'appelle (`npm run cap:suggest`) ; le modèle se télécharge dans
`.cache/` au premier lancement (environ 2,3 Go).
