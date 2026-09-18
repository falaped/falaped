import { cookies } from "next/headers"

const NAME = "fp_book_lead"
const MAX_AGE = 60 * 60 * 24 * 365

/** Cookie httpOnly com o id do lead da landing pública (uuid v4 = token de acesso). */
export async function getBookLeadId(): Promise<string | null> {
  const value = (await cookies()).get(NAME)?.value ?? ""
  return /^[0-9a-f-]{36}$/i.test(value) ? value : null
}

/** Só em Server Action ou Route Handler. */
export async function setBookLeadId(id: string): Promise<void> {
  ;(await cookies()).set(NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  })
}
