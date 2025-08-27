import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom" 
import LoadingSpinner from "../../components/common/LoadingSpinner"
import { showAppToast } from "../../utils/showAppToast"
import { useGetPomodoroSettings } from "../../features/pomodoro/pomodoroHooks/useGetPomodoroSettings"
import { useUpdatePomodoroSettings } from "../../features/pomodoro/pomodoroHooks/useUpdatePomodoroSettings"

function PomodoroSettingsPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(null)

  const { settings: initialSettings, isSettingsLoading: isLoading } = useGetPomodoroSettings()
  const { updateSettings, isUpdatingSettings } = useUpdatePomodoroSettings()

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings)
    }
  }, [initialSettings])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : Number(value),
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    updateSettings(settings)
    navigate(-1)
    showAppToast("Settings updated!", "success")
  }

  if (isLoading || !settings) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-100 p-4 sm:p-6 text-base-content-inverse">
      <div className="mx-auto w-full max-w-lg">
        <h3 className="mb-6 text-2xl font-bold">Pomodoro Settings</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 py-4">
          {/* Session Duration Range Input */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Session Duration: {settings.sessionDuration} min</span>
            </label>
            <input
              type="range"
              name="sessionDuration"
              min="5"
              max="300"
              step="5"
              value={settings.sessionDuration}
              onChange={handleChange}
              className="range range-primary"
            />
          </div>
          {/* Short Break Range Input */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Short Break: {settings.shortBreakDuration} min</span>
            </label>
            <input
              type="range"
              name="shortBreakDuration"
              min="1"
              max="20"
              step="1"
              value={settings.shortBreakDuration}
              onChange={handleChange}
              className="range range-primary"
            />
          </div>
          {/* Long Break Range Input */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Long Break: {settings.longBreakDuration} min</span>
            </label>
            <input
              type="range"
              name="longBreakDuration"
              min="5"
              max="60"
              step="5"
              value={settings.longBreakDuration}
              onChange={handleChange}
              className="range range-primary"
            />
          </div>
          {/* Sessions before Long Break Range Input */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">
                Sessions before Long Break: {settings.sessionsBeforeLongBreak} sessions
              </span>
            </label>
            <input
              type="range"
              name="sessionsBeforeLongBreak"
              min="1"
              max="10"
              step="1"
              value={settings.sessionsBeforeLongBreak}
              onChange={handleChange}
              className="range range-primary"
            />
          </div>
          {/* Session Goal Range Input */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">
                Session Goal: {settings.sessionGoalCount}{" "}
                {settings.sessionGoalCount === 1 ? "session" : "sessions"}
              </span>
            </label>
            <input
              type="range"
              name="sessionGoalCount"
              min="0"
              max="20"
              step="1"
              value={settings.sessionGoalCount}
              onChange={handleChange}
              className="range range-primary"
            />
          </div>
          <div className="flex flex-col">
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Autoplay Next Session</span>
                <input
                  type="checkbox"
                  name="autoplay"
                  checked={settings.autoplay}
                  onChange={handleChange}
                  className="checkbox"
                />
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Skip All breaks</span>
                <input
                  type="checkbox"
                  name="skipBreaks"
                  checked={settings.skipBreaks}
                  onChange={handleChange}
                  className="checkbox"
                />
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Mute Alarm</span>
                <input
                  type="checkbox"
                  name="isMuted"
                  checked={settings.isMuted}
                  onChange={handleChange}
                  className="checkbox"
                />
              </label>
            </div>
          </div>
          {/* Action Buttons */}
          <div className="mt-8 flex justify-end gap-3">
            <button type="button" className="btn" onClick={() => navigate(-1)}>
              Go Back
            </button>
            <button type="submit" className="btn btn-primary" disabled={isUpdatingSettings}>
              {isUpdatingSettings ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PomodoroSettingsPage
