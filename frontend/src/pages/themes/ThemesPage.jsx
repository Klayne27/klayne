import { MdSend } from "react-icons/md";
import { AVAILABLE_THEMES } from "../../constants/themes";
import { useTheme } from "../../context/ThemeContext";
import { PiSmiley } from "react-icons/pi";
import { IoImageOutline } from "react-icons/io5";

const PREVIEW_MESSAGES = [
  { id: 1, content: "Hey! How's it going?", isSent: false },
  { id: 2, content: "I'm doing great! Just working on some new features.", isSent: true },
];

const ThemesPage = () => {
  const { theme, setTheme } = useTheme();

  return (
    <main className="flex-[4_4_0] border-r border-gray-700 min-h-screen">
      <div className="flex justify-between items-center p-4  border-gray-700">
        <p className="font-bold text-xl">Themes</p>
      </div>

      <div className="space-y-6 p-4">
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {AVAILABLE_THEMES.map((t) => (
            <button
              key={t}
              className={`
                group flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors
                ${theme === t ? "bg-base-200" : "hover:bg-base-200/50"}
              `}
              onClick={() => setTheme(t)}
            >
              <div
                className="relative h-8 w-full rounded-md overflow-hidden"
                data-theme={t}
              >
                <div className="absolute inset-0 grid grid-cols-3 gap-px p-1">
                  <div className="rounded bg-primary"></div>
                  <div className="rounded bg-secondary"></div>

                  <div className="rounded bg-neutral"></div>
                </div>
              </div>
              <span className="text-[11px] font-medium truncate w-full text-center">
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </span>
            </button>
          ))}
        </div>
        {/* Preview Section */}
        <h3 className="text-lg font-semibold mb-3">Preview</h3>
        <div className="rounded-xl border border-base-300 overflow-hidden bg-base-100 shadow-lg">
          <div className="p-4 bg-base-200">
            <div className="max-w-lg mx-auto">
              {/* Mock Chat UI */}
              <div className="bg-base-100 rounded-xl shadow-sm overflow-hidden">
                {/* Chat Header */}
                <div className="px-4 py-3 border-b border-base-300 bg-base-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-content font-medium">
                      J
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">John Doe</h3>
                    </div>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="p-4 space-y-4 min-h-[200px] max-h-[200px] overflow-y-auto bg-base-100">
                  {PREVIEW_MESSAGES.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.isSent ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`
                          max-w-[80%] rounded-3xl p-3 shadow-sm
                          ${
                            message.isSent
                              ? "bg-primary text-primary-content rounded-br-[5px]"
                              : "bg-base-200 rounded-bl-[5px]"
                          }
                        `}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex-1 relative mb-4 flex items-center rounded-full bg-secondary border border-transparent focus-within:border-primary mx-4">
                  <div className="flex pl-1">
                    <button
                      type="button"
                      className="p-2 text-primary rounded-full hover:bg-gray-700 transition-colors duration-200"
                    >
                      <IoImageOutline className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      className="p-2 relative text-primary rounded-full hover:bg-gray-700 transition-colors duration-200 hidden md:block"
                    >
                      <PiSmiley className="w-5 h-5" />
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="This is a preview"
                    className="flex-1 py-2  bg-secondary rounded-full text-white placeholder-gray-400 focus:outline-none pl-1 pr-10 w-1"
                  />

                  <button
                    type="submit"
                    className={`hidden md:block absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-primary text-blue-200 transition-colors duration-200`}
                  >
                    <MdSend className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ThemesPage;
