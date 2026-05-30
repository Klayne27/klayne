import { useEffect, useRef, useState } from "react"

const PostSkeleton = ({ count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SinglePostSkeleton key={i} />
      ))}
    </>
  )
}

const SinglePostSkeleton = () => (
  <div className="flex flex-col border-b border-accent px-4 pb-0 pt-3">
    <div className="flex items-start gap-2.5">
      {/* Avatar */}
      <div className="skeleton mt-0.5 h-10 w-10 shrink-0 rounded-full" />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* Header row: fullname · verified badge placeholder · @username · timestamp */}
        <div className="flex items-center gap-1.5 mt-1">
          <div className="skeleton h-3 w-28 rounded-full" />
          <div className="skeleton h-3 w-4 rounded-full" />
          <div className="skeleton h-3 w-20 rounded-full" />
          <div className="skeleton ml-1 h-3 w-8 rounded-full opacity-60" />
        </div>

        {/* Post text lines */}

        {/* Image block */}
        <div className="skeleton mb-0.5 mt-4 h-80 w-full rounded-xl" />

        {/* Action bar: comment · repost · like (w-2/3 matches Post) */}
        <div className="flex w-2/3 items-center justify-between py-1.5 pb-4">
          <div className="skeleton h-3.5 w-8 rounded-full" />
          <div className="skeleton h-3.5 w-8 rounded-full" />
          <div className="skeleton h-3.5 w-8 rounded-full" />
        </div>
      </div>
    </div>
  </div>
)

export default PostSkeleton
