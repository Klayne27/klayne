import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import PublicChatWindow from "../../components/common/public-chat/PublicChatWindow";

const PublicChatPage = () => {
  const { authUser, isLoading: isLoadingAuthUser } = useAuthUser();


  if (isLoadingAuthUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-lg text-primary">
        Please log in to join the public chat.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PublicChatWindow  />
    </div>
  );
};

export default PublicChatPage;
