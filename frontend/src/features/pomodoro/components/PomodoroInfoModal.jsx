const PomodoroInfoModal = ({ onClose }) => {
  const badges = [
    {
      name: "25-Hour Scholar",
      src: "/badge-hrs-25.png",
      description: "Achieve 25 total study hours.",
    },
    {
      name: "100-Hour Scholar",
      src: "/badge-hrs-100.png",
      description: "Achieve 100 total study hours.",
    },
    {
      name: "300-Hour Master",
      src: "/badge-hrs-300.png",
      description: "Achieve 300 total study hours.",
    },
    {
      name: "10-Session Achiever",
      src: "/badge-sessions-10.png",
      description: "Complete 10 total sessions.",
    },
    {
      name: "50-Session Pro",
      src: "/badge-sessions-50.png",
      description: "Complete 50 total sessions.",
    },
    {
      name: "Session Master",
      src: "/badge-sessions-150.png",
      description: "Complete 150 total sessions.",
    },
    {
      name: "7-Day Streak",
      src: "/badge-streak-7.png",
      description: "Maintain a 7-day study streak.",
    },
    {
      name: "14-Day Streak",
      src: "/badge-streak-14.png",
      description: "Maintain a 14-day study streak.",
    },
    {
      name: "30-Day Streak",
      src: "/badge-streak-30.png",
      description: "Maintain a 30-day study streak.",
    },
  ]



  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-gray-800 p-6 text-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-600 pb-3">
          <h3 className="text-xl font-bold">How Pomodoro Works</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 transition-colors hover:bg-gray-700"
          >
            <svg
              className="h-6 w-6 text-gray-400 hover:text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-300">
          <p>
            The Pomodoro Technique is a time management method that breaks down work into intervals,
            traditionally 25 minutes in length, separated by short breaks. Our timer is based on
            this principle, helping you stay focused and avoid burnout.
          </p>
          <div>
            <h4 className="font-semibold text-white">The XP Gaining System</h4>
            <p className="mt-1">
              Every minute you study earns you **XP (Experience Points)**. The amount of XP you get
              increases with the length of your session:
            </p>
            <ul className="mt-2 list-disc pl-5">
              <li>
                <strong>10 XP per minute</strong> for sessions up to 60 minutes.
              </li>
              <li>
                <strong>15 XP per minute</strong> for sessions longer than 60 minutes.
              </li>
              <li>
                <strong>20 XP per minute</strong> for sessions 120 minutes or longer.
              </li>
            </ul>
            <p className="mt-2">
              The XP you earn helps you level up, unlocking new milestones and showcasing your
              dedication.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white">Leaderboard Competition</h4>
            <p className="mt-1">
              See how you rank against other users on the platform! The leaderboard displays users
              based on their total study duration, creating a friendly competition to see who can be
              the most productive.
            </p>
          </div>

          <div className="pt-4">
            <h4 className="font-semibold text-white">Badge Showcase</h4>
            <p className="mt-1">These are all the badges you can earn by hitting key milestones.</p>
            <div className="mt-4 grid grid-cols-3 gap-4 md:grid-cols-3">
              {badges.map((badge, index) => (
                <div key={index} className="flex flex-col items-center text-center">
                  <div className="size-16 md:size-20">
                    <img
                      src={badge.src}
                      alt={badge.name}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <span className="mt-2 text-[10px] font-medium text-gray-100 sm:text-xs">
                    {badge.name}
                  </span>
                  <p className="mt-1 text-[8px] text-gray-400 sm:text-[10px]">
                    {badge.description}
                  </p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default PomodoroInfoModal
