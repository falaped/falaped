"use server"

import { clearBookLeadId } from "@/lib/book-lead-cookie"

/**
 * "Não é você?": apaga o cookie do lead para começar um cadastro do zero.
 * Os livros já criados continuam no banco, ligados ao lead antigo — só este
 * navegador deixa de enxergá-los.
 */
export async function forgetBookLeadAction(): Promise<void> {
  await clearBookLeadId()
}
