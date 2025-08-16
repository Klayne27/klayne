export const renderHourBadge = (badges) => {
  if (badges?.includes("three-hundred-hour-master")) {
    return <img src="/badge-hrs-300.png" className="size-5" />
  }
  if (badges?.includes("centurion-scholar")) {
    return <img src="/badge-hrs-100.png" className="size-5" />
  }
  if (badges?.includes("twentyfive-hour-scholar")) {
    return <img src="/badge-hrs-25.png" className="size-5" />
  }
  return null
}

export const renderSessionBadge = (badges) => {
  if (badges?.includes("session-master")) {
    return <img src="/badge-sessions-150.png" className="size-5" />
  }
  if (badges?.includes("fifty-sessions-pro")) {
    return <img src="/badge-sessions-50.png" className="size-5" />
  }
  if (badges?.includes("ten-sessions-achiever")) {
    return <img src="/badge-sessions-10.png" className="size-5" />
  }
  return null
}

export const renderStreakBadge = (badges) => {
  if (badges?.includes("thirty-day-streak")) {
    return <img src="/badge-streak-30.png" className="size-5" />
  }
  if (badges?.includes("fourteen-day-streak")) {
    return <img src="/badge-streak-14.png" className="size-5" />
  }
  if (badges?.includes("seven-day-streak")) {
    return <img src="/badge-streak-7.png" className="size-5" />
  }
  return null
}
