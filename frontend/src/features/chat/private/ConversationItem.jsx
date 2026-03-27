import React from "react"
import DMConversationItem from "./DMConversationItem"
import GroupConversationItem from "../group/GroupConversationItem"

function ConversationItem({ conv }) {
  if (conv.isGroup) return <GroupConversationItem conv={conv} />
  return <DMConversationItem conv={conv} />
}

export default React.memo(ConversationItem)
