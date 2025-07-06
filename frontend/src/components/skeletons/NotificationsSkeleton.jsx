function NotificationsSkeleton() {
  return (
    <div className="flex w-52 flex-col gap-2 px-2 py-3">
      <div className="flex items-center gap-2">
        <div className="skeleton h-10 w-10 shrink-0 rounded-full"></div>

        <div className="skeleton h-9 w-9 shrink-0 rounded-full"></div>
        <div className="flex flex-col gap-2">
          <div className="skeleton h-4 w-24"></div>
        </div>
      </div>
      <div className="ml-12 skeleton h-4 w-44"></div>
    </div>
  );
}

export default NotificationsSkeleton;
