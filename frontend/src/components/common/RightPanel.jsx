import SearchPanel from "./SearchPanel";
import SuggestedUsersPanel from "./SuggestedUsersPanel";

const RightPanel = () => {


  return (
    <div className="hidden lg:block sticky pt-4 mx-6 h-[100vh] w-[350px] top-0">
      <SearchPanel />

      <SuggestedUsersPanel />
    </div>
  );
};
export default RightPanel;
