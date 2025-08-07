export const usePublicChatAdminHandlers = ({
  message,
  banUser,
  unbanUser,
  adminDeletePublicMessage,
}) => {


  const handleAdminDeleteMessage = () => {
    adminDeletePublicMessage(message._id)
  }

  const handleBanUser = () => {
    banUser(message.sender._id)
  }

  const handleUnbanUser = () => {
    unbanUser(message.sender._id)
  }

  return {
    handleAdminDeleteMessage,
    handleBanUser,
    handleUnbanUser,
  }
}
