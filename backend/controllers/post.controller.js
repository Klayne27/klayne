import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";

import {
  createAndSendNotification,
  emitNewICPostCount,
  emitNewICUnreadDot,
  emitNewPostCount,
  emitNewVentPostCount,
  emitNewVentUnreadDot,
  io,
  onlineUsersMap,
} from "../lib/socket.js";
import {
  extractAndValidateMentions,
  getBlockingUsers,
  getMutedUsers,
  getPrivateExcludedIds,
  isBlockedOrBlockedBy,
} from "../lib/utils/helpers.js";
import Image from "../models/image.model.js";
import { extractHashtags, syncHashtagCounts } from "../lib/utils/hashtagUtils.js";

export const getPostThread = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId)
      .populate({
        path: "user",
        select:
          "username fullName isCha isVerified isGoldVerified profileImg badges preferredBadge nameColor equipped",
        populate: { path: "profileImg", select: "imageUrl" },
      })
      .populate({ path: "image", select: "imageUrl" })
      .populate({ path: "images", select: "imageUrl" })
      .lean();

    if (!post) return res.status(404).json({ error: "Post not found." });

    const ancestors = [];
    let current = post;

    while (current.parentPost) {
      const parent = await Post.findById(current.parentPost)
        .populate({
          path: "user",
          select:
            "username fullName isCha isVerified isGoldVerified profileImg badges preferredBadge nameColor equipped",
          populate: { path: "profileImg", select: "imageUrl" },
        })
        .populate({ path: "image", select: "imageUrl" })
        .populate({ path: "images", select: "imageUrl" })
        .lean();

      if (!parent) break;
      ancestors.unshift(parent);
      current = parent;
    }

    // ── Mask anonymous ancestor posts ─────────────────────────────────────────
    // An ancestor is anonymous when it (or the root post whose context it
    // lives in) was posted with isAnonymous: true. We never expose the real
    // user details to the client in that case.
    const ANON_USER = {
      _id: null,
      username: "Anonymous",
      fullName: "Anonymous",
      profileImg: { imageUrl: "/avatar-placeholder.png" },
      isCha: false,
      isVerified: false,
      isGoldVerified: false,
      badges: [],
      preferredBadge: null,
      nameColor: null,
      equipped: null,
    };

    const maskedAncestors = ancestors.map((ancestor) =>
      ancestor.isAnonymous ? { ...ancestor, user: ANON_USER } : ancestor,
    );

    // Also mask the focal post itself if anonymous
    const maskedPost = post.isAnonymous ? { ...post, user: ANON_USER } : post;

    res.status(200).json({ post: maskedPost, ancestors: maskedAncestors });
  } catch (error) {
    console.error("Error in getPostThread controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPostReplies = async (req, res) => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const userId = req.user._id;
    const { blockedByMe, blockedMe } = await getBlockingUsers(userId);
    const { all: mutedUserIds } = await getMutedUsers(userId);
    const mutedObjectIds = mutedUserIds.map((id) => new mongoose.Types.ObjectId(id));

    const blockedIds = [...new Set([...blockedByMe, ...blockedMe])].map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    const totalReplies = await Post.countDocuments({
      parentPost: postId,
      user: { $nin: [...blockedIds, ...mutedObjectIds] },
    });

    const replies = await Post.find({
      parentPost: postId,
      user: { $nin: [...blockedIds, ...mutedObjectIds] },
    })
      .populate({
        path: "user",
        select:
          "username fullName isCha isVerified isGoldVerified profileImg badges preferredBadge nameColor equipped",
        populate: { path: "profileImg", select: "imageUrl" },
      })
      .populate({ path: "image", select: "imageUrl" })
      .populate({ path: "images", select: "imageUrl" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // For each reply, fetch its first child reply (if any)
    const repliesWithFirstChild = await Promise.all(
      replies.map(async (reply) => {
        if (reply.repliesCount === 0) return { ...reply, firstChildReply: null };

        const firstChild = await Post.findOne({
          parentPost: reply._id,
          user: { $nin: [...blockedIds, ...mutedObjectIds] },
        })
          .populate({
            path: "user",
            select:
              "username fullName isCha isVerified isGoldVerified profileImg badges preferredBadge nameColor equipped",
            populate: { path: "profileImg", select: "imageUrl" },
          })
          .populate({ path: "image", select: "imageUrl" })
          .populate({ path: "images", select: "imageUrl" })
          .sort({ createdAt: 1 }) // oldest first — the actual first reply
          .lean();

        return { ...reply, firstChildReply: firstChild || null };
      }),
    );

    const hasNextPage = page * limit < totalReplies;

    const maskAnonymousUser = (post) => {
      if (!post || !post.isAnonymous) return post;
      return {
        ...post,
        user: {
          _id: post.user._id,
          username: "Anonymous",
          fullName: "Anonymous",
          profileImg: { imageUrl: "/avatar-placeholder.png" },
          isCha: false,
          isVerified: false,
          isGoldVerified: false,
          badges: [],
          preferredBadge: null,
        },
      };
    };

    const maskedReplies = repliesWithFirstChild.map((reply) => {
      const maskedReply = maskAnonymousUser(reply);
      if (maskedReply.firstChildReply) {
        maskedReply.firstChildReply = maskAnonymousUser(maskedReply.firstChildReply);
      }
      return maskedReply;
    });

    res.status(200).json({ replies: maskedReplies, hasNextPage, totalReplies });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.error("Error in getPostReplies controller:", error);
  }
};

export const createReply = async (req, res) => {
  try {
    const { parentId } = req.params;
    const { text, isStudy } = req.body;
    let { img, video, imgs } = req.body;
    const userId = req.user._id;

    const parent = await Post.findById(parentId).populate("user", "-password -email");
    if (!parent) return res.status(404).json({ error: "Post not found." });

    const parentAuthor = parent.user;

    if (parentAuthor?.isPrivate) {
      const isOwn = parentAuthor._id.toString() === userId.toString();
      const isFollower = parentAuthor.followers?.some(
        (fId) => fId.toString() === userId.toString(),
      );
      if (!isOwn && !isFollower) {
        return res.status(403).json({
          error: "This account is private. Follow them to reply to their posts.",
        });
      }
    }

const incomingImgs = Array.isArray(imgs) ? imgs : [];
if (!text && !img && !incomingImgs.length && !video) {
  return res.status(400).json({ error: "Reply must have text, image, or video." });
}

    const { isGoldVerified } = req.user;
    if (video && !isGoldVerified) {
      return res.status(403).json({ error: "Only Gold Verified users can post videos." });
    }

    const finalIsAnonymous =
      (parent.isVent && req.body.isAnonymous === true) ||
      (!parent.isVent && parent.isAnonymous && req.body.isAnonymous !== false);

    if (await isBlockedOrBlockedBy(userId, parent.user._id)) {
      return res
        .status(403)
        .json({ error: "Cannot reply due to blocking restrictions." });
    }

    let uploadedImgUrl = null;
    let uploadedVideoUrl = null;
    let imgPublicId = null;
    let videoPublicId = null;
    let mediaType = "none";
    let uploadedImages = []; // { url, publicId }

    // const incomingImgs = Array.isArray(imgs) ? imgs.slice(0, 4) : [];
    const incomingSingleImg = img; // legacy single-image support

    if (incomingImgs.length > 0) {
      const uploads = await Promise.all(
        incomingImgs.map((b64) =>
          cloudinary.uploader.upload(b64, { upload_preset: "ml_posts" }),
        ),
      );
      uploadedImages = uploads.map((u) => ({ url: u.secure_url, publicId: u.public_id }));
      uploadedImgUrl = uploadedImages[0].url; // keep legacy field populated
      imgPublicId = uploadedImages[0].publicId;
      mediaType = "image";
    } else if (incomingSingleImg) {
      // legacy path — single base64 img
      const uploadedResponse = await cloudinary.uploader.upload(incomingSingleImg, {
        upload_preset: "ml_posts",
      });
      uploadedImgUrl = uploadedResponse.secure_url;
      imgPublicId = uploadedResponse.public_id;
      uploadedImages = [{ url: uploadedImgUrl, publicId: imgPublicId }];
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

    // ── Extract hashtags ───────────────────────────────────────────────────
    const tags = extractHashtags(text);

    const newReply = new Post({
      user: userId,
      text,
      img: uploadedImgUrl,
      imgPublicId,
      video: uploadedVideoUrl,
      videoPublicId,
      mediaType,
      mentionedUsers: mentionedUsersIds,
      hashtags: tags, // ADD
      parentPost: parentId,
      publishedAt: new Date(),
      isStudy: parent.isStudy || isStudy || false,
      isVent: parent.isVent,
      isAnonymous: finalIsAnonymous,
    });

    await newReply.save();

if (uploadedImages.length > 0) {
  const imageDocs = await Promise.all(
    uploadedImages.map(({ url, publicId }) =>
      new Image({
        imageUrl: url,
        parentDocument: newReply._id,
        parentModel: "Post",
        uploadedBy: userId,
        publicId,
      }).save(),
    ),
  );
  newReply.image = imageDocs[0]._id;
  newReply.images = imageDocs.map((d) => d._id);
  await newReply.save();
}

    // ── Sync hashtag counts ────────────────────────────────────────────────
    if (tags.length) {
      await syncHashtagCounts(tags, []);
    }

    await Post.findByIdAndUpdate(parentId, { $inc: { repliesCount: 1 } });

    if (parent.user._id.toString() !== userId.toString()) {
      await createAndSendNotification({
        from: userId,
        to: parent.user._id,
        type: parent.parentPost === null ? "reply" : "replyReply",
        postId: newReply._id,
        isAnonymousInteraction: finalIsAnonymous,
      });
    }

    const mentionNotificationPromises = mentionedUsersIds
      .filter((mentionedId) => mentionedId.toString() !== userId.toString())
      .map((mentionedId) =>
        createAndSendNotification({
          from: userId,
          to: mentionedId,
          type: "replyMention",
          postId: newReply._id,
          isAnonymousInteraction: finalIsAnonymous,
        }),
      );

    await Promise.all(mentionNotificationPromises);

    const populatedReply = await Post.findById(newReply._id)
      .populate({
        path: "user",
        select:
          "username fullName isCha isVerified isGoldVerified profileImg badges preferredBadge nameColor equipped",
        populate: { path: "profileImg", select: "imageUrl" },
      })
      .populate({ path: "image", select: "imageUrl" })
        .populate({ path: "images", select: "imageUrl" }) // ← add


    let finalReply = populatedReply.toObject();

    if (finalIsAnonymous) {
      finalReply.user = {
        _id: populatedReply.user._id,
        username: "Anonymous",
        fullName: "Anonymous",
        profileImg: { imageUrl: "/avatar-placeholder.png" },
        isCha: false,
        isVerified: false,
        isGoldVerified: false,
        badges: [],
        preferredBadge: null,
      };
    }

    res.status(201).json(finalReply);
  } catch (error) {
    console.error("Error in createReply controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const userId = req.user?._id;
    if (!userId)
      return res.status(401).json({ error: "Unauthorized: User ID not found" });

    const { blockedByMe, blockedMe } = await getBlockingUsers(userId);
    const { all: mutedUserIds } = await getMutedUsers(userId);
    const mutedObjectIds = mutedUserIds.map((id) => new mongoose.Types.ObjectId(id));

    const blockedAndBlockingObjectIds = [
      ...new Set([
        ...blockedByMe.map((id) => new mongoose.Types.ObjectId(id)),
        ...blockedMe.map((id) => new mongoose.Types.ObjectId(id)),
      ]),
    ];

    // ── NEW: private users the current user doesn't follow ────────────────
    const privateExcludedIds = await getPrivateExcludedIds(userId);

    // Combined exclusion list used for both the post author and repost author
    const excludedUserIds = [
      ...blockedAndBlockingObjectIds,
      ...mutedObjectIds,
      ...privateExcludedIds, // ← ADD
    ];
    // ─────────────────────────────────────────────────────────────────────

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
      isCha: 1,
      isVerified: 1,
      isGoldVerified: 1,
      nameColor: 1,
      preferredBadge: 1,
      equipped: 1,
    };

    const repostedPostProjection = {
      text: 1,
      img: 1,
      image: 1,
      images:1,
      video: 1,
      mediaType: 1,
      likes: 1,
      repliesCount: 1,
      repostsCount: 1,
      repostedBy: 1,
      bookmarkedBy: 1,
      createdAt: 1,
      publishedAt: 1,
      isScheduled: 1,
      scheduledAt: 1,
      user: 1,
      pollOptions: 1,
    };

    // ── CHANGE: replace the two separate arrays with excludedUserIds ──────
    const initialMatchConditions = {
      isVent: { $ne: true },
      isStudy: { $ne: true },
      parentPost: null,
      "deletedFor.user": { $ne: userId },
      ...scheduledPostConditions,
      user: { $nin: excludedUserIds }, // ← was [...blocked, ...muted]
    };

    // ── Repost author filter — also excludes private non-followed ─────────
    const repostedFromFilter = {
      $or: [
        { repostedFrom: { $eq: null } },
        {
          $and: [
            { repostedFrom: { $ne: null } },
            { "repostedFrom.user": { $ne: null } },
            {
              "repostedFrom.user._id": {
                $nin: excludedUserIds, // ← was [...blocked, ...muted]
              },
            },
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
    };

    // totalCount aggregate — same structure as before, just use the new vars
    const totalPostsResult = await Post.aggregate([
      {
        $lookup: {
          from: "posts",
          localField: "repostedFrom",
          foreignField: "_id",
          as: "repostedFromPostData",
          pipeline: [{ $project: { isVent: 1 } }],
        },
      },
      { $unwind: { path: "$repostedFromPostData", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          isVent: { $ne: true },
          isStudy: { $ne: true },
          parentPost: null,
          "deletedFor.user": { $ne: userId },
          ...scheduledPostConditions,
          user: { $nin: excludedUserIds },
          "repostedFromPostData.isVent": { $ne: true },
          "repostedFromPostData.isStudy": { $ne: true },
        },
      },
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
      { $match: repostedFromFilter }, // ← unified repost filter
      { $count: "count" },
    ]);

    const totalCount = totalPostsResult.length > 0 ? totalPostsResult[0].count : 0;

    // posts aggregate — same structure, same substitutions
    const posts = await Post.aggregate([
      {
        $lookup: {
          from: "posts",
          localField: "repostedFrom",
          foreignField: "_id",
          as: "repostedFromPostData",
          pipeline: [{ $project: { isVent: 1 } }],
        },
      },
      { $unwind: { path: "$repostedFromPostData", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          isVent: { $ne: true },
          isStudy: { $ne: true },
          parentPost: null,
          "deletedFor.user": { $ne: userId },
          ...scheduledPostConditions,
          user: { $nin: excludedUserIds },
          "repostedFromPostData.isVent": { $ne: true },
          "repostedFromPostData.isStudy": { $ne: true },
        },
      },
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
          pipeline: [
            {
              $lookup: {
                from: "images",
                localField: "profileImg",
                foreignField: "_id",
                as: "profileImg",
              },
            },
            { $unwind: { path: "$profileImg", preserveNullAndEmptyArrays: true } },

            { $project: { ...userProjection, profileImg: "$profileImg" } },
          ],
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "images",
          localField: "image",
          foreignField: "_id",
          as: "image",
        },
      },
      { $unwind: { path: "$image", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "images",
          localField: "images",
          foreignField: "_id",
          as: "images",
        },
      },
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
                pipeline: [
                  {
                    $lookup: {
                      from: "images",
                      localField: "profileImg",
                      foreignField: "_id",
                      as: "profileImg",
                    },
                  },
                  { $unwind: { path: "$profileImg", preserveNullAndEmptyArrays: true } },
                  { $project: userProjection },
                ],
              },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "images",
                localField: "image",
                foreignField: "_id",
                as: "image",
              },
            },
            { $unwind: { path: "$image", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "images",
                localField: "images",
                foreignField: "_id",
                as: "images",
              },
            },
            { $project: repostedPostProjection },
          ],
        },
      },
      { $unwind: { path: "$repostedFrom", preserveNullAndEmptyArrays: true } },
      { $match: repostedFromFilter }, // ← same unified filter here too
      {
        $lookup: {
          from: "posts",
          localField: "parentPost",
          foreignField: "_id",
          as: "parentPost",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user",
                pipeline: [{ $project: { _id: 1, username: 1 } }],
              },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            { $project: { _id: 1, user: 1 } },
          ],
        },
      },
      { $unwind: { path: "$parentPost", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          text: 1,
          img: 1,
          image: 1,
          images: 1,
          video: 1,
          mediaType: 1,
          imgPublicId: 1,
          videoPublicId: 1,
          likes: 1,
          repliesCount: 1,
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
          editHistory: 1,
          parentPost: 1,
        },
      },
    ]);

    const finalFilteredPosts = posts.filter(
      (post) => !(post.repostedFrom && post.repostedFrom.repostedFrom),
    );

    const hasNextPage = page * limit < totalCount;
    await User.findByIdAndUpdate(userId, { lastReadFeedTimestamp: new Date() });
    emitNewPostCount(userId.toString());

    res
      .status(200)
      .json({ posts: finalFilteredPosts, hasNextPage, totalPosts: totalCount });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.error("Error in getAllPosts:", error);
  }
};

