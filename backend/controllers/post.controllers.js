import Post from "../models/post.model.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import { v2 as cloudinary } from "cloudinary";
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
    blockedByMe: user ? user.blockedUsers.map((id) => id.toString()) : [],
    blockedMe: user ? user.blockedBy.map((id) => id.toString()) : [],
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

    // --- START: BLOCKING FILTERING FOR ALL POSTS (GLOBAL FEED) ---
    const { blockedByMe, blockedMe } = await getBlockingUsers(userId);
    const blockedAndBlockingUsers = [...new Set([...blockedByMe, ...blockedMe])];

    const queryConditions = {
      // Exclude posts from users I've blocked or users who have blocked me
      user: { $nin: blockedAndBlockingUsers },
      // Exclude reposts of posts by users I've blocked or users who have blocked me
      "repostedFrom.user": { $nin: blockedAndBlockingUsers },
    };

    // Use aggregate pipeline for better filtering and conditional lookups on nested fields
    const totalPosts = await Post.aggregate([
      {
        $match: {
          $or: [
            { user: { $nin: blockedAndBlockingUsers } },
            { "repostedFrom.user": { $nin: blockedAndBlockingUsers } },
          ],
        },
      },
      { $count: "count" },
    ]);
    const totalCount = totalPosts.length > 0 ? totalPosts[0].count : 0;

    const posts = await Post.find(queryConditions) // Initial query with blocking
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "user", select: "-password blockedUsers blockedBy" }) // Populate user to check blocking on client side too if needed
      .populate({
        path: "repostedFrom",
        populate: {
          path: "user",
          select: "-password blockedUsers blockedBy",
        },
        select: "text img likes commentsCount repostsCount createdAt user",
      });

    const finalFilteredPosts = posts.filter((post) => {
      const postOwnerId = post.user?._id.toString();
      const repostedFromOwnerId = post.repostedFrom?.user?._id.toString();

      // 1. Filter out posts (original or reposts) if the owner is blocked or has blocked current user
      if (blockedAndBlockingUsers.includes(postOwnerId)) {
        return false;
      }

      // 2. If it's a repost, filter out if the original post's owner is blocked or has blocked current user
      if (post.repostedFrom && blockedAndBlockingUsers.includes(repostedFromOwnerId)) {
        return false;
      }

      // Existing logic for 'deletedFor' (ensure it's compatible)
      if (post.repostedFrom && post.repostedFrom.repostedFrom) {
        // Double repost protection
        return false;
      }
      const isOriginalPostDeletedForMe =
        userId &&
        post.deletedFor?.some((entry) => entry.user.toString() === userId.toString());
      if (isOriginalPostDeletedForMe) {
        return false;
      }

      return true;
    });

    const hasNextPage = page * limit < totalCount; // totalCount based on blocked filtered data

    res
      .status(200)
      .json({ posts: finalFilteredPosts, hasNextPage, totalPosts: totalCount }); //// totalPosts renamed to totalCount
    // --- END: BLOCKING FILTERING FOR ALL POSTS ---
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in getAllPosts controller: ", error);
  }
};

