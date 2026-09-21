import test from "node:test"
import assert from "node:assert/strict"

import { CHANGELOG, LATEST_RELEASE } from "@/lib/changelog"

test("ids são únicos: id repetido faria o modal nunca reaparecer", () => {
  const ids = CHANGELOG.map((r) => r.id)
  assert.equal(new Set(ids).size, ids.length)
})

test("a versão mais nova é a primeira da lista", () => {
  assert.equal(LATEST_RELEASE, CHANGELOG[0])
  const dates = CHANGELOG.map((r) => r.date)
  assert.deepEqual(dates, [...dates].sort().reverse())
})

test("toda versão tem data ISO e pelo menos um item", () => {
  for (const release of CHANGELOG) {
    assert.match(release.date, /^\d{4}-\d{2}-\d{2}$/, release.id)
    assert.ok(release.entries.length > 0, release.id)
    for (const entry of release.entries) {
      assert.ok(entry.title.trim().length > 0, release.id)
      assert.ok(entry.description.trim().length > 0, entry.title)
    }
  }
})
