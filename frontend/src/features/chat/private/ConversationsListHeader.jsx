import { FaCog } from "react-icons/fa"
import DropdownMenu from "../../../components/common/DropdownMenu"
import { Link } from "react-router-dom"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { useSocket } from "../../../context/SocketContext"
import { useUpdateStatusPreference } from "../../users/usersHooks/useUpdateStatusPreference"
import { useState } from "react"
import { HiUserGroup } from "react-icons/hi"
import CreateGroupModal from "../group/CreateGroupModal"
import { MdGroupAdd } from "react-icons/md"
import { HiMiniUserGroup } from "react-icons/hi2"

function ConversationsListHeader() {
  const { authUser } = useAuthUser()
  const { socket } = useSocket()

  const [showCreateGroup, setShowCreateGroup] = useState(false)

  const { updateStatus, isUpdatingStatus } = useUpdateStatusPreference()

  const handleStatusChange = (status) => {
    updateStatus(status)
    if (socket) {
      socket.emit("changeOnlineStatus", { status })
    }
  }

  const isOnline = authUser.statusPreference === "online"

  return (
    <>
      <div className="mr-2 flex items-center justify-between">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-black/0 p-4 backdrop-blur-sm">
          <h1 className="text-xl font-bold">Messages</h1>
        </div>
        <div className="flex gap-2">
          <div className="group relative ml-auto flex rounded-full px-1.5 transition duration-200 hover:bg-primary/20">
            <button
              className={`group cursor-pointer rounded-full transition duration-200 hover:text-primary`}
              onClick={() => setShowCreateGroup(true)}
              title="Create group"
            >
              <HiMiniUserGroup size={20} />
            </button>
          </div>
          <DropdownMenu icon={<FaCog />}>
            <div className="mt-1 flex w-full flex-col">
              <span className="mb-2 px-4 text-xs text-gray-400">Set Status</span>
              <div className="mb-2 flex items-center gap-2 px-3">
                <Link to={`/profile/${authUser.username}`}>
                  <div className={`avatar relative`}>
                    <div className="w-10 rounded-full">
                      <img src={authUser?.profileImg?.imageUrl || "/avatar-placeholder.png"} />
                    </div>
                    {isOnline ? (
                      <span className="absolute bottom-0 right-0 z-50 h-3 w-3 rounded-full border-2 border-base-100 bg-green-500"></span>
                    ) : (
                      <span className="absolute bottom-0 right-0 z-50 h-3 w-3 rounded-full border-2 border-base-100 bg-gray-500"></span>
                    )}
                  </div>
                </Link>
                <div>
                  <Link
                    to={`/profile/${authUser?.username}`}
                    className="font-semibold hover:underline"
                  >
                    {authUser.fullName}
                  </Link>
                  <p className="text-sm text-slate-500">@{authUser.username}</p>
                </div>
              </div>
              <button
                className="flex w-full items-center gap-2 px-4 py-2 text-left font-semibold transition duration-200 hover:bg-gray-700/30 disabled:cursor-wait"
                onClick={() => handleStatusChange("online")}
                disabled={isUpdatingStatus}
              >
                <span className="size-[14px] rounded-full border-2 border-base-100 bg-green-500"></span>
                <div className="flex flex-col">
                  <span className="text-sm">Online</span>
                  <span className="text-xs text-gray-500">You will appear online</span>
                </div>
              </button>
              <button
                className="flex w-full items-center gap-2 px-4 py-2 text-left font-semibold transition duration-200 hover:bg-gray-700/30 disabled:cursor-wait"
                onClick={() => handleStatusChange("offline")}
                disabled={isUpdatingStatus}
              >
                <span className="size-[14px] rounded-full border-2 border-base-100 bg-gray-500"></span>
                <div className="flex flex-col">
                  <span className="text-sm">Offline</span>
                  <span className="text-xs text-gray-500">You will appear offline</span>
                </div>
              </button>
            </div>
          </DropdownMenu>
        </div>
      </div>
      <CreateGroupModal isOpen={showCreateGroup} onClose={() => setShowCreateGroup(false)} />
    </>
  )
}

export default ConversationsListHeader
