import React from "react";
import SearchPanel from "./SearchPanel";
import SuggestedUsersPanel from "./SuggestedUsersPanel";

const RightPanel = ({showUnfollowModal, setShowUnfollowModal}) => {

  return (
    <div className="hidden md:block sticky pt-4 px-4 h-[100vh] w-[380px] top-0 border-l border-accent">
      <SearchPanel />
      <SuggestedUsersPanel
        showUnfollowModal={showUnfollowModal}
        setShowUnfollowModal={setShowUnfollowModal}
      />
    </div>
  );
};
export default React.memo(RightPanel);
