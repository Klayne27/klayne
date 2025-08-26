import { formatDate } from "../../utils/date";

const DateSeparator = ({ date }) => (
  <div className="flex items-center mb-6 mt-7">
    <div className="flex-grow border-t border-gray-700"></div>
    <div className="px-2 text-slate-400 text-xs flex-shrink-0">{formatDate(date)}</div>
    <div className="flex-grow border-t border-gray-700"></div>
  </div>
);

export default DateSeparator;
