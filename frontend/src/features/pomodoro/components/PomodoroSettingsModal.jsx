import { useState, useEffect } from "react"
import { showAppToast } from "../../../utils/showAppToast"
import { useUpdatePomodoroSettings } from "../pomodoroHooks/usePomodoroMutations"
import { usePomodoroTimerStore } from "../../../store/usePomodoroTimerStore"
import ConfirmationModal from "../../../components/common/ConfirmationModal"

const PomodoroSettingsModal = ({ isOpen, onClose, initialSettings }) => {
  const [settings, setSettings] = useState(initialSettings)
  const [showDurationWarning, setShowDurationWarning] = useState(false)
  const [pendingSettings, setPendingSettings] = useState(null)

  const { updateSettings, isUpdatingSettings } = useUpdatePomodoroSettings()

  // Read live timer state — don't subscribe to the whole store, just what we need
  const isActive = usePomodoroTimerStore((s) => s.isActive)
  const setIsActive = usePomodoroTimerStore((s) => s.setIsActive)
  const setTimer = usePomodoroTimerStore((s) => s.setTimer)
  const setIsBreak = usePomodoroTimerStore((s) => s.setIsBreak)
  const setSessionCount = usePomodoroTimerStore((s) => s.setSessionCount)
  const setIsGoalReached = usePomodoroTimerStore((s) => s.setIsGoalReached)
  const persistReset = usePomodoroTimerStore((s) => s.persistReset)
  const timer = usePomodoroTimerStore((s) => s.timer)
  const sessionCount = usePomodoroTimerStore((s) => s.sessionCount)
  const isBreak = usePomodoroTimerStore((s) => s.isBreak)

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

  const hasSessionStarted =
    isActive || (timer > 0 && timer !== (initialSettings?.sessionDuration ?? 0) * 60)


const commitSettings = (s) => {
  updateSettings(s)

  if (!hasSessionStarted && s.sessionDuration !== initialSettings?.sessionDuration) {
    // Idle — not in any session or break yet
    setTimer(s.sessionDuration * 60)
  } else if (isBreak) {
    // Currently in a break phase — recalculate which break type it is and update live
    const isLongBreak =
      sessionCount > 0 &&
      s.sessionsBeforeLongBreak > 0 &&
      sessionCount % s.sessionsBeforeLongBreak === 0

    const newBreakDuration = isLongBreak ? s.longBreakDuration * 60 : s.shortBreakDuration * 60

    setTimer(newBreakDuration)
  }

  onClose?.()
  showAppToast("Settings updated!", "success")
}

  const handleSubmit = (e) => {
    e.preventDefault()

    // If the timer is running AND the user changed session duration, warn them
    if (hasSessionStarted && settings.sessionDuration !== initialSettings.sessionDuration) {
      setPendingSettings(settings)
      setShowDurationWarning(true)
      return
    }

    commitSettings(settings)
  }

  // const commitSettings = (s) => {
  //   updateSettings(s)
  //   onClose()
  //   showAppToast("Settings updated!", "success")
  // }

  const handleConfirmReset = () => {
    // Apply the new settings then wipe the active session
    updateSettings(pendingSettings)

    setIsActive(false)
    setTimer(pendingSettings.sessionDuration * 60)
    setIsBreak(false)
    setSessionCount(0)
    setIsGoalReached(false)
    persistReset()

    setShowDurationWarning(false)
    setPendingSettings(null)
    onClose()
    showAppToast("Settings updated. Session reset.", "success")
  }

  const handleCancelReset = () => {
    // Revert the slider back to the original value so nothing was "saved"
    setSettings((prev) => ({ ...prev, sessionDuration: initialSettings.sessionDuration }))
    setShowDurationWarning(false)
    setPendingSettings(null)
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-700/70"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-lg rounded-3xl bg-base-100 p-8 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-bold">Pomodoro Settings</h3>
          <form onSubmit={handleSubmit} className="py-4">
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">
                  Session Duration: {settings.sessionDuration} min
                  {hasSessionStarted &&
                    settings.sessionDuration !== initialSettings.sessionDuration && (
                      <span className="ml-2 text-xs font-bold text-warning">
                        ⚠ Changing this will reset your session
                      </span>
                    )}
                </span>
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
              <button type="submit" className="btn btn-primary" disabled={isUpdatingSettings}>
                Save
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDurationWarning}
        onClose={handleCancelReset}
        onConfirm={handleConfirmReset}
        danger
        modalTitle="Reset session?"
        message={`Changing the session duration while a session is active will stop your current session and reset all progress to 0. Your study time will not be logged. Are you sure?`}
        confirmButtonText="Reset & Apply"
      />
    </>
  )
}

export default PomodoroSettingsModal
