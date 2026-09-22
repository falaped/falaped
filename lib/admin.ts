/** Contas com acesso ao painel admin. Módulo puro: a sidebar (client) também importa daqui. */
export const ADMIN_EMAILS = ["oi.fprado@gmail.com", "contato@falaped.com.br"]

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase())
}
