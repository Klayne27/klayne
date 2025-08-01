import { HiOutlineReply } from "react-icons/hi";
import { FiTrash } from "react-icons/fi";
import { MdEdit } from "react-icons/md";
import { IoCopy } from "react-icons/io5";

function MessageActionsModal({
  onCloseMoreActionsModal,
  moreActionsModalPosition,
  onReplyClick,
  onEditClick,
  onCopyMessage,
  onDeleteOwnMessage,
  onAdminDeleteMessage,
  onBanUser,
  onUnbanUser,
  message,
  isEditable,
  isSentByCurrentUser,
  isAuthUserAdmin = false,
  isMessageDeleted = false,
  isSenderBanned,
  isAdminDeleting,
}) {
  return (
    <div className="fixed inset-0 z-20" onClick={onCloseMoreActionsModal}>
      <div
        className={`absolute p-2 bg-base-100 rounded-xl gray-shadow  z-30`}
        style={{
          top: moreActionsModalPosition.top,
          left: moreActionsModalPosition.left,
          minWidth: "180px",
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <button
          onClick={onReplyClick}
          className="flex justify-between items-center gap-2 rounded-md w-full px-3 py-1.5 text-slate-300 hover:bg-secondary duration-200 transition"
        >
          Reply
          <HiOutlineReply size={18} className="text-slate-400" />
        </button>
        {message.text && (
          <button
            onClick={onCopyMessage}
            className="flex justify-between items-center gap-2 rounded-md w-full px-3 py-1.5 text-slate-300 hover:bg-secondary duration-200 transition"
          >
            Copy Text
            <IoCopy size={18} className="text-slate-400" />
          </button>
        )}
        {isEditable && !isMessageDeleted &&  (
          <button
            onClick={onEditClick}
            className="flex justify-between items-center gap-2 rounded-md w-full px-3 py-1.5 text-slate-300 hover:bg-secondary duration-200 transition"
          >
            Edit Message
            <MdEdit size={16} className="text-slate-400" />
          </button>
        )}
        {isSentByCurrentUser && !isMessageDeleted && (
          <button
            onClick={onDeleteOwnMessage}
            className="flex justify-between items-center gap-2 rounded-md w-full px-3 py-1.5 text-red-400 hover:bg-red-400/10 duration-200 transition"
          >
            Delete Message
            <FiTrash size={16} />
          </button>
        )}

        {isAuthUserAdmin && !isSentByCurrentUser && (
          <>
            {!isMessageDeleted && (
              <button
                onClick={onAdminDeleteMessage}
                disabled={isAdminDeleting}
                className="flex justify-between rounded-md items-center gap-2 w-full px-3 py-1.5 text-red-400 hover:bg-red-400/10 transition duration-200"
              >
                Delete (Admin)
                <MdDeleteForever size={18} />
              </button>
            )}
            {isSenderBanned ? (
              <button
                onClick={onUnbanUser}
                className="flex justify-between rounded-md items-center gap-2 w-full px-3 py-1.5 text-green-400 hover:bg-green-400/10 transition duration-200"
              >
                Unban User
                <FaUserCheck size={16} />
              </button>
            ) : (
              <button
                onClick={onBanUser}
                className="flex justify-between rounded-md items-center gap-2 w-full px-3 py-1.5 text-red-400 hover:bg-red-400/10 transition duration-200"
              >
                Ban User
                <FaUserSlash size={16} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default MessageActionsModal;
