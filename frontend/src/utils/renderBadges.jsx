export const renderHourBadge = (badges) => {
  if (badges.includes("three-hundred-hour-master")) {
    return <img src="/three-hundred-hour-master.png" className="size-5" />
  }
  if (badges.includes("centurion-scholar")) {
    return <img src="/onehundred-hour-scholar.png" className="size-5" />
  }
  if (badges.includes("twentyfive-hour-scholar")) {
    return <img src="/twentyfive-hour-scholar.png" className="size-5" />
  }
  return null
}
