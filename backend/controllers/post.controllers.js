import Post from "../models/post.model.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";

import {
  createAndSendNotification,
  emitNewPostCount,
  emitUnreadNotificationStatus,
  io,
  onlineUsersMap,
} from "../lib/socket.js";
import { extractAndValidateMentions, getBlockingUsers } from "../lib/utils/helpers.js";

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

    const isScheduled = !!scheduledAt;
    const newPostData = {
      user: userId,
      text,
      commentsCount: 0,
      mentionedUsers: mentionedUsersIds,
      isScheduled,
      scheduledAt: isScheduled ? new Date(scheduledAt) : null,
      publishedAt: new Date(),
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

      const notificationPromises = mentionedUsersIds.map((mentionedUserId) =>
        createAndSendNotification({
          from: userId,
          to: mentionedUserId,
          type: "mention",
          postId: newPost._id,
        })
      );

      await Promise.all(notificationPromises);

      if (onlineUsersMap && io) {
        for (const [onlineUserId, socketIdsSet] of onlineUsersMap.entries()) {
          if (onlineUserId.toString() !== userId.toString()) {
            await emitNewPostCount(onlineUserId);
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
    } else {
      await Post.updateOne(
        { _id: postToDelete.repostedFrom },
        {
          $inc: { repostsCount: -1 },
          $pull: { repostedBy: userId },
        }
      );
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
      await Promise.all([
        Post.updateOne({ _id: postId }, { $pull: { likes: userId } }),
        User.updateOne({ _id: userId }, { $pull: { likedPosts: postId } }),
      ]);

      const updatedLikes = post.likes.filter((id) => id.toString() !== userId.toString());
      res.status(200).json(updatedLikes);
    } else {
      // Like post
      post.likes.push(userId);
      await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } });
      await post.save();

      if (post.user.toString() !== userId.toString()) {
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
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User ID not found" });
    }

    const { blockedByMe, blockedMe } = await getBlockingUsers(userId);

    const blockedAndBlockingObjectIds = [
      ...new Set([
        ...blockedByMe.map((id) => new mongoose.Types.ObjectId(id)),
        ...blockedMe.map((id) => new mongoose.Types.ObjectId(id)),
      ]),
    ];

    const now = new Date();

    const scheduledPostConditions = {
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
    };

    const userProjection = {
      _id: 1,
      username: 1,
      fullName: 1,
      profileImg: 1,
      isVerified: 1,
      isGoldVerified: 1,
    };

    const repostedPostProjection = {
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
      publishedAt: 1,
      isScheduled: 1,
      scheduledAt: 1,
      user: 1,
    };

    const initialMatchConditions = {
      "deletedFor.user": { $ne: userId },
      ...scheduledPostConditions,
      user: { $nin: blockedAndBlockingObjectIds },
    };

    const totalPostsResult = await Post.aggregate([
      { $match: initialMatchConditions },
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
                pipeline: [{ $project: { _id: 1 } }],
              },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            { $project: { _id: 1, user: 1, isScheduled: 1, scheduledAt: 1 } },
          ],
        },
      },
      { $unwind: { path: "$repostedFrom", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          $or: [
            { repostedFrom: { $eq: null } },
            {
              $and: [
                { repostedFrom: { $ne: null } },
                { "repostedFrom.user._id": { $nin: blockedAndBlockingObjectIds } },
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
              ],
            },
          ],
        },
      },
      { $count: "count" },
    ]);

    const totalCount = totalPostsResult.length > 0 ? totalPostsResult[0].count : 0;

    const posts = await Post.aggregate([
      { $match: initialMatchConditions },
      { $sort: { publishedAt: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
          pipeline: [{ $project: userProjection }],
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
                pipeline: [{ $project: userProjection }],
              },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            { $project: repostedPostProjection },
          ],
        },
      },
      { $unwind: { path: "$repostedFrom", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          $or: [
            { repostedFrom: { $eq: null } },
            {
              $and: [
                { repostedFrom: { $ne: null } },
                { "repostedFrom.user": { $ne: null } },
                { "repostedFrom.user._id": { $nin: blockedAndBlockingObjectIds } },
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
              ],
            },
          ],
        },
      },
      {
        $project: {
          _id: 1,
          text: 1,
          img: 1,
          video: 1,
          mediaType: 1,
          imgPublicId: 1,
          videoPublicId: 1,
          likes: 1,
          commentsCount: 1,
          repostsCount: 1,
          repostedBy: 1,
          bookmarkedBy: 1,
          pollTotalVotes: 1,
          mentionedUsers: 1,
          isScheduled: 1,
          scheduledAt: 1,
          publishedAt: 1,
          pollOptions: 1,
          createdAt: 1,
          updatedAt: 1,
          user: 1,
          repostedFrom: 1,
        },
      },
    ]);
    const finalFilteredPosts = posts.filter((post) => {
      if (post.repostedFrom && post.repostedFrom.repostedFrom) {
        return false;
      }
      return true;
    });

    const hasNextPage = page * limit < totalCount;

    await User.findByIdAndUpdate(userId, { lastReadFeedTimestamp: new Date() });
    emitNewPostCount(userId.toString());

    res
      .status(200)
      .json({ posts: finalFilteredPosts, hasNextPage, totalPosts: totalCount });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.error(
      "Error in getAllPosts controller (optimized aggregation, fixed reposts): ",
      error
    );
  }
};

