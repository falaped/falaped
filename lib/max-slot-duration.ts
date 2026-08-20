/**
 * Duração MÁXIMA (minutos) agendável a partir de `startMinute`, encadeando
 * células contíguas de `step` minutos enquanto `isFree` as aceitar.
 *
 * PORQUÊ existir: um horário estar livre não significa que qualquer duração
 * cabe nele. Com 15:00 livre e 15:30 já confirmada, só 15/30 min entram — 45+
 * sobrepõem a consulta seguinte, e o INSERT morre na exclusion constraint do
 * Postgres (23P01) com uma copy de corrida que não explica o conflito real.
 * Este teto permite desabilitar os chips que não cabem, então o erro não
 * acontece em vez de precisar ser explicado depois.
 *
 * `cap` limita o encadeamento (o maior preset de duração): sem ele, um dia
 * inteiramente livre percorreria a grade à toa — e o loop precisa terminar.
 *
 * @param startMinute Minuto-do-dia do início do slot (wall-clock).
 * @param step Granularidade da grade em minutos (o STEP do dado, 30).
 * @param cap Teto em minutos — o retorno nunca passa disto.
 * @param isFree Recebe o minuto-do-dia de uma célula; `true` se ela está
 *   disponível E sem consulta ativa (pendente/confirmada) ocupando-a.
 * @returns Múltiplo de `step` entre 0 e `cap`. Zero significa que nem a
 *   primeira célula está livre — nenhuma duração cabe.
 */
export function maxSlotDuration(
  startMinute: number,
  step: number,
  cap: number,
  isFree: (minute: number) => boolean,
): number {
  if (step <= 0) throw new Error("[AGENDA] step deve ser positivo")
  let total = 0
  for (let minute = startMinute; total < cap; minute += step) {
    if (!isFree(minute)) break
    total += step
  }
  return Math.min(total, cap)
}
