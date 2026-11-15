-- Un rangement à relire n'est pas encore décidé : il n'a pas de signataire,
-- comme un rangement proposé. Validé ou retiré, il en a toujours un.
ALTER TABLE "cap_labels" DROP CONSTRAINT "cap_label_decision_signed";
ALTER TABLE "cap_labels" ADD CONSTRAINT "cap_label_decision_signed" CHECK (
  (status IN ('proposed', 'review') AND "decidedById" IS NULL AND "decidedAt" IS NULL)
  OR (status IN ('validated', 'rejected') AND "decidedById" IS NOT NULL AND "decidedAt" IS NOT NULL)
);
