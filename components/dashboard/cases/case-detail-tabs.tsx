"use client"

import type { ReactNode } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type CaseDetailTabsProps = {
  overviewSlot: ReactNode
  documentsSlot: ReactNode
  reportSlot: ReactNode
}

export function CaseDetailTabs({
  overviewSlot,
  documentsSlot,
  reportSlot,
}: CaseDetailTabsProps) {
  return (
    <Tabs defaultValue="overview" className="w-full gap-0">
      <TabsList className="mb-6 grid h-auto min-h-9 w-full grid-cols-1 gap-1 p-1 sm:grid-cols-3">
        <TabsTrigger value="overview" className="min-h-9 py-2">
          Visão do caso
        </TabsTrigger>
        <TabsTrigger value="documents" className="min-h-9 py-2">
          Documentos e cadastros
        </TabsTrigger>
        <TabsTrigger value="report" className="min-h-9 py-2">
          Relatório do atendimento
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="space-y-6">
        {overviewSlot}
      </TabsContent>
      <TabsContent value="documents">{documentsSlot}</TabsContent>
      <TabsContent value="report">{reportSlot}</TabsContent>
    </Tabs>
  )
}
