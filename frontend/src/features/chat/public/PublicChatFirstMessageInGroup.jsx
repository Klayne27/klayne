import { Link } from "react-router-dom"
import { formatTime } from "../../../utils/date"
import { MdAdminPanelSettings } from "react-icons/md"
import { FaBan } from "react-icons/fa"
import { renderHourBadge, renderSessionBadge, renderStreakBadge } from "../../../utils/renderBadges"

function PublicChatFirstMessageInGroup({ message, isSentByCurrentUser, isSenderBanned }) {
  const isSenderAdmin = message.sender.isAdmin
  const isSenderVerified = message.sender.isVerified
  const isSenderGoldVerified = message.sender.isGoldVerified
  
  return (
    <>
      {message.isFirstInGroup && (
        <div className={`mb-0.5 flex items-center gap-1 text-sm`}>
          {!isSentByCurrentUser && (
            <Link
              to={`/profile/${message.sender.username}`}
              className={`font-semibold ${
                isSenderVerified
                  ? "text-[#1D9BF0]"
                  : isSenderGoldVerified
                    ? "text-[#E3B812]"
                    : "text-white"
              }`}
            >
              {message.sender.username}
            </Link>
          )}
          <span className="flex items-center">
            {isSenderVerified && !isSentByCurrentUser && (
              <img src="/verified2.png" className="size-[17px]" />
            )}
            {isSenderGoldVerified && !isSentByCurrentUser && (
              <img src="/gold-verified2.png" className="size-[17px]" />
            )}

            {isSenderAdmin && !isSentByCurrentUser && (
              <span>
                <MdAdminPanelSettings size={20} className="mb-[1px] fill-green-500" />
              </span>
            )}

            {isSenderBanned && !isSentByCurrentUser && (
              <span>
                <FaBan size={15} className="mr-1 fill-red-500" />
              </span>
            )}
            {!isSentByCurrentUser && renderHourBadge(message.sender.badges)}
            {!isSentByCurrentUser && renderSessionBadge(message.sender.badges)}
            {!isSentByCurrentUser && renderStreakBadge(message.sender.badges)}
          </span>
          <span className="text-xs text-gray-500">{formatTime(message.createdAt)}</span>
        </div>
      )}
    </>
  )
}

export default PublicChatFirstMessageInGroup
