/** Le registre des clés de cache, du général au particulier. */
export const queryKeys = {
  session: ['session'] as const,
  catalogue: ['catalogue'] as const,
  versions: (datasetId: string) => ['datasets', datasetId, 'versions'] as const,
  importJob: (id: string, headerRow?: number) =>
    ['import-jobs', id, { headerRow }] as const,
  reviewQueue: ['review-queue'] as const,
  subjectReview: ['subject-review'] as const,
  checks: ['checks'] as const,
  gridTopics: ['grid-topics'] as const,
  measure: ['measure'] as const,
  nextCheck: (candidateId: string) => ['checks', candidateId] as const,
  nextReclass: (candidateId: string) =>
    ['checks', candidateId, 'reclass'] as const,
  publications: ['publications'] as const,
  history: (versionId: string) => ['versions', versionId, 'history'] as const,
}
