// src/pages/publicChat/PublicChatPage.jsx
import React, { useEffect } from "react";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import PublicChatWindow from "./PublicChatWindow";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const PublicChatPage = ({ openImageModal }) => {
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
    // The PublicChatWindow will now occupy the entire available space within the <main> element
    // We remove the two-panel layout classes here, as it's just one full-width component.
    <div className="flex flex-col h-full">
      <PublicChatWindow openImageModal={openImageModal} />
    </div>
  );
};

export default PublicChatPage;
