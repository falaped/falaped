"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Download, MoreHorizontal, Trash2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { formatDate } from "@/lib/formatters"
import { deleteMedicalCertificateAction } from "@/actions"
import { toast } from "sonner"
import type {
  MedicalCertificateListItem,
  MedicalCertificateType,
} from "@/modules/medical-certificates/get-medical-certificates-by-profile-id"

const TYPE_LABELS: Record<MedicalCertificateType, string> = {
  comparecimento: "Comparecimento",
  aptidao_fisica: "Aptidão Física",
  medico: "Médico (afastamento)",
  acompanhante: "Acompanhante",
}

type MedicalCertificateTableProps = {
  certificates: MedicalCertificateListItem[]
}

export function MedicalCertificateTable({
  certificates,
}: MedicalCertificateTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const certificateToDelete = deleteId
    ? certificates.find((c) => c.id === deleteId)
    : null

  async function handleConfirmDelete() {
    if (!certificateToDelete) return
    setDeleting(true)
    const result = await deleteMedicalCertificateAction(
      certificateToDelete.id,
      certificateToDelete.pdf_storage_path,
    )
    setDeleting(false)
    setDeleteId(null)
    if (result.ok) {
      toast.success("Atestado excluído.")
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Paciente</TableHead>
            <TableHead className="w-[80px] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {certificates.map((cert) => {
            const subtitle = cert.patient_name ?? cert.location_state ?? "—"
            return (
              <TableRow key={cert.id}>
                <TableCell className="whitespace-nowrap font-medium">
                  {formatDate(cert.issued_at)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {TYPE_LABELS[cert.type]}
                </TableCell>
                <TableCell className="min-w-0 max-w-[200px] truncate text-muted-foreground">
                  {subtitle}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Abrir ações"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[12rem]">
                      {cert.pdf_storage_path ? (
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/api/medical-certificates/${cert.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Baixar PDF
                          </Link>
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleteId(cert.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir atestado
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atestado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O atestado e o PDF associado
              serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={handleConfirmDelete}
            >
              {deleting ? "Excluindo…" : "Excluir"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