export const getLikedPosts = async (req, res) => {
  const userId = req.params.id;
  const currentUserId = req.user?._id; // The authenticated user viewing

  try {
    const user = await User.findById(userId);
    // --- START: BLOCKING CHECK FOR LIKED POSTS VIEW ---
    // If the user whose liked posts are being viewed (userId) is blocked by the current user (currentUserId)
    // OR if the current user (currentUserId) is blocked by the user whose liked posts are being viewed (userId)
    if (await isBlockedOrBlockedBy(currentUserId, userId)) {
      return res.status(403).json({
        error: "You cannot view liked posts of this user due to blocking restrictions.",
      });
    }

    const { blockedByMe, blockedMe } = await getBlockingUsers(currentUserId);
    const blockedAndBlockingUsers = [...new Set([...blockedByMe, ...blockedMe])];
    // --- END: BLOCKING CHECK FOR LIKED POSTS VIEW ---

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build the query for liked posts, integrating blocking filter
    const query = {
      _id: { $in: user.likedPosts },
      // Exclude posts where the owner is blocked or has blocked the current user
      user: { $nin: blockedAndBlockingUsers },
      // Exclude reposts where the original post's owner is blocked or has blocked the current user
      "repostedFrom.user": { $nin: blockedAndBlockingUsers },
    };

    const totalLikedPosts = await Post.countDocuments(query);

    const likedPosts = await Post.find(query)
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
        select: "text img likes commentsCount repostsCount createdAt user",
      });

    // Client-side filtering for edge cases or complex scenarios,
    // though initial query should handle most.
    const finalLikedPosts = likedPosts.filter((post) => {
      const postOwnerId = post.user?._id.toString();
      const repostedFromOwnerId = post.repostedFrom?.user?._id.toString();

      // Re-check to be absolutely sure after populate, though $nin in query should handle
      if (blockedAndBlockingUsers.includes(postOwnerId)) return false;
      if (post.repostedFrom && blockedAndBlockingUsers.includes(repostedFromOwnerId))
        return false;

      // Existing deletedFor logic (if any specific to liked posts)
      const isOriginalPostDeletedForMe =
        currentUserId &&
        post.deletedFor?.some(
          (entry) => entry.user.toString() === currentUserId.toString()
        );
      if (isOriginalPostDeletedForMe) {
        return false;
      }
      return true;
    });

    const hasNextPage = page * limit < totalLikedPosts;

    res.status(200).json({ posts: finalLikedPosts, hasNextPage, totalLikedPosts });
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
    const blockedAndBlockingUsers = [...new Set([...blockedByMe, ...blockedMe])];

    const followingIds = user.following.map((id) => id.toString());
    const effectiveFollowing = followingIds.filter(
      (id) => !blockedAndBlockingUsers.includes(id)
    );

    if (effectiveFollowing.length === 0) {
      return res.status(200).json({ posts: [], hasNextPage: false });
    }
    // --- END: BLOCKING FILTERING FOR FOLLOWING FEED ---

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const baseQuery = {
      user: { $in: effectiveFollowing },
      user: { $nin: blockedAndBlockingUsers },
    };

    // For reposts, the `user` is the one who reposted, which is already covered by `effectiveFollowing`.
    // But the `repostedFrom.user` (original post owner) must also not be blocked.
    const repostQuery = {
      user: { $in: effectiveFollowing }, // The user who reposted is followed
      repostedFrom: { $ne: null },
      // Ensure the original post owner is not blocked
      "repostedFrom.user": { $nin: blockedAndBlockingUsers },
    };

    // Count documents that match the criteria before fetching
    const totalCount = await Post.countDocuments({
      $or: [baseQuery, repostQuery],
      "deletedFor.user": { $ne: userId }, // Your existing filter
    });

    const rawFeedPosts = await Post.find({
      $or: [baseQuery, repostQuery],
      "deletedFor.user": { $ne: userId }, // Your existing filter
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "user",
        select: "-password blockedUsers blockedBy",
      })
      .populate({
        path: "repostedFrom",
        populate: {
          path: "user",
          select: "-password blockedUsers blockedBy",
        },
        select: "text img likes commentsCount repostsCount createdAt user",
      });

    const finalFeedPosts = rawFeedPosts.filter((post) => {
      // Double-check blocking relationships after populate, especially for nested reposts
      const postOwnerId = post.user?._id.toString();
      const repostedFromOwnerId = post.repostedFrom?.user?._id.toString();

      if (blockedAndBlockingUsers.includes(postOwnerId)) return false;
      if (post.repostedFrom && blockedAndBlockingUsers.includes(repostedFromOwnerId))
        return false;

      // Existing logic for 'deletedFor' and double reposts
      const isDeletedForMe = post.deletedFor?.includes(userId.toString());
      if (isDeletedForMe) {
        return false;
      }

      if (post.repostedFrom && post.repostedFrom.repostedFrom) {
        return false; // Prevent showing reposts of reposts
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
    "Error in getFollowingPosts controller: ", error;
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
    const blockedAndBlockingUsers = [...new Set([...blockedByMe, ...blockedMe])];
    // --- END: BLOCKING CHECK FOR USER PROFILE POSTS VIEW ---

    const baseQuery = {
      user: user._id, // Posts directly by the profile owner
    };

    const repostQuery = {
      user: user._id, // Reposts made by the profile owner
      repostedFrom: { $ne: null },
      // Ensure the original post owner is not blocked by the current user
      "repostedFrom.user": { $nin: blockedAndBlockingUsers },
    };

    const rawUserPosts = await Post.find({
      $or: [baseQuery, repostQuery],
      "deletedFor.user": { $ne: currentUserId }, // Your existing filter
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "user", select: "-password blockedUsers blockedBy" })
      .populate({
        path: "repostedFrom",
        populate: {
          path: "user",
          select: "-password blockedUsers blockedBy",
        },
        select: "text img likes commentsCount repostsCount createdAt user",
      });

    const finalUserPosts = rawUserPosts.filter((post) => {
      // Re-check blocking after populate, especially for reposts of posts by blocked users
      const postOwnerId = post.user?._id.toString();
      const repostedFromOwnerId = post.repostedFrom?.user?._id.toString();

      // This should ideally be caught by the initial `isBlockedOrBlockedBy` check above,
      // but as a safeguard for edge cases with `populate`.
      if (blockedAndBlockingUsers.includes(postOwnerId)) return false;
      if (post.repostedFrom && blockedAndBlockingUsers.includes(repostedFromOwnerId))
        return false;

      if (currentUserId) {
        const isDeletedForMe = post.deletedFor?.some(
          (entry) => entry.user.toString() === currentUserId.toString()
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

    // Count documents that match the criteria before fetching
    const totalUserPosts = await Post.countDocuments({
      $or: [baseQuery, repostQuery],
      "deletedFor.user": { $ne: currentUserId },
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
    const post = await Post.findById(req.params.id)
      .populate({
        path: "user",
        select: "username profileImg fullName isVerified",
      })
      .populate({
        path: "repostedFrom",
        populate: [
          {
            path: "user",
            select: "username profileImg fullName isVerified",
          },
        ],
        select: "text img likes commentsCount repostsCount createdAt user",
      });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // --- START: BLOCKING CHECK FOR SINGLE POST VIEW ---
    const postOwnerId = post.user?._id.toString();
    const repostedFromOwnerId = post.repostedFrom?.user?._id.toString();

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
      return res
        .status(403)
        .json({
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