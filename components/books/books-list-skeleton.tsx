export function BooksListSkeleton() {
  return (
    <div className="grid gap-5 px-4 pb-8 sm:grid-cols-2 sm:gap-7 sm:px-10 sm:pb-14 lg:grid-cols-3" aria-busy>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex flex-col overflow-hidden rounded-2xl border-2 border-ink bg-white shadow-hard-md">
          <div className="aspect-[3/4] animate-shimmer border-b-2 border-ink bg-[linear-gradient(100deg,#e1f1fa_20%,#f7fbfe_40%,#e1f1fa_60%)] bg-[length:380px_100%]" />
          <div className="flex flex-col gap-2.5 p-4">
            <span className="h-5 w-3/4 rounded-full bg-[#ededeb]" />
            <span className="h-3 w-[90%] rounded-full bg-muted" />
            <span className="h-3 w-[55%] rounded-full bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}
