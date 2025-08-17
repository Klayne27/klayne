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

import mongoose from "mongoose";

/**
 * Builds the common query stages for filtering posts.
 * @param {string} userId - The ID of the current user.
 * @param {Array<string>} blockedAndBlockingIds - An array of user IDs that have blocked or are blocked by the current user.
 * @returns {object} An object containing common aggregation stages.
 */
export const buildCommonPostQueryStages = (userId, blockedAndBlockingIds) => {
  const now = new Date();
  const blockedObjectIds = blockedAndBlockingIds.map(
    (id) => new mongoose.Types.ObjectId(id)
  );

  // Stage to filter out posts from blocked users and posts not yet published
  const initialMatch = {
    $match: {
      user: { $nin: blockedObjectIds },
      "deletedFor.user": { $ne: new mongoose.Types.ObjectId(userId) },
      $or: [{ isScheduled: { $ne: true } }, { scheduledAt: { $lte: now } }],
    },
  };

  // Stage to populate the user data
  const userLookup = {
    $lookup: {
      from: "users",
      localField: "user",
      foreignField: "_id",
      as: "user",
      pipeline: [
        {
          $project: {
            username: 1,
            fullName: 1,
            profileImg: 1,
            isVerified: 1,
            isGoldVerified: 1,
            badges: 1,
          },
        },
      ],
    },
  };

  // Stage to populate the reposted post data and its user
  const repostLookup = {
    $lookup: {
      from: "posts",
      localField: "repostedFrom",
      foreignField: "_id",
      as: "repostedFrom",
      pipeline: [
        // Match only valid reposts
        {
          $match: {
            user: { $nin: blockedObjectIds },
            $or: [{ isScheduled: { $ne: true } }, { scheduledAt: { $lte: now } }],
          },
        },
        // Populate the original post's author
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
            pipeline: [
              {
                $project: {
                  username: 1,
                  fullName: 1,
                  profileImg: 1,
                  isVerified: 1,
                  isGoldVerified: 1,
                  badges: 1,
                },
              },
            ],
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        // Ensure we don't populate reposts of reposts
        { $match: { repostedFrom: { $exists: false } } },
      ],
    },
  };

  // Final filter to ensure a repost has a valid (non-blocked, non-deleted) original post
  const finalMatch = {
    $match: {
      $or: [
        { repostedFrom: { $eq: [] } }, // It's not a repost
        { "repostedFrom.user": { $ne: null } }, // It's a valid repost with a user
      ],
    },
  };

  return { initialMatch, userLookup, repostLookup, finalMatch };
};

export const getDynamicPushBody = (type, username) => {
  switch (type) {
    case "follow":
      return `@${username} is now following you.`;
    case "like":
      return `@${username} liked your post.`;
    case "comment":
      return `@${username} commented on your post.`;
    case "repost":
      return `@${username} reposted your post.`;
    case "commentLike":
      return `@${username} liked your comment.`;
    case "commentReply":
      return `@${username} replied to your comment.`;
    case "mention":
      return `@${username} mentioned you in a post.`;
    default:
      return "You have a new notification on X-ayne!";
  }
};

export const getDynamicPushTitle = (type) => {
  switch (type) {
    case "follow":
      return `New Follower`;
    case "mention":
      return "New Mention";
    default:
      return "New Notification";
  }
};

export const getDynamicPushUrl = (type, postOwnerUsername, postId, username) => {
  switch (type) {
    case "follow":
      return `/profile/${username}`;
    default:
      return `/${postOwnerUsername}/post/${postId}`;
  }
};

export const transformCloudinaryUrl = (url, width, height) => {
  if (!url) return null;
  const parts = url.split("/upload/");
  if (parts.length !== 2) return url;
  return `${parts[0]}/upload/w_${width},h_${height},c_fill,g_face,f_png/${parts[1]}`;
};