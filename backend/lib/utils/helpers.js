import Comment from "../../models/comment.model.js";
import Notification from "../../models/notification.model.js";
import User from "../../models/user.model.js";

export const getBlockingUsers = async (userId) => {
  if (!userId) {
    return { blockedByMe: [], blockedMe: [] };
  }
  const user = await User.findById(userId).select("blockedUsers blockedBy").lean();
  return {
    blockedByMe: user.blockedUsers?.map((id) => id.toString()) || [],
    blockedMe: user.blockedBy?.map((id) => id.toString()) || [],
  };
};

export const extractAndValidateMentions = async (text) => {
  const mentionRegex = /@([a-zA-Z0-9_]{1,30})\b/g;
  let match;
  const mentionedUsernames = new Set(); // Use a Set to avoid duplicate usernames

  while ((match = mentionRegex.exec(text)) !== null) {
    mentionedUsernames.add(match[1].toLowerCase()); // Store in lowercase for case-insensitive lookup
  }

  const mentionedUsersIds = [];
  if (mentionedUsernames.size > 0) {
    const users = await User.find({
      username: { $in: Array.from(mentionedUsernames) },
    }).select("_id username"); // Select only ID and username

    users.forEach((user) => mentionedUsersIds.push(user._id));
  }
  return mentionedUsersIds;
};

export async function deleteAllChildComments(commentId) {
  let deletedCount = 0;
  const commentsToDeleteQueue = [commentId];

  while (commentsToDeleteQueue.length > 0) {
    const currentCommentId = commentsToDeleteQueue.shift();

    const directReplies = await Comment.find({ parentComment: currentCommentId }).select(
      "_id"
    );

    directReplies.forEach((reply) => commentsToDeleteQueue.push(reply._id));

    const deleteResult = await Comment.deleteOne({ _id: currentCommentId });
    if (deleteResult.deletedCount > 0) {
      deletedCount++;
      await Notification.deleteMany({
        $or: [{ commentId: currentCommentId }, { parentCommentId: currentCommentId }],
      });
    }
  }
  return deletedCount;
}