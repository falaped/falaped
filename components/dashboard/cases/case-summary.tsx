import { SparklesIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function CaseSummary() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <SparklesIcon className="h-4 w-4 text-primary" />
            Resumo do atendimento
          </CardTitle>
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Gerado por IA
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          O responsável entrou em contato relatando que a criança apresenta quadro de febre
          persistente há 3 dias, com temperatura variando entre 38,5°C e 39,2°C. Foram
          administrados antitérmicos (dipirona 10mg/kg) com resposta parcial, mas a febre retorna
          após aproximadamente 6 horas. A criança está aceitando líquidos e alimentos normalmente,
          sem sinais de desidratação aparentes. O responsável relatou que não há outros sintomas
          associados além de uma leve irritabilidade.
        </p>
        <p>
          Durante a conversa, foram investigados sinais de alarme como manchas na pele, rigidez
          de nuca, dificuldade respiratória e alteração do nível de consciência — todos negados
          pelo responsável. O histórico vacinal da criança está em dia e não houve contato
          recente com pessoas doentes. O pediatra orientou a manutenção da hidratação oral,
          uso adequado dos antitérmicos e monitoramento dos sinais vitais.
        </p>
        <p>
          Foi recomendado acompanhamento presencial caso a febre persista por mais 48 horas ou
          caso surjam novos sintomas como prostração intensa, recusa alimentar, vômitos repetidos
          ou qualquer sinal de alarme. O responsável demonstrou boa compreensão das orientações
          e se comprometeu a retornar com atualizações sobre a evolução do quadro clínico.
        </p>
      </CardContent>
    </Card>
  )
}
