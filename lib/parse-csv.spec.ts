import { test } from "node:test"
import assert from "node:assert/strict"

import { parseCsv } from "@/lib/parse-csv"

test("vírgula, aspas e quebra de linha dentro do campo", () => {
  assert.deepEqual(parseCsv('id,Nome,phone\r\ndl-1,"Silva, Ana","(31) 9999\n9999"\n\n'), [
    { id: "dl-1", nome: "Silva, Ana", phone: "(31) 9999\n9999" },
  ])
})

test("ponto e vírgula do Excel e aspas duplicadas", () => {
  assert.deepEqual(parseCsv('﻿id;notes\ngm-2;"diz ""oi"""'), [{ id: "gm-2", notes: 'diz "oi"' }])
})
