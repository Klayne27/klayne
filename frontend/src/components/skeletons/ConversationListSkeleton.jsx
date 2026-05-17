function ConversationItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-1 py-3">
      <div className="skeleton size-9 rounded-full"></div>
      <div className="flex flex-1 flex-col gap-2">
        <div className="skeleton h-4 w-3/4"></div>
        <div className="skeleton h-3 w-1/2"></div>
      </div>
    </div>
  )
}

const NoteCardSkeleton = () => {
  return (
    <div className="mt-2 flex w-16 flex-shrink-0 flex-col items-center">
      <div className="relative mt-8 flex w-20 flex-col items-center">
        <div className="skeleton absolute -top-4 h-8 w-20 rounded-2xl" />
        <div className="skeleton size-20 rounded-full" />
      </div>
      <div className="skeleton mt-2 h-3 w-14 rounded" />
    </div>
  )
}

function ConversationListSkeleton() {
  return (
    <div className="mt-[66px] flex w-full flex-col px-3">
      <div className="skeleton mb-3 mt-1 h-10 w-full rounded-full"></div>

      <div className="flex gap-10 px-1">
        <NoteCardSkeleton />
        <NoteCardSkeleton />
        <NoteCardSkeleton />
        <NoteCardSkeleton />
      </div>

      <div className="mt-5 flex flex-col gap-1.5">
        {[...Array(11)].map((_, i) => (
          <ConversationItemSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export default ConversationListSkeleton
