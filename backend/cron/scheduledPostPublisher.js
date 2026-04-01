import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";

export const publishScheduledPosts = async (io, onlineUsersMap) => {
  try {
    const now = new Date();
    const postsToPublish = await Post.find({
      isScheduled: true,
      scheduledAt: { $lte: now },
    }).populate("user", "-password");

    if (postsToPublish.length === 0) {
      return;
    }

    const postsToUpdate = [];
    const usersToUpdate = {};
    const notificationsToCreate = [];

    for (const post of postsToPublish) {
      postsToUpdate.push({
        updateOne: {
          filter: { _id: post._id },
          update: {
            $set: {
              isScheduled: false,
              scheduledAt: null,
              publishedAt: new Date(),
            },
          },
        },
      });

      if (!usersToUpdate[post.user._id]) {
        usersToUpdate[post.user._id] = 0;
      }
      usersToUpdate[post.user._id] += 1;

      if (post.mentionedUsers && post.mentionedUsers.length > 0) {
        for (const mentionedUserId of post.mentionedUsers) {
          if (mentionedUserId.toString() !== post.user._id.toString()) {
            notificationsToCreate.push({
              from: post.user._id,
              to: mentionedUserId,
              type: "mention",
              postId: post._id,
            });
          }
        }
      }
    }

    await Post.bulkWrite(postsToUpdate);

    const userUpdateOps = Object.keys(usersToUpdate).map((userId) => ({
      updateOne: {
        filter: { _id: userId },
        update: { $inc: { postsCount: usersToUpdate[userId] } },
      },
    }));
    await User.bulkWrite(userUpdateOps);

    if (notificationsToCreate.length > 0) {
      await Notification.insertMany(notificationsToCreate);
    }

    // This part can still be a bottleneck if there are many online users.
    if (onlineUsersMap && io) {
      for (const post of postsToPublish) {
        for (const [onlineUserId, socketIdsSet] of onlineUsersMap.entries()) {
          if (onlineUserId.toString() !== post.user._id.toString()) {
            socketIdsSet.forEach((socketId) => {
              io.to(socketId).emit("newPostCount", post);
            });
          }
        }
      }
    }

    console.log(`Published ${postsToPublish.length} scheduled posts.`);
  } catch (error) {
    console.error("Error publishing scheduled posts:", error);
  }
};
