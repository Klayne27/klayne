import React from "react"
import GroupConversationItem from "../../group/components/GroupConversationItem"
import DMConversationItem from "./DMConversationItem"

function ConversationItem({ conv }) {
  if (conv.isGroup) return <GroupConversationItem conv={conv} />
  return <DMConversationItem conv={conv} />
}

export default React.memo(ConversationItem)
