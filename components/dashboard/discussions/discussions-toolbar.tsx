"use client"

import { useMemo } from "react"

import { DiscussionList } from "@/components/dashboard/discussions/discussion-list"
import type { DiscussionWithMessages } from "@/modules/discussions/get-discussions-by-profile-id"

export function DiscussionsToolbarAndList({
  discussions,
}: {
  discussions: DiscussionWithMessages[]
}) {
  const sortedDiscussions = useMemo(() => {
    return [...discussions].sort((a, b) => {
      const order = (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1)
      if (order !== 0) return order
      return new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    })
  }, [discussions])

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end" />
      <DiscussionList discussions={sortedDiscussions} />
    </>
  )
}
