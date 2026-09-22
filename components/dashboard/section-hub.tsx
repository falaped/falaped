import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { dashboardNav } from "@/lib/dashboard-nav"

/**
 * Página de uma seção do menu: os antigos submenus da sidebar viram cards aqui.
 */
export function SectionHub({ url }: { url: string }) {
  const section = dashboardNav.find((entry) => entry.url === url)
  if (!section) return null

  const SectionIcon = section.icon

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2.5">
          <SectionIcon className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h1 className="text-2xl font-semibold tracking-tight">{section.title}</h1>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {section.description}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {section.items.map((item) => {
          const ItemIcon = item.icon
          return (
            <Link key={item.url} href={item.url} className="group">
              <Card className="h-full transition-colors group-hover:border-primary group-hover:bg-primary/5">
                <CardHeader className="flex flex-row items-center gap-2.5 space-y-0">
                  <ItemIcon className="h-5 w-5 text-primary" aria-hidden />
                  <CardTitle className="text-base font-semibold">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
