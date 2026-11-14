/** Le registre des clés de cache, du général au particulier. */
export const queryKeys = {
  session: ['session'] as const,
  catalogue: ['catalogue'] as const,
  versions: (datasetId: string) => ['datasets', datasetId, 'versions'] as const,
  importJob: (id: string, headerRow?: number) =>
    ['import-jobs', id, { headerRow }] as const,
  reviewQueue: ['review-queue'] as const,
  publications: ['publications'] as const,
  history: (versionId: string) => ['versions', versionId, 'history'] as const,
}
