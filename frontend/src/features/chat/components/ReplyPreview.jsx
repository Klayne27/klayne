import { renderClickableText } from "../../../utils/textUtils";
import { truncateText } from "../../../utils/truncateText";

const ReplyPreview = ({
  repliedTo,
  isSentByCurrentUser,
  onJumpToOriginalMessage,
}) => {
  const replyClasses = isSentByCurrentUser
    ? "border-gray-600 bg-blue-300 bg-opacity-30 border-l-4"
    : "border-blue-300 bg-gray-950 bg-opacity-30 border-r-4";

  const textClasses = isSentByCurrentUser ? "text-gray-600" : "text-gray-300";

  return (
    <div
      className={`mb-2 p-2 rounded-md text-xs border flex flex-col cursor-pointer transition-colors duration-200 hover:border-blue-400 hover:bg-opacity-40 ${replyClasses}`}
      onClick={(e) => {
        e.stopPropagation();
        onJumpToOriginalMessage(repliedTo._id);
      }}
    >
      <span className={`font-bold ${textClasses}`}>Replying to:</span>
      {repliedTo.text && (
        <span className={`font-bold truncate ${textClasses} mt-1 italic`}>
          {renderClickableText(truncateText(repliedTo.text, 20))}
        </span>
      )}
      {repliedTo.img && (
        <img
          src={repliedTo.img}
          alt="replied message attachment"
          className="mt-1 rounded-md max-w-[100px] max-h-[100px] object-cover"
        />
      )}
    </div>
  );
};

export default ReplyPreview;
