import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import LoadingSpinner from "../../components/common/LoadingSpinner"
import { showAppToast } from "../../utils/showAppToast"
import { useUpdatePomodoroSettings } from "../../features/pomodoro/pomodoroHooks/usePomodoroMutations"
import { useGetPomodoroSettings } from "../../features/pomodoro/pomodoroHooks/usePomodoroQueries"
import { usePomodoroTimerStore } from "../../store/usePomodoroTimerStore"
import ConfirmationModal from "../../components/common/ConfirmationModal"

function PomodoroSettingsPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(null)
  const [showDurationWarning, setShowDurationWarning] = useState(false)
  const [pendingSettings, setPendingSettings] = useState(null)

  const { settings: initialSettings, isSettingsLoading: isLoading } = useGetPomodoroSettings()
  const { updateSettings, isUpdatingSettings } = useUpdatePomodoroSettings()

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
    if (initialSettings) setSettings(initialSettings)
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

  navigate?.(-1)
  showAppToast("Settings updated!", "success")
}

  const handleSubmit = (e) => {
    e.preventDefault()

    if (hasSessionStarted && settings.sessionDuration !== initialSettings.sessionDuration) {
      setPendingSettings(settings)
      setShowDurationWarning(true)
      return
    }

    commitSettings(settings)
  }

  // const commitSettings = (s) => {
  //   updateSettings(s)
  //   navigate(-1)
  //   showAppToast("Settings updated!", "success")
  // }

  const handleConfirmReset = () => {
    updateSettings(pendingSettings)

    setIsActive(false)
    setTimer(pendingSettings.sessionDuration * 60)
    setIsBreak(false)
    setSessionCount(0)
    setIsGoalReached(false)
    persistReset()

    setShowDurationWarning(false)
    setPendingSettings(null)
    navigate(-1)
    showAppToast("Settings updated. Session reset.", "success")
  }

  const handleCancelReset = () => {
    setSettings((prev) => ({ ...prev, sessionDuration: initialSettings.sessionDuration }))
    setShowDurationWarning(false)
    setPendingSettings(null)
  }

  if (isLoading || !settings) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <>
      <div className="template flex min-h-screen items-center justify-center bg-base-100 p-4 sm:p-6">
        <div className="mx-auto w-full max-w-lg">
          <h3 className="mb-6 text-2xl font-bold">Pomodoro Settings</h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 py-4">
            <div className="form-control">
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

      <ConfirmationModal
        isOpen={showDurationWarning}
        onClose={handleCancelReset}
        onConfirm={handleConfirmReset}
        danger
        modalTitle="Reset session?"
        message="Changing the session duration while a session is active will stop your current session and reset all progress to 0. Your study time will not be logged. Are you sure?"
        confirmButtonText="Reset & Apply"
      />
    </>
  )
}

export default PomodoroSettingsPage
