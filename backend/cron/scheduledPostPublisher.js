// cron/scheduledPostPublisher.js

import Post from "../models/post.model.js";
import User from "../models/user.model.js";

export const publishScheduledPosts = async (io, onlineUsersMap) => {
  try {
    const now = new Date();
    // Find posts that are scheduled, not yet published, and whose scheduledAt time is in the past or now
    const postsToPublish = await Post.find({
      isScheduled: true,
      scheduledAt: { $lte: now },
    }).populate("user", "-password"); // Populate user to get necessary info for notifications/feed

    if (postsToPublish.length === 0) {
      // console.log("No scheduled posts to publish at this time.");
      return;
    }

    // console.log(`Publishing ${postsToPublish.length} scheduled posts...`);

    for (const post of postsToPublish) {
      // Mark as not scheduled
      post.isScheduled = false;
      post.scheduledAt = null;
      post.publishedAt = new Date(); // <--- ADDED THIS LINE

      // Increment user's postsCount
      await User.findByIdAndUpdate(post.user._id, { $inc: { postsCount: 1 } });

      // Handle mentions for the newly published post
      if (post.mentionedUsers && post.mentionedUsers.length > 0) {
        for (const mentionedUserId of post.mentionedUsers) {
          if (mentionedUserId.toString() !== post.user._id.toString()) {
            await createAndSendNotification({
              from: post.user._id,
              to: mentionedUserId,
              type: "mention",
              postId: post._id,
            });
          }
        }
      }

      await post.save();
      // console.log(
      //   `Successfully published and saved post ${post._id}. New publishedAt: ${post.publishedAt}, isScheduled: ${post.isScheduled}`
      // );


      // Emit new post event to online users (excluding the post creator for their own feed)
      // This is similar to what you do in createPost
      if (onlineUsersMap && io) {
        for (const [onlineUserId, socketIdsSet] of onlineUsersMap.entries()) {
          if (onlineUserId.toString() !== post.user._id.toString()) {
            socketIdsSet.forEach((socketId) => {
              io.to(socketId).emit("newPostAvailable", post);
            });
          }
        }
      }
      // console.log(`Published scheduled post: ${post._id}`);
    }
  } catch (error) {
    console.error("Error publishing scheduled posts:", error);
  }
};
