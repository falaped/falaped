export default function CasesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Casos</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie seus atendimentos por WhatsApp.
        </p>
      </div>
      <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        Nenhum caso ativo.
      </div>
    </div>
  )
}
