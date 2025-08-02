import Post from "../models/post.model.js";
import User from "../models/user.model.js";

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


    for (const post of postsToPublish) {
      post.isScheduled = false;
      post.scheduledAt = null;
      post.publishedAt = new Date();

      await User.findByIdAndUpdate(post.user._id, { $inc: { postsCount: 1 } });

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
      if (onlineUsersMap && io) {
        for (const [onlineUserId, socketIdsSet] of onlineUsersMap.entries()) {
          if (onlineUserId.toString() !== post.user._id.toString()) {
            socketIdsSet.forEach((socketId) => {
              io.to(socketId).emit("newPostCount", post);
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
