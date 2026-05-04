// src/utils/nicknameUtils.js

/**
 * Build a userId → nickname lookup from a conversation's members array.
 * Only includes members that actually have a nickname set.
 */
export function buildNicknameMap(conversation) {
//   if (!conversation?.isGroup || !conversation?.members) return {}
  return conversation.members.reduce((acc, m) => {
    if (m.nickname) {
      const uid = (m.user?._id ?? m.user)?.toString()
      if (uid) acc[uid] = m.nickname
    }
    return acc
  }, {})
}

/**
 * Resolve the display name for a user inside a group conversation.
 * Falls back to fullName, then username.
 */
export function resolveDisplayName(user, nicknameMap) {
  if (!user) return ""
  const uid = (user._id ?? user)?.toString()
  return nicknameMap?.[uid] || user.fullName || user.username || ""
}
