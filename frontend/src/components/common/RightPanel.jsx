import React from "react";
import SearchPanel from "./SearchPanel";
import SuggestedUsersPanel from "./SuggestedUsersPanel";

const RightPanel = () => {
  return (
    <div className="hidden lg:block sticky pt-4 px-4 h-[100vh] w-[380px] top-0 border-l border-accent">
      <SearchPanel />
      <SuggestedUsersPanel />
    </div>
  );
};
export default React.memo(RightPanel);