export const getLikedPosts = async (req, res) => {
  const userId = req.params.id;
  const currentUserId = req.user?._id;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

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

    const now = new Date();

    const baseMatchConditions = {
      _id: { $in: user.likedPosts },
      "deletedFor.user": {
        $ne: currentUserId ? new mongoose.Types.ObjectId(currentUserId) : null,
      },
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
                isScheduled: 1,
                scheduledAt: 1,
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
          isScheduled: 1,
          scheduledAt: 1,
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
            {
              $or: [
                { repostedFrom: null },
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
          ],
        },
      },
      { $sort: { publishedAt: -1, createdAt: -1 } },
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
      return res.status(200).json({ posts: [], hasNextPage: false, totalPosts: 0 });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const now = new Date();

    const queryConditions = {
      $and: [
        { "deletedFor.user": { $ne: userId } },
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
        {
          $or: [
            { user: { $in: effectiveFollowing } },
            {
              $and: [
                { user: { $in: effectiveFollowing } },
                { repostedFrom: { $ne: null } },
                { "repostedFrom.user": { $nin: blockedAndBlockingObjectIds } },
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

      if (post.repostedFrom && !post.repostedFrom.user) {
        return false;
      }
      if (
        post.repostedFrom &&
        post.repostedFrom.isScheduled &&
        post.repostedFrom.scheduledAt &&
        new Date(post.repostedFrom.scheduledAt) > now
      ) {
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

    const now = new Date();

    const queryConditions = {
      $and: [
        { "deletedFor.user": { $ne: currentUserId } },
        {
          $or: [
            { isScheduled: { $ne: true } },
            { user: currentUserId },
            {
              $and: [
                { isScheduled: true },
                { scheduledAt: { $ne: null } },
                { scheduledAt: { $lte: now } },
              ],
            },
          ],
        },
        {
          $or: [
            { user: user._id },
            {
              $and: [
                { user: user._id },
                { repostedFrom: { $ne: null } },
                { "repostedFrom.user": { $nin: blockedAndBlockingObjectIds } },
                {
                  $or: [
                    { "repostedFrom.isScheduled": { $ne: true } },
                    { "repostedFrom.user": currentUserId },
                    {
                      $and: [
                        { "repostedFrom.isScheduled": true },
                        { "repostedFrom.scheduledAt": { $ne: null } },
                        { "repostedFrom.scheduledAt": { $lte: now } },
                      ],
                    },
                  ],
                },
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
      if (
        post.repostedFrom &&
        post.repostedFrom.isScheduled &&
        post.repostedFrom.scheduledAt &&
        new Date(post.repostedFrom.scheduledAt) > now
      ) {
        if (!currentUserId || !post.repostedFrom.user._id.equals(currentUserId)) {
          return false;
        }
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
          "text img video mediaType likes commentsCount repostsCount bookmarkedBy createdAt user isScheduled scheduledAt repostedBy", // Ensure these are selected
      });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const now = new Date();

    if (post.isScheduled && post.scheduledAt && new Date(post.scheduledAt) > now) {
      if (!currentUserId || post.user._id.toString() !== currentUserId.toString()) {
        return res.status(404).json({ error: "Post not found" });
      }
    }

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

    const originalPostId = postToRepost.repostedFrom || postToRepost._id;
    const originalPost = await Post.findById(originalPostId);
    if (!originalPost) {
      return res.status(404).json({ error: "Original post not found." });
    }

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
        publishedAt: new Date(),
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

export const markFeedPostsAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const userIdObj = new mongoose.Types.ObjectId(userId);

    const now = new Date();

    await User.findByIdAndUpdate(
      userIdObj,
      { $set: { lastReadFeedTimestamp: now } },
      { new: true }
    );

    await emitNewPostCount(userId.toString());

    res.status(200).json({ message: "Feed posts marked as read." });
  } catch (error) {
    console.error("Error marking feed posts as read:", error.message);
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
    const { postId } = req.params;
    const { optionId } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "Post not found." });
    }

    if (!post.pollOptions || post.pollOptions.length === 0) {
      return res.status(400).json({ error: "This post is not a poll." });
    }

    const selectedOption = post.pollOptions.id(optionId);

    if (!selectedOption) {
      return res.status(404).json({ error: "Poll option not found." });
    }
    const hasUserAlreadyVoted = post.pollOptions.some((option) =>
      option.voters.includes(userId)
    );

    if (hasUserAlreadyVoted) {
      return res.status(400).json({ error: "You have already voted on this poll." });
    }

    selectedOption.voters.push(userId);

    post.pollTotalVotes += 1;

    await post.save();

    res.status(200).json({
      message: "Vote cast successfully!",
      pollOptions: post.pollOptions,
      pollTotalVotes: post.pollTotalVotes,
    });
  } catch (error) {
    console.error("Error in voteOnPoll controller:", error.message);
    res.status(500).json({ error: "Internal server error." });
  }
};

export const pinUnpinPost = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

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
      user.pinnedPosts = user.pinnedPosts.filter(
        (id) => id.toString() !== postId.toString()
      );
      await user.save();
      res.status(200).json({ message: "Post unpinned successfully" });
    } else {
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
            select:
              "text img video mediaType likes commentsCount bookmarkedBy repostsCount createdAt user isScheduled scheduledAt repostedBy",
          },
        ],
      })
      .lean();

    if (!userWithPinnedPosts || !userWithPinnedPosts.pinnedPosts) {
      return res.status(200).json([]);
    }

    const { blockedByMe, blockedMe } = await getBlockingUsers(currentUserId);
    const blockedIds = new Set([...blockedByMe, ...blockedMe]);

    const finalPinnedPosts = userWithPinnedPosts.pinnedPosts.filter((post) => {
      const postOwnerId = post.user?._id?.toString();
      const repostedFromOwnerId = post.repostedFrom?.user?._id?.toString();

      if (
        blockedIds.has(postOwnerId) ||
        (repostedFromOwnerId && blockedIds.has(repostedFromOwnerId))
      ) {
        return false;
      }

      if (post.deletedFor?.some((entry) => entry.user.equals(currentUserId))) {
        return false;
      }

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
      scheduledAt: { $gt: new Date() },
    })
      .sort({ scheduledAt: 1 })
      .populate("user", "-password");

    res.status(200).json(scheduledPosts);
  } catch (error) {
    console.log("Error in getScheduledPosts controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateScheduledPost = async (req, res) => {
  try {
    const { id } = req.params;
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

    if (post.imgPublicId) {
      // Assuming cloudinary is configured to destroy the image
      // await cloudinary.uploader.destroy(post.imgPublicId); // Uncomment if you want to delete associated media from Cloudinary on update
    }
    if (post.videoPublicId) {
      // Assuming cloudinary is configured to destroy the video
      // await cloudinary.uploader.destroy(post.videoPublicId, { resource_type: "video" }); // Uncomment if you want to delete associated media from Cloudinary on update
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Scheduled post must have text content." });
    }

    const mentionedUsersIds = await extractAndValidateMentions(text);

    post.text = text;
    post.img = null;
    post.video = null;
    post.imgPublicId = null;
    post.videoPublicId = null;
    post.mediaType = "none";
    post.pollOptions = [];
    post.pollTotalVotes = 0;
    post.mentionedUsers = mentionedUsersIds;
    post.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    post.isScheduled = !!scheduledAt;

    await post.save();

    res.status(200).json(post);
  } catch (error) {
    console.log("Error in updateScheduledPost controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMultipleScheduledPosts = async (req, res) => {
  try {
    const { postIds } = req.body;
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
