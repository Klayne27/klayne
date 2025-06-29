import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import Notification from "../models/notification.model.js";
import {
  createAndSendNotification,
} from "../lib/socket.js";
import mongoose from "mongoose";
import User from "../models/user.model.js";

// Helper function to get blocking relationships for the current user
const getBlockingUsers = async (userId) => {
  if (!userId) {
    return { blockedByMe: [], blockedMe: [] };
  }
  const user = await User.findById(userId).select("blockedUsers blockedBy").lean();
  return {
    blockedByMe: user ? user.blockedUsers.map(id => id.toString()) : [],
    blockedMe: user ? user.blockedBy.map(id => id.toString()) : [],
  };
};

// Helper function to check if a user is involved in a block relationship
// targetUserId is the user whose content or profile we are interacting with
// currentUserId is the authenticated user
const isBlockedOrBlockedBy = async (currentUserId, targetUserId) => {
  if (!currentUserId || !targetUserId) return false;
  if (currentUserId.toString() === targetUserId.toString()) return false;

  const currentUser = await User.findById(currentUserId).select("blockedUsers blockedBy").lean();
  const targetUser = await User.findById(targetUserId).select("blockedUsers blockedBy").lean();

  if (!currentUser || !targetUser) return false;

  // Current user has blocked target user OR target user has blocked current user
  const currentUserBlockedTarget = currentUser.blockedUsers.some(id => id.toString() === targetUserId.toString());
  const targetUserBlockedCurrentUser = targetUser.blockedUsers.some(id => id.toString() === currentUserId.toString());

  return currentUserBlockedTarget || targetUserBlockedCurrentUser;
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

async function deleteAllChildComments(commentId) {
  let deletedCount = 0;
  const commentsToDeleteQueue = [commentId];

  while (commentsToDeleteQueue.length > 0) {
    const currentCommentId = commentsToDeleteQueue.shift();

    const directReplies = await Comment.find({ parentComment: currentCommentId }).select(
      "_id"
    );

    directReplies.forEach((reply) => commentsToDeleteQueue.push(reply._id));

    const deleteResult = await Comment.deleteOne({ _id: currentCommentId });
    if (deleteResult.deletedCount > 0) {
      deletedCount++;
      await Notification.deleteMany({
        $or: [{ commentId: currentCommentId }, { parentCommentId: currentCommentId }],
      });
    }
  }
  return deletedCount;
}

export const getComments = async (req, res) => {
  try {
    const { postId, parentCommentId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const userId = req.user._id; // Current authenticated user

    if (!isValidObjectId(postId)) {
      return res.status(400).json({ error: "Invalid Post ID" });
    }

    // --- START: Blocking check for the post itself ---
    const post = await Post.findById(postId).populate("user", "blockedUsers blockedBy");
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    if (await isBlockedOrBlockedBy(userId, post.user._id)) {
      return res.status(403).json({
        error: "Cannot view comments on this post due to blocking restrictions.",
      });
    }
    // --- END: Blocking check for the post itself ---

    const query = { post: postId };

    if (parentCommentId) {
      if (!isValidObjectId(parentCommentId)) {
        return res.status(400).json({ error: "Invalid Parent Comment ID" });
      }
      query.parentComment = parentCommentId;
    } else {
      query.parentComment = null;
    }

    const comments = await Comment.find(query)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "user",
        select: "username fullName profileImg isVerified blockedUsers blockedBy",
      })
      .populate({
        path: "parentComment",
        select: "text user",
        populate: {
          path: "user",
          select: "username fullName blockedUsers blockedBy",
        },
      });

    // --- START: Filter comments based on blocking relationships ---
    const { blockedByMe, blockedMe } = await getBlockingUsers(userId);
    const blockedAndBlockingUsers = [...new Set([...blockedByMe, ...blockedMe])];

    const filteredComments = comments.filter((comment) => {
      // 1. Filter out comments from users blocked by me or who blocked me
      if (blockedAndBlockingUsers.includes(comment.user._id.toString())) {
        return false;
      }
      // 2. If it's a reply, filter out replies to comments by users blocked by me or who blocked me
      if (
        comment.parentComment &&
        blockedAndBlockingUsers.includes(comment.parentComment.user._id.toString())
      ) {
        return false;
      }
      return true;
    });
    // --- END: Filter comments based on blocking relationships ---

    // Note: totalComments count might not reflect filtered results,
    // but typically for pagination, it's based on the full query.
    // If the frontend needs a count of *displayable* comments,
    // you'd count after filtering. For now, we'll keep it as is.
    const totalComments = await Comment.countDocuments(query);
    const hasNextPage = page * limit < totalComments;

    res.status(200).json({ comments, hasNextPage });
  } catch (error) {
    console.error("Error in getComments controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createComment = async (req, res) => {
  try {
    const { text } = req.body;
    const postId = req.params.postId;
    const userId = req.user._id;

    if (!text) {
      return res.status(400).json({ error: "Text field is required for comment" });
    }
    if (!isValidObjectId(postId)) {
      return res.status(400).json({ error: "Invalid Post ID" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // --- START: Blocking check before creating a comment ---
    // Check if the commenter (userId) is blocked by the post owner (post.user)
    // OR if the post owner (post.user) is blocked by the commenter (userId)
    if (await isBlockedOrBlockedBy(userId, post.user._id)) {
      return res
        .status(403)
        .json({ error: "You cannot comment on this post due to blocking restrictions." });
    }
    // --- END: Blocking check ---

    const newComment = new Comment({
      user: userId,
      post: postId,
      text,
      parentComment: null,
    });

    await newComment.save();

    post.commentsCount = (post.commentsCount || 0) + 1;
    await post.save();

    await newComment.populate({
      path: "user",
      select: "username fullName profileImg isVerified",
    });

    // Send notification only if the post owner is not the commenter and no blocking
    if (
      post.user.toString() !== userId.toString() &&
      !(await isBlockedOrBlockedBy(userId, post.user._id))
    ) {
      await createAndSendNotification({
        from: userId,
        to: post.user,
        type: "comment",
        postId: post._id,
        commentId: newComment._id,
      });
    }

    res.status(201).json(newComment);
  } catch (error) {
    console.error("Error in createComment controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const replyToComment = async (req, res) => {
  try {
    const { text } = req.body;
    const { postId, parentCommentId } = req.params;
    const userId = req.user._id;

    if (!text) {
      return res.status(400).json({ error: "Text field is required for reply" });
    }
    if (!isValidObjectId(postId) || !isValidObjectId(parentCommentId)) {
      return res.status(400).json({ error: "Invalid Post ID or Parent Comment ID" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const parentComment = await Comment.findById(parentCommentId);
    if (!parentComment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (parentComment.post.toString() !== postId) {
      return res
        .status(400)
        .json({ error: "Parent comment does not belong to this post" });
    }

    // --- START: Blocking check before creating a reply ---
    // Check if the replier (userId) is blocked by the post owner (post.user)
    // OR if the post owner (post.user) is blocked by the replier (userId)
    if (await isBlockedOrBlockedBy(userId, post.user._id)) {
      return res
        .status(403)
        .json({ error: "You cannot reply on this post due to blocking restrictions." });
    }
    // Check if the replier (userId) is blocked by the parent comment owner (parentComment.user)
    // OR if the parent comment owner (parentComment.user) is blocked by the replier (userId)
    if (await isBlockedOrBlockedBy(userId, parentComment.user._id)) {
      return res.status(403).json({
        error: "You cannot reply to this comment due to blocking restrictions.",
      });
    }
    // --- END: Blocking check ---

    const newReply = new Comment({
      user: userId,
      post: postId,
      text,
      parentComment: parentCommentId,
    });

    await newReply.save();

    post.commentsCount = (post.commentsCount || 0) + 1;
    await post.save();

    parentComment.repliesCount = (parentComment.repliesCount || 0) + 1;
    await parentComment.save();

    await newReply.populate({
      path: "user",
      select: "username fullName profileImg isVerified",
    });
    await newReply.populate({
      path: "parentComment",
      select: "text user",
      populate: {
        path: "user",
        select: "username fullName",
      },
    });
    // Send notification only if parent comment owner is not the replier and no blocking
    if (
      parentComment.user.toString() !== userId.toString() &&
      !(await isBlockedOrBlockedBy(userId, parentComment.user._id))
    ) {
      await createAndSendNotification({
        from: userId,
        to: parentComment.user,
        type: "commentReply",
        postId: post._id,
        commentId: newReply._id,
        parentCommentId: parentComment._id,
      });
    }

    res.status(201).json(newReply);
  } catch (error) {
    console.error("Error in replyToComment controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const likeUnlikeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(commentId)) {
      return res.status(400).json({ error: "Invalid Comment ID" });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // --- START: Blocking check before liking/unliking a comment ---
    // Check if the liker (userId) is blocked by the comment owner (comment.user)
    // OR if the comment owner (comment.user) is blocked by the liker (userId)
    if (await isBlockedOrBlockedBy(userId, comment.user._id)) {
      return res
        .status(403)
        .json({
          error: "You cannot like/unlike this comment due to blocking restrictions.",
        });
    }
    // --- END: Blocking check ---

    const userLikedComment = comment.likes.includes(userId);

    if (userLikedComment) {
      comment.likes.pull(userId);
      await comment.save();
      res
        .status(200)
        .json({ message: "Comment unliked successfully!", likes: comment.likes });
    } else {
      comment.likes.push(userId);

      // Send notification only if comment owner is not the liker and no blocking
      if (
        comment.user.toString() !== userId.toString() &&
        !(await isBlockedOrBlockedBy(userId, comment.user._id))
      ) {
        await createAndSendNotification({
          from: userId,
          to: comment.user,
          type: "commentLike",
          postId: comment.post,
          commentId: comment._id,
        });
      }

      await comment.save();
      res
        .status(200)
        .json({ message: "Comment liked successfully!", likes: comment.likes });
    }
  } catch (error) {
    console.error("Error in likeUnlikeComment controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(commentId)) {
      return res.status(400).json({ error: "Invalid Comment ID" });
    }

    const commentToDelete = await Comment.findById(commentId);
    if (!commentToDelete) {
      return res.status(404).json({ error: "Comment not found" });
    }

    const post = await Post.findById(commentToDelete.post);
    if (!post) {
      return res.status(404).json({ error: "Associated Post not found" });
    }

    const isCommentOwner = commentToDelete.user.toString() === userId.toString();
    const isPostOwner = post.user.toString() === userId.toString();

    if (!isCommentOwner && !isPostOwner) {
      return res
        .status(401)
        .json({ error: "You are not authorized to delete this comment" });
    }

    // --- START: Blocking check before deleting a comment ---
    // Check if the deleter (userId) is blocked by the comment owner (commentToDelete.user)
    // OR if the comment owner (commentToDelete.user) is blocked by the deleter (userId)
    if (
      !isCommentOwner &&
      (await isBlockedOrBlockedBy(userId, commentToDelete.user._id))
    ) {
      return res
        .status(403)
        .json({ error: "You cannot delete this comment due to blocking restrictions." });
    }
    // If the deleter is the post owner, check against the comment owner
    if (
      isPostOwner &&
      commentToDelete.user.toString() !== userId.toString() &&
      (await isBlockedOrBlockedBy(userId, commentToDelete.user._id))
    ) {
      return res
        .status(403)
        .json({ error: "You cannot delete this comment due to blocking restrictions." });
    }
    // --- END: Blocking check ---

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

    res
      .status(200)
      .json({ message: "Comment and its replies deleted successfully", commentId });
  } catch (error) {
    console.error("Error in deleteComment controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
