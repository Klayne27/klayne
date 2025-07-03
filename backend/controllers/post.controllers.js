import Post from "../models/post.model.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose"; // <--- Make sure to import mongoose for ObjectId

import {
  createAndSendNotification,
  emitUnreadNotificationStatus,
  io,
  onlineUsersMap,
} from "../lib/socket.js";

// Helper function to get blocking relationships for the current user
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

// Helper function to check if a user is involved in a block relationship
// targetUserId is the user whose content or profile we are interacting with
// currentUserId is the authenticated user
const isBlockedOrBlockedBy = async (currentUserId, targetUserId) => {
  if (!currentUserId || !targetUserId) return false;
  if (currentUserId.toString() === targetUserId.toString()) return false;

  const currentUser = await User.findById(currentUserId).select("blockedUsers blockedBy");
  const targetUser = await User.findById(targetUserId).select("blockedUsers blockedBy");

  if (!currentUser || !targetUser) return false;

  // Current user has blocked target user OR target user has blocked current user
  return (
    currentUser.blockedUsers.includes(targetUserId) ||
    targetUser.blockedUsers.includes(currentUserId)
  );
};

export const createPost = async (req, res) => {
    try {
        const { text } = req.body;
        let { img, video } = req.body; // Destructure 'video' from req.body

        const userId = req.user._id.toString();

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        // Validate that either text, img, or video is present
        if (!text && !img && !video) {
            return res.status(400).json({ error: "Post must have a text, image, or video" });
        }

        let uploadedImgUrl = null;
        let uploadedVideoUrl = null;
        let imgPublicId = null;   // NEW: Variable for image public ID
        let videoPublicId = null; // NEW: Variable for video public ID
        let mediaType = null;     // Changed default to null, will be set below if media exists

        if (img) {
            // Assuming 'img' comes as a base64 string
            const uploadedResponse = await cloudinary.uploader.upload(img);
            uploadedImgUrl = uploadedResponse.secure_url;
            imgPublicId = uploadedResponse.public_id; // NEW: Store public ID
            mediaType = "image";
        } else if (video) {
            // Handle video upload if 'video' field is present
            const uploadedResponse = await cloudinary.uploader.upload(video, {
                resource_type: "video",
                // You might want to add other options for videos here, e.g.,
                // transformation: { width: 800, crop: "limit" }, // Example for scaling
                // quality: "auto:eco", // Example for optimizing quality
            });
            uploadedVideoUrl = uploadedResponse.secure_url;
            videoPublicId = uploadedResponse.public_id; // NEW: Store public ID
            mediaType = "video";
        }

        // The logic below 'Ensure only one media type is set'
        // is redundant if your frontend correctly sends only 'img' OR 'video'.
        // If your frontend *could* send both (e.g., if a user uploads an image then a video
        // without clearing the image), then this explicit prioritization is good.
        // Given your previous frontend code for `CreatePost.jsx`, it correctly sends
        // only one, so this block isn't strictly necessary but harmless.
        if (uploadedVideoUrl) {
            uploadedImgUrl = null; // Clear img if video is uploaded
            imgPublicId = null;    // NEW: Clear img public ID if video is uploaded
        } else if (uploadedImgUrl) { // If it's an image, make sure video fields are null
            uploadedVideoUrl = null;
            videoPublicId = null;
        }


        const newPost = new Post({
            user: userId,
            text,
            img: uploadedImgUrl,      // Store processed image URL
            video: uploadedVideoUrl,  // Store processed video URL
            imgPublicId: imgPublicId, // NEW: Store image public ID
            videoPublicId: videoPublicId, // NEW: Store video public ID
            mediaType,                // Set the determined media type
            commentsCount: 0,
            // likes and repostsCount will default to [] and 0 per schema definition
        });

        await newPost.save();

        // Increment user's posts count (if you maintain this on the User model)
        await User.findByIdAndUpdate(userId, { $inc: { postsCount: 1 } });


        // Emit "newPostAvailable" to all online users except the sender
        // Assuming `io` and `onlineUsersMap` are available in this scope (e.g., from socket setup)
        for (const [onlineUserId, socketIdsSet] of onlineUsersMap.entries()) {
            if (onlineUserId.toString() !== userId.toString()) {
                socketIdsSet.forEach((socketId) => {
                    io.to(socketId).emit("newPostAvailable", newPost); // Consider sending the new post object
                });
            }
        }

        res.status(201).json(newPost);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
        console.log("Error in createPost controller: ", error);
    }
};

