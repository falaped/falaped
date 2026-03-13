"use client"

import { DiscussionCard } from "@/components/dashboard/discussions/discussion-card"
import { DiscussionEmptyState } from "@/components/dashboard/discussions/discussion-empty-state"
import type { DiscussionWithMessages } from "@/modules/discussions/get-discussions-by-profile-id"

export function DiscussionList({
  discussions,
}: {
  discussions: DiscussionWithMessages[]
}) {
  if (discussions.length === 0) {
    return <DiscussionEmptyState />
  }

  return (
    <div className="flex flex-col gap-3">
      {discussions.map((d) => (
        <DiscussionCard key={d.id} discussion={d} />
      ))}
    </div>
  )
}
