export const PUBLIC_CHAT_MODAL_CONFIGS = (message, handlers) => ({
  delete: {
    message: "Are you sure you want to delete this message?",
    onConfirm: handlers.handleAdminDeleteMessage,
    modalTitle: "Delete Message",
    confirmButtonText: "Delete",
  },
  ban: {
    message: `Are you sure you want to ban @${message.sender.username} from public chat?`,
    onConfirm: handlers.handleBanUser,
    modalTitle: `Ban @${message.sender.username}`,
    confirmButtonText: "Ban",
  },
  unban: {
    message: `Are you sure you want to unban @${message.sender.username} from public chat?`,
    onConfirm: handlers.handleUnbanUser,
    modalTitle: `Unban @${message.sender.username}`,
    confirmButtonText: "Unban",
  },
})
