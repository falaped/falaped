import { Skeleton } from "@/components/ui/skeleton"
import { ProfileLoading } from "@/components/dashboard/profile/profile-loading"

export default function Loading() {
  return (
    <div className="container mx-auto flex flex-col items-center gap-6">
      <div className="w-full max-w-4xl space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <ProfileLoading />
    </div>
  )
}
