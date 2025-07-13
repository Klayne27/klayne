// components/skeletons/ConversationListSkeleton.jsx
import React from "react";

function ConversationItemSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 px-1">
      <div className="skeleton rounded-full size-9"></div> {/* Avatar */}
      <div className="flex flex-col flex-1 gap-2">
        <div className="skeleton w-3/4 h-4"></div> {/* Username/Full Name */}
        <div className="skeleton w-1/2 h-3"></div> {/* Last Message */}
      </div>
    </div>
  );
}

function ConversationListSkeleton() {
  return (
    <div className="flex flex-col w-full px-3 mt-[66px]">
      <div className="skeleton rounded-full w-full h-10 mb-3"></div>

      <div className="flex flex-col gap-2">
        {[...Array(5)].map(
          (
            _,
            i 
          ) => (
            <ConversationItemSkeleton key={i} />
          )
        )}
      </div>
    </div>
  );
}

export default ConversationListSkeleton;
