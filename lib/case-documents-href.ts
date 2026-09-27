/**
 * URL da página do caso já com o drawer de Documentos aberto (`?open=documents`).
 * É para onde os fluxos de novo atestado/nova receita voltam quando nasceram de um caso.
 */
export function caseDocumentsHref(caseId: string): string {
  return `/dashboard/cases/${caseId}?open=documents`
}
