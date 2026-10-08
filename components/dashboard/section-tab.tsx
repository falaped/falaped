import { TabsTrigger } from "@/components/ui/tabs"

/** Aba sublinhada dos cartões (Início, Consultas, Pacientes). */
export function SectionTab({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <TabsTrigger
      value={value}
      className="-mb-px flex-none gap-1.5 rounded-none border-b-2 border-transparent px-1 pt-0 pb-2.5 text-body font-normal text-muted-foreground shadow-none hover:text-foreground sm:px-1 sm:text-body data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none"
    >
      {children}
    </TabsTrigger>
  )
}
