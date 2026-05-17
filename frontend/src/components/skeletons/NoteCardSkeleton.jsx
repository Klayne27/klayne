const NoteCardSkeleton = () => {
  return (
    <div className="flex w-16 flex-shrink-0 flex-col items-center">
      {/* Sized container matching the avatar anchor spacing */}
      <div className="relative mt-8 flex w-20 flex-col items-center">
        {/* Mock floating Note bubble skeleton */}
        <div className="skeleton absolute -top-4 h-8 w-20 rounded-2xl " />
        {/* Mock Avatar circle skeleton (Matching UserAvatar xl size) */}
        <div className="skeleton size-20 rounded-full" />
      </div>
      {/* Mock Username text string line skeleton */}
      <div className="skeleton mt-2 h-3 w-14 rounded " />
    </div>
  )
}

export default NoteCardSkeleton