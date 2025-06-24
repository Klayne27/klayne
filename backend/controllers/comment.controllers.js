// src/controllers/comment.controller.js
import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import Notification from "../models/notification.model.js";
import {
  createAndSendNotification,
  emitUnreadNotificationStatus,
} from "../lib/socket.js";
import mongoose from "mongoose"; // Import mongoose for ObjectId

// Helper function to validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Recursively deletes a comment and all its nested replies.
 * Returns the total count of comments deleted (including the initial comment).
 * @param {string | mongoose.Types.ObjectId} commentId The ID of the comment to start deletion from.
 * @returns {Promise<number>} The total number of comments deleted.
 */
async function deleteAllChildComments(commentId) {
  let deletedCount = 0;
  const commentsToDeleteQueue = [commentId]; // Start with the initial comment

  while (commentsToDeleteQueue.length > 0) {
    const currentCommentId = commentsToDeleteQueue.shift();

    // Find all direct replies to the current comment
    const directReplies = await Comment.find({ parentComment: currentCommentId }).select(
      "_id"
    );

    // Add their IDs to the queue for further processing
    directReplies.forEach((reply) => commentsToDeleteQueue.push(reply._id));

    // Delete the current comment and count it
    const deleteResult = await Comment.deleteOne({ _id: currentCommentId });
    if (deleteResult.deletedCount > 0) {
      deletedCount++;
      // Optional: Delete notifications related to this specific comment
      await Notification.deleteMany({
        $or: [{ commentId: currentCommentId }, { parentCommentId: currentCommentId }],
      });
    }
  }
  return deletedCount;
}

// @desc    Get comments for a post (paginated, top-level comments or replies)
// @route   GET /api/comments/:postId/comments
// @route   GET /api/comments/:postId/comments/:parentCommentId/replies
// @access  Public
export const getComments = async (req, res) => {
  try {
    const { postId, parentCommentId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!isValidObjectId(postId)) {
      return res.status(400).json({ error: "Invalid Post ID" });
    }

    const query = { post: postId };

    // Determine if fetching top-level comments or replies
    // parentCommentId will be undefined for top-level comments in this route setup
    if (parentCommentId) {
      if (!isValidObjectId(parentCommentId)) {
        return res.status(400).json({ error: "Invalid Parent Comment ID" });
      }
      query.parentComment = parentCommentId;
    } else {
      query.parentComment = null; // Fetching top-level comments
    }

    const comments = await Comment.find(query)
      .sort({ createdAt: 1 }) // Sort by oldest first for comment threads
      .skip(skip)
      .limit(limit)
      .populate({
        path: "user",
        select: "username fullName profileImg isVerified", // Populate sender details
      })
      .populate({
        path: "parentComment", // Populate parent comment for context if needed
        select: "text user", // Only select necessary fields to avoid deep nesting
        populate: {
          path: "user",
          select: "username fullName", // Populate user for parent comment
        },
      });

    const totalComments = await Comment.countDocuments(query);
    const hasNextPage = page * limit < totalComments;

    res.status(200).json({ comments, hasNextPage });
  } catch (error) {
    console.error("Error in getComments controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// @desc    Create a new comment on a post
// @route   POST /api/comments/:postId
// @access  Protected
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

    // Create the new comment
    const newComment = new Comment({
      user: userId,
      post: postId,
      text,
      parentComment: null, // This is a top-level comment
    });

    await newComment.save();

    // Increment commentsCount on the Post
    post.commentsCount = (post.commentsCount || 0) + 1;
    await post.save();

    // Populate the new comment for the response
    await newComment.populate({
      path: "user",
      select: "username fullName profileImg isVerified",
    });

    // Send notification to the post owner if it's not their own comment
    if (post.user.toString() !== userId.toString()) {
      await createAndSendNotification({
        from: userId,
        to: post.user,
        type: "comment", // Notification type for a new comment
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

// @desc    Reply to an existing comment
// @route   POST /api/comments/:postId/:parentCommentId/reply
// @access  Protected
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
      return res.status(404).json({ error: "Parent comment not found" });
    }

    // Ensure the parent comment belongs to the specified post
    if (parentComment.post.toString() !== postId) {
      return res
        .status(400)
        .json({ error: "Parent comment does not belong to this post" });
    }

    // Create the new reply comment
    const newReply = new Comment({
      user: userId,
      post: postId,
      text,
      parentComment: parentCommentId, // Link to the parent comment
    });

    await newReply.save();

    // Increment commentsCount on the Post (total comments)
    post.commentsCount = (post.commentsCount || 0) + 1;
    await post.save();

    // Increment repliesCount on the parent comment
    parentComment.repliesCount = (parentComment.repliesCount || 0) + 1;
    await parentComment.save();

    // Populate the new reply for the response
    await newReply.populate({
      path: "user",
      select: "username fullName profileImg isVerified",
    });
    await newReply.populate({
      path: "parentComment", // Populate parent comment details for context
      select: "text user",
      populate: {
        path: "user",
        select: "username fullName",
      },
    });

    // Send notification to the parent comment owner if it's not their own reply
    if (parentComment.user.toString() !== userId.toString()) {
      await createAndSendNotification({
        from: userId,
        to: parentComment.user,
        type: "commentReply", // Notification type for a reply
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

// @desc    Like or Unlike a comment
// @route   POST /api/comments/:commentId/like
// @access  Protected
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

    const userLikedComment = comment.likes.includes(userId);

    if (userLikedComment) {
      // Unlike the comment
      comment.likes.pull(userId);
      await comment.save();
      res
        .status(200)
        .json({ message: "Comment unliked successfully!", likes: comment.likes });
    } else {
      // Like the comment
      comment.likes.push(userId);

      // Send notification to the comment owner if not their own comment
      if (comment.user.toString() !== userId.toString()) {
        await createAndSendNotification({
          from: userId,
          to: comment.user,
          type: "commentLike", // Notification type for a comment like
          postId: comment.post, // Post ID is taken from the comment
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

// @desc    Delete a comment (and its replies recursively)
// @route   DELETE /api/comments/:commentId
// @access  Protected
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

    // Ensure only the comment owner or post owner can delete the comment
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

    // Call the recursive deletion function
    const totalDeletedComments = await deleteAllChildComments(commentId);

    // Decrement commentsCount on the parent Post by the total number of comments deleted
    post.commentsCount = Math.max(0, post.commentsCount - totalDeletedComments);
    await post.save();

    // If the *initial* comment being deleted was a reply, decrement repliesCount on its parent
    if (commentToDelete.parentComment) {
      const parentComment = await Comment.findById(commentToDelete.parentComment);
      if (parentComment) {
        parentComment.repliesCount = Math.max(0, parentComment.repliesCount - 1); // Decrement by 1 as the direct child is removed
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
