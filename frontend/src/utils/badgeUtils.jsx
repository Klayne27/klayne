import { FaBullseye, FaFire, FaMedal, FaRegStar, FaStar, FaTrophy } from "react-icons/fa6"
import { GiLaurelsTrophy, GiSevenPointedStar } from "react-icons/gi"
import { MdGridOn } from "react-icons/md"

export const badgeTiers = {
  "ten-sessions-achiever": { tier: 1, category: "session", displayName: "10 Sessions Achiever" },
  "fifty-sessions-pro": { tier: 2, category: "session", displayName: "50 Sessions Pro" },
  "session-master": { tier: 3, category: "session", displayName: "Session Master" },
  "twentyfive-hour-scholar": { tier: 1, category: "hour", displayName: "25 Hour Scholar" },
  "onehundred-hour-scholar": { tier: 2, category: "hour", displayName: "100 Hour Scholar" },
  "three-hundred-hour-master": { tier: 3, category: "hour", displayName: "300 Hour Master" },
  "seven-day-streak": { tier: 1, category: "streak", displayName: "7 Day Streak" },
  "fourteen-day-streak": { tier: 2, category: "streak", displayName: "14 Day Streak" },
  "thirty-day-streak": { tier: 3, category: "streak", displayName: "30 Day Streak" },
  "august-2025-1st": { tier: 3, category: "trophy", displayName: "1st - August 2025" },
  "august-2025-2nd": { tier: 3, category: "trophy", displayName: "2nd - August 2025" },
  "august-2025-3rd": { tier: 3, category: "trophy", displayName: "3rd - August 2025" },
  "wordle-first-try": { tier: 3, category: "wordle", displayName: "Wordle Ace" },
  "wordle-sixth-sense": { tier: 2, category: "wordle", displayName: "Sixth Sense" },
  "wordle-clean-solve": { tier: 2, category: "wordle", displayName: "Clean Solve" },
  "wordle-3-streak": { tier: 1, category: "wordle", displayName: "Spark Streak" },
  "wordle-7-streak": { tier: 2, category: "wordle", displayName: "Week Sharp" },
  "wordle-14-streak": { tier: 3, category: "wordle", displayName: "Fortnight Focus" },
  "wordle-10-solves": { tier: 1, category: "wordle", displayName: "Ten Solves" },
  "wordle-25-solves": { tier: 2, category: "wordle", displayName: "Quarter Century" },
  "wordle-50-solves": { tier: 3, category: "wordle", displayName: "Grid Veteran" },
  "wordle-100-solves": { tier: 3, category: "wordle", displayName: "Wordle Centurion" },
}

