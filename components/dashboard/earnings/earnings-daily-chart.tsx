"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { formatCentsToBRL } from "@/lib/formatters"
import type { EarningsSummary } from "@/modules/financial-entries/types"

/** Formatador único do eixo e do tooltip — nenhum valor abreviado em nenhum dos dois. */
const money = (value: unknown) => formatCentsToBRL(Number(value))

type EarningsDailyChartProps = {
  /** A série diária como chega da função SQL: já ordenada e já sem anulados. */
  byDay: EarningsSummary["by_day"]
}

/**
 * Série diária do período (EARN-03). Mesmo contrato do único consumidor de gráfico que já
 * existe no repo: biblioteca crua com imports nomeados, container responsivo de largura
 * percentual e altura NUMÉRICA, grid por classe de token, ticks de 11px, preenchimento por
 * variável de token e animação desligada. Nenhum wrapper de gráfico e nenhum pacote novo.
 *
 * Não é um Card: este gráfico vive DENTRO do Card da Faixa B, e dois níveis de card
 * aninhado é profundidade demais.
 *
 * O eixo Y tem 88px de largura porque um valor de milhares não cabe em 64 — e a largura é
 * a solução, não abreviar: nenhum valor monetário é abreviado em lugar nenhum da fase, sob
 * pena de o total da tela deixar de fechar ao centavo com a soma das linhas.
 *
 * A série vem pronta do SQL; aqui só o dia do mês é extraído por fatia da string de data
 * (sem construir data, que num host em UTC deslocaria a barra um dia). Nenhuma soma,
 * nenhuma divisão e nenhuma média acontecem aqui.
 */
export function EarningsDailyChart({ byDay }: EarningsDailyChartProps) {
  const data = byDay.map((point) => ({
    day: Number(point.received_on.slice(8, 10)),
    cents: point.cents,
  }))

  return (
    <div className="px-4 py-4 border-b border-border">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
          <YAxis
            type="number"
            tick={{ fontSize: 11 }}
            width={88}
            tickFormatter={money}
          />
          <Tooltip formatter={money} labelFormatter={(label) => `Dia ${label}`} />
          <Bar dataKey="cents" fill="var(--primary)" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
