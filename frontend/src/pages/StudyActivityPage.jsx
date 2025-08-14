import { Link, useNavigate } from "react-router-dom"
import { useGetStudyActivityFeed } from "../hooks/pomodoroHooks/usePomodo"
import { FaArrowLeft } from "react-icons/fa6"
import LoadingSpinner from "../components/ui/LoadingSpinner"

const StudyActivityPage = () => {
  const navigate = useNavigate()
  const { data: activityFeed, isLoading, isError } = useGetStudyActivityFeed()

  console.log(activityFeed);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <LoadingSpinner />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-screen items-center justify-center p-6 text-red-500">
        Failed to load activity feed.
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 ">
      <div className="mb-4 flex">
        <button
          onClick={() => navigate(-1)}
          className="mr-2 flex flex-shrink-0 items-center gap-6 rounded-full p-2.5 transition duration-200 hover:bg-gray-800"
        >
          <FaArrowLeft />
        </button>
        <h2 className="text-center text-2xl font-bold">Study Activity Feed</h2>
      </div>
      <div className="space-y-4">
        {activityFeed.map((session) => (
          <div key={session._id} className="card bg-base-100 p-4 shadow-xl">
            <div className="flex items-center space-x-4">
              <div className="avatar">
                <div className="w-12 rounded-full">
                  <img
                    src={session.user.profileImg?.imageUrl || "/avatar-placeholder.png"}
                    alt={`${session.user.username}'s profile`}
                  />
                </div>
              </div>
              <div>
                <Link
                  to={`/profile/${session.user.username}`}
                  className="font-bold hover:underline"
                >
                  {session.user.fullName} (@{session.user.username})
                </Link>
                <div className="text-sm text-gray-500">
                  Completed a {session.duration}-minute study session.
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(session.date).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default StudyActivityPage
