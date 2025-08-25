import { MdSend } from "react-icons/md";
import { AVAILABLE_THEMES } from "../../constants/themes";
import { useTheme } from "../../context/ThemeContext";
import { PiSmiley } from "react-icons/pi";
import { IoImageOutline } from "react-icons/io5";
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa6";

const PREVIEW_MESSAGES = [
  { id: 1, content: "Hey! How's it going?", isSent: false },
  { id: 2, content: "I'm doing great! Just working on some new features.", isSent: true },
];

const ThemesPage = () => {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate()
  const { authUser } = useAuthUser()

  const isThemeLocked = authUser && authUser.forceBlackTheme;

  return (
    <main className="min-h-screen flex-[4_4_0] border-accent">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-accent bg-opacity-20 px-3 py-2 backdrop-blur-md md:gap-4 md:px-4 md:py-3.5">
        <button
          onClick={() => navigate(-1)}
          className="flex-shrink-0 rounded-full p-2.5 transition duration-200 hover:bg-gray-800"
        >
          {" "}
          <FaArrowLeft />
        </button>
        <h1 className="flex-1 truncate text-xl font-bold">Themes</h1>
      </div>

      <div className="space-y-6 p-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-base-content/70">
            Choose a theme for your application interface
          </p>
          {isThemeLocked && (
            <p className="text-sm text-red-400">
              Your theme setting is currently managed by an administrator.
            </p>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
          {AVAILABLE_THEMES.map((t) => (
            <button
              key={t}
              className={`group flex flex-col items-center gap-1.5 rounded-2xl p-2 transition duration-200 ${theme === t ? "bg-base-200" : "hover:bg-base-200/50"} ${
                isThemeLocked ? "cursor-not-allowed opacity-50" : ""
              } // Disable if locked`}
              onClick={() => setTheme(t)}
              disabled={isThemeLocked}
            >
              <div className="relative h-8 w-full overflow-hidden rounded-2xl" data-theme={t}>
                <div className="absolute inset-0 grid grid-cols-3 gap-px p-1">
                  <div className="rounded-xl bg-primary"></div>
                  <div className="rounded-xl bg-secondary"></div>
                  <div className="rounded-xl bg-accent"></div>
                </div>
              </div>
              <span className="w-full truncate text-center text-[11px] font-medium">
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </span>
            </button>
          ))}
        </div>
        <h3 className="mb-3 px-4 text-lg font-semibold">Preview</h3>
        <div className="mx-4 overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-lg">
          <div className="bg-base-200 p-4">
            <div className="mx-auto max-w-lg">
              <div className="overflow-hidden rounded-xl bg-base-100 shadow-sm">
                <div className="border-b border-base-300 bg-base-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-medium text-primary-content">
                      J
                    </div>
                    <div>
                      <h3 className="text-sm font-medium">John Doe</h3>
                    </div>
                  </div>
                </div>

                <div className="max-h-[200px] min-h-[200px] space-y-4 overflow-y-auto bg-base-100 p-4">
                  {PREVIEW_MESSAGES.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isSent ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-3xl p-3 shadow-sm ${
                          message.isSent ? "bg-primary text-white" : "bg-[#2F3336] text-white"
                        } `}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="focus-within:border-accent/99 relative mx-4 mb-4 flex flex-1 items-center rounded-xl bg-secondary">
                  <div className="flex pl-1">
                    <button
                      type="button"
                      className="rounded-full p-2 text-primary transition-colors duration-200 hover:bg-gray-700"
                    >
                      <IoImageOutline className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className="relative hidden rounded-xl p-2 text-primary transition-colors duration-200 hover:bg-gray-700 md:block"
                    >
                      <PiSmiley className="h-5 w-5" />
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="This is a preview"
                    className="w-1 flex-1 rounded-xl bg-secondary py-2 pl-1 pr-10 placeholder-gray-500 focus:outline-none"
                  />

                  <button
                    type="submit"
                    className={`absolute right-1 top-1/2 hidden -translate-y-1/2 rounded-full bg-primary p-1.5 text-blue-200 transition-colors duration-200 md:block`}
                  >
                    <MdSend className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
};

export default ThemesPage;
