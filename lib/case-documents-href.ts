/**
 * URL da página do caso já com o drawer de Documentos aberto (`?open=documents`).
 * É para onde os documentos voltam quando nasceram de um caso; consulta aberta do painel
 * redireciona daí para a própria consulta (case-detail-content.tsx).
 */
export function caseDocumentsHref(caseId: string): string {
  return `/dashboard/cases/${caseId}?open=documents`
}
