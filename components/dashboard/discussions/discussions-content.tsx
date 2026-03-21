import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getDiscussionsByProfileId } from "@/modules/discussions/get-discussions-by-profile-id"
import { DiscussionsToolbarAndList } from "@/components/dashboard/discussions/discussions-toolbar"

export async function DiscussionsContent() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) redirect("/auth/login")

  const discussions = await getDiscussionsByProfileId(supabase, profile.id)
  return <DiscussionsToolbarAndList discussions={discussions} />
}
