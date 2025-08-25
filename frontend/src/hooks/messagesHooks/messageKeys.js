export const messageKeys = {
  all: ["messages"],
  private: () => [...messageKeys.all, "private"],
  privateMessages: (conversationId) => [...messageKeys.private(), conversationId],
  publicMessages: () => [...messageKeys.all, "public"],
}
