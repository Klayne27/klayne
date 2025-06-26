import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import Notification from "../models/notification.model.js";
import {
  createAndSendNotification,
} from "../lib/socket.js";
import mongoose from "mongoose";

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

    if (!isValidObjectId(postId)) {
      return res.status(400).json({ error: "Invalid Post ID" });
    }

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
        select: "username fullName profileImg isVerified",
      })
      .populate({
        path: "parentComment",
        select: "text user",
        populate: {
          path: "user",
          select: "username fullName",
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

    if (post.user.toString() !== userId.toString()) {
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

    if (parentComment.user.toString() !== userId.toString()) {
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

    const userLikedComment = comment.likes.includes(userId);

    if (userLikedComment) {
      comment.likes.pull(userId);
      await comment.save();
      res
        .status(200)
        .json({ message: "Comment unliked successfully!", likes: comment.likes });
    } else {
      comment.likes.push(userId);

      if (comment.user.toString() !== userId.toString()) {
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