export const getICPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User ID not found" });
    }

    const { blockedByMe, blockedMe } = await getBlockingUsers(userId);
    const { all: mutedUserIds } = await getMutedUsers(userId);
    const privateExcludedIds = await getPrivateExcludedIds(userId);

    const mutedObjectIds = mutedUserIds.map((id) => new mongoose.Types.ObjectId(id));

    const blockedAndBlockingObjectIds = [
      ...new Set([
        ...blockedByMe.map((id) => new mongoose.Types.ObjectId(id)),
        ...blockedMe.map((id) => new mongoose.Types.ObjectId(id)),
      ]),
    ];

    const excludedUserIds = [
      ...blockedAndBlockingObjectIds,
      ...mutedObjectIds,
      ...privateExcludedIds,
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
      isCha: 1,
      isVerified: 1,
      isGoldVerified: 1,
      nameColor: 1,
      preferredBadge: 1,
      equipped: 1,
    };

    const repostedPostProjection = {
      text: 1,
      img: 1,
      image: 1,
      images: 1,
      video: 1,
      mediaType: 1,
      likes: 1,
      repostsCount: 1,
      repostedBy: 1,
      bookmarkedBy: 1,
      createdAt: 1,
      publishedAt: 1,
      isScheduled: 1,
      scheduledAt: 1,
      user: 1,
    };

    const icMatchConditions = {
      isStudy: true,
      isVent: { $ne: true },
      parentPost: null,
      "deletedFor.user": { $ne: userId },
      ...scheduledPostConditions,
      user: { $nin: excludedUserIds },
    };

    const totalPostsResult = await Post.aggregate([
      {
        $lookup: {
          from: "posts",
          localField: "repostedFrom",
          foreignField: "_id",
          as: "repostedFromPostData",
          pipeline: [{ $project: { isVent: 1 } }],
        },
      },
      { $unwind: { path: "$repostedFromPostData", preserveNullAndEmptyArrays: true } },

      {
        $match: {
          isVent: { $ne: true },
          isStudy: true,
          "deletedFor.user": { $ne: userId },
          parentPost: null,
          ...scheduledPostConditions,
          user: { $nin: excludedUserIds },
          "repostedFromPostData.isVent": { $ne: true },
        },
      },
      { $match: icMatchConditions },
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
                {
                  "repostedFrom.user._id": {
                    $nin: excludedUserIds,
                  },
                },
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
      {
        $lookup: {
          from: "posts",
          localField: "repostedFrom",
          foreignField: "_id",
          as: "repostedFromPostData",
          pipeline: [{ $project: { isVent: 1 } }],
        },
      },
      { $unwind: { path: "$repostedFromPostData", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          isVent: { $ne: true },
          isStudy: true,
          "deletedFor.user": { $ne: userId },
          parentPost: null,
          ...scheduledPostConditions,
          user: { $nin: excludedUserIds },
          "repostedFromPostData.isVent": { $ne: true },
        },
      },
      { $match: icMatchConditions },
      { $sort: { publishedAt: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
          pipeline: [
            {
              $lookup: {
                from: "images",
                localField: "profileImg",
                foreignField: "_id",
                as: "profileImg",
              },
            },
            { $unwind: { path: "$profileImg", preserveNullAndEmptyArrays: true } },
            { $project: { ...userProjection, profileImg: "$profileImg" } },
          ],
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "images",
          localField: "image",
          foreignField: "_id",
          as: "image",
        },
      },
      { $unwind: { path: "$image", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "images",
          localField: "images",
          foreignField: "_id",
          as: "images",
        },
      },
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
                pipeline: [
                  {
                    $lookup: {
                      from: "images",
                      localField: "profileImg",
                      foreignField: "_id",
                      as: "profileImg",
                    },
                  },
                  { $unwind: { path: "$profileImg", preserveNullAndEmptyArrays: true } },
                  { $project: userProjection },
                ],
              },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "images",
                localField: "image",
                foreignField: "_id",
                as: "image",
              },
            },
            { $unwind: { path: "$image", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "images",
                localField: "images",
                foreignField: "_id",
                as: "images",
              },
            },
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
                {
                  "repostedFrom.user._id": {
                    $nin: excludedUserIds,
                  },
                },
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
        $lookup: {
          from: "posts",
          localField: "parentPost",
          foreignField: "_id",
          as: "parentPost",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user",
                pipeline: [{ $project: { _id: 1, username: 1 } }],
              },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            { $project: { _id: 1, user: 1 } },
          ],
        },
      },
      { $unwind: { path: "$parentPost", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          text: 1,
          img: 1,
          image: 1,
          images: 1,
          video: 1,
          mediaType: 1,
          imgPublicId: 1,
          videoPublicId: 1,
          likes: 1,
          repliesCount: 1,
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
          editHistory: 1,
          parentPost: 1,
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

    await User.findByIdAndUpdate(userId, { lastReadICFeedTimestamp: new Date() });
    await emitNewICPostCount(userId.toString());
    await emitNewICUnreadDot(userId.toString());

    res
      .status(200)
      .json({ posts: finalFilteredPosts, hasNextPage, totalPosts: totalCount });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.error(
      "Error in getICPosts controller (optimized aggregation, fixed reposts): ",
      error,
    );
  }
};

