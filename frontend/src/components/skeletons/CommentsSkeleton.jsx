function CommentsSkeleton() {
    return (
      <div className="flex w-full flex-col gap-1">
        <div className="flex items-center gap-1 md:gap-3 mb-2">
          <div className="skeleton size-8 md:size-9 shrink-0 rounded-full mb-8"></div>
          <div className="flex w-full flex-col gap-1 md:gap-2">
            <div className="skeleton h-3 w-40"></div>
            {/* <div className="skeleton h-2 w-28"></div> */}
            <div className="skeleton h-6 w-full"></div>
            <div className="flex gap-4 ml-2">
              <div className="skeleton h-4 w-8"></div>
              <div className="skeleton h-4 w-12"></div>
            </div>
          </div>
        </div>
      </div>
    );
}

export default CommentsSkeleton