export const deletePost = async (req, res) => {
    try {
        const { id } = req.params;

        const postToDelete = await Post.findById(id);

        if (!postToDelete) {
            return res.status(404).json({ error: "Post not found" });
        }

        // Authorization check: Ensure the user deleting the post is the owner
        if (postToDelete.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ error: "You are not authorized to delete this post" });
        }

        // --- MODIFIED: Cloudinary Deletion Logic using stored public_ids ---
        if (postToDelete.mediaType === "image" && postToDelete.imgPublicId) {
            await cloudinary.uploader.destroy(postToDelete.imgPublicId);
        } else if (postToDelete.mediaType === "video" && postToDelete.videoPublicId) {
            // Cloudinary's destroy method needs resource_type: "video" for videos
            await cloudinary.uploader.destroy(postToDelete.videoPublicId, { resource_type: "video" });
        }
        // --- END MODIFIED: Cloudinary Deletion Logic ---

        // Logic for handling reposts
        // If it's an original post, delete all its reposts.
        // Note: Reposts typically don't have their own media, but if your design
        // allows "quote posts" with new media, you'd need to extend this.
        // For standard reposts, they just reference the original post's content.
        if (!postToDelete.repostedFrom) {
            // Find and delete all reposts associated with this original post
            await Post.deleteMany({ repostedFrom: postToDelete._id });

            // Decrement the user's *original* posts count if you track it
            // (assuming `postToDelete.user` is the creator of the original post)
            await User.findByIdAndUpdate(postToDelete.user, { $inc: { postsCount: -1 } });

        } else {
            // This is a repost. Decrement the repostsCount on the original post it refers to.
            await Post.findByIdAndUpdate(
                postToDelete.repostedFrom,
                { $inc: { repostsCount: -1 } },
                { new: true } // Return the updated document (optional for this context but good practice)
            );
            // Note: If you have a separate "repostsCount" for users (i.e. how many times they reposted),
            // you might want to decrement that here as well for `req.user`.
        }

        // Finally, delete the post (or repost) itself from the database
        await Post.deleteOne({ _id: id });

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

    // --- START: BLOCKING CHECK FOR LIKING ---
    const postOwnerId = post.user.toString();
    if (await isBlockedOrBlockedBy(userId, postOwnerId)) {
      return res.status(403).json({
        error: "You cannot like/unlike this post due to blocking restrictions.",
      });
    }
    // --- END: BLOCKING CHECK FOR LIKING ---

    const userLikedPost = post.likes.includes(userId);

    if (userLikedPost) {
      // Unlike the post
      await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
      await User.updateOne({ _id: userId }, { $pull: { likedPosts: postId } });

      const updatedLikes = post.likes.filter((id) => id.toString() !== userId.toString());
      res.status(200).json(updatedLikes);
    } else {
      // Like the post
      post.likes.push(userId);
      await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } });
      await post.save();

      // Only create notification if not blocked, and not liking your own post
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

