import { Link } from "react-router-dom";

import RightPanelSkeleton from "../skeletons/RightPanelSkeleton";
import useFollow from "../../hooks/usersHooks/useFollow";
import { useSuggestedUsers } from "../../hooks/usersHooks/useSuggestedUsers";
import LoadingSpinner from "./LoadingSpinner";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import SearchPanel from "./SearchPanel";
import { BiRefresh } from "react-icons/bi";
import SuggestedUsersPanel from "./SuggestedUsersPanel";

const RightPanel = () => {
  const { suggestedUsers, isLoading, refetch, isRefetching } = useSuggestedUsers();
  const { follow, isPending } = useFollow();

  const { authUser: currentUser } = useAuthUser();

  // Handler for the refresh button click
  const handleRefreshClick = () => {
    refetch(); // Call the refetch function
  };

  if (suggestedUsers?.length === 0) return <div className="md:w-[390px] w-0 ml-2"></div>;

  return (
    <div className="hidden lg:block sticky pt-4 mx-6 h-[100vh] w-[350px] top-0">
      <SearchPanel />

      <SuggestedUsersPanel />
    </div>
  );
};
export default RightPanel;
