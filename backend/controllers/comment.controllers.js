import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import {
  createAndSendNotification,
  emitUnreadNotificationStatus,
} from "../lib/socket.js";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import { v2 as cloudinary } from "cloudinary";
import {
  deleteAllChildComments,
  extractAndValidateMentions,
  getBlockingUsers,
} from "../lib/utils/helpers.js";
import Image from "../models/image.model.js";

const isBlockedOrBlockedBy = async (currentUserId, targetUserId) => {
  if (
    !currentUserId ||
    !targetUserId ||
    !mongoose.Types.ObjectId.isValid(currentUserId) ||
    !mongoose.Types.ObjectId.isValid(targetUserId)
  ) {
    return false;
  }
  if (currentUserId.toString() === targetUserId.toString()) return false;

  const currentUser = await User.findById(currentUserId)
    .select("blockedUsers blockedBy")
    .lean();
  const targetUser = await User.findById(targetUserId)
    .select("blockedUsers blockedBy")
    .lean();

  if (!currentUser || !targetUser) {
    return false;
  }

  const currentUserBlockedTarget = (currentUser.blockedUsers || []).some(
    (id) => id.toString() === targetUserId.toString()
  );
  const targetUserBlockedCurrentUser = (targetUser.blockedUsers || []).some(
    (id) => id.toString() === currentUserId.toString()
  );

  return currentUserBlockedTarget || targetUserBlockedCurrentUser;
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const getComments = async (req, res) => {
  try {
    const { postId, parentCommentId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!req.user || !req.user._id) {
      console.error(
        "[getComments] req.user or req.user._id is undefined. Authentication might be missing or failed."
      );
      return res.status(401).json({ error: "Unauthorized: User not authenticated." });
    }
    const userId = req.user._id;

    if (!isValidObjectId(postId)) {
      console.error(`[getComments] Invalid Post ID provided: ${postId}`);
      return res.status(400).json({ error: "Invalid Post ID" });
    }

    const post = await Post.findById(postId).populate("user", "blockedUsers blockedBy");
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (!post.user) {
      console.error(
        `[getComments] Post ${postId} has no associated user. Cannot perform blocking check for post owner.`
      );
      return res
        .status(500)
        .json({ error: "Internal server error: Post owner information missing." });
    }

    if (await isBlockedOrBlockedBy(userId, post.user._id)) {
      return res.status(403).json({
        error: "Cannot view comments on this post due to blocking restrictions.",
      });
    }

    const query = { post: postId };

    if (parentCommentId) {
      if (!isValidObjectId(parentCommentId)) {
        console.error(
          `[getComments] Invalid Parent Comment ID provided: ${parentCommentId}`
        );
        return res.status(400).json({ error: "Invalid Parent Comment ID" });
      }
      query.parentComment = parentCommentId;
    } else {
      query.parentComment = null;
    }

    const comments = await Comment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "user",
        select:
          "username fullName  isVerified isGoldVerified blockedUsers blockedBy",
        populate: {
          path: "profileImg",
          select: "imageUrl",
        },
      })
      .populate({
        path: "parentComment",
        select: "text user",
        populate: {
          path: "user",
          select: "username fullName blockedUsers blockedBy",
          populate: {
            path: "profileImg",
            select: "imageUrl",
          },
        },
      })
      .populate("image", "imageUrl");

    const { blockedByMe, blockedMe } = await getBlockingUsers(userId);
    const blockedAndBlockingUsers = [...new Set([...blockedByMe, ...blockedMe])];

    const filteredComments = comments.filter((comment) => {
      if (!comment.user) {
        return false;
      }

      if (blockedAndBlockingUsers.includes(comment.user._id.toString())) {
        return false;
      }

      if (comment.parentComment) {
        if (!comment.parentComment.user) {
          return false;
        }
        if (blockedAndBlockingUsers.includes(comment.parentComment.user._id.toString())) {
          return false;
        }
      }
      return true;
    });

    const totalComments = await Comment.countDocuments(query);
    const hasNextPage = page * limit < totalComments;
    res
      .status(200)
      .json({ comments: filteredComments.reverse(), hasNextPage, totalComments });
  } catch (error) {
    console.error("Error in getComments controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const createComment = async (req, res) => {
  try {
    const { text } = req.body;
    let { img } = req.body;
    let newImage = null;

    const postId = req.params.postId;
    const userId = req.user._id;

    if (!isValidObjectId(postId)) {
      return res.status(400).json({ error: "Invalid Post ID" });
    }

    const post = await Post.findById(postId).populate("user", "blockedUsers blockedBy");
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (!post.user) {
      console.error(
        `[createComment] Post ${postId} has no associated user. Cannot perform blocking check.`
      );
      return res
        .status(500)
        .json({ error: "Internal server error: Post owner information missing." });
    }

    if (await isBlockedOrBlockedBy(userId, post.user._id)) {
      return res
        .status(403)
        .json({ error: "You cannot comment on this post due to blocking restrictions." });
    }

    if (img) {
      try {
        const uploadedResponse = await cloudinary.uploader.upload(img);
        img = uploadedResponse.secure_url;

        newImage = new Image({
          imageUrl: img,
          parentDocument: null, // This will be set after the comment is created
          parentModel: "Comment",
          uploadedBy: userId,
          publicId: uploadedResponse.public_id,
        });
      } catch (uploadError) {
        console.error("Cloudinary upload error in createComment:", uploadError);
        return res.status(500).json({ error: "Image upload failed." });
      }
    }

    if (!text && !img) {
      return res
        .status(400)
        .json({ error: "Comment must contain either text or an image." });
    }

    const mentionedUserIds = await extractAndValidateMentions(text);

    const newComment = new Comment({
      user: userId,
      post: postId,
      text,
      img,
      image: newImage?._id || null, // Store the image ID
      parentComment: null,
      mentionedUsers: mentionedUserIds,
    });

    if (newImage) {
      newImage.parentDocument = newComment._id;
      await newImage.save();
    }

    await newComment.save();

    post.commentsCount = (post.commentsCount || 0) + 1;
    await post.save();

    await newComment.populate([
      {
        path: "user",
        select: "username fullName profileImg isVerified isGoldVerified",
      },
      {
        path: "image",
        select: "imageUrl",
      },
    ]);

    if (post.user && post.user._id.toString() !== userId.toString()) {
      await createAndSendNotification({
        from: userId,
        to: post.user._id,
        type: "comment",
        postId: post._id,
        commentId: newComment._id,
      });
    }

    for (const mentionedUserId of mentionedUserIds) {
      if (post.user && mentionedUserId.toString() === post.user._id.toString()) {
        continue;
      }
      await createAndSendNotification({
        from: userId,
        to: mentionedUserId,
        type: "mention",
        postId: post._id,
        commentId: newComment._id,
      });
    }

    await emitUnreadNotificationStatus(post.user._id.toString());
    for (const mentionedUserId of mentionedUserIds) {
      await emitUnreadNotificationStatus(mentionedUserId.toString());
    }

    res.status(201).json(newComment);
  } catch (error) {
    console.error("Error in createComment controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const replyToComment = async (req, res) => {
  try {
    const { text } = req.body;
    let { img } = req.body;
    let newImage = null;

    const postId = req.params.postId;
    const parentCommentId = req.params.parentCommentId;
    const userId = req.user._id;

    if (!text && !img) {
      return res
        .status(400)
        .json({ error: "Reply must contain either text or an image." });
    }
    if (!isValidObjectId(postId) || !isValidObjectId(parentCommentId)) {
      return res.status(400).json({ error: "Invalid Post or Comment ID" });
    }

    const post = await Post.findById(postId).populate("user", "blockedUsers blockedBy");
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const parentComment = await Comment.findById(parentCommentId).populate(
      "user",
      "blockedUsers blockedBy"
    );
    if (!parentComment) {
      return res.status(404).json({ error: "Parent comment not found" });
    }

    if (await isBlockedOrBlockedBy(userId, post.user._id)) {
      return res
        .status(403)
        .json({ error: "You cannot reply to this post due to blocking restrictions." });
    }
    if (await isBlockedOrBlockedBy(userId, parentComment.user._id)) {
      return res.status(403).json({
        error: "You cannot reply to this comment due to blocking restrictions.",
      });
    }

    if (img) {
      try {
        const uploadedResponse = await cloudinary.uploader.upload(img);
        img = uploadedResponse.secure_url;

        newImage = new Image({
          imageUrl: img,
          parentDocument: null, // Set after the comment is created
          parentModel: "Comment",
          uploadedBy: userId,
          publicId: uploadedResponse.public_id,
        });
        await newImage.save();
      } catch (uploadError) {
        console.log("Cloudinary upload error in replyToComment:", uploadError);
        return res.status(500).json({ error: "Image upload failed." });
      }
    }

    const mentionedUserIds = await extractAndValidateMentions(text);

    const newReply = new Comment({
      user: userId,
      post: postId,
      text,
      img,
      image: newImage?._id || null,
      parentComment: parentCommentId,
      mentionedUsers: mentionedUserIds,
    });
    if (newImage) {
      newImage.parentDocument = newReply._id;
      await newImage.save();
    }
    await newReply.save();

    parentComment.repliesCount = (parentComment.repliesCount || 0) + 1;
    await parentComment.save();

    post.commentsCount = (post.commentsCount || 0) + 1;
    await post.save();

    await newReply.populate([
      {
        path: "user",
        select: "username fullName profileImg isVerified isGoldVerified",
      },
      {
        path: "image",
        select: "imageUrl",
      },
    ]);
    if (parentComment.user && parentComment.user._id.toString() !== userId.toString()) {
      await createAndSendNotification({
        from: userId,
        to: parentComment.user._id,
        type: "commentReply",
        postId: post._id,
        commentId: newReply._id,
        parentCommentId: parentCommentId,
      });
    }

    for (const mentionedUserId of mentionedUserIds) {
      if (
        parentComment.user &&
        mentionedUserId.toString() === parentComment.user._id.toString()
      ) {
        continue;
      }
      await createAndSendNotification({
        from: userId,
        to: mentionedUserId,
        type: "mention",
        postId: post._id,
        commentId: newReply._id,
      });
    }

    await emitUnreadNotificationStatus(parentComment.user._id.toString());
    for (const mentionedUserId of mentionedUserIds) {
      await emitUnreadNotificationStatus(mentionedUserId.toString());
    }

    res.status(201).json(newReply);
  } catch (error) {
    console.error("Error in replyToComment controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const likeUnlikeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(commentId)) {
      return res.status(400).json({ error: "Invalid Comment ID" });
    }
    const comment = await Comment.findById(commentId).populate(
      "user",
      "blockedUsers blockedBy"
    );
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (!comment.user) {
      console.error(
        `[likeUnlikeComment] Comment ${commentId} has no associated user. Cannot perform blocking check.`
      );
      return res
        .status(500)
        .json({ error: "Internal server error: Comment owner information missing." });
    }
    if (await isBlockedOrBlockedBy(userId, comment.user._id)) {
      return res.status(403).json({
        error: "You cannot like/unlike this comment due to blocking restrictions.",
      });
    }

    const userLikedComment = comment.likes.includes(userId);

    if (userLikedComment) {
      comment.likes.pull(userId);
      await comment.save();
      res
        .status(200)
        .json({ message: "Comment unliked successfully!", likes: comment.likes });
    } else {
      comment.likes.push(userId);

      if (comment.user && comment.user._id.toString() !== userId.toString()) {
        await createAndSendNotification({
          from: userId,
          to: comment.user._id,
          type: "commentLike",
          postId: comment.post,
          commentId: comment._id,
        });
      }

      await emitUnreadNotificationStatus(comment.user._id.toString());

      await comment.save();
      res
        .status(200)
        .json({ message: "Comment liked successfully!", likes: comment.likes });
    }
  } catch (error) {
    console.error("Error in likeUnlikeComment controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(commentId)) {
      return res.status(400).json({ error: "Invalid Comment ID" });
    }

    const commentToDelete = await Comment.findById(commentId).populate(
      "user",
      "blockedUsers blockedBy"
    );
    if (!commentToDelete) {
      return res.status(404).json({ error: "Comment not found" });
    }

    const post = await Post.findById(commentToDelete.post).populate(
      "user",
      "blockedUsers blockedBy"
    );
    if (!post) {
      return res.status(404).json({ error: "Associated Post not found" });
    }

    const isCommentOwner = commentToDelete.user._id.toString() === userId.toString();
    const isPostOwner = post.user._id.toString() === userId.toString();

    if (!isCommentOwner && !isPostOwner) {
      return res
        .status(401)
        .json({ error: "You are not authorized to delete this comment" });
    }

    if (!commentToDelete.user) {
      console.error(
        `[deleteComment] Comment ${commentId} has no associated user. Cannot perform blocking check for comment owner.`
      );
      return res
        .status(500)
        .json({ error: "Internal server error: Comment owner information missing." });
    }
    if (!post.user) {
      console.error(
        `[deleteComment] Post ${post._id} has no associated user. Cannot perform blocking check for post owner.`
      );
      return res
        .status(500)
        .json({ error: "Internal server error: Post owner information missing." });
    }

    if (
      !isCommentOwner &&
      (await isBlockedOrBlockedBy(userId, commentToDelete.user._id))
    ) {
      return res
        .status(403)
        .json({ error: "You cannot delete this comment due to blocking restrictions." });
    }
    if (
      isPostOwner &&
      commentToDelete.user.toString() !== userId.toString() &&
      (await isBlockedOrBlockedBy(userId, commentToDelete.user._id))
    ) {
      return res
        .status(403)
        .json({ error: "You cannot delete this comment due to blocking restrictions." });
    }

    const totalDeletedComments = await deleteAllChildComments(commentId);

    post.commentsCount = Math.max(0, post.commentsCount - totalDeletedComments);
    await post.save();

    if (commentToDelete.parentComment) {
      const parentComment = await Comment.findById(commentToDelete.parentComment);
      if (parentComment) {
        parentComment.repliesCount = Math.max(0, parentComment.repliesCount - 1);
        await parentComment.save();
      }
    }

    res.status(200).json({
      message: "Comment and its replies deleted successfully",
      commentId,
      totalDeletedComments,
      parentCommentId: commentToDelete.parentComment,
    });
  } catch (error) {
    console.error("Error in deleteComment controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};