export const getLikedPosts = async (req, res) => {
  const { username } = req.params;
  const currentUserId = req.user?._id;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });

    const isCurrentUser =
      currentUserId && user._id.toString() === currentUserId.toString();

    if (user.isLikedFeedPrivate && !isCurrentUser) {
      return res.status(200).json({
        message: "This user's liked posts are private.",
        posts: [],
        hasNextPage: false,
        totalLikedPosts: 0,
      });
    }

    if (currentUserId && (await isBlockedOrBlockedBy(currentUserId, user._id))) {
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

    // ── Private exclusion ─────────────────────────────────────────────────
    const privateExcludedIds = await getPrivateExcludedIds(currentUserId);
    // Combined: blocked/blocking + private-not-followed
    const excludedAuthorIds = [...blockedAndBlockingObjectIds, ...privateExcludedIds];
    // ─────────────────────────────────────────────────────────────────────

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const now = new Date();

    const baseMatchConditions = {
      isVent: { $ne: true },
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

    const userProjection = {
      _id: 1,
      username: 1,
      fullName: 1,
      isCha: 1,
      isVerified: 1,
      isGoldVerified: 1,
      nameColor: 1,
      preferredBadge: 1,
      equipped: 1,
    };

    const repostedPostProjection = {
      text: 1,
      img: 1,
      image: 1,
      images: 1,
      video: 1,
      mediaType: 1,
      likes: 1,
      pollOptions: 1,
      pollTotalVotes: 1,
      repostsCount: 1,
      repostedBy: 1,
      bookmarkedBy: 1,
      createdAt: 1,
      publishedAt: 1,
      isScheduled: 1,
      scheduledAt: 1,
      user: 1,
    };

    const pipeline = [
      { $match: baseMatchConditions },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
          pipeline: [
            {
              $lookup: {
                from: "images",
                localField: "profileImg",
                foreignField: "_id",
                as: "profileImg",
              },
            },
            { $unwind: { path: "$profileImg", preserveNullAndEmptyArrays: true } },
            { $project: { ...userProjection, profileImg: "$profileImg" } },
          ],
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "images",
          localField: "image",
          foreignField: "_id",
          as: "image",
        },
      },
      { $unwind: { path: "$image", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "images",
          localField: "images",
          foreignField: "_id",
          as: "images",
        },
      },
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
                pipeline: [
                  {
                    $lookup: {
                      from: "images",
                      localField: "profileImg",
                      foreignField: "_id",
                      as: "profileImg",
                    },
                  },
                  { $unwind: { path: "$profileImg", preserveNullAndEmptyArrays: true } },
                  { $project: { ...userProjection, profileImg: "$profileImg" } },
                ],
              },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "images",
                localField: "image",
                foreignField: "_id",
                as: "image",
              },
            },
            { $unwind: { path: "$image", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "images",
                localField: "images",
                foreignField: "_id",
                as: "images",
              },
            },
            { $project: repostedPostProjection },
          ],
        },
      },
      { $unwind: { path: "$repostedFrom", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          user: 1,
          text: 1,
          img: 1,
          image: 1,
          images: 1,
          video: 1,
          mediaType: 1,
          likes: 1,
          pollOptions: 1,
          pollTotalVotes: 1,
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
            // ── Author must not be blocked or private-not-followed ──────────
            { "user._id": { $nin: excludedAuthorIds } },
            {
              $or: [
                { repostedFrom: null },
                {
                  // ── Repost original author same exclusion ───────────────
                  "repostedFrom.user._id": { $nin: excludedAuthorIds },
                },
              ],
            },
            // ──────────────────────────────────────────────────────────────
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
    const { all: mutedUserIds } = await getMutedUsers(userId);
    // Fetch private users the current user does not follow (aligns with reference code functionality)
    const privateExcludedIds = await getPrivateExcludedIds(userId);

    const mutedObjectIds = mutedUserIds.map((id) => new mongoose.Types.ObjectId(id));

    const blockedAndBlockingObjectIds = [
      ...new Set([
        ...blockedByMe.map((id) => new mongoose.Types.ObjectId(id)),
        ...blockedMe.map((id) => new mongoose.Types.ObjectId(id)),
      ]),
    ];

    // Combine exclusions to filter out authors downstream
    const excludedUserIds = [
      ...blockedAndBlockingObjectIds,
      ...mutedObjectIds,
      ...privateExcludedIds,
    ];

    const followingObjectIds = user.following.map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    const effectiveFollowing = followingObjectIds.filter(
      (id) => !blockedAndBlockingObjectIds.some((blockedId) => blockedId.equals(id)),
    );

    if (effectiveFollowing.length === 0) {
      return res.status(200).json({ posts: [], hasNextPage: false, totalPosts: 0 });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

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
      isCha: 1,
      isVerified: 1,
      isGoldVerified: 1,
      nameColor: 1,
      preferredBadge: 1,
      equipped: 1,
    };

    const repostedPostProjection = {
      text: 1,
      img: 1,
      image: 1,
      images: 1, // <-- Added field array to projection
      imgs: 1,
      video: 1,
      mediaType: 1,
      likes: 1,
      repostsCount: 1,
      bookmarkedBy: 1,
      repostedBy: 1,
      createdAt: 1,
      user: 1,
      isScheduled: 1,
      scheduledAt: 1,
    };

    // Main filter criteria matching your initial parameters restricted to effectiveFollowing
    const initialMatchConditions = {
      isVent: { $ne: true },
      parentPost: null,
      "deletedFor.user": { $ne: userId },
      user: { $in: effectiveFollowing },
      ...scheduledPostConditions,
    };

    // Filter evaluating nested repost constraints
    const repostedFromFilter = {
      $or: [
        { repostedFrom: { $eq: null } },
        {
          $and: [
            { repostedFrom: { $ne: null } },
            { "repostedFrom.user": { $ne: null } },
            {
              "repostedFrom.user._id": {
                $nin: excludedUserIds,
              },
            },
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
    };

    // 1. Calculate matching total posts count
    const totalPostsResult = await Post.aggregate([
      {
        $lookup: {
          from: "posts",
          localField: "repostedFrom",
          foreignField: "_id",
          as: "repostedFromPostData",
          pipeline: [{ $project: { isVent: 1 } }],
        },
      },
      { $unwind: { path: "$repostedFromPostData", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          isVent: { $ne: true },
          parentPost: null,
          "deletedFor.user": { $ne: userId },
          "repostedFromPostData.isVent": { $ne: true },
        },
      },
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
      { $match: repostedFromFilter },
      { $count: "count" },
    ]);

    const totalCount = totalPostsResult.length > 0 ? totalPostsResult[0].count : 0;

    // 2. Aggregate data feed collection
    const posts = await Post.aggregate([
      {
        $lookup: {
          from: "posts",
          localField: "repostedFrom",
          foreignField: "_id",
          as: "repostedFromPostData",
          pipeline: [{ $project: { isVent: 1 } }],
        },
      },
      { $unwind: { path: "$repostedFromPostData", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          isVent: { $ne: true },
          parentPost: null,
          "deletedFor.user": { $ne: userId },
          "repostedFromPostData.isVent": { $ne: true },
        },
      },
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
          pipeline: [
            {
              $lookup: {
                from: "images",
                localField: "profileImg",
                foreignField: "_id",
                as: "profileImg",
              },
            },
            { $unwind: { path: "$profileImg", preserveNullAndEmptyArrays: true } },
            { $project: { ...userProjection, profileImg: "$profileImg" } },
          ],
        },
      },
      { $unwind: "$user" },
      // Fetch Legacy Primary Image
      {
        $lookup: {
          from: "images",
          localField: "image",
          foreignField: "_id",
          as: "image",
        },
      },
      { $unwind: { path: "$image", preserveNullAndEmptyArrays: true } },
      // Fetch Multi-Image Array Support
      {
        $lookup: {
          from: "images",
          localField: "images",
          foreignField: "_id",
          as: "images",
        },
      },
      // Lookup and resolve Nested Repost Subdocuments
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
                pipeline: [
                  {
                    $lookup: {
                      from: "images",
                      localField: "profileImg",
                      foreignField: "_id",
                      as: "profileImg",
                    },
                  },
                  { $unwind: { path: "$profileImg", preserveNullAndEmptyArrays: true } },
                  { $project: userProjection },
                ],
              },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            // Nested Legacy Image lookup
            {
              $lookup: {
                from: "images",
                localField: "image",
                foreignField: "_id",
                as: "image",
              },
            },
            { $unwind: { path: "$image", preserveNullAndEmptyArrays: true } },
            // Nested New Multi-Image lookup
            {
              $lookup: {
                from: "images",
                localField: "images",
                foreignField: "_id",
                as: "images",
              },
            },
            { $project: repostedPostProjection },
          ],
        },
      },
      { $unwind: { path: "$repostedFrom", preserveNullAndEmptyArrays: true } },
      { $match: repostedFromFilter },
      {
        $lookup: {
          from: "posts",
          localField: "parentPost",
          foreignField: "_id",
          as: "parentPost",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user",
                pipeline: [{ $project: { _id: 1, username: 1 } }],
              },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            { $project: { _id: 1, user: 1 } },
          ],
        },
      },
      { $unwind: { path: "$parentPost", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          text: 1,
          img: 1,
          image: 1,
          images: 1, // Output collection arrays
          video: 1,
          mediaType: 1,
          imgPublicId: 1,
          videoPublicId: 1,
          likes: 1,
          repliesCount: 1,
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
          editHistory: 1,
          parentPost: 1,
        },
      },
    ]);

    // Simple validation block verifying depth validation
    const finalFeedPosts = posts.filter(
      (post) => !(post.repostedFrom && post.repostedFrom.repostedFrom),
    );

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

    // ── NEW: private profiles the viewer doesn't follow ───────────────────
    const privateExcludedIds = await getPrivateExcludedIds(currentUserId);

    // Combined exclusion — used to filter reposts of private authors
    const excludedAuthorIds = [...blockedAndBlockingObjectIds, ...privateExcludedIds];
    // ─────────────────────────────────────────────────────────────────────

    const now = new Date();

    const queryConditions = {
      parentPost: null,
      $and: [
        // Show regular posts AND non-anonymous vent posts
        {
          $or: [{ isVent: { $ne: true } }, { isVent: true, isAnonymous: { $ne: true } }],
        },
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
        { $or: [{ user: user._id }] },
      ],
    };
    const totalUserPosts = await Post.countDocuments(queryConditions);

    const rawUserPosts = await Post.find(queryConditions)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "user",
        select:
          "username fullName profileImg badges isAdmin isCha isVerified isGoldVerified preferredBadge nameColor equipped",
        populate: { path: "profileImg coverImg", select: "imageUrl publicId" },
      })
      .populate({
        path: "repostedFrom",
        populate: [
          {
            path: "user",
            select:
              "username fullName profileImg badges isAdmin isCha isVerified isGoldVerified preferredBadge nameColor equipped",
            populate: { path: "profileImg coverImg", select: "imageUrl publicId" },
          },
          { path: "image", select: "imageUrl" },
          { path: "images", select: "imageUrl" },
        ],
        select:
          "text img video mediaType likes bookmarkedBy repostsCount isStudy repostedBy createdAt user isScheduled scheduledAt image",
      })
      .populate("image", "imageUrl")
      .populate("images", "imageUrl")
      .lean();

    const finalUserPosts = rawUserPosts.filter((post) => {
      const postOwnerId = post.user?._id;
      const repostedFromOwnerId = post.repostedFrom?.user?._id;

      if (blockedAndBlockingObjectIds.some((id) => id.equals(postOwnerId))) return false;
      if (
        post.repostedFrom &&
        blockedAndBlockingObjectIds.some((id) => id.equals(repostedFromOwnerId))
      )
        return false;

      // ── NEW: hide reposts whose original author is private + not followed ──
      if (post.repostedFrom && repostedFromOwnerId) {
        if (excludedAuthorIds.some((id) => id.equals(repostedFromOwnerId))) return false;
      }
      // ───────────────────────────────────────────────────────────────────────

      if (currentUserId) {
        const isDeletedForMe = post.deletedFor?.some((entry) =>
          entry.user.equals(currentUserId),
        );
        if (isDeletedForMe) return false;
      }

      if (post.repostedFrom && post.repostedFrom.repostedFrom) return false;
      if (post.repostedFrom && !post.repostedFrom.user) return false;
      if (
        post.repostedFrom?.isScheduled &&
        post.repostedFrom?.scheduledAt &&
        new Date(post.repostedFrom.scheduledAt) > now &&
        (!currentUserId || !post.repostedFrom.user._id.equals(currentUserId))
      )
        return false;

      return true;
    });

    const hasNextPage = page * limit < totalUserPosts;
    res
      .status(200)
      .json({ posts: finalUserPosts, hasNextPage, totalPosts: totalUserPosts });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.error("Error in getUserPosts:", error);
  }
};

