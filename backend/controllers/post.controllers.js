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

// Helper function to extract and validate mentions
const extractAndValidateMentions = async (text) => {
  // Regex to find @username patterns (adjust based on your username rules)
  // This regex matches '@' followed by 1 to 30 alphanumeric characters or underscores.
  const mentionRegex = /@([a-zA-Z0-9_]{1,30})\b/g;
  let match;
  const mentionedUsernames = new Set(); // Use a Set to avoid duplicate usernames

  // Extract all unique usernames mentioned in the text
  while ((match = mentionRegex.exec(text)) !== null) {
    mentionedUsernames.add(match[1].toLowerCase()); // Store in lowercase for case-insensitive lookup
  }

  const mentionedUsersIds = [];
  if (mentionedUsernames.size > 0) {
    // Find all users by their usernames from the database
    // Use $in operator to query multiple usernames efficiently
    // Use $options: 'i' for case-insensitive matching
    const users = await User.find({
      username: { $in: Array.from(mentionedUsernames) },
    }).select('_id username'); // Select only ID and username

    // Map found users to their _id
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
    const { text, pollOptions } = req.body;
    let { img, video } = req.body;

    const userId = req.user._id.toString();

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

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

    // Extract and validate mentioned users from the post text
    const mentionedUsersIds = await extractAndValidateMentions(text); // Ensure this function correctly returns an array of user IDs

    const newPostData = {
      user: userId,
      text,
      commentsCount: 0,
      mentionedUsers: mentionedUsersIds, // Store the IDs of mentioned users
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

    await User.findByIdAndUpdate(userId, { $inc: { postsCount: 1 } });

    // --- Create Notifications for Mentioned Users and emit status ---
    for (const mentionedUserId of mentionedUsersIds) {
      // Ensure you don't notify the post author if they mention themselves
      if (mentionedUserId.toString() !== userId.toString()) {
        // You can reuse createAndSendNotification here for consistency
        // Or keep your direct logic if you prefer, but make sure to call emitUnreadNotificationStatus
        await createAndSendNotification({
          from: userId,
          to: mentionedUserId,
          type: "mention",
          postId: newPost._id,
        });
        // The createAndSendNotification function already calls emitUnreadNotificationStatus
        // so you don't need to call it again here if you use it.
        // If you prefer the direct logic, you *must* add:
        // await emitUnreadNotificationStatus(mentionedUserId.toString());
      }
    }

    // Emit new post to online users (excluding the sender)
    // This is separate from notification badge logic
    for (const [onlineUserId, socketIdsSet] of onlineUsersMap.entries()) {
      if (onlineUserId.toString() !== userId.toString()) {
        socketIdsSet.forEach((socketId) => {
          io.to(socketId).emit("newPostAvailable", newPost);
        });
      }
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

    const postToDelete = await Post.findById(id);

    if (!postToDelete) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (postToDelete.user.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ error: "You are not authorized to delete this post" });
    }

    if (postToDelete.mediaType === "image" && postToDelete.imgPublicId) {
      await cloudinary.uploader.destroy(postToDelete.imgPublicId);
    } else if (postToDelete.mediaType === "video" && postToDelete.videoPublicId) {
      await cloudinary.uploader.destroy(postToDelete.videoPublicId, {
        resource_type: "video",
      });
    }

    if (!postToDelete.repostedFrom) {
      await Post.deleteMany({ repostedFrom: postToDelete._id });
      await User.findByIdAndUpdate(postToDelete.user, { $inc: { postsCount: -1 } });
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

    const postOwnerId = post.user.toString();
    if (await isBlockedOrBlockedBy(userId, postOwnerId)) {
      return res.status(403).json({
        error: "You cannot like/unlike this post due to blocking restrictions.",
      });
    }

    const userLikedPost = post.likes.includes(userId);

    if (userLikedPost) {
      await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
      await User.updateOne({ _id: userId }, { $pull: { likedPosts: postId } });

      const updatedLikes = post.likes.filter((id) => id.toString() !== userId.toString());
      res.status(200).json(updatedLikes);
    } else {
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
                video: 1,
                mediaType: 1,
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
                video: 1,
                mediaType: 1,
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
          repostedFrom: 1,
          bookmarkedBy: 1,
          createdAt: 1,
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
        select:
          "text img video mediaType likes commentsCount repostsCount createdAt user",
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
        select:
          "text img video mediaType likes commentsCount repostsCount createdAt user", // <--- ADDED video and mediaType
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
          "text img video mediaType likes commentsCount repostsCount createdAt user",
      });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const postOwnerId = post.user?._id;
    const repostedFromOwnerId = post.repostedFrom?.user?._id;

    if (await isBlockedOrBlockedBy(currentUserId, postOwnerId)) {
      return res
        .status(403)
        .json({ error: "You cannot view this post due to blocking restrictions." });
    }
    if (
      post.repostedFrom &&
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

    const originalPost = await Post.findById(postId);
    if (!originalPost) {
      return res.status(404).json({ error: "Original post not found." });
    }

    const originalPostOwnerId = originalPost.user.toString();
    if (await isBlockedOrBlockedBy(userId, originalPostOwnerId)) {
      return res
        .status(403)
        .json({ error: "You cannot repost this content due to blocking restrictions." });
    }

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
    let hasUserReposted;

    if (existingRepost) {
      await Post.deleteOne({ _id: existingRepost._id });
      originalPost.repostsCount = Math.max(0, originalPost.repostsCount - 1);
      message = "Repost removed successfully.";
      hasUserReposted = false;
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
      hasUserReposted = true;

      if (originalPost.user.toString() !== userId.toString()) {
        await createAndSendNotification({
          from: userId,
          to: originalPost.user,
          type: "repost",
          postId: originalPost._id,
          commentId: null,
        });
      }
    }

    await originalPost.save();

    res.status(200).json({
      message: message,
      newRepostsCount: originalPost.repostsCount,
      hasUserReposted: hasUserReposted,
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
      .sort({ createdAt: -1 })
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
          "text img video mediaType likes commentsCount repostsCount createdAt user",
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
  const currentUserId = req.user?._id; // Get the ID of the authenticated user viewing the profile

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the current user is blocked by or has blocked the profile owner
    if (currentUserId && (await isBlockedOrBlockedBy(currentUserId, user._id))) {
      return res.status(403).json({
        error: "You cannot view posts from this user due to blocking restrictions.",
      });
    }

    // Determine blocked/blocking users for filtering reposts and general posts if necessary
    // For pinned posts, we mainly care about the direct blocking between viewer and profile owner.
    // However, if pinned posts can be reposts, you might need to apply similar logic as getUserPosts.
    // For now, let's assume pinned posts are always original posts of the user whose profile is being viewed.
    // If a pinned post is a repost of someone blocked by the viewer, that's a more complex scenario,
    // which the frontend `Post` component would ideally handle.

    const pinnedPosts = await User.findById(user._id) // Use user._id instead of just 'user'
      .select("pinnedPosts")
      .populate({
        path: "pinnedPosts",
        populate: {
          path: "user",
          select: "username fullName profileImg isVerified",
        },
        // IMPORTANT: If pinned posts can be reposts, you'll need to populate repostedFrom here as well
        // similar to how you do it in getUserPosts.
        // For example:
        // populate: [
        //   { path: "user", select: "username fullName profileImg isVerified" },
        //   {
        //     path: "repostedFrom",
        //     populate: {
        //       path: "user",
        //       select: "username fullName profileImg isVerified",
        //     },
        //     select: "text img video mediaType likes commentsCount repostsCount createdAt user",
        //   },
        // ],
      })
      .lean(); // Use .lean() for performance if you don't need Mongoose document methods

    if (!pinnedPosts || !pinnedPosts.pinnedPosts) {
      return res.status(200).json([]); // No pinned posts found, return empty array
    }

    // Filter out posts that are deleted for the current user, or if they are reposts of blocked users.
    // This part should mirror the filtering logic in getUserPosts to ensure consistency.
    const finalPinnedPosts = pinnedPosts.pinnedPosts.filter((post) => {
      // If the post itself is deleted for the current user
      const isDeletedForMe = post.deletedFor?.some((entry) =>
        entry.user.equals(currentUserId)
      );
      if (isDeletedForMe) {
        return false;
      }

      // If the pinned post is a repost and the original owner is blocked/blocking
      // You'll need `getBlockingUsers` here if you populated `repostedFrom`.
      // For simplicity, assuming pinned posts are always original posts of the profile owner for now.
      // If you implement the `repostedFrom` population, add filtering for it here.

      return true;
    });

    res.status(200).json(finalPinnedPosts);
  } catch (error) {
    console.log("Error in getPinnedPosts: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