export const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
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
            { user: { $nin: blockedAndBlockingObjectIds } },
            {
              $and: [
                { repostedFrom: { $ne: null } },
                { "repostedFrom.user": { $nin: blockedAndBlockingObjectIds } },
              ],
            },
          ],
        },
      ],
    };

    const totalPostsResult = await Post.aggregate([
      { $match: matchConditions },
      { $count: "count" },
    ]);
    const totalCount = totalPostsResult.length > 0 ? totalPostsResult[0].count : 0;

    const posts = await Post.aggregate([
      { $match: matchConditions },
      { $sort: { createdAt: -1 } },
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
                video: 1, // <--- ADDED
                mediaType: 1, // <--- ADDED
                likes: 1,
                commentsCount: 1,
                repostsCount: 1,
                createdAt: 1,
                user: 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: "$repostedFrom", preserveNullAndEmptyArrays: true } },
    ]);

    const finalFilteredPosts = posts.filter((post) => {
      if (post.repostedFrom && post.repostedFrom.repostedFrom) {
        return false;
      }
      if (post.repostedFrom && !post.repostedFrom.user) {
        return false;
      }
      return true;
    });

    const hasNextPage = page * limit < totalCount;

    res
      .status(200)
      .json({ posts: finalFilteredPosts, hasNextPage, totalPosts: totalCount });
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

    if (await isBlockedOrBlockedBy(currentUserId, userId)) {
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

    const baseMatchConditions = {
      _id: { $in: user.likedPosts },
      "deletedFor.user": {
        $ne: currentUserId ? new mongoose.Types.ObjectId(currentUserId) : null,
      },
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
                video: 1, // <--- ADDED
                mediaType: 1, // <--- ADDED
                likes: 1,
                commentsCount: 1,
                repostsCount: 1,
                createdAt: 1,
                user: 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: "$repostedFrom", preserveNullAndEmptyArrays: true } },

      // Add a $project here for the main liked post
      {
        $project: {
          user: 1,
          text: 1,
          img: 1, // <--- ADDED (for the main liked post itself)
          video: 1, // <--- ADDED (for the main liked post itself)
          mediaType: 1, // <--- ADDED (for the main liked post itself)
          likes: 1,
          comments: 1, // Keep comments if you want to populate them later (though not done here)
          commentsCount: 1,
          repostsCount: 1,
          repostedFrom: 1,
          bookmarkedBy: 1, // Include if needed on frontend
          createdAt: 1,
          // Do not include 'deletedFor' here unless needed on frontend for debugging
        },
      },
      {
        $match: {
          $and: [
            { "user._id": { $nin: blockedAndBlockingObjectIds } },
            {
              $or: [
                { repostedFrom: null },
                { "repostedFrom.user._id": { $nin: blockedAndBlockingObjectIds } },
              ],
            },
            { "repostedFrom.repostedFrom": { $eq: null } },
            { $or: [{ repostedFrom: null }, { "repostedFrom.user": { $ne: null } }] },
          ],
        },
      },
      { $sort: { createdAt: -1 } },
    ];

    const totalLikedPostsResult = await Post.aggregate([
      ...pipeline,
      { $count: "count" },
    ]);
    const totalLikedPosts =
      totalLikedPostsResult.length > 0 ? totalLikedPostsResult[0].count : 0;

    const likedPosts = await Post.aggregate([
      ...pipeline,
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
      return res.status(200).json({ posts: [], hasNextPage: false });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const queryConditions = {
      $and: [
        { "deletedFor.user": { $ne: userId } },
        {
          $or: [
            { user: { $in: effectiveFollowing } },
            {
              $and: [
                { user: { $in: effectiveFollowing } },
                { repostedFrom: { $ne: null } },
                { "repostedFrom.user": { $nin: blockedAndBlockingObjectIds } },
              ],
            },
          ],
        },
      ],
    };

    const totalCount = await Post.countDocuments(queryConditions);

    const rawFeedPosts = await Post.find(queryConditions)
      .sort({ createdAt: -1 })
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
        // Include video and mediaType here
        select:
          "text img video mediaType likes commentsCount repostsCount createdAt user", // <--- ADDED video and mediaType
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
      if (post.repostedFrom && !post.repostedFrom._id) {
        return false;
      }
      if (post.repostedFrom && !post.repostedFrom.user) {
        return false;
      }

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

      if (await isBlockedOrBlockedBy(currentUserId, user._id)) {
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

      const queryConditions = {
          $and: [
              { "deletedFor.user": { $ne: currentUserId } },
              {
                  $or: [
                      { user: user._id },
                      {
                          $and: [
                              { user: user._id },
                              { repostedFrom: { $ne: null } },
                              { "repostedFrom.user": { $nin: blockedAndBlockingObjectIds } },
                          ],
                      },
                  ],
              },
          ],
      };

      const totalUserPosts = await Post.countDocuments(queryConditions);

      const rawUserPosts = await Post.find(queryConditions)
          .sort({ createdAt: -1 })
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
              // Include video and mediaType here
              select: "text img video mediaType likes commentsCount repostsCount createdAt user", // <--- ADDED video and mediaType
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
        select: "-password", // Corrected: only exclude password
      })
      .populate({
        path: "repostedFrom",
        populate: [
          {
            path: "user",
            select: "-password", // Corrected: only exclude password
          },
        ],
        select: "text img video mediaType likes commentsCount repostsCount createdAt user",
      });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // --- START: BLOCKING CHECK FOR SINGLE POST VIEW ---
    const postOwnerId = post.user?._id;
    const repostedFromOwnerId = post.repostedFrom?.user?._id;

    // Check if the current user is blocked by or has blocked the post owner
    if (await isBlockedOrBlockedBy(currentUserId, postOwnerId)) {
      return res
        .status(403)
        .json({ error: "You cannot view this post due to blocking restrictions." });
    }
    // If it's a repost, check if the current user is blocked by or has blocked the original post owner
    if (
      post.repostedFrom &&
      (await isBlockedOrBlockedBy(currentUserId, repostedFromOwnerId))
    ) {
      return res
        .status(403)
        .json({ error: "You cannot view this post due to blocking restrictions." });
    }
    // --- END: BLOCKING CHECK FOR SINGLE POST VIEW ---

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

    const originalPost = await Post.findById(postId);
    if (!originalPost) {
      return res.status(404).json({ error: "Original post not found." });
    }

    // --- START: BLOCKING CHECK FOR REPOSTING ---
    const originalPostOwnerId = originalPost.user.toString();
    if (await isBlockedOrBlockedBy(userId, originalPostOwnerId)) {
      return res
        .status(403)
        .json({ error: "You cannot repost this content due to blocking restrictions." });
    }
    // --- END: BLOCKING CHECK FOR REPOSTING ---

    if (
      !originalPost.repostedFrom &&
      originalPost.user.toString() === userId.toString()
    ) {
      return res.status(400).json({ error: "You cannot repost your own post." });
    }

    const existingRepost = await Post.findOne({
      user: userId,
      repostedFrom: originalPost._id,
    });

    let message;
    if (existingRepost) {
      await Post.deleteOne({ _id: existingRepost._id });
      originalPost.repostsCount = Math.max(0, originalPost.repostsCount - 1);
      message = "Repost removed successfully.";
    } else {
      const newRepost = new Post({
        user: userId,
        text: "",
        img: "",
        repostedFrom: originalPost._id,
        likes: [],
        commentsCount: 0,
        repostsCount: 0,
      });
      await newRepost.save();
      originalPost.repostsCount = (originalPost.repostsCount || 0) + 1;
      message = "Post reposted successfully.";
    }

    await originalPost.save();

    if (originalPost.user.toString() !== userId.toString()) {
      await createAndSendNotification({
        from: userId,
        to: originalPost.user,
        type: "repost",
        postId: originalPost._id,
        commentId: null,
      });
    }

    res.status(200).json({
      message: message,
      newRepostsCount: originalPost.repostsCount,
      hasUserReposted: !existingRepost,
    });
  } catch (error) {
    console.error("Error in toggleRepost controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const checkIfUserReposted = async (req, res) => {
  try {
    const { originalPostId } = req.params;
    const userId = req.user._id;

    // --- START: BLOCKING CHECK FOR CHECK IF REPOSTED ---
    const originalPost = await Post.findById(originalPostId).select("user");
    if (!originalPost) return res.status(404).json({ error: "Original post not found." });

    if (await isBlockedOrBlockedBy(userId, originalPost.user)) {
      return res.status(403).json({
        error: "You cannot interact with this content due to blocking restrictions.",
      });
    }
    // --- END: BLOCKING CHECK FOR CHECK IF REPOSTED ---

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

// --- NEW CONTROLLER: Toggle Bookmark ---
export const toggleBookmark = async (req, res) => {
  try {
      const { id: postId } = req.params; // ID of the post to bookmark
      const userId = req.user._id; // ID of the currently authenticated user

      const post = await Post.findById(postId);

      if (!post) {
          return res.status(404).json({ error: "Post not found" });
      }

      const isBookmarked = post.bookmarkedBy.includes(userId);

      if (isBookmarked) {
          // Unbookmark the post
          await Post.findByIdAndUpdate(postId, { $pull: { bookmarkedBy: userId } });
          await User.findByIdAndUpdate(userId, { $pull: { bookmarkedPosts: postId } }); // If user model tracks this too
          res.status(200).json({ message: "Post unbookmarked successfully" });
      } else {
          // Bookmark the post
          await Post.findByIdAndUpdate(postId, { $push: { bookmarkedBy: userId } });
          await User.findByIdAndUpdate(userId, { $push: { bookmarkedPosts: postId } }); // If user model tracks this too
          res.status(200).json({ message: "Post bookmarked successfully" });
      }
  } catch (error) {
      console.error("Error in toggleBookmark controller:", error.message);
      res.status(500).json({ error: "Internal server error" });
  }
};

export const getBookmarkedPosts = async (req, res) => {
    try {
        const userId = req.user._id; // Assuming userId is available from authentication middleware
        // Add page and limit parameters, with default values
        const { query, page = 1, limit = 10 } = req.query; 

        const parsedPage = parseInt(page);
        const parsedLimit = parseInt(limit);

        // Start with the base filter for bookmarked posts by the user
        let filter = { bookmarkedBy: userId };

        // Apply substring search if a query is provided
        if (query) {
            // This is the case-insensitive substring search (as per your clarification)
            filter.text = { $regex: query, $options: "i" };
            // If you need to search other fields (e.g., in reposted content), use $or:
            // filter.$or = [
            //     { text: { $regex: query, $options: "i" } },
            //     { 'repostedFrom.text': { $regex: query, $options: "i" } } // Example: search text of original post if it's a repost
            // ];
        }

        // Get the total count of documents matching the filter (before pagination)
        // This is crucial to determine total pages and if there's a next page
        const totalPostsCount = await Post.countDocuments(filter); 

        // Fetch the bookmarked posts with pagination
        const bookmarkedPosts = await Post.find(filter)
            .sort({ createdAt: -1 }) // Sort by creation date, newest first
            .skip((parsedPage - 1) * parsedLimit) // Skip documents for previous pages
            .limit(parsedLimit) // Limit the number of documents returned for the current page
            .populate({
                path: "user", // Populating the user who created the post
                select: "-password", // Exclude password field
            })
            .populate({
                path: "repostedFrom", // Populating the original post if the current post is a repost
                populate: {
                    path: "user", // Then, within the original post, populate its user
                    select: "-password",
                },
                // Crucially, include img, video, mediaType in the select for repostedFrom
                // so the frontend has all necessary data for the original post
                select: "text img video mediaType likes commentsCount repostsCount createdAt user",
            })
            .populate({
                path: "comments", // Populating the 'comments' array
                populate: {
                    path: "user", // Then, within each populated comment, populate its 'user' field
                    select: "-password",
                },
            })
            .lean(); // Use .lean() for faster query results if you don't need Mongoose Document methods

        // Calculate if there are more pages
        const hasNextPage = totalPostsCount > parsedPage * parsedLimit;

        // Send the paginated data along with pagination information
        res.status(200).json({
            posts: bookmarkedPosts,
            currentPage: parsedPage,
            totalPages: Math.ceil(totalPostsCount / parsedLimit),
            hasNextPage: hasNextPage,
            totalPosts: totalPostsCount // Optional, but useful for frontend debugging/display
        });

    } catch (error) {
        console.error("Error in getBookmarkedPosts controller:", error.message);
        // Include error.message in the response for better debugging on the frontend
        res.status(500).json({ error: "Internal server error: " + error.message });
    }
};