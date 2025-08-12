function NotificationsSkeleton() {
  return (
    <div className="flex w-52 flex-col gap-2 px-3 mb-16">
      <div className="flex items-center gap-1.5">
        <div className="skeleton size-8 shrink-0 rounded-full"></div>

        <div className="skeleton ml-1.5 size-[42px] shrink-0 rounded-full"></div>
        <div className="flex flex-col gap-2">
          <div className="skeleton h-3 w-24"></div>
          <div className="skeleton h-3 w-44"></div>
        </div>
      </div>
        {/* <div className="skeleton ml-12 h-9 w-full rounded-md"></div> */}
    </div>
  )
}

export default NotificationsSkeleton
