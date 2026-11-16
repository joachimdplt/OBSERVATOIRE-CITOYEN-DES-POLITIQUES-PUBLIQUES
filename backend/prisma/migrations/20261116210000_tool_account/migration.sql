-- Le compte de l'outil : il signe les décisions prises par l'outil (un
-- rangement retiré parce que son chapitre a disparu, un rerangement), au
-- lieu du compte d'une personne. Retiré dès sa création : il ne se connecte
-- jamais, son mot de passe est un tirage au hasard que personne ne connaît.
INSERT INTO "users" ("id", "email", "name", "passwordHash", "role", "active")
VALUES ('00000000-0000-4000-8000-000000000001', 'outil@observatoire.invalid',
        'Outil de rangement', '$argon2id$v=19$m=65536,t=3,p=4$HOJA4XHsOs8SUUgu/ipZCA$U0hVpKUOmOp/eA6wZofUVOjwE9dM7MJCD0ZQGwitxxo', 'editor', false)
ON CONFLICT ("id") DO NOTHING;

-- Les décisions déjà prises par l'outil ou l'assistant portaient la
-- signature du premier compte d'administration : elles passent au compte de
-- l'outil. Le mode de décision, lui, disait déjà « assistant ».
UPDATE "cap_labels"
SET "decidedById" = '00000000-0000-4000-8000-000000000001'
WHERE "decisionMode" = 'assistant' AND "decidedById" IS NOT NULL;
