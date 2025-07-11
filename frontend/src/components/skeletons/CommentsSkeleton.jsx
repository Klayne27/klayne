function CommentsSkeleton() {
    return (
      <div className="flex w-full flex-col gap-1">
        <div className="flex items-center gap-1 md:gap-3">
          <div className="skeleton size-9 md:size-10 shrink-0 rounded-full mb-12"></div>
          <div className="flex w-full flex-col gap-1">
            <div className="skeleton h-3 w-40"></div>
            {/* <div className="skeleton h-2 w-28"></div> */}
            <div className="skeleton h-16 w-full"></div>
          </div>
        </div>
      </div>
    );
}

export default CommentsSkeleton
