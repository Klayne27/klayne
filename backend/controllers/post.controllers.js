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
    let { img } = req.body;

    const userId = req.user._id.toString();

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!text && !img) {
      return res.status(400).json({ error: "Post must have a text or image" });
    }

    if (img) {
      const uploadedResponse = await cloudinary.uploader.upload(img);
      img = uploadedResponse.secure_url;
    }

    const newPost = new Post({
      user: userId,
      text,
      img,
      commentsCount: 0,
    });

    await newPost.save();

    for (const [onlineUserId, socketIdsSet] of onlineUsersMap.entries()) {
      if (onlineUserId.toString() !== userId.toString()) {
        socketIdsSet.forEach((socketId) => {
          io.to(socketId).emit("newPostAvailable");
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

    if (postToDelete.user.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ error: "You are not authorized to delete this post" });
    }
    if (!postToDelete.repostedFrom) {
      await Post.deleteMany({ repostedFrom: postToDelete._id });
    } else {
      await Post.findByIdAndUpdate(
        postToDelete.repostedFrom,
        { $inc: { repostsCount: -1 } },
        { new: true }
      );
    }
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
  const userId = req.params.id; // The user whose liked posts we want to fetch
  const currentUserId = req.user?._id; // The authenticated user viewing

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // --- START: BLOCKING CHECK FOR LIKED POSTS VIEW ---
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
    // --- END: BLOCKING CHECK FOR LIKED POSTS VIEW ---

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Base match condition for posts liked by the user, and not deleted for the current user
    const baseMatchConditions = {
      _id: { $in: user.likedPosts }, // Posts must be in the likedPosts array of the target user
      "deletedFor.user": {
        $ne: currentUserId ? new mongoose.Types.ObjectId(currentUserId) : null,
      },
    };

    // Aggregation pipeline for both counting and fetching posts
    const pipeline = [
      { $match: baseMatchConditions },
      // Populate the user of the post
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
          pipeline: [{ $project: { password: 0 } }],
        },
      },
      { $unwind: "$user" }, // Unwind the user array

      // Populate the repostedFrom post
      {
        $lookup: {
          from: "posts",
          localField: "repostedFrom",
          foreignField: "_id",
          as: "repostedFrom",
          pipeline: [
            // Populate the user of the repostedFrom post
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
                likes: 1,
                commentsCount: 1,
                repostsCount: 1,
                createdAt: 1,
                user: 1, // Include populated user here
              },
            },
          ],
        },
      },
      { $unwind: { path: "$repostedFrom", preserveNullAndEmptyArrays: true } }, // Unwind repostedFrom, allowing nulls

      // Add the blocking filters AFTER population
      {
        $match: {
          $and: [
            // Filter out posts whose direct owner is blocked
            { "user._id": { $nin: blockedAndBlockingObjectIds } },
            // Filter out reposts whose original owner (repostedFrom.user) is blocked
            {
              $or: [
                { repostedFrom: null }, // If not a repost, this is true
                { "repostedFrom.user._id": { $nin: blockedAndBlockingObjectIds } }, // If repost, check its original owner
              ],
            },
            // Filter out reposts of reposts (nested reposts) if you don't want them
            { "repostedFrom.repostedFrom": { $eq: null } },
            // Filter out posts where repostedFrom user is null (e.g., original post/user deleted)
            { $or: [{ repostedFrom: null }, { "repostedFrom.user": { $ne: null } }] },
          ],
        },
      },
      // Sort, skip, and limit for fetching posts
      { $sort: { createdAt: -1 } },
    ];

    // --- Calculate totalLikedPosts using a separate pipeline for count ---
    const totalLikedPostsResult = await Post.aggregate([
      ...pipeline, // Use the same filtering stages as the main pipeline
      { $count: "count" },
    ]);
    const totalLikedPosts =
      totalLikedPostsResult.length > 0 ? totalLikedPostsResult[0].count : 0;

    // Fetch paginated liked posts
    const likedPosts = await Post.aggregate([
      ...pipeline, // Use the same filtering stages
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

    // --- START: BLOCKING FILTERING FOR FOLLOWING FEED ---
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

    // Exclude blocked/blocking users from the list of users whose posts we want to see
    const effectiveFollowing = followingObjectIds.filter(
      (id) => !blockedAndBlockingObjectIds.some((blockedId) => blockedId.equals(id))
    );

    if (effectiveFollowing.length === 0) {
      return res.status(200).json({ posts: [], hasNextPage: false });
    }
    // --- END: BLOCKING FILTERING FOR FOLLOWING FEED ---

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const queryConditions = {
      $and: [
        { "deletedFor.user": { $ne: userId } },
        {
          $or: [
            // Posts directly by effectively followed users (not blocked)
            { user: { $in: effectiveFollowing } },
            // Reposts where the user who reposted is effectively followed
            // AND the original post owner is NOT blocked/blocking
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
        select: "-password", // Only exclude password
      })
      .populate({
        path: "repostedFrom",
        populate: {
          path: "user",
          select: "-password", // Only exclude password
        },
        select: "text img likes commentsCount repostsCount createdAt user",
      });

    const finalFeedPosts = rawFeedPosts.filter((post) => {
      // Redundant if query is perfect, but good as a final safeguard
      const postOwnerId = post.user?._id; // This is already an ObjectId from populate
      const repostedFromOwnerId = post.repostedFrom?.user?._id;

      if (blockedAndBlockingObjectIds.some((id) => id.equals(postOwnerId))) return false;
      if (
        post.repostedFrom &&
        blockedAndBlockingObjectIds.some((id) => id.equals(repostedFromOwnerId))
      )
        return false;

      // Existing logic for 'deletedFor' and double reposts
      const isDeletedForMe = post.deletedFor?.some((entry) => entry.user.equals(userId));
      if (isDeletedForMe) {
        return false;
      }

      if (post.repostedFrom && post.repostedFrom.repostedFrom) {
        return false;
      }
      // Additional check if original post is null after populate for reposts (should ideally not happen if query is good)
      if (post.repostedFrom && !post.repostedFrom._id) {
        return false;
      }
      if (post.repostedFrom && !post.repostedFrom.user) {
        // Ensure original post owner is populated
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

    // --- START: BLOCKING CHECK FOR USER PROFILE POSTS VIEW ---
    // Check if the profile owner (user._id) is blocked by the viewer (currentUserId)
    // OR if the viewer (currentUserId) is blocked by the profile owner (user._id)
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
    // --- END: BLOCKING CHECK FOR USER PROFILE POSTS VIEW ---

    const queryConditions = {
      $and: [
        { "deletedFor.user": { $ne: currentUserId } }, // Your existing filter
        {
          $or: [
            // Posts directly by the profile owner (user._id) - they are already not blocked based on initial check
            { user: user._id },
            // Reposts made by the profile owner (user._id)
            // AND ensure the original post owner is NOT blocked/blocking
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
        select: "-password", // Corrected: only exclude password
      })
      .populate({
        path: "repostedFrom",
        populate: {
          path: "user",
          select: "-password", // Corrected: only exclude password
        },
        select: "text img likes commentsCount repostsCount createdAt user",
      });

    const finalUserPosts = rawUserPosts.filter((post) => {
      // Re-check blocking after populate, especially for reposts of posts by blocked users
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
        return false; // No reposts of reposts
      }
      if (post.repostedFrom && !post.repostedFrom.user) {
        // Ensure original post owner is populated
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
        select: "text img likes commentsCount repostsCount createdAt user",
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