export const getBadgeIcon = (badgeName) => {
  switch (badgeName) {
    case "twentyfive-hour-scholar":
      return (
        <img
          src="/badge-hrs-25.png"
          alt="25 Hour Scholar"
          className="size-[17px] flex-shrink-0"
          title="25 hour badge"
        />
      )
    case "onehundred-hour-scholar":
      return (
        <img
          src="/badge-hrs-100.png"
          alt="100 Hour Scholar"
          className="size-[17px] flex-shrink-0"
          title="100 hour badge"
        />
      )
    case "three-hundred-hour-master":
      return (
        <img
          src="/badge-hrs-300.png"
          alt="300 Hour Master"
          className="size-[17px] flex-shrink-0"
          title="300 hour badge"
        />
      )
    case "ten-sessions-achiever":
      return (
        <img
          src="/badge-sessions-10.png"
          alt="10 Sessions Achiever"
          className="size-[17px] flex-shrink-0"
          title="10 sessions badge"
        />
      )
    case "fifty-sessions-pro":
      return (
        <img
          src="/badge-sessions-50.png"
          alt="50 Sessions Pro"
          className="size-[17px] flex-shrink-0"
          title="50 sessions badge"
        />
      )
    case "session-master":
      return (
        <img
          src="/badge-sessions-150.png"
          alt="Session Master"
          className="size-[17px] flex-shrink-0"
          title="150 sessions badge"
        />
      )
    case "seven-day-streak":
      return (
        <img
          src="/badge-streak-7.png"
          alt="7 Day Streak"
          className="size-[17px] flex-shrink-0"
          title="7 Day Streak badge"
        />
      )
    case "fourteen-day-streak":
      return (
        <img
          src="/badge-streak-14.png"
          alt="14 Day Streak"
          className="size-[17px] flex-shrink-0"
          title="14 Day Streak badge"
        />
      )
    case "thirty-day-streak":
      return (
        <img
          src="/badge-streak-30.png"
          alt="30 Day Streak"
          className="size-[17px] flex-shrink-0"
          title="30 Day Streak badge"
        />
      )
    case "august-2025-1st":
      return (
        <img
          src="/badge-august2025-1st.png"
          alt="August 2025 1st"
          className="size-[17px] flex-shrink-0"
          title="1st place trophy - August 2025"
        />
      )
    case "august-2025-2nd":
      return (
        <img
          src="/badge-august2025-2nd.png"
          alt="August 2025 2nd"
          className="size-[17px] flex-shrink-0"
          title="2nd place trophy - August 2025"
        />
      )
    case "august-2025-3rd":
      return (
        <img
          src="/badge-august2025-3rd.png"
          alt="August 2025 3rd"
          className="size-[17px] flex-shrink-0"
          title="3rd place trophy - August 2025"
        />
      )
    case "wordle-first-try":
      return <FaStar className="size-[17px] flex-shrink-0 text-amber-300" title="Wordle Ace" />
    case "wordle-sixth-sense":
      return <GiSevenPointedStar className="size-[17px] flex-shrink-0 text-violet-400" title="Sixth Sense" />
    case "wordle-clean-solve":
      return <FaBullseye className="size-[17px] flex-shrink-0 text-emerald-400" title="Clean Solve" />
    case "wordle-3-streak":
      return <FaFire className="size-[17px] flex-shrink-0 text-orange-400" title="Spark Streak" />
    case "wordle-7-streak":
      return <FaFire className="size-[17px] flex-shrink-0 text-red-400" title="Week Sharp" />
    case "wordle-14-streak":
      return <FaFire className="size-[17px] flex-shrink-0 text-cyan-300" title="Fortnight Focus" />
    case "wordle-10-solves":
      return <MdGridOn className="size-[17px] flex-shrink-0 text-lime-400" title="Ten Solves" />
    case "wordle-25-solves":
      return <FaMedal className="size-[17px] flex-shrink-0 text-slate-300" title="Quarter Century" />
    case "wordle-50-solves":
      return <FaTrophy className="size-[17px] flex-shrink-0 text-yellow-400" title="Grid Veteran" />
    case "wordle-100-solves":
      return <GiLaurelsTrophy className="size-[17px] flex-shrink-0 text-sky-300" title="Wordle Centurion" />
    default:
      return null
  }
}

export const getBadgeIconDisplay = (badgeName) => {
  switch (badgeName) {
    case "twentyfive-hour-scholar":
      return <img src="/badge-hrs-25.png" alt="25 Hour Scholar" className="size-full" />
    case "onehundred-hour-scholar":
      return <img src="/badge-hrs-100.png" alt="100 Hour Scholar" className="size-full" />
    case "three-hundred-hour-master":
      return <img src="/badge-hrs-300.png" alt="300 Hour Master" className="size-full" />
    case "ten-sessions-achiever":
      return <img src="/badge-sessions-10.png" alt="10 Sessions Achiever" className="size-full" />
    case "fifty-sessions-pro":
      return <img src="/badge-sessions-50.png" alt="50 Sessions Pro" className="size-full" />
    case "session-master":
      return <img src="/badge-sessions-150.png" alt="Session Master" className="size-full" />
    case "seven-day-streak":
      return <img src="/badge-streak-7.png" alt="7 Day Streak" className="size-full" />
    case "fourteen-day-streak":
      return <img src="/badge-streak-14.png" alt="14 Day Streak" className="size-full" />
    case "thirty-day-streak":
      return <img src="/badge-streak-30.png" alt="30 Day Streak" className="size-full" />
    case "august-2025-1st":
      return <img src="/badge-august2025-1st.png" alt="August 2025 1st" className="size-full" />
    case "august-2025-2nd":
      return <img src="/badge-august2025-2nd.png" alt="August 2025 2nd" className="size-full" />
    case "august-2025-3rd":
      return <img src="/badge-august2025-3rd.png" alt="August 2025 3rd" className="size-full" />
    case "wordle-first-try":
      return <FaStar className="size-full text-amber-300" />
    case "wordle-sixth-sense":
      return <GiSevenPointedStar className="size-full text-violet-400" />
    case "wordle-clean-solve":
      return <FaBullseye className="size-full text-emerald-400" />
    case "wordle-3-streak":
      return <FaFire className="size-full text-orange-400" />
    case "wordle-7-streak":
      return <FaFire className="size-full text-red-400" />
    case "wordle-14-streak":
      return <FaFire className="size-full text-cyan-300" />
    case "wordle-10-solves":
      return <MdGridOn className="size-full text-lime-400" />
    case "wordle-25-solves":
      return <FaMedal className="size-full text-slate-300" />
    case "wordle-50-solves":
      return <FaTrophy className="size-full text-yellow-400" />
    case "wordle-100-solves":
      return <GiLaurelsTrophy className="size-full text-sky-300" />
    default:
      return null
  }
}
