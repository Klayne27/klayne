import { useState, useEffect } from "react"
import { useUpdatePomodoroSettings } from "../../hooks/pomodoroHooks/usePomodo"

const PomodoroSettingsModal = ({ isOpen, onClose, initialSettings }) => {
  const [settings, setSettings] = useState(initialSettings)
  const updateSettingsMutation = useUpdatePomodoroSettings()

  useEffect(() => {
    setSettings(initialSettings)
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
    updateSettingsMutation.mutate(settings, {
      onSuccess: () => onClose(),
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center bg-slate-700/70 justify-center" onClick={onClose}>
      <div
        className="relative w-full max-w-lg rounded-3xl bg-base-100 p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold">Pomodoro Settings</h3>
        <form onSubmit={handleSubmit} className="py-4">
          {/* Session Duration Range Input */}
          <div className="form-control mb-4">
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
          <div className="form-control mb-4">
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
          <div className="form-control mb-4">
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
          <div className="form-control mb-4">
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
          <div className="form-control mb-4">
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
          {/* Autoplay checkbox */}
          <div className="form-control mb-4">
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

          <div className="form-control mb-4">
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
          <div className="modal-action mt-6 flex justify-end gap-2">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={updateSettingsMutation.isPending}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PomodoroSettingsModal
