import Link from "next/link"
import { redirect } from "next/navigation"

import { BookStatusBadge } from "@/components/books/book-status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { listBooks } from "@/modules/books/list-books"
import { getBookTheme } from "@/modules/books/themes"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export async function BooksList() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const books = await listBooks(createAdminClient(), profile.id)
  if (!books.length)
    return <p className="text-sm text-muted-foreground">Nenhum livro ainda. Crie o primeiro em Novo livro.</p>

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Criança</TableHead>
          <TableHead>Tema</TableHead>
          <TableHead>Qualidade</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Criado em</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {books.map((b) => (
          <TableRow key={b.id}>
            <TableCell>
              <Link href={`/books/${b.id}`} className="font-medium hover:underline">
                {b.child_name}
              </Link>
            </TableCell>
            <TableCell>{getBookTheme(b.theme).label}</TableCell>
            <TableCell>{b.quality}</TableCell>
            <TableCell>
              <BookStatusBadge status={b.status} />
            </TableCell>
            <TableCell>{new Date(b.created_at).toLocaleDateString("pt-BR")}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
