import Comment from "../../models/comment.model.js";
import LevelUp from "../../models/levelup.model.js";
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
            preferredBadge: 1,
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
                  preferredBadge: 1,
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

export const getPublicIdFromUrl = (url) => {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.(?:jpe?g|png|gif|webp|mp4)/);
  return match && match[1] ? match[1] : null;
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
      return "You have a new notification on Klayne!";
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

export const generateRandomString = (length) => {
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

export const checkAndAwardBadges = async (user) => {
  const newBadges = [];
  const existingBadges = new Set(user.badges);

  // Study Duration Badges
  if (user.totalStudyDuration >= 1500 && !existingBadges.has("twentyfive-hour-scholar")) {
    newBadges.push("twentyfive-hour-scholar");
  }
  if (user.totalStudyDuration >= 6000 && !existingBadges.has("onehundred-hour-scholar")) {
    newBadges.push("onehundred-hour-scholar");
  }
  if (
    user.totalStudyDuration >= 18000 &&
    !existingBadges.has("three-hundred-hour-master")
  ) {
    newBadges.push("three-hundred-hour-master");
  }

  // Session Completion Badges
  if (user.totalSessionsCompleted >= 10 && !existingBadges.has("ten-sessions-achiever")) {
    newBadges.push("ten-sessions-achiever");
  }
  if (user.totalSessionsCompleted >= 50 && !existingBadges.has("fifty-sessions-pro")) {
    newBadges.push("fifty-sessions-pro");
  }
  if (user.totalSessionsCompleted >= 150 && !existingBadges.has("session-master")) {
    newBadges.push("session-master");
  }

  // Study Streak Badges
  if (user.studyStreak >= 7 && !existingBadges.has("seven-day-streak")) {
    newBadges.push("seven-day-streak");
  }
  if (user.studyStreak >= 14 && !existingBadges.has("fourteen-day-streak")) {
    newBadges.push("fourteen-day-streak");
  }
  if (user.studyStreak >= 30 && !existingBadges.has("thirty-day-streak")) {
    newBadges.push("thirty-day-streak");
  }

  if (newBadges.length > 0) {
    user.badges = [...new Set([...user.badges, ...newBadges])];
    await user.save();
  }
};

export const xpForLevel = (level) => {
  if (level <= 1) {
    return 500;
  }
  return Math.floor(300 + level * 200 + Math.pow(level - 1, 1.3) * 100);
};

export const handleXPAndLeveling = async (user, duration) => {
  let xpGained;
  if (duration >= 120) {
    xpGained = duration * 20; // 20 XP for sessions 2 hours (120 duration) or more
  } else if (duration >= 60) {
    xpGained = duration * 15; // 15 XP for sessions over 60 duration
  } else {
    xpGained = duration * 10; // 10 XP for all other sessions
  }
  const initialLevel = user.pomodoroLevel;

  user.pomodoroXP += xpGained;
  let levelsGained = [];

  // Check for level up. Loop in case of multiple level ups from one session.
  let xpNeededForCurrentLevel = xpForLevel(user.pomodoroLevel + 1); // XP needed for NEXT level

  while (user.pomodoroXP >= xpNeededForCurrentLevel) {
    // Subtract the XP needed for this level up
    user.pomodoroXP -= xpNeededForCurrentLevel;

    // Increment the user's level
    user.pomodoroLevel += 1;
    levelsGained.push(user.pomodoroLevel);

    // Create a record of the level up event for the activity feed
    await LevelUp.create({
      user: user._id,
      newLevel: user.pomodoroLevel,
    });

    // Get the XP needed for the next level
    xpNeededForCurrentLevel = xpForLevel(user.pomodoroLevel + 1);
  }

  await user.save();

  return {
    xpGained,
    levelsGained,
    finalLevel: user.pomodoroLevel,
    finalXP: user.pomodoroXP,
    xpNeededForNext: xpNeededForCurrentLevel,
  };
};