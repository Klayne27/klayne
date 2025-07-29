import Post from "../models/post.model.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";

import {
  createAndSendNotification,
  emitUnreadNotificationStatus,
  io,
  onlineUsersMap,
} from "../lib/socket.js";

const extractAndValidateMentions = async (text) => {
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

const getBlockingUsers = async (userId) => {
  if (!userId) {
    return { blockedByMe: [], blockedMe: [] };
  }
  const user = await User.findById(userId).select("blockedUsers blockedBy").lean();
  return {
    blockedByMe: user.blockedUsers?.map((id) => id.toString()) || [],
    blockedMe: user.blockedBy?.map((id) => id.toString()) || [],
  };
};

const isBlockedOrBlockedBy = async (currentUserId, targetUserId) => {
  if (!currentUserId || !targetUserId) return false;
  if (currentUserId.toString() === targetUserId.toString()) return false;

  const currentUser = await User.findById(currentUserId).select("blockedUsers blockedBy");
  const targetUser = await User.findById(targetUserId).select("blockedUsers blockedBy");

  if (!currentUser || !targetUser) return false;

  return (
    currentUser.blockedUsers.includes(targetUserId) ||
    targetUser.blockedUsers.includes(currentUserId)
  );
};

export const createPost = async (req, res) => {
  try {
    const { text, pollOptions, scheduledAt } = req.body;
    let { img, video } = req.body;

    const userId = req.user._id.toString();

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (video) {
      if (!user.isVerified && !user.isGoldVerified) {
        return res.status(403).json({
          error: "Only verified users can post videos.",
        });
      }
    }

    if (!text && !img && !video && (!pollOptions || pollOptions.length === 0)) {
      return res
        .status(400)
        .json({ error: "Post must have text, image, video, or poll options." });
    }

    if ((img || video) && pollOptions && pollOptions.length > 0) {
      return res
        .status(400)
        .json({ error: "You cannot post a poll with an image or video." });
    }

    let uploadedImgUrl = null;
    let uploadedVideoUrl = null;
    let imgPublicId = null;
    let videoPublicId = null;
    let mediaType = "none";

    if (img) {
      const uploadedResponse = await cloudinary.uploader.upload(img);
      uploadedImgUrl = uploadedResponse.secure_url;
      imgPublicId = uploadedResponse.public_id;
      mediaType = "image";
    } else if (video) {
      const uploadedResponse = await cloudinary.uploader.upload(video, {
        resource_type: "video",
      });
      uploadedVideoUrl = uploadedResponse.secure_url;
      videoPublicId = uploadedResponse.public_id;
      mediaType = "video";
    }

    const mentionedUsersIds = await extractAndValidateMentions(text);

    const isScheduled = !!scheduledAt; // Convert to boolean
    const newPostData = {
      user: userId,
      text,
      commentsCount: 0,
      mentionedUsers: mentionedUsersIds,
      isScheduled,
      scheduledAt: isScheduled ? new Date(scheduledAt) : null,
      publishedAt: new Date(), // <--- ADD THIS LINE FOR IMMEDIATE POSTS
    };

    if (pollOptions && pollOptions.length > 0) {
      if (pollOptions.length < 2) {
        return res.status(400).json({ error: "A poll must have at least two options." });
      }
      const validPollOptions = pollOptions.map((option) => {
        if (!option.text || option.text.trim() === "") {
          throw new Error("Poll options cannot be empty.");
        }
        return { text: option.text.trim(), voters: [] };
      });

      newPostData.pollOptions = validPollOptions;
      newPostData.pollTotalVotes = 0;
      newPostData.img = null;
      newPostData.video = null;
      newPostData.imgPublicId = null;
      newPostData.videoPublicId = null;
      newPostData.mediaType = "none";
    } else {
      newPostData.img = uploadedImgUrl;
      newPostData.video = uploadedVideoUrl;
      newPostData.imgPublicId = imgPublicId;
      newPostData.videoPublicId = videoPublicId;
      newPostData.mediaType = mediaType;
    }

    const newPost = new Post(newPostData);
    await newPost.save();

    if (!newPost.isScheduled) {
      await User.findByIdAndUpdate(userId, { $inc: { postsCount: 1 } });

      for (const mentionedUserId of mentionedUsersIds) {
        if (mentionedUserId.toString() !== userId.toString()) {
          await createAndSendNotification({
            from: userId,
            to: mentionedUserId,
            type: "mention",
            postId: newPost._id,
          });
        }
      }

      // Check if onlineUsersMap and io are defined before using
      if (onlineUsersMap && io) {
        for (const [onlineUserId, socketIdsSet] of onlineUsersMap.entries()) {
          if (onlineUserId.toString() !== userId.toString()) {
            socketIdsSet.forEach((socketId) => {
              io.to(socketId).emit("newPostAvailable", newPost);
            });
          }
        }
      }
    } else {
      console.log(`Post scheduled for ${newPost.scheduledAt}`);
    }

    res.status(201).json(newPost);
  } catch (error) {
    if (error.message.includes("Poll options cannot be empty.")) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in createPost controller: ", error);
  }
};

export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const postToDelete = await Post.findById(id);

    if (!postToDelete) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (!postToDelete.user.equals(userId)) {
      return res
        .status(401)
        .json({ error: "You are not authorized to delete this post" });
    }

    // Case 1: Deleting an ORIGINAL post
    if (!postToDelete.repostedFrom) {
      if (postToDelete.imgPublicId) {
        await cloudinary.uploader.destroy(postToDelete.imgPublicId);
      }
      if (postToDelete.videoPublicId) {
        await cloudinary.uploader.destroy(postToDelete.videoPublicId, {
          resource_type: "video",
        });
      }
      await Post.deleteMany({ repostedFrom: postToDelete._id });
      await Post.deleteOne({ _id: id });
      // You may want to update user's post count here as well
    }
    // Case 2: Deleting a REPOST
    else {
      // Update the original post's metadata
      await Post.updateOne(
        { _id: postToDelete.repostedFrom },
        {
          $inc: { repostsCount: -1 },
          $pull: { repostedBy: userId }, // Remove user from the 'repostedBy' array
        }
      );
      // Delete the actual repost document
      await Post.deleteOne({ _id: id });
    }

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error in deletePost controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const likeUnlikePost = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id: postId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const postOwnerId = post.user.toString();
    if (await isBlockedOrBlockedBy(userId, postOwnerId)) {
      return res.status(403).json({
        error: "You cannot like/unlike this post due to blocking restrictions.",
      });
    }

    const userLikedPost = post.likes.includes(userId);

    if (userLikedPost) {
      // Unlike post
      await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
      await User.updateOne({ _id: userId }, { $pull: { likedPosts: postId } });

      const updatedLikes = post.likes.filter((id) => id.toString() !== userId.toString());
      res.status(200).json(updatedLikes);
    } else {
      // Like post
      post.likes.push(userId);
      await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } });
      await post.save();

      if (
        post.user.toString() !== userId.toString() &&
        !(await isBlockedOrBlockedBy(userId, post.user))
      ) {
        const notification = new Notification({
          from: userId,
          to: post.user,
          type: "like",
          postId: postId,
          read: false,
        });

        await notification.save();

        await emitUnreadNotificationStatus(post.user.toString());
      }
      res.status(200).json(post.likes);
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in likeUnlikePost controller: ", error);
  }
};

// export const getAllPosts = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 15; // <--- Match frontend limit
//     const skip = (page - 1) * limit;

//     const userId = req.user?._id;

//     const { blockedByMe, blockedMe } = await getBlockingUsers(userId);

//     const blockedAndBlockingObjectIds = [
//       ...new Set([
//         ...blockedByMe.map((id) => new mongoose.Types.ObjectId(id)),
//         ...blockedMe.map((id) => new mongoose.Types.ObjectId(id)),
//       ]),
//     ];

//     const matchConditions = {
//       $and: [
//         { "deletedFor.user": { $ne: userId } },
//         // --- MODIFIED SCHEDULED LOGIC START ---
//         {
//           $or: [
//             // If it's not explicitly scheduled (isScheduled is false or missing)
//             { isScheduled: { $ne: true } },
//             // OR if it is scheduled, but the scheduledAt time has passed
//             {
//               $and: [
//                 { isScheduled: true },
//                 { scheduledAt: { $ne: null } }, // Ensure scheduledAt is set if isScheduled is true
//                 { scheduledAt: { $lte: new Date() } },
//               ],
//             },
//           ],
//         },
//         // --- MODIFIED SCHEDULED LOGIC END ---
//         {
//           $or: [
//             { user: { $nin: blockedAndBlockingObjectIds } },
//             {
//               $and: [
//                 { repostedFrom: { $ne: null } }, // It's a repost
//                 { user: { $nin: blockedAndBlockingObjectIds } }, // Reposter is not blocked
//                 { "repostedFrom.user": { $nin: blockedAndBlockingObjectIds } },
//                 {
//                   $or: [
//                     { "repostedFrom.isScheduled": { $ne: true } },
//                     {
//                       $and: [
//                         { "repostedFrom.isScheduled": true },
//                         { "repostedFrom.scheduledAt": { $ne: null } },
//                         { "repostedFrom.scheduledAt": { $lte: new Date() } },
//                       ],
//                     },
//                   ],
//                 },
//               ],
//             },
//           ],
//         },
//       ],
//     };

//     // console.log("Final Match Conditions:", JSON.stringify(matchConditions, null, 2)); // Debug match conditions

//     const totalPostsResult = await Post.aggregate([
//       { $match: matchConditions },
//       { $count: "count" },
//     ]);
//     const totalCount = totalPostsResult.length > 0 ? totalPostsResult[0].count : 0;

//     const posts = await Post.aggregate([
//       { $match: matchConditions },
//       { $sort: { publishedAt: -1, createdAt: -1 } },
//       { $skip: skip },
//       { $limit: limit },
//       {
//         $lookup: {
//           from: "users",
//           localField: "user",
//           foreignField: "_id",
//           as: "user",
//           pipeline: [{ $project: { password: 0 } }],
//         },
//       },
//       { $unwind: "$user" },
//       {
//         $lookup: {
//           from: "posts",
//           localField: "repostedFrom",
//           foreignField: "_id",
//           as: "repostedFrom",
//           pipeline: [
//             {
//               $lookup: {
//                 from: "users",
//                 localField: "user",
//                 foreignField: "_id",
//                 as: "user",
//                 pipeline: [{ $project: { password: 0 } }],
//               },
//             },
//             { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
//             {
//               $project: {
//                 text: 1,
//                 img: 1,
//                 video: 1,
//                 mediaType: 1,
//                 likes: 1,
//                 commentsCount: 1,
//                 repostsCount: 1,
//                 repostedBy: 1,
//                 bookmarkedBy: 1,
//                 createdAt: 1,
//                 user: 1,
//                 isScheduled: 1, // <--- Include these for potential client-side use or deeper filtering
//                 scheduledAt: 1, // <--- Include these
//               },
//             },
//           ],
//         },
//       },
//       { $unwind: { path: "$repostedFrom", preserveNullAndEmptyArrays: true } },
//       // { $match: matchConditions },
//       // { $count: "count" },
//     ]);

//     const finalFilteredPosts = posts.filter((post) => {
//       // These client-side filters are fine, but ensure they don't unexpectedly remove posts
//       // If the aggregation query is strong enough, some of these might be redundant.
//       if (post.repostedFrom && post.repostedFrom.repostedFrom) {
//         return false;
//       }
//       if (post.repostedFrom && !post.repostedFrom.user) {
//         return false;
//       }
//       // Add client-side filter for reposts of future scheduled posts, if not fully covered by aggregation
//       if (
//         post.repostedFrom &&
//         post.repostedFrom.isScheduled &&
//         post.repostedFrom.scheduledAt &&
//         new Date(post.repostedFrom.scheduledAt) > new Date()
//       ) {
//         return false;
//       }
//       return true;
//     });

//     const hasNextPage = page * limit < totalCount;

//     res
//       .status(200)
//       .json({ posts: finalFilteredPosts, hasNextPage, totalPosts: totalCount });
//   } catch (error) {
//     res.status(500).json({ error: "Internal server error" });
//     console.log("Error in getAllPosts controller: ", error); // Keep this for server-side debugging
//   }
// };

export const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15; // <--- Match frontend limit
    const skip = (page - 1) * limit;

    const userId = req.user?._id;

    const { blockedByMe, blockedMe } = await getBlockingUsers(userId);

    const blockedAndBlockingObjectIds = [
      ...new Set([
        ...blockedByMe.map((id) => new mongoose.Types.ObjectId(id)),
        ...blockedMe.map((id) => new mongoose.Types.ObjectId(id)),
      ]),
    ];

    const matchConditions = {
      $and: [
        { "deletedFor.user": { $ne: userId } },
        {
          $or: [
            // If it's not explicitly scheduled (isScheduled is false or missing)
            { isScheduled: { $ne: true } },
            // OR if it is scheduled, but the scheduledAt time has passed
            {
              $and: [
                { isScheduled: true },
                { scheduledAt: { $ne: null } }, // Ensure scheduledAt is set if isScheduled is true
                { scheduledAt: { $lte: new Date() } },
              ],
            },
          ],
        },
        // Blocking logic for original posts and reposts
        {
          $and: [
            // Condition for the post's direct author (applies to original posts and reposts' authors)
            { user: { $nin: blockedAndBlockingObjectIds } },
            // Condition for the original post's author, if it's a repost
            {
              $or: [
                { repostedFrom: { $eq: null } }, // Not a repost, so no original author to check
                {
                  "repostedFrom.user": { $nin: blockedAndBlockingObjectIds }, // Original author of reposted content is not blocked
                },
              ],
            },
          ],
        },
        // Prevent reposts of reposts, or reposts of future scheduled posts in the aggregation level
        {
          repostedFrom: { $ne: null } ? { $exists: true } : { $exists: false },
          "repostedFrom.repostedFrom": { $exists: false },
        }, // Ensure no repost of a repost
        {
          $or: [
            { "repostedFrom.isScheduled": { $ne: true } },
            {
              $and: [
                { "repostedFrom.isScheduled": true },
                { "repostedFrom.scheduledAt": { $lte: new Date() } },
              ],
            },
          ],
        },
      ],
    };

    const totalPostsResult = await Post.aggregate([
      // First lookup to get original post data for reposts before applying blocking on original author
      {
        $lookup: {
          from: "posts",
          localField: "repostedFrom",
          foreignField: "_id",
          as: "repostedFromDoc",
        },
      },
      {
        $unwind: { path: "$repostedFromDoc", preserveNullAndEmptyArrays: true },
      },
      {
        $addFields: {
          // If it's a repost, use the original post's user for the blocking check
          // Otherwise, use the post's own user
          userForBlocking: {
            $cond: {
              if: "$repostedFromDoc",
              then: "$repostedFromDoc.user",
              else: "$user",
            },
          },
        },
      },
      {
        $match: {
          $and: [
            { "deletedFor.user": { $ne: userId } },
            // Scheduled post logic for the main post
            {
              $or: [
                { isScheduled: { $ne: true } },
                {
                  $and: [
                    { isScheduled: true },
                    { scheduledAt: { $ne: null } },
                    { scheduledAt: { $lte: new Date() } },
                  ],
                },
              ],
            },
            // Blocking logic for the current post's author (reposter or original author)
            { user: { $nin: blockedAndBlockingObjectIds } },
            // Blocking logic for the *original* author if it's a repost
            {
              $or: [
                { repostedFromDoc: { $eq: null } }, // Not a repost
                { "repostedFromDoc.user": { $nin: blockedAndBlockingObjectIds } }, // Original post's author is not blocked
              ],
            },
            // Also ensure that if it's a repost, the original post isn't a scheduled post for the future
            {
              $or: [
                { repostedFromDoc: { $eq: null } }, // Not a repost
                { "repostedFromDoc.isScheduled": { $ne: true } }, // Original is not scheduled
                {
                  $and: [
                    { "repostedFromDoc.isScheduled": true },
                    { "repostedFromDoc.scheduledAt": { $ne: null } },
                    { "repostedFromDoc.scheduledAt": { $lte: new Date() } }, // Original is scheduled but already published
                  ],
                },
              ],
            },
            // Prevent reposts of reposts at the aggregation level
            { "repostedFromDoc.repostedFrom": { $exists: false } },
          ],
        },
      },
      { $count: "count" },
    ]);
    const totalCount = totalPostsResult.length > 0 ? totalPostsResult[0].count : 0;

    const posts = await Post.aggregate([
      // First lookup to get original post data for reposts before applying blocking on original author
      {
        $lookup: {
          from: "posts",
          localField: "repostedFrom",
          foreignField: "_id",
          as: "repostedFromDoc",
        },
      },
      {
        $unwind: { path: "$repostedFromDoc", preserveNullAndEmptyArrays: true },
      },
      {
        $addFields: {
          userForBlocking: {
            $cond: {
              if: "$repostedFromDoc",
              then: "$repostedFromDoc.user",
              else: "$user",
            },
          },
        },
      },
      {
        $match: {
          $and: [
            { "deletedFor.user": { $ne: userId } },
            // Scheduled post logic for the main post
            {
              $or: [
                { isScheduled: { $ne: true } },
                {
                  $and: [
                    { isScheduled: true },
                    { scheduledAt: { $ne: null } },
                    { scheduledAt: { $lte: new Date() } },
                  ],
                },
              ],
            },
            // Blocking logic for the current post's author (reposter or original author)
            { user: { $nin: blockedAndBlockingObjectIds } },
            // Blocking logic for the *original* author if it's a repost
            {
              $or: [
                { repostedFromDoc: { $eq: null } }, // Not a repost
                { "repostedFromDoc.user": { $nin: blockedAndBlockingObjectIds } }, // Original post's author is not blocked
              ],
            },
            // Also ensure that if it's a repost, the original post isn't a scheduled post for the future
            {
              $or: [
                { repostedFromDoc: { $eq: null } }, // Not a repost
                { "repostedFromDoc.isScheduled": { $ne: true } }, // Original is not scheduled
                {
                  $and: [
                    { "repostedFromDoc.isScheduled": true },
                    { "repostedFromDoc.scheduledAt": { $ne: null } },
                    { "repostedFromDoc.scheduledAt": { $lte: new Date() } }, // Original is scheduled but already published
                  ],
                },
              ],
            },
            // Prevent reposts of reposts at the aggregation level
            { "repostedFromDoc.repostedFrom": { $exists: false } },
          ],
        },
      },
      { $sort: { publishedAt: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
          pipeline: [{ $project: { password: 0 } }],
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "posts",
          localField: "repostedFrom",
          foreignField: "_id",
          as: "repostedFrom",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user",
                pipeline: [{ $project: { password: 0 } }],
              },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                text: 1,
                img: 1,
                video: 1,
                mediaType: 1,
                likes: 1,
                commentsCount: 1,
                repostsCount: 1,
                repostedBy: 1,
                bookmarkedBy: 1,
                createdAt: 1,
                user: 1,
                isScheduled: 1,
                scheduledAt: 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: "$repostedFrom", preserveNullAndEmptyArrays: true } },
      // Project to remove the temporary `repostedFromDoc` and `userForBlocking` fields
      {
        $project: {
          repostedFromDoc: 0,
          userForBlocking: 0,
        },
      },
    ]);

    // The client-side filtering below becomes largely redundant if the aggregation pipeline is correct.
    // It's good practice to push as much filtering as possible to the database for performance.
    // I'm commenting it out, but you can keep it as a fallback if you desire,
    // although it suggests the aggregation might not be fully optimized.
    // const finalFilteredPosts = posts.filter((post) => {
    //   if (post.repostedFrom && post.repostedFrom.repostedFrom) {
    //     return false;
    //   }
    //   if (post.repostedFrom && !post.repostedFrom.user) {
    //     return false;
    //   }
    //   if (
    //     post.repostedFrom &&
    //     post.repostedFrom.isScheduled &&
    //     post.repostedFrom.scheduledAt &&
    //     new Date(post.repostedFrom.scheduledAt) > new Date()
    //   ) {
    //     return false;
    //   }
    //   return true;
    // });

    const hasNextPage = page * limit < totalCount;

    res.status(200).json({ posts: posts, hasNextPage, totalPosts: totalCount }); // Use 'posts' directly
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in getAllPosts controller: ", error);
  }
};

export const getLikedPosts = async (req, res) => {
  const userId = req.params.id;
  const currentUserId = req.user?._id;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Blocking check for the user whose liked posts are being viewed
    if (currentUserId && (await isBlockedOrBlockedBy(currentUserId, userId))) {
      return res.status(403).json({
        error: "You cannot view liked posts of this user due to blocking restrictions.",
      });
    }

    const { blockedByMe, blockedMe } = await getBlockingUsers(currentUserId);
    const blockedAndBlockingObjectIds = [
      ...new Set([
        ...blockedByMe.map((id) => new mongoose.Types.ObjectId(id)),
        ...blockedMe.map((id) => new mongoose.Types.ObjectId(id)),
      ]),
    ];

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const now = new Date(); // Current time for scheduled post checks

    const baseMatchConditions = {
      _id: { $in: user.likedPosts }, // Only include posts the user liked
      "deletedFor.user": {
        $ne: currentUserId ? new mongoose.Types.ObjectId(currentUserId) : null,
      },
      // --- START: MODIFIED SCHEDULED POST LOGIC for the main post ---
      $or: [
        { isScheduled: { $ne: true } }, // if isScheduled is false or not present
        {
          $and: [
            { isScheduled: true },
            { scheduledAt: { $ne: null } },
            { scheduledAt: { $lte: now } }, // scheduledAt is in the past or now
          ],
        },
      ],
      // --- END: MODIFIED SCHEDULED POST LOGIC ---
    };

    const pipeline = [
      { $match: baseMatchConditions },

      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
          pipeline: [{ $project: { password: 0 } }],
        },
      },
      { $unwind: "$user" },

      {
        $lookup: {
          from: "posts",
          localField: "repostedFrom",
          foreignField: "_id",
          as: "repostedFrom",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user",
                pipeline: [{ $project: { password: 0 } }],
              },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                text: 1,
                img: 1,
                video: 1,
                mediaType: 1,
                likes: 1,
                commentsCount: 1,
                repostsCount: 1,
                bookmarkedBy: 1,
                repostedBy: 1,
                createdAt: 1,
                user: 1,
                isScheduled: 1, // Include for filtering reposts
                scheduledAt: 1, // Include for filtering reposts
              },
            },
          ],
        },
      },
      { $unwind: { path: "$repostedFrom", preserveNullAndEmptyArrays: true } },

      {
        $project: {
          user: 1,
          text: 1,
          img: 1,
          video: 1,
          mediaType: 1,
          likes: 1,
          comments: 1,
          commentsCount: 1,
          repostsCount: 1,
          repostedBy: 1,
          repostedFrom: 1,
          bookmarkedBy: 1,
          createdAt: 1,
          isScheduled: 1, // Ensure these are carried through
          scheduledAt: 1, // Ensure these are carried through
        },
      },
      {
        $match: {
          $and: [
            // Blocking filters
            { "user._id": { $nin: blockedAndBlockingObjectIds } },
            {
              $or: [
                { repostedFrom: null },
                { "repostedFrom.user._id": { $nin: blockedAndBlockingObjectIds } },
              ],
            },
            // Prevent reposts of reposts (as per your existing logic)
            { "repostedFrom.repostedFrom": { $eq: null } },
            // Ensure repostedFrom.user is not null (as per your existing logic)
            { $or: [{ repostedFrom: null }, { "repostedFrom.user": { $ne: null } }] },
            // --- START: MODIFIED SCHEDULED POST LOGIC for repostedFrom ---
            {
              $or: [
                { repostedFrom: null }, // If not a repost, this condition doesn't apply
                { "repostedFrom.isScheduled": { $ne: true } }, // Reposted original is not scheduled
                {
                  $and: [
                    { "repostedFrom.isScheduled": true },
                    { "repostedFrom.scheduledAt": { $ne: null } },
                    { "repostedFrom.scheduledAt": { $lte: now } }, // Reposted original's scheduled time has passed
                  ],
                },
              ],
            },
            // --- END: MODIFIED SCHEDULED POST LOGIC ---
          ],
        },
      },
      { $sort: { publishedAt: -1, createdAt: -1 } },
    ];

    const totalLikedPostsResult = await Post.aggregate([
      ...pipeline, // Use the constructed pipeline for count
      { $count: "count" },
    ]);
    const totalLikedPosts =
      totalLikedPostsResult.length > 0 ? totalLikedPostsResult[0].count : 0;

    const likedPosts = await Post.aggregate([
      ...pipeline, // Use the constructed pipeline for fetching
      { $skip: skip },
      { $limit: limit },
    ]);

    const hasNextPage = page * limit < totalLikedPosts;

    res.status(200).json({ posts: likedPosts, hasNextPage, totalLikedPosts });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in getLikedPosts controller: ", error);
  }
};

export const getFollowingPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const { blockedByMe, blockedMe } = await getBlockingUsers(userId);
    const blockedAndBlockingObjectIds = [
      ...new Set([
        ...blockedByMe.map((id) => new mongoose.Types.ObjectId(id)),
        ...blockedMe.map((id) => new mongoose.Types.ObjectId(id)),
      ]),
    ];

    const followingObjectIds = user.following.map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const effectiveFollowing = followingObjectIds.filter(
      (id) => !blockedAndBlockingObjectIds.some((blockedId) => blockedId.equals(id))
    );

    if (effectiveFollowing.length === 0) {
      return res.status(200).json({ posts: [], hasNextPage: false, totalPosts: 0 }); // Added totalPosts for consistency
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const now = new Date(); // Current time for scheduled post checks

    const queryConditions = {
      $and: [
        { "deletedFor.user": { $ne: userId } },
        // --- START: MODIFIED SCHEDULED POST LOGIC for the main post ---
        {
          $or: [
            { isScheduled: { $ne: true } },
            {
              $and: [
                { isScheduled: true },
                { scheduledAt: { $ne: null } },
                { scheduledAt: { $lte: now } },
              ],
            },
          ],
        },
        // --- END: MODIFIED SCHEDULED POST LOGIC ---
        {
          $or: [
            { user: { $in: effectiveFollowing } },
            {
              $and: [
                { user: { $in: effectiveFollowing } },
                { repostedFrom: { $ne: null } },
                { "repostedFrom.user": { $nin: blockedAndBlockingObjectIds } },
                // --- START: MODIFIED SCHEDULED POST LOGIC for repostedFrom in query ---
                {
                  $or: [
                    { "repostedFrom.isScheduled": { $ne: true } },
                    {
                      $and: [
                        { "repostedFrom.isScheduled": true },
                        { "repostedFrom.scheduledAt": { $ne: null } },
                        { "repostedFrom.scheduledAt": { $lte: now } },
                      ],
                    },
                  ],
                },
                // --- END: MODIFIED SCHEDULED POST LOGIC for repostedFrom in query ---
              ],
            },
          ],
        },
      ],
    };

    const totalCount = await Post.countDocuments(queryConditions);

    const rawFeedPosts = await Post.find(queryConditions)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "repostedFrom",
        populate: {
          path: "user",
          select: "-password",
        },
        // --- ADDED isScheduled and scheduledAt to repostedFrom select ---
        select:
          "text img video mediaType likes commentsCount repostsCount bookmarkedBy repostedBy createdAt user isScheduled scheduledAt",
      });

    const finalFeedPosts = rawFeedPosts.filter((post) => {
      const postOwnerId = post.user?._id;
      const repostedFromOwnerId = post.repostedFrom?.user?._id;

      if (blockedAndBlockingObjectIds.some((id) => id.equals(postOwnerId))) return false;
      if (
        post.repostedFrom &&
        blockedAndBlockingObjectIds.some((id) => id.equals(repostedFromOwnerId))
      )
        return false;

      const isDeletedForMe = post.deletedFor?.some((entry) => entry.user.equals(userId));
      if (isDeletedForMe) {
        return false;
      }

      if (post.repostedFrom && post.repostedFrom.repostedFrom) {
        return false;
      }
      // This is checking if repostedFrom is an _id, but not its existence
      // if (post.repostedFrom && !post.repostedFrom._id) { // Not needed if already populated and checked for user
      //   return false;
      // }
      if (post.repostedFrom && !post.repostedFrom.user) {
        return false;
      }
      // --- START: Client-side filter for reposts of future-scheduled posts ---
      if (
        post.repostedFrom &&
        post.repostedFrom.isScheduled &&
        post.repostedFrom.scheduledAt &&
        new Date(post.repostedFrom.scheduledAt) > now
      ) {
        return false;
      }
      // --- END: Client-side filter ---

      return true;
    });

    const hasNextPage = page * limit < totalCount;

    res.status(200).json({ posts: finalFeedPosts, hasNextPage, totalPosts: totalCount });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in getFollowingPosts controller: ", error);
  }
};

export const getUserPosts = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });

    if (!user) return res.status(404).json({ error: "User not found" });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const currentUserId = req.user?._id;

    if (currentUserId && (await isBlockedOrBlockedBy(currentUserId, user._id))) {
      return res.status(403).json({
        error: "You cannot view posts from this user due to blocking restrictions.",
      });
    }

    const { blockedByMe, blockedMe } = await getBlockingUsers(currentUserId);
    const blockedAndBlockingObjectIds = [
      ...new Set([
        ...blockedByMe.map((id) => new mongoose.Types.ObjectId(id)),
        ...blockedMe.map((id) => new mongoose.Types.ObjectId(id)),
      ]),
    ];

    const now = new Date(); // Current time for scheduled post checks

    const queryConditions = {
      $and: [
        { "deletedFor.user": { $ne: currentUserId } },
        {
          $or: [
            { isScheduled: { $ne: true } }, // if isScheduled is false or not present
            { user: currentUserId }, // Current user can always see their own scheduled posts
            {
              $and: [
                { isScheduled: true },
                { scheduledAt: { $ne: null } },
                { scheduledAt: { $lte: now } }, // scheduledAt is in the past or now
              ],
            },
          ],
        },
        // --- END: MODIFIED SCHEDULED POST LOGIC ---
        {
          $or: [
            { user: user._id },
            {
              $and: [
                { user: user._id },
                { repostedFrom: { $ne: null } },
                { "repostedFrom.user": { $nin: blockedAndBlockingObjectIds } },
                // --- START: MODIFIED SCHEDULED POST LOGIC for repostedFrom in query ---
                {
                  $or: [
                    { "repostedFrom.isScheduled": { $ne: true } },
                    { "repostedFrom.user": currentUserId }, // Current user can see reposts of their own scheduled posts
                    {
                      $and: [
                        { "repostedFrom.isScheduled": true },
                        { "repostedFrom.scheduledAt": { $ne: null } },
                        { "repostedFrom.scheduledAt": { $lte: now } },
                      ],
                    },
                  ],
                },
                // --- END: MODIFIED SCHEDULED POST LOGIC for repostedFrom in query ---
              ],
            },
          ],
        },
      ],
    };

    const totalUserPosts = await Post.countDocuments(queryConditions);

    const rawUserPosts = await Post.find(queryConditions)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "repostedFrom",
        populate: {
          path: "user",
          select: "-password",
        },
        select:
          "text img video mediaType likes commentsCount bookmarkedBy repostsCount repostedBy createdAt user isScheduled scheduledAt",
      });

    const finalUserPosts = rawUserPosts.filter((post) => {
      const postOwnerId = post.user?._id;
      const repostedFromOwnerId = post.repostedFrom?.user?._id;

      if (blockedAndBlockingObjectIds.some((id) => id.equals(postOwnerId))) return false;
      if (
        post.repostedFrom &&
        blockedAndBlockingObjectIds.some((id) => id.equals(repostedFromOwnerId))
      )
        return false;

      if (currentUserId) {
        const isDeletedForMe = post.deletedFor?.some((entry) =>
          entry.user.equals(currentUserId)
        );
        if (isDeletedForMe) {
          return false;
        }
      }

      if (post.repostedFrom && post.repostedFrom.repostedFrom) {
        return false;
      }
      if (post.repostedFrom && !post.repostedFrom.user) {
        return false;
      }
      // --- START: Client-side filter for reposts of future-scheduled posts ---
      // This is mostly handled by the queryConditions now, but as a final safeguard:
      if (
        post.repostedFrom &&
        post.repostedFrom.isScheduled &&
        post.repostedFrom.scheduledAt &&
        new Date(post.repostedFrom.scheduledAt) > now
      ) {
        // If the reposted post is future-scheduled, and the current user is NOT its owner, hide it.
        // This ensures that even if somehow it slipped past query, it's caught.
        if (!currentUserId || !post.repostedFrom.user._id.equals(currentUserId)) {
          return false;
        }
      }
      // --- END: Client-side filter ---

      return true;
    });

    const hasNextPage = page * limit < totalUserPosts;

    res
      .status(200)
      .json({ posts: finalUserPosts, hasNextPage, totalPosts: totalUserPosts });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in getUserPosts controller: ", error);
  }
};

export const getPost = async (req, res) => {
  try {
    const currentUserId = req.user?._id;

    const post = await Post.findById(req.params.id)
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "repostedFrom",
        populate: [
          {
            path: "user",
            select: "-password",
          },
        ],
        select:
          "text img video mediaType likes commentsCount repostsCount bookmarkedBy createdAt user isScheduled scheduledAt repostedBy", // Ensure these are selected
      });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const now = new Date();

    // Check if the main post is scheduled for the future
    if (post.isScheduled && post.scheduledAt && new Date(post.scheduledAt) > now) {
      if (!currentUserId || post.user._id.toString() !== currentUserId.toString()) {
        return res.status(404).json({ error: "Post not found" });
      }
    }

    // If the post is a repost, check the original post's (repostedFrom) schedule
    if (post.repostedFrom) {
      const originalPost = post.repostedFrom;
      if (
        originalPost.isScheduled &&
        originalPost.scheduledAt &&
        new Date(originalPost.scheduledAt) > now
      ) {
        if (
          !currentUserId ||
          originalPost.user._id.toString() !== currentUserId.toString()
        ) {
          return res.status(404).json({ error: "Post not found" });
        }
      }
    }

    const postOwnerId = post.user?._id;
    const repostedFromOwnerId = post.repostedFrom?.user?._id;

    if (
      currentUserId &&
      postOwnerId &&
      (await isBlockedOrBlockedBy(currentUserId, postOwnerId))
    ) {
      return res
        .status(403)
        .json({ error: "You cannot view this post due to blocking restrictions." });
    }
    if (
      post.repostedFrom &&
      currentUserId &&
      repostedFromOwnerId &&
      (await isBlockedOrBlockedBy(currentUserId, repostedFromOwnerId))
    ) {
      return res
        .status(403)
        .json({ error: "You cannot view this post due to blocking restrictions." });
    }

    res.status(200).json(post);
  } catch (error) {
    console.error("Error in getPost controller", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const repostPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const postToRepost = await Post.findById(postId);
    if (!postToRepost) {
      return res.status(404).json({ error: "Post not found." });
    }

    // A post can be a repost itself. Find the ultimate original post.
    const originalPostId = postToRepost.repostedFrom || postToRepost._id;
    const originalPost = await Post.findById(originalPostId);
    if (!originalPost) {
      return res.status(404).json({ error: "Original post not found." });
    }

    // Block check against the original author
    const originalPostOwnerId = originalPost.user.toString();
    if (await isBlockedOrBlockedBy(userId, originalPostOwnerId)) {
      return res.status(403).json({
        error: "You cannot interact with this content due to blocking restrictions.",
      });
    }

    if (originalPost.user.equals(userId)) {
      return res.status(400).json({ error: "You cannot repost your own post." });
    }

    const existingRepost = await Post.findOne({
      user: userId,
      repostedFrom: originalPostId,
    });

    if (existingRepost) {
      // --- UNDO REPOST ---
      await Post.deleteOne({ _id: existingRepost._id });
      await Post.updateOne(
        { _id: originalPostId },
        { $pull: { repostedBy: userId }, $inc: { repostsCount: -1 } }
      );

      res.status(200).json({
        message: "Repost removed successfully.",
      });
    } else {
      const newRepost = new Post({
        user: userId,
        repostedFrom: originalPostId,
        publishedAt: new Date(), // A repost happens NOW
      });
      await newRepost.save();
      await Post.updateOne(
        { _id: originalPostId },
        { $addToSet: { repostedBy: userId }, $inc: { repostsCount: 1 } }
      );

      if (!originalPost.user.equals(userId)) {
        await createAndSendNotification({
          from: userId,
          to: originalPost.user,
          type: "repost",
          postId: originalPostId,
        });
      }

      res.status(201).json({ message: "Post reposted successfully." });
    }
  } catch (error) {
    console.error("Error in repostPost controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const checkIfUserReposted = async (req, res) => {
  try {
    const { originalPostId } = req.params;
    const userId = req.user._id;

    const originalPost = await Post.findById(originalPostId).select("user");
    if (!originalPost) return res.status(404).json({ error: "Original post not found." });

    if (await isBlockedOrBlockedBy(userId, originalPost.user)) {
      return res.status(403).json({
        error: "You cannot interact with this content due to blocking restrictions.",
      });
    }

    const existingRepost = await Post.findOne({
      user: userId,
      repostedFrom: originalPostId,
    });

    res.status(200).json({ hasReposted: !!existingRepost });
  } catch (error) {
    console.error("Error in checkIfUserReposted controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const toggleBookmark = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const isBookmarked = post.bookmarkedBy.includes(userId);

    if (isBookmarked) {
      await Post.findByIdAndUpdate(postId, { $pull: { bookmarkedBy: userId } });
      await User.findByIdAndUpdate(userId, { $pull: { bookmarkedPosts: postId } });
      res.status(200).json({ message: "Post unbookmarked successfully" });
    } else {
      await Post.findByIdAndUpdate(postId, { $push: { bookmarkedBy: userId } });
      await User.findByIdAndUpdate(userId, { $push: { bookmarkedPosts: postId } });
      res.status(200).json({ message: "Post bookmarked successfully" });
    }
  } catch (error) {
    console.error("Error in toggleBookmark controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getBookmarkedPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const { query, page = 1, limit = 10 } = req.query;

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);

    let filter = { bookmarkedBy: userId };

    if (query) {
      filter.text = { $regex: query, $options: "i" };
    }

    const totalPostsCount = await Post.countDocuments(filter);

    const bookmarkedPosts = await Post.find(filter)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "repostedFrom",
        populate: {
          path: "user",
          select: "-password",
        },
        select:
          "text img video mediaType likes commentsCount repostsCount createdAt user repostedBy",
      })
      .populate({
        path: "comments",
        populate: {
          path: "user",
          select: "-password",
        },
      })
      .lean();

    const hasNextPage = totalPostsCount > parsedPage * parsedLimit;

    res.status(200).json({
      posts: bookmarkedPosts,
      currentPage: parsedPage,
      totalPages: Math.ceil(totalPostsCount / parsedLimit),
      hasNextPage: hasNextPage,
      totalPosts: totalPostsCount,
    });
  } catch (error) {
    console.error("Error in getBookmarkedPosts controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const voteOnPoll = async (req, res) => {
  try {
    const { postId } = req.params; // Get post ID from URL parameters
    const { optionId } = req.body; // Get the ID of the selected poll option from the request body
    const userId = req.user._id; // Get the ID of the authenticated user

    // 1. Find the Post
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "Post not found." });
    }

    // 2. Validate if it's a poll
    if (!post.pollOptions || post.pollOptions.length === 0) {
      return res.status(400).json({ error: "This post is not a poll." });
    }

    // Optional: Add blocking checks here if you want to prevent blocked users from voting
    // if (await isBlockedOrBlockedBy(userId, post.user.toString())) {
    //   return res.status(403).json({ error: "You cannot vote on this content due to blocking restrictions." });
    // }

    // 3. Find the specific poll option using its _id (Mongoose subdocument method)
    const selectedOption = post.pollOptions.id(optionId); // `id()` is a Mongoose array method to find subdocuments by their `_id`

    if (!selectedOption) {
      return res.status(404).json({ error: "Poll option not found." });
    }

    // 4. Check if the user has already voted on *any* option in this poll
    // Iterate through all poll options to see if the current user's ID exists in any 'voters' array
    const hasUserAlreadyVoted = post.pollOptions.some((option) =>
      option.voters.includes(userId)
    );

    if (hasUserAlreadyVoted) {
      return res.status(400).json({ error: "You have already voted on this poll." });
    }

    // 5. Add the user's ID to the selected option's voters array
    selectedOption.voters.push(userId);

    // 6. Increment the total votes for the poll
    post.pollTotalVotes += 1;

    // 7. Save the updated post
    await post.save();

    // Optional: Send a notification to the post owner that someone voted on their poll
    // (You might want a new notification `type: "pollVote"` if you implement this)
    // if (post.user.toString() !== userId.toString()) {
    //   await createAndSendNotification({
    //     from: userId,
    //     to: post.user,
    //     type: "pollVote", // New notification type
    //     postId: post._id,
    //   });
    // }

    // 8. Send a success response with updated poll data (optional, but useful for frontend)
    res.status(200).json({
      message: "Vote cast successfully!",
      pollOptions: post.pollOptions, // Return the updated options
      pollTotalVotes: post.pollTotalVotes, // Return the updated total
    });
  } catch (error) {
    console.error("Error in voteOnPoll controller:", error.message);
    res.status(500).json({ error: "Internal server error." });
  }
};

export const pinUnpinPost = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const userId = req.user._id; // Authenticated user's ID

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Ensure only the owner can pin/unpin their own post
    if (post.user.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "You are not authorized to pin/unpin this post" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isPinned = user.pinnedPosts.includes(postId);

    if (isPinned) {
      // Unpin the post
      user.pinnedPosts = user.pinnedPosts.filter(
        (id) => id.toString() !== postId.toString()
      );
      await user.save();
      res.status(200).json({ message: "Post unpinned successfully" });
    } else {
      // Pin the post
      // Add to the beginning of the array for a LIFO (Last-In, First-Out) display
      // Or you can append: user.pinnedPosts.push(postId); for FIFO
      user.pinnedPosts.unshift(postId);
      await user.save();
      res.status(200).json({ message: "Post pinned successfully" });
    }
  } catch (error) {
    console.error("Error in pinUnpinPost controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPinnedPosts = async (req, res) => {
  const { username } = req.params;
  const currentUserId = req.user?._id;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (currentUserId && (await isBlockedOrBlockedBy(currentUserId, user._id))) {
      return res.status(403).json({
        error: "You cannot view posts from this user due to blocking restrictions.",
      });
    }

    // ✨ REVISED POPULATION LOGIC
    const userWithPinnedPosts = await User.findById(user._id)
      .select("pinnedPosts")
      .populate({
        path: "pinnedPosts",
        populate: [
          { path: "user", select: "-password" },
          {
            path: "repostedFrom",
            populate: {
              path: "user",
              select: "-password",
            },
            // Select all necessary fields for the original post, including repostedBy
            select:
              "text img video mediaType likes commentsCount bookmarkedBy repostsCount createdAt user isScheduled scheduledAt repostedBy",
          },
        ],
      })
      .lean();

    if (!userWithPinnedPosts || !userWithPinnedPosts.pinnedPosts) {
      return res.status(200).json([]);
    }

    // ✨ ENHANCED FILTERING
    // This ensures consistency with your other feed endpoints
    const { blockedByMe, blockedMe } = await getBlockingUsers(currentUserId);
    const blockedIds = new Set([...blockedByMe, ...blockedMe]);

    const finalPinnedPosts = userWithPinnedPosts.pinnedPosts.filter((post) => {
      const postOwnerId = post.user?._id?.toString();
      const repostedFromOwnerId = post.repostedFrom?.user?._id?.toString();

      // Filter if viewer has blocked/is blocked by post owner or original post owner
      if (
        blockedIds.has(postOwnerId) ||
        (repostedFromOwnerId && blockedIds.has(repostedFromOwnerId))
      ) {
        return false;
      }

      // Filter if post is "deleted for me"
      if (post.deletedFor?.some((entry) => entry.user.equals(currentUserId))) {
        return false;
      }

      // Add any other necessary filtering (e.g., for scheduled posts) if needed

      return true;
    });

    res.status(200).json(finalPinnedPosts);
  } catch (error) {
    console.log("Error in getPinnedPosts: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getScheduledPosts = async (req, res) => {
  try {
    const userId = req.user._id;

    const scheduledPosts = await Post.find({
      user: userId,
      isScheduled: true,
      scheduledAt: { $gt: new Date() }, // Only posts scheduled for the future
    })
      .sort({ scheduledAt: 1 }) // Sort by earliest scheduled time
      .populate("user", "-password"); // Populate user details, exclude password

    res.status(200).json(scheduledPosts);
  } catch (error) {
    console.log("Error in getScheduledPosts controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateScheduledPost = async (req, res) => {
  try {
    const { id } = req.params;
    // Only expect text and scheduledAt for scheduled posts
    const { text, scheduledAt } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.user.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "You are not authorized to update this post" });
    }

    if (!post.isScheduled) {
      return res.status(400).json({
        error: "This post is not a scheduled post and cannot be updated this way.",
      });
    }

    // Since scheduled posts are text-only, ensure no media or poll is present
    // If the original scheduled post somehow had media/poll, clear it on update.
    if (post.imgPublicId) {
      // Assuming cloudinary is configured to destroy the image
      // await cloudinary.uploader.destroy(post.imgPublicId); // Uncomment if you want to delete associated media from Cloudinary on update
    }
    if (post.videoPublicId) {
      // Assuming cloudinary is configured to destroy the video
      // await cloudinary.uploader.destroy(post.videoPublicId, { resource_type: "video" }); // Uncomment if you want to delete associated media from Cloudinary on update
    }

    // Basic validation for text content
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Scheduled post must have text content." });
    }

    const mentionedUsersIds = await extractAndValidateMentions(text);

    // Update the post fields
    post.text = text;
    post.img = null; // Clear image
    post.video = null; // Clear video
    post.imgPublicId = null; // Clear image public ID
    post.videoPublicId = null; // Clear video public ID
    post.mediaType = "none"; // Set media type to none for text-only scheduled posts
    post.pollOptions = []; // Clear poll options
    post.pollTotalVotes = 0; // Reset poll votes
    post.mentionedUsers = mentionedUsersIds;
    post.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    post.isScheduled = !!scheduledAt; // Should remain true for updates unless published immediately

    await post.save();

    res.status(200).json(post);
  } catch (error) {
    console.log("Error in updateScheduledPost controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteScheduledPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.user.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "You are not authorized to delete this post" });
    }

    if (!post.isScheduled) {
      return res.status(400).json({
        error: "This post is not a scheduled post and cannot be deleted this way.",
      });
    }

    // Delete media from cloudinary if it exists
    if (post.imgPublicId) {
      await cloudinary.uploader.destroy(post.imgPublicId);
    }
    if (post.videoPublicId) {
      await cloudinary.uploader.destroy(post.videoPublicId, { resource_type: "video" });
    }

    await Post.deleteOne({ _id: id }); // Or findByIdAndDelete(id);

    res.status(200).json({ message: "Scheduled post deleted successfully" });
  } catch (error) {
    console.log("Error in deleteScheduledPost controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMultipleScheduledPosts = async (req, res) => {
  try {
    const { postIds } = req.body; // Expect an array of post IDs
    const userId = req.user._id;

    if (!Array.isArray(postIds) || postIds.length === 0) {
      return res.status(400).json({ error: "No post IDs provided for deletion." });
    }

    const deletePromises = postIds.map(async (postId) => {
      const post = await Post.findById(postId);

      if (!post) {
        return { postId, status: "not_found", message: "Post not found" };
      }

      if (post.user.toString() !== userId.toString()) {
        return { postId, status: "unauthorized", message: "Not authorized to delete" };
      }

      if (!post.isScheduled) {
        return { postId, status: "not_scheduled", message: "Not a scheduled post" };
      }

      // Delete media from cloudinary if it exists (only if you want to delete associated media)
      if (post.imgPublicId) {
        await cloudinary.uploader.destroy(post.imgPublicId);
      }
      if (post.videoPublicId) {
        await cloudinary.uploader.destroy(post.videoPublicId, { resource_type: "video" });
      }

      await Post.deleteOne({ _id: postId });
      return { postId, status: "success", message: "Deleted successfully" };
    });

    const results = await Promise.all(deletePromises);

    const successfulDeletions = results.filter(
      (result) => result.status === "success"
    ).length;
    const failedDeletions = results.filter(
      (result) => result.status !== "success"
    ).length;

    if (successfulDeletions === 0) {
      return res.status(400).json({
        error: "No scheduled posts were deleted. Check authorizations or if posts exist.",
      });
    }

    res.status(200).json({
      message: `${successfulDeletions} scheduled post(s) deleted successfully.`,
      results,
      successfulDeletions,
      failedDeletions,
    });
  } catch (error) {
    console.log("Error in deleteMultipleScheduledPosts controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