export const getUserReplies = async (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user?._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const targetUser = await User.findOne({ username });
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    if (currentUserId && (await isBlockedOrBlockedBy(currentUserId, targetUser._id))) {
      return res.status(403).json({ error: "Cannot view this user's replies." });
    }

    const { blockedByMe, blockedMe } = await getBlockingUsers(currentUserId);
    const blockedIds = [
      ...new Set([
        ...blockedByMe.map((id) => new mongoose.Types.ObjectId(id)),
        ...blockedMe.map((id) => new mongoose.Types.ObjectId(id)),
      ]),
    ];

    // ── Private exclusion ─────────────────────────────────────────────────
    const privateExcludedIds = await getPrivateExcludedIds(currentUserId);
    // For replies: hide replies directed at private users the viewer can't see
    const excludedParentAuthorIds = [...blockedIds, ...privateExcludedIds];
    // ─────────────────────────────────────────────────────────────────────

    const userProjection = {
      _id: 1,
      username: 1,
      fullName: 1,
      profileImg: 1,
      isCha: 1,
      isVerified: 1,
      isGoldVerified: 1,
      nameColor: 1,
      preferredBadge: 1,
      equipped: 1,
    };

    const matchConditions = {
      user: targetUser._id,
      parentPost: { $ne: null },
      "deletedFor.user": { $ne: currentUserId },
      $or: [{ isVent: { $ne: true } }, { isVent: true, isAnonymous: { $ne: true } }],
    };

    const totalCount = await Post.countDocuments(matchConditions);

    const replies = await Post.aggregate([
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
          pipeline: [
            {
              $lookup: {
                from: "images",
                localField: "profileImg",
                foreignField: "_id",
                as: "profileImg",
              },
            },
            { $unwind: { path: "$profileImg", preserveNullAndEmptyArrays: true } },
            { $project: { ...userProjection, profileImg: "$profileImg" } },
          ],
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "images",
          localField: "image",
          foreignField: "_id",
          as: "image",
        },
      },
      { $unwind: { path: "$image", preserveNullAndEmptyArrays: true } },
            {
        $lookup: {
          from: "images",
          localField: "images",
          foreignField: "_id",
          as: "images",
        },
      },
      {
        $lookup: {
          from: "posts",
          localField: "parentPost",
          foreignField: "_id",
          as: "parentPost",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user",
                pipeline: [{ $project: { _id: 1, username: 1, fullName: 1 } }],
              },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            // ── Mask identity if the parent post is anonymous ──────────────────
            {
              $addFields: {
                "user.username": {
                  $cond: [{ $eq: ["$isAnonymous", true] }, "Anonymous", "$user.username"],
                },
                "user.fullName": {
                  $cond: [{ $eq: ["$isAnonymous", true] }, "Anonymous", "$user.fullName"],
                },
              },
            },
            // ──────────────────────────────────────────────────────────────────
            { $project: { _id: 1, text: 1, user: 1, isAnonymous: 1 } }, // ← add isAnonymous
          ],
        },
      },
      { $unwind: { path: "$parentPost", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          $and: [
            { "user._id": { $nin: blockedIds } },
            {
              // ── Hide replies whose parent post is from a private-not-followed author ──
              $or: [
                { parentPost: null },
                {
                  "parentPost.user._id": { $nin: excludedParentAuthorIds },
                },
              ],
              // ────────────────────────────────────────────────────────────────────────
            },
          ],
        },
      },
      {
        $project: {
          _id: 1,
          text: 1,
          img: 1,
          image: 1,
          images: 1,
          video: 1,
          mediaType: 1,
          likes: 1,
          repliesCount: 1,
          repostsCount: 1,
          repostedBy: 1,
          bookmarkedBy: 1,
          createdAt: 1,
          publishedAt: 1,
          mentionedUsers: 1,
          editHistory: 1,
          isStudy: 1,
          isAnonymous: 1,
          pollOptions: 1,
          pollTotalVotes: 1,
          user: 1,
          parentPost: 1,
        },
      },
    ]);

    const hasNextPage = page * limit < totalCount;
    res.status(200).json({ posts: replies, hasNextPage, totalPosts: totalCount });
  } catch (error) {
    console.error("Error in getUserReplies controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserMedia = async (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user?._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const targetUser = await User.findOne({ username });
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    if (currentUserId && (await isBlockedOrBlockedBy(currentUserId, targetUser._id))) {
      return res.status(403).json({ error: "Cannot view this user's media." });
    }

    const userProjection = {
      _id: 1,
      username: 1,
      fullName: 1,
      profileImg: 1,
      isCha: 1,
      isVerified: 1,
      isGoldVerified: 1,
      preferredBadge: 1,
      nameColor: 1,
      equipped: 1,
    };

    // FIX: match only posts that actually have media.
    // mediaType is set to "image" or "video" in createPost/createReply whenever
    // media is uploaded — this is the authoritative flag, not the presence of
    // individual fields. We also exclude anonymous vent posts so the media tab
    // doesn't leak identity.
    const matchConditions = {
      user: targetUser._id,
      mediaType: { $in: ["image", "video"] }, // only posts with media
      "deletedFor.user": { $ne: currentUserId },
      $or: [
        { isAnonymous: { $ne: true } }, // non-anonymous posts always OK
        { isVent: { $ne: true } }, // non-vent anonymous posts are fine
      ],
    };

    const totalCount = await Post.countDocuments(matchConditions);

    const mediaPosts = await Post.aggregate([
      { $match: matchConditions },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },

      // ── Populate post author ──────────────────────────────────────────────
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
          pipeline: [
            {
              $lookup: {
                from: "images",
                localField: "profileImg",
                foreignField: "_id",
                as: "profileImg",
              },
            },
            { $unwind: { path: "$profileImg", preserveNullAndEmptyArrays: true } },
            { $project: { ...userProjection, profileImg: "$profileImg" } },
          ],
        },
      },
      { $unwind: "$user" },

      // ── Populate primary image (legacy single-image ref) ──────────────────
      {
        $lookup: {
          from: "images",
          localField: "image",
          foreignField: "_id",
          as: "image",
        },
      },
      { $unwind: { path: "$image", preserveNullAndEmptyArrays: true } },

      // ── Populate images array (multi-image) ───────────────────────────────
      {
        $lookup: {
          from: "images",
          localField: "images",
          foreignField: "_id",
          as: "images",
        },
      },

      // ── Project only what the frontend needs ──────────────────────────────
      {
        $project: {
          _id: 1,
          text: 1,
          img: 1,
          image: 1,
          images: 1,
          video: 1,
          mediaType: 1,
          likes: 1,
          repliesCount: 1,
          repostsCount: 1,
          repostedBy: 1,
          bookmarkedBy: 1,
          isAnonymous: 1,
          isVent: 1,
          publishedAt: 1,
          createdAt: 1,
          user: 1,
        },
      },
    ]);

    const hasNextPage = page * limit < totalCount;
    res.status(200).json({ posts: mediaPosts, hasNextPage, totalPosts: totalCount });
  } catch (error) {
    console.error("Error in getUserMedia controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const getPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const currentUserId = req.user?._id;

    const post = await Post.findById(postId)
      .populate({
        path: "user",
        select:
          "username fullName profileImg badges isCha isVerified isGoldVerified preferredBadge nameColor equipped",
        populate: {
          path: "profileImg coverImg",
          select: "imageUrl publicId",
        },
      })
      .populate({
        path: "repostedFrom",
        populate: [
          {
            path: "user",
            select:
              "username fullName profileImg badges isAdmin isCha isVerified isGoldVerified preferredBadge nameColor equipped",
            populate: {
              path: "profileImg coverImg",
              select: "imageUrl publicId",
            },
          },
        ],
        select:
          "text img images video mediaType isVent likes repostsCount bookmarkedBy createdAt user isScheduled scheduledAt repostedBy", // Ensure these are selected
      })
      .populate("image", "imageUrl")
      .populate("images", "imageUrl")
      .lean();

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

export const getBookmarkedPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const { query, page = 1, limit = 10 } = req.query;

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);

    // ── Private exclusion ─────────────────────────────────────────────────
    const privateExcludedIds = await getPrivateExcludedIds(userId);
    const privateExcludedSet = new Set(privateExcludedIds.map((id) => id.toString()));
    // ─────────────────────────────────────────────────────────────────────

    let filter = { bookmarkedBy: userId };
    if (query) filter.text = { $regex: query, $options: "i" };

    const bookmarkedPosts = await Post.find(filter)
      .sort({ publishedAt: -1, createdAt: -1 })
      .populate({
        path: "user",
        select:
          "username fullName profileImg badges isAdmin isCha isVerified isGoldVerified preferredBadge nameColor equipped",
        populate: { path: "profileImg", select: "imageUrl" },
      })
      .populate({
        path: "repostedFrom",
        populate: {
          path: "user",
          select:
            "username fullName profileImg badges isAdmin isCha isVerified isGoldVerified preferredBadge nameColor equipped",
          populate: { path: "profileImg", select: "imageUrl" },
        },
        select:
          "text img video mediaType likes repliesCount repostsCount createdAt user repostedBy",
      })
      .populate({
        path: "parentPost",
        populate: {
          path: "user",
          select:
            "username fullName profileImg badges isAdmin isCha isVerified isGoldVerified preferredBadge nameColor equipped",
        },
      })
      .populate("image", "imageUrl")
      .populate("images", "imageUrl")
      .lean();

    // ── Filter: hide reposts whose original author is private + not followed ──
    const filteredPosts = bookmarkedPosts.filter((post) => {
      if (post) {
        const repostAuthorId = post?.user?._id?.toString();
        if (repostAuthorId && privateExcludedSet.has(repostAuthorId)) return false;
      }
      return true;
    });
    // ──────────────────────────────────────────────────────────────────────

    const totalPostsCount = filteredPosts.length;
    const paginated = filteredPosts.slice(
      (parsedPage - 1) * parsedLimit,
      parsedPage * parsedLimit,
    );
    const hasNextPage = totalPostsCount > parsedPage * parsedLimit;

    res.status(200).json({
      posts: paginated,
      currentPage: parsedPage,
      totalPages: Math.ceil(totalPostsCount / parsedLimit),
      hasNextPage,
      totalPosts: totalPostsCount,
    });
  } catch (error) {
    console.error("Error in getBookmarkedPosts controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
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
          {
            path: "user",
            select:
              "username fullName profileImg badges isAdmin isCha isVerified isGoldVerified preferredBadge nameColor equipped",
            populate: {
              path: "profileImg",
              select: "imageUrl",
            },
          },
          {
            path: "image",
            select: "imageUrl",
          },
          {
            path: "images",
            select: "imageUrl",
          },
          {
            path: "repostedFrom",
            select:
              "text img video mediaType likes bookmarkedBy repostsCount createdAt user isScheduled scheduledAt repostedBy image",
            populate: [
              {
                path: "user",
                select:
                  "username fullName profileImg badges isAdmin isCha isVerified isGoldVerified preferredBadge nameColor equipped",
                populate: {
                  path: "profileImg",
                  select: "imageUrl",
                },
              },
              {
                path: "image",
                select: "imageUrl",
              },
              {
                path: "images",
                select: "imageUrl",
              },
            ],
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
      .populate("user", "-password -email");

    res.status(200).json(scheduledPosts);
  } catch (error) {
    console.log("Error in getScheduledPosts controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createPost = async (req, res) => {
  try {
    const { text, pollOptions, scheduledAt, isStudy } = req.body;
    let { img, video, imgs } = req.body;

    const userId = req.user._id.toString();

const incomingImgs = Array.isArray(imgs) ? imgs : [];
if (!text && !img && !incomingImgs.length && !video) {
  return res.status(400).json({ error: "Post must have text, image, or video." });
}

    const { isGoldVerified } = req.user;

    if (video && !isGoldVerified) {
      return res.status(403).json({ error: "Only Gold Verified users can post videos." });
    }

    try {
      if (
        !text &&
        !img &&
        !incomingImgs.length &&
        !video &&
        (!pollOptions || pollOptions.length === 0)
      ) {
        return res
          .status(400)
          .json({ error: "Post must have text, image, video, or poll options." });
      }

      if ((img || video) && pollOptions && pollOptions.length > 0) {
        return res
          .status(400)
          .json({ error: "You cannot post a poll with an image or video." });
      }
    } catch (uploadError) {
      return res.status(500).json({
        error: "Failed to upload media. Please try again.",
        details: uploadError.message,
      });
    }

    let uploadedImgUrl = null;
    let uploadedVideoUrl = null;
    let imgPublicId = null;
    let videoPublicId = null;
    let mediaType = "none";
    let uploadedImages = []; // { url, publicId }

    // const incomingImgs = Array.isArray(imgs) ? imgs.slice(0, 4) : [];
    const incomingSingleImg = img; // legacy single-image support

    if (incomingImgs.length > 0) {
      const uploads = await Promise.all(
        incomingImgs.map((b64) =>
          cloudinary.uploader.upload(b64, { upload_preset: "ml_posts" }),
        ),
      );
      uploadedImages = uploads.map((u) => ({ url: u.secure_url, publicId: u.public_id }));
      uploadedImgUrl = uploadedImages[0].url; // keep legacy field populated
      imgPublicId = uploadedImages[0].publicId;
      mediaType = "image";
    } else if (incomingSingleImg) {
      // legacy path — single base64 img
      const uploadedResponse = await cloudinary.uploader.upload(incomingSingleImg, {
        upload_preset: "ml_posts",
      });
      uploadedImgUrl = uploadedResponse.secure_url;
      imgPublicId = uploadedResponse.public_id;
      uploadedImages = [{ url: uploadedImgUrl, publicId: imgPublicId }];
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

    // ── Extract hashtags early so they can be stored on the post ──────────
    const tags = extractHashtags(text);

    const isScheduled = !!scheduledAt;
    const newPostData = {
      user: userId,
      text,
      mentionedUsers: mentionedUsersIds,
      hashtags: tags, // store on document from the start
      isScheduled,
      scheduledAt: isScheduled ? new Date(scheduledAt) : null,
      publishedAt: new Date(),
      isStudy: isStudy || false,
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
      newPostData.img = uploadedImgUrl; // legacy compat
      newPostData.imgPublicId = imgPublicId;
      newPostData.video = uploadedVideoUrl;
      newPostData.videoPublicId = videoPublicId;
      newPostData.mediaType = mediaType;
    }

    const newPost = new Post(newPostData);
    await newPost.save();

    let newImage = null;

    if (uploadedImages.length > 0) {
      const imageDocs = await Promise.all(
        uploadedImages.map(({ url, publicId }) =>
          new Image({
            imageUrl: url,
            parentDocument: newPost._id,
            parentModel: "Post",
            uploadedBy: userId,
            publicId,
          }).save(),
        ),
      );
      newPost.image = imageDocs[0]._id; // legacy single ref
      newPost.images = imageDocs.map((d) => d._id); // new multi-image refs
      await newPost.save();
    }

    // ── Sync hashtag counts BEFORE responding ─────────────────────────────
    // Previously this ran after res.json(), making it fire-and-forget and
    // ensuring the response never reflected the saved hashtags.
    if (tags.length) {
      await syncHashtagCounts(tags, []);
    }

    const isAnonymousInteraction =
      newPost.isVent &&
      newPost.isAnonymous &&
      newPost.user.toString() === userId.toString();

    if (!newPost.isScheduled) {
      await User.findByIdAndUpdate(userId, { $inc: { postsCount: 1 } });

      const notificationPromises = mentionedUsersIds.map((mentionedUserId) =>
        createAndSendNotification({
          from: userId,
          to: mentionedUserId,
          type: "mention",
          postId: newPost._id,
          isAnonymousInteraction,
        }),
      );

      await Promise.all(notificationPromises);

      if (onlineUsersMap && io) {
        for (const [onlineUserId] of onlineUsersMap.entries()) {
          if (onlineUserId.toString() !== userId.toString()) {
            if (newPost.isStudy) {
              await emitNewICPostCount(onlineUserId);
              await emitNewICUnreadDot(onlineUserId);
            } else {
              await emitNewPostCount(onlineUserId);
            }
          }
        }
      }
    } else {
      console.log(`Post scheduled for ${newPost.scheduledAt}`);
    }

    const populatedPost = await Post.findById(newPost._id)
      .populate({
        path: "user",
        select:
          "username isPrivate fullName isCha isVerified isGoldVerified badges preferredBadge nameColor equipped",
        populate: { path: "profileImg", select: "imageUrl" },
      })
      .populate({ path: "image", select: "imageUrl" })
      .populate({ path: "images", select: "imageUrl" }) // ← add

      .populate({ path: "video" })
      .exec();

    res.status(201).json(populatedPost);
  } catch (error) {
    if (error.message.includes("Poll options cannot be empty.")) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in createPost controller: ", error);
  }
};

export const editPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "Post cannot be empty." });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.user.toString() !== userId.toString()) {
      return res.status(403).json({ error: "You are not authorized to edit this post." });
    }

    // No-op: text unchanged – return current state without touching hashtags.
    if (post.text === text) {
      const populatedPost = await Post.findById(post._id)
        .populate({
          path: "user",
          select:
            "username fullName isCha isVerified isGoldVerified badges preferredBadge nameColor equipped",
          populate: { path: "profileImg", select: "imageUrl" },
        })
        .populate({
          path: "repostedFrom",
          populate: {
            path: "user",
            select:
              "username fullName isCha isVerified isGoldVerified badges preferredBadge nameColor equipped",
            populate: { path: "profileImg", select: "imageUrl" },
          },
        });
      return res.status(200).json(populatedPost);
    }

    // ── Diff hashtags ───────────────────────────────────────────────────────
    const oldTags = post.hashtags ?? []; // tags on the stored document
    const newTags = extractHashtags(text); // tags in the incoming text

    const oldSet = new Set(oldTags);
    const newSet = new Set(newTags);

    const added = newTags.filter((t) => !oldSet.has(t)); // net-new → increment
    const removed = oldTags.filter((t) => !newSet.has(t)); // dropped  → decrement

    post.editHistory.push({ text: post.text });
    post.text = text;
    post.updatedAt = new Date();
    post.hashtags = newTags;
    post.mentionedUsers = await extractAndValidateMentions(text);

    await post.save();

    // Persist count changes after the document is saved so we don't update
    // counts if the save fails.
    if (added.length || removed.length) {
      await syncHashtagCounts(added, removed);
    }

    const populatedPost = await Post.findById(post._id)
      .populate({
        path: "user",
        select:
          "username fullName isCha isVerified isGoldVerified badges preferredBadge nameColor equipped",
        populate: { path: "profileImg", select: "imageUrl" },
      })
      .populate({
        path: "repostedFrom",
        populate: {
          path: "user",
          select:
            "username fullName isCha isVerified isGoldVerified badges preferredBadge nameColor equipped",
          populate: { path: "profileImg", select: "imageUrl" },
        },
      });

    res.status(200).json(populatedPost);
  } catch (error) {
    console.error("Error in editPost controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const postToDelete = await Post.findById(postId);

    if (!postToDelete) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (!postToDelete.user.equals(userId) && !req.user.isAdmin) {
      return res
        .status(401)
        .json({ error: "You are not authorized to delete this post" });
    }

    if (!postToDelete.repostedFrom) {
      // ── Collect all descendant IDs (for cascade delete + hashtag cleanup) ─
      const idsToDelete = [postToDelete._id];
      let frontier = [postToDelete._id];

      while (frontier.length > 0) {
        const children = await Post.find(
          { parentPost: { $in: frontier } },
          { _id: 1 },
        ).lean();
        const childIds = children.map((c) => c._id);
        if (childIds.length === 0) break;
        idsToDelete.push(...childIds);
        frontier = childIds;
      }

      // ── Decrement hashtag counts for all posts being deleted ─────────────
      const allDocsToDelete = await Post.find(
        { _id: { $in: idsToDelete } },
        { hashtags: 1 },
      ).lean();

      // Build a frequency map: tag → total decrement amount
      const tagFrequency = {};
      for (const doc of allDocsToDelete) {
        for (const tag of doc.hashtags ?? []) {
          tagFrequency[tag] = (tagFrequency[tag] ?? 0) + 1;
        }
      }

      if (Object.keys(tagFrequency).length > 0) {
        const Hashtag = (await import("../models/hashtag.model.js")).default;
        const ops = Object.entries(tagFrequency).map(([tag, freq]) => ({
          updateOne: {
            filter: { tag, count: { $gte: freq } },
            update: { $inc: { count: -freq } },
          },
        }));
        await Hashtag.bulkWrite(ops, { ordered: false });
      }

      // ── Media cleanup (FIXED LOGIC) ───────────────────────────────────────

      // 1. Fetch any attached subdocuments from the Image collection for this post
      const imageSubDocuments = await Image.find(
        { parentDocument: postToDelete._id },
        { publicId: 1 },
      ).lean();

      // 2. Build a unique array of publicIds combining the subdocuments and legacy field
      const publicIdsToDestroy = imageSubDocuments
        .map((img) => img.publicId)
        .filter(Boolean); // Filter out any empty/null records

      if (
        postToDelete.imgPublicId &&
        !publicIdsToDestroy.includes(postToDelete.imgPublicId)
      ) {
        publicIdsToDestroy.push(postToDelete.imgPublicId);
      }

      // 3. Fire parallel Cloudinary destruction calls if IDs are present
      if (publicIdsToDestroy.length > 0) {
        await Promise.all(
          publicIdsToDestroy.map((publicId) => cloudinary.uploader.destroy(publicId)),
        );
      }

      // 4. Wipe out referenced records from the Image database collection
      await Image.deleteMany({ parentDocument: postToDelete._id });

      // Video Cleanup Block
      if (postToDelete.videoPublicId) {
        await cloudinary.uploader.destroy(postToDelete.videoPublicId, {
          resource_type: "video",
        });
      }

      // ── Delete reposts of the root ─────────────────────────────────────
      await Post.deleteMany({ repostedFrom: postToDelete._id });

      // ── Delete descendants ────────────────────────────────────────────
      const descendantIds = idsToDelete.slice(1);
      if (descendantIds.length > 0) {
        await Post.deleteMany({ _id: { $in: descendantIds } });
      }

      // ── Update parent reply count ─────────────────────────────────────
      if (postToDelete.parentPost) {
        await Post.findByIdAndUpdate(postToDelete.parentPost, {
          $inc: { repliesCount: -1 },
        });
      }

      await Post.deleteOne({ _id: postId });
    } else {
      // Repost deletion: just decrement the original's repost counter.
      await Post.updateOne(
        { _id: postToDelete.repostedFrom },
        {
          $inc: { repostsCount: -1 },
          $pull: { repostedBy: userId },
        },
      );
      await Post.deleteOne({ _id: postId });
    }

    res.status(200).json({
      message: "Post deleted successfully",
      parentPostId: postToDelete.parentPost ?? null,
    });
  } catch (error) {
    console.error("Error in deletePost controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const likeUnlikePost = async (req, res) => {
  try {
    const userId = req.user._id;
    const { postId } = req.params;

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
        const isAnonymousInteraction =
          post.isVent && post.isAnonymous && post.user.toString() === userId.toString();

        if (post.parentPost === null) {
          await createAndSendNotification({
            from: userId,
            to: post.user,
            type: "like",
            postId: postId,
            isAnonymousInteraction: isAnonymousInteraction,
          });
        } else {
          await createAndSendNotification({
            from: userId,
            to: post.user,
            type: "replyLike",
            postId: postId,
            isAnonymousInteraction: isAnonymousInteraction,
          });
        }
      }

      res.status(200).json(post.likes);
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in likeUnlikePost controller: ", error);
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

    const isOriginalVent = originalPost.isVent;
    const isOriginalAnonymous = originalPost.isAnonymous;
    const isOriginalIC = originalPost.isStudy;

    const originalPostOwnerId = originalPost.user.toString();
    if (await isBlockedOrBlockedBy(userId, originalPostOwnerId)) {
      return res.status(403).json({
        error: "You cannot interact with this content due to blocking restrictions.",
      });
    }

    const existingRepost = await Post.findOne({
      user: userId,
      repostedFrom: originalPostId,
    });

    if (existingRepost) {
      await Post.deleteOne({ _id: existingRepost._id });
      await Post.updateOne(
        { _id: originalPostId },
        { $pull: { repostedBy: userId }, $inc: { repostsCount: -1 } },
      );

      res.status(200).json({
        message: "Repost removed successfully.",
      });
    } else {
      const newRepost = new Post({
        user: userId,
        repostedFrom: originalPostId,
        publishedAt: new Date(),
        isVent: isOriginalVent,
        isAnonymous: isOriginalAnonymous,
        isStudy: isOriginalIC,
        pollOptions: originalPost.pollOptions,
        pollTotalVotes: originalPost.pollTotalVotes,
        image: originalPost.image,
        images: originalPost.images,
        img: originalPost.img,
        video: originalPost.video,
        mediaType: originalPost.mediaType,
      });

      await newRepost.save();
      await Post.updateOne(
        { _id: originalPostId },
        { $addToSet: { repostedBy: userId }, $inc: { repostsCount: 1 } },
      );

      if (!originalPost.user.equals(userId)) {
        if (originalPost.parentPost === null) {
          await createAndSendNotification({
            from: userId,
            to: originalPost.user,
            type: "repost",
            postId: originalPostId,
          });
        } else {
          await createAndSendNotification({
            from: userId,
            to: originalPost.user,
            type: "replyRepost",
            postId: originalPostId,
          });
        }
      }

      if (onlineUsersMap && io) {
        for (const [onlineUserId] of onlineUsersMap.entries()) {
          if (onlineUserId.toString() !== userId.toString()) {
            if (isOriginalIC) {
              await emitNewICPostCount(onlineUserId);
              await emitNewICUnreadDot(onlineUserId);
            } else if (isOriginalVent) {
              await emitNewVentPostCount(onlineUserId);
              await emitNewVentUnreadDot(onlineUserId);
            } else {
              await emitNewPostCount(onlineUserId);
            }
          }
        }
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
      { new: true },
    );

    await emitNewPostCount(userId.toString());

    res.status(200).json({ message: "Feed posts marked as read." });
  } catch (error) {
    console.error("Error marking feed posts as read:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markFeedVentPostsAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const userIdObj = new mongoose.Types.ObjectId(userId);

    const now = new Date();

    await User.findByIdAndUpdate(
      userIdObj,
      { $set: { lastReadVentFeedTimestamp: now } },
      { new: true },
    );

    await emitNewVentPostCount(userId.toString());
    await emitNewVentUnreadDot(userId.toString());

    res.status(200).json({ message: "Feed vent posts marked as read." });
  } catch (error) {
    console.error("Error marking feed posts as read:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markFeedICPostsAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const userIdObj = new mongoose.Types.ObjectId(userId);

    const now = new Date();

    await User.findByIdAndUpdate(
      userIdObj,
      { $set: { lastReadICFeedTimestamp: now } },
      { new: true },
    );

    await emitNewICPostCount(userId.toString());
    await emitNewICUnreadDot(userId.toString());

    res.status(200).json({ message: "Feed vent posts marked as read." });
  } catch (error) {
    console.error("Error marking feed posts as read:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const checkIfUserReposted = async (req, res) => {
  try {
    const { originalPostId } = req.params;
    const userId = req.user._id;

    const originalPost = await Post.findById(originalPostId).select(
      "user",
      "-password -email",
    );
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
    const { postId } = req.params;
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

export const voteOnPoll = async (req, res) => {
  try {
    const { postId, optionId } = req.body;
    const userId = req.user._id;

    if (!postId || !optionId) {
      return res.status(400).json({ error: "Post ID and option ID are required." });
    }

    const postToVoteOn = await Post.findById(postId);
    if (!postToVoteOn) return res.status(404).json({ error: "Post not found." });

    const targetPostId = postToVoteOn.repostedFrom || postToVoteOn._id;

    const hasUserVoted = await Post.findOne({
      _id: targetPostId,
      "pollOptions.voters": userId,
    });

    if (hasUserVoted) {
      return res.status(400).json({
        error: "You have already voted on this poll.",
      });
    }

    const updatedOriginal = await Post.findOneAndUpdate(
      {
        _id: targetPostId,
        "pollOptions._id": optionId,
      },
      {
        $push: { "pollOptions.$.voters": userId },
        $inc: { pollTotalVotes: 1 },
      },
      { new: true },
    ).lean();

    await Post.updateMany(
      { repostedFrom: targetPostId, "pollOptions._id": optionId },
      {
        $push: { "pollOptions.$.voters": userId },
        $inc: { pollTotalVotes: 1 },
      },
    );

    res.status(200).json({
      message: "Vote cast successfully!",
      pollOptions: updatedOriginal.pollOptions,
      pollTotalVotes: updatedOriginal.pollTotalVotes,
    });
  } catch (error) {
    console.error("Error in voteOnPoll:", error.message);
    res.status(500).json({ error: "Internal server error." });
  }
};

export const pinUnpinPost = async (req, res) => {
  try {
    const { postId } = req.params;
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
        (id) => id.toString() !== postId.toString(),
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

export const updateScheduledPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { text, scheduledAt } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(postId);

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
      (result) => result.status === "success",
    ).length;
    const failedDeletions = results.filter(
      (result) => result.status !== "success",
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

export const createVentPost = async (req, res) => {
  try {
    const { text, isAnonymous, pollOptions } = req.body;
    let { img, video, imgs } = req.body;

    const userId = req.user._id;
    const user = await User.findById(userId);

    if (video && !user.isGoldVerified) {
      return res.status(403).json({ error: "Only Gold Verified users can post videos." });
    }

    const incomingImgs = Array.isArray(imgs) ? imgs : [];
    if (!text && !img && !incomingImgs.length && !video) {
      return res
        .status(400)
        .json({ error: "Vent post must have text, image, or video." });
    }

    try {
      if (
        !text &&
        !img &&
        !incomingImgs.length &&
        !video &&
        (!pollOptions || pollOptions.length === 0)
      ) {
        return res
          .status(400)
          .json({ error: "Post must have text, image, video, or poll options." });
      }

      if ((img || video) && pollOptions && pollOptions.length > 0) {
        return res
          .status(400)
          .json({ error: "You cannot post a poll with an image or video." });
      }
    } catch (uploadError) {
      return res.status(500).json({
        error: "Failed to upload media. Please try again.",
        details: uploadError.message,
      });
    }

    let uploadedImgUrl = null;
    let uploadedVideoUrl = null;
    let imgPublicId = null;
    let videoPublicId = null;
    let mediaType = "none";
    let uploadedImages = []; // { url, publicId }

    const incomingSingleImg = img; // legacy single-image support

 if (incomingImgs.length > 0) {
   const uploads = await Promise.all(
     incomingImgs.map((b64) =>
       cloudinary.uploader.upload(b64, { upload_preset: "ml_posts" }),
     ),
   );
   uploadedImages = uploads.map((u) => ({ url: u.secure_url, publicId: u.public_id }));
   uploadedImgUrl = uploadedImages[0].url; // keep legacy field populated
   imgPublicId = uploadedImages[0].publicId;
   mediaType = "image";
 } else if (incomingSingleImg) {
   // legacy path — single base64 img
   const uploadedResponse = await cloudinary.uploader.upload(incomingSingleImg, {
     upload_preset: "ml_posts",
   });
   uploadedImgUrl = uploadedResponse.secure_url;
   imgPublicId = uploadedResponse.public_id;
   uploadedImages = [{ url: uploadedImgUrl, publicId: imgPublicId }];
   mediaType = "image";
 } else if (video) {
   const uploadedResponse = await cloudinary.uploader.upload(video, {
     resource_type: "video",
   });
   uploadedVideoUrl = uploadedResponse.secure_url;
   videoPublicId = uploadedResponse.public_id;
   mediaType = "video";
 }

    const newPostData = {
      user: userId,
      text,
      isVent: true,
      isAnonymous: isAnonymous === true,
      publishedAt: new Date(),
      img: uploadedImgUrl,
      video: uploadedVideoUrl,
      imgPublicId,
      videoPublicId,
      mediaType,
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
      newPostData.mediaType = "none";
    }

    const newPost = new Post(newPostData);
    await newPost.save();

    if (uploadedImages.length > 0) {
      const imageDocs = await Promise.all(
        uploadedImages.map(({ url, publicId }) =>
          new Image({
            imageUrl: url,
            parentDocument: newPost._id,
            parentModel: "Post",
            uploadedBy: userId,
            publicId,
          }).save(),
        ),
      );
      newPost.image = imageDocs[0]._id; // legacy single ref
      newPost.images = imageDocs.map((d) => d._id); // new multi-image refs
      await newPost.save();
    }

    if (onlineUsersMap && io) {
      for (const [onlineUserId] of onlineUsersMap.entries()) {
        if (onlineUserId.toString() !== userId.toString()) {
          await emitNewVentPostCount(onlineUserId);
          await emitNewVentUnreadDot(onlineUserId);
        }
      }
    }

    const populatedPost = await Post.findById(newPost._id)
      .populate({
        path: "user",
        select:
          "username fullName isCha isVerified isGoldVerified  badges preferredBadge nameColor equipped",
        populate: { path: "profileImg", select: "imageUrl" },
      })
      .populate({ path: "image", select: "imageUrl" })
      .exec();

    res.status(201).json(populatedPost);
  } catch (error) {
    if (error.message.includes("Poll options cannot be empty.")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error in createVentPost controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getVentPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User ID not found" });
    }

    const { blockedByMe, blockedMe } = await getBlockingUsers(userId);
    const { all: mutedUserIds } = await getMutedUsers(userId);
    const mutedObjectIds = mutedUserIds.map((id) => new mongoose.Types.ObjectId(id));

    const blockedAndBlockingObjectIds = [
      ...new Set([
        ...blockedByMe.map((id) => new mongoose.Types.ObjectId(id)),
        ...blockedMe.map((id) => new mongoose.Types.ObjectId(id)),
      ]),
    ];

    const matchConditions = {
      isVent: true,
      parentPost: null,
      "deletedFor.user": { $ne: userId },
      user: { $nin: [...blockedAndBlockingObjectIds, ...mutedObjectIds] },
    };

    const totalCount = await Post.countDocuments(matchConditions);

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
          as: "author",
          pipeline: [
            {
              $lookup: {
                from: "images",
                localField: "profileImg",
                foreignField: "_id",
                as: "profileImg",
              },
            },
            { $unwind: { path: "$profileImg", preserveNullAndEmptyArrays: true } },
          ],
        },
      },
      { $unwind: "$author" },
      {
        $lookup: {
          from: "images",
          localField: "image",
          foreignField: "_id",
          as: "image",
        },
      },
      { $unwind: { path: "$image", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "images",
          localField: "images",
          foreignField: "_id",
          as: "images",
        },
      },
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
                pipeline: [
                  {
                    $lookup: {
                      from: "images",
                      localField: "profileImg",
                      foreignField: "_id",
                      as: "profileImg",
                    },
                  },
                  { $unwind: { path: "$profileImg", preserveNullAndEmptyArrays: true } },
                  {
                    $project: {
                      _id: 1,
                      username: 1,
                      fullName: 1,
                      profileImg: 1,
                      isCha: 1,
                      isVerified: 1,
                      isGoldVerified: 1,
                      nameColor: 1,
                      badges: 1,
                      preferredBadge: 1,
                      equipped: 1,
                    },
                  },
                ],
              },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "images",
                localField: "image",
                foreignField: "_id",
                as: "image",
              },
            },
            { $unwind: { path: "$image", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "images",
                localField: "images",
                foreignField: "_id",
                as: "images",
              },
            },
            {
              $project: {
                text: 1,
                img: 1,
                image: 1,
                images: 1,
                video: 1,
                mediaType: 1,
                likes: 1,
                repliesCount: 1,
                repostsCount: 1,
                repostedBy: 1,
                bookmarkedBy: 1,
                createdAt: 1,
                user: 1,
                isVent: 1,
                isAnonymous: 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: "$repostedFrom", preserveNullAndEmptyArrays: true } },
      // 👆 End of new $lookup stage
      {
        $project: {
          text: 1,
          likes: 1,
          isVent: 1,
          isAnonymous: 1,
          img: 1,
          image: 1,
          images: 1,
          video: 1,
          mediaType: 1,
          pollOptions: 1,
          pollTotalVotes: 1,
          repliesCount: 1,
          createdAt: 1,
          repostedFrom: 1, // Add this field to the projection
          editHistory: 1,
          repostedBy: 1,
          repostsCount: 1,
          user: {
            $cond: {
              if: { $eq: ["$isAnonymous", true] },
              then: {
                _id: "$author._id",
                username: "Anonymous",
                fullName: "Anonymous",
                profileImg: { imageUrl: "/avatar-placeholder.png" },
                isCha: false,
                isVerified: false,
                isGoldVerified: false,

                badges: [],
                preferredBadge: null,
              },
              else: {
                _id: "$author._id",
                username: "$author.username",
                fullName: "$author.fullName",
                profileImg: "$author.profileImg",
                isCha: "$author.isCha",
                isVerified: "$author.isVerified",
                isGoldVerified: "$author.isGoldVerified",
                nameColor: "$author.nameColor",
                badges: "$author.badges",
                preferredBadge: "$author.preferredBadge",
                equipped: "$author.equipped",
              },
            },
          },
        },
      },
    ]);

    await User.findByIdAndUpdate(userId, { lastReadVentFeedTimestamp: new Date() });
    emitNewVentPostCount(userId.toString());
    emitNewVentUnreadDot(userId.toString());

    const hasNextPage = page * limit < totalCount;

    res.status(200).json({ posts, hasNextPage, totalPosts: totalCount });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.error("Error in getVentPosts controller: ", error);
  }
};

export const getPostHistory = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId).select("editHistory");

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.status(200).json(post.editHistory);
  } catch (error) {
    console.error("Error in getPostHistory controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
