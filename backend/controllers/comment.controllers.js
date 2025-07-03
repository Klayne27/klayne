import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import Notification from "../models/notification.model.js";
import {
  createAndSendNotification,
} from "../lib/socket.js";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import { v2 as cloudinary } from "cloudinary";

// Helper function to get blocking relationships for the current user
const getBlockingUsers = async (userId) => {
  if (!userId) {
    return { blockedByMe: [], blockedMe: [] };
  }
  const user = await User.findById(userId).select("blockedUsers blockedBy").lean();
  return {
    // Safely access blockedUsers and blockedBy, defaulting to empty arrays if undefined/null
    blockedByMe: user.blockedUsers?.map((id) => id.toString()) || [],
    blockedMe: user.blockedBy?.map((id) => id.toString()) || [],
  };
};


const isBlockedOrBlockedBy = async (currentUserId, targetUserId) => {
  // Add robustness for input IDs being invalid or missing
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

  // CRITICAL FIX: If either user is not found, they cannot be blocked/blocking.
  // This prevents errors like accessing `null.blockedUsers`.
  if (!currentUser || !targetUser) {

    return false;
  }

  // CRITICAL FIX: Ensure .blockedUsers is treated as an array.
  // This uses the logical OR operator (||) to default to an empty array if `blockedUsers` is `null` or `undefined`.
  const currentUserBlockedTarget = (currentUser.blockedUsers || []).some(
    (id) => id.toString() === targetUserId.toString()
  );
  const targetUserBlockedCurrentUser = (targetUser.blockedUsers || []).some(
    (id) => id.toString() === currentUserId.toString()
  );

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
    // Add this check
    if (!req.user || !req.user._id) {
      console.error(
        "[getComments] req.user or req.user._id is undefined. Authentication might be missing or failed."
      );
      return res.status(401).json({ error: "Unauthorized: User not authenticated." });
    }
    const userId = req.user._id;

    console.log(
      `[getComments] User: ${userId}, Post ID: ${postId}, Parent Comment ID: ${
        parentCommentId || "none"
      }`
    );

    if (!isValidObjectId(postId)) {
      console.error(`[getComments] Invalid Post ID provided: ${postId}`);
      return res.status(400).json({ error: "Invalid Post ID" });
    }

    // --- START: Blocking check for the post itself ---
    const post = await Post.findById(postId).populate("user", "blockedUsers blockedBy");
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // CRITICAL FIX 1: Ensure `post.user` exists before accessing `_id`.
    if (!post.user) {
      console.error(
        `[getComments] Post ${postId} has no associated user. Cannot perform blocking check for post owner.`
      );
      // Decide how to handle: either error or continue without blocking check for post owner
      // For safety, let's return an error as a missing post owner is data inconsistency.
      return res
        .status(500)
        .json({ error: "Internal server error: Post owner information missing." });
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
        console.error(
          `[getComments] Invalid Parent Comment ID provided: ${parentCommentId}`
        );
        return res.status(400).json({ error: "Invalid Parent Comment ID" });
      }
      query.parentComment = parentCommentId;
    } else {
      query.parentComment = null; // Fetch top-level comments
    }

    const comments = await Comment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "user",
        select: "username fullName profileImg isVerified blockedUsers blockedBy", // Ensure blockedUsers/blockedBy are populated for comment owners
      })
      .populate({
        path: "parentComment", // This will be null for top-level comments
        select: "text user",
        populate: {
          path: "user",
          select: "username fullName blockedUsers blockedBy", // Ensure blockedUsers/blockedBy are populated for parent comment owners
        },
      });

    // --- START: Filter comments based on blocking relationships ---
    const { blockedByMe, blockedMe } = await getBlockingUsers(userId);
    const blockedAndBlockingUsers = [...new Set([...blockedByMe, ...blockedMe])];

    const filteredComments = comments.filter((comment) => {
      // CRITICAL FIX 2: Ensure `comment.user` exists before accessing `_id` on it.
      if (!comment.user) {

        return false; // Exclude comments with no valid user
      }

      // 1. Filter out comments from users blocked by me or who blocked me
      if (blockedAndBlockingUsers.includes(comment.user._id.toString())) {
        console.log(
          `[getComments] Filtering comment ${comment._id} because its user (${comment.user._id}) is blocked.`
        );
        return false;
      }

      // 2. If it's a reply, filter out replies to comments by users blocked by me or who blocked me
      if (comment.parentComment) {
        // CRITICAL FIX 3: Ensure `comment.parentComment.user` exists before accessing `_id` on it.
        if (!comment.parentComment.user) {

          return false; // Exclude replies if parent user is missing
        }
        if (blockedAndBlockingUsers.includes(comment.parentComment.user._id.toString())) {
          console.log(
            `[getComments] Filtering comment ${comment._id} because its parent comment's user (${comment.parentComment.user._id}) is blocked.`
          );
          return false;
        }
      }
      return true;
    });
    // --- END: Filter comments based on blocking relationships ---

    const totalComments = await Comment.countDocuments(query); // Total count based on original query
    const hasNextPage = page * limit < totalComments;

    // CRITICAL FIX: Send `filteredComments` to the client, not the original `comments`.
    res
      .status(200)
      .json({ comments: filteredComments.reverse(), hasNextPage, totalComments });
  } catch (error) {
    console.error("Error in getComments controller:", error.message);
    // Include the actual error message in the response for better debugging on the client-side during development
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const createComment = async (req, res) => {
  try {
    const { text } = req.body;
    let { img } = req.body; // 'img' is now the Base64 string from frontend

    const postId = req.params.postId;
    const userId = req.user._id;

    if (!text && !img) {
      return res
        .status(400)
        .json({ error: "Comment must contain either text or an image." });
    }
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

    // --- Image Upload Logic (replicated from your createPost) ---
    if (img) {
      try {
        const uploadedResponse = await cloudinary.uploader.upload(img);
        img = uploadedResponse.secure_url; // Update img to the Cloudinary URL
      } catch (uploadError) {
        console.error("Cloudinary upload error in createComment:", uploadError);
        return res.status(500).json({ error: "Image upload failed." });
      }
    }
    // --- End Image Upload Logic ---

    const newComment = new Comment({
      user: userId,
      post: postId,
      text,
      img, // This will now be the Cloudinary URL or null
      parentComment: null,
    });

    await newComment.save();

    post.commentsCount = (post.commentsCount || 0) + 1;
    await post.save();

    await newComment.populate({
      path: "user",
      select: "username fullName profileImg isVerified",
    });

    if (
      post.user &&
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
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const replyToComment = async (req, res) => {
  try {
    const { text } = req.body;
    let { img } = req.body; // 'img' is now the Base64 string from frontend
    const { postId, parentCommentId } = req.params;
    const userId = req.user._id;

    if (!text && !img) {
      return res
        .status(400)
        .json({ error: "Reply must contain either text or an image." });
    }
    if (!isValidObjectId(postId) || !isValidObjectId(parentCommentId)) {
      return res.status(400).json({ error: "Invalid Post ID or Parent Comment ID" });
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
      return res.status(404).json({ error: "Comment not found" });
    }

    if (parentComment.post.toString() !== postId) {
      return res
        .status(400)
        .json({ error: "Parent comment does not belong to this post" });
    }

    if (!post.user) {
      console.error(
        `[replyToComment] Post ${postId} has no associated user. Cannot perform blocking check for post owner.`
      );
      return res
        .status(500)
        .json({ error: "Internal server error: Post owner information missing." });
    }
    if (await isBlockedOrBlockedBy(userId, post.user._id)) {
      return res
        .status(403)
        .json({ error: "You cannot reply on this post due to blocking restrictions." });
    }

    if (!parentComment.user) {
      console.error(
        `[replyToComment] Parent comment ${parentCommentId} has no associated user. Cannot perform blocking check for parent comment owner.`
      );
      return res.status(500).json({
        error: "Internal server error: Parent comment owner information missing.",
      });
    }
    if (await isBlockedOrBlockedBy(userId, parentComment.user._id)) {
      return res.status(403).json({
        error: "You cannot reply to this comment due to blocking restrictions.",
      });
    }

    // --- Image Upload Logic (replicated from your createPost) ---
    if (img) {
      try {
        const uploadedResponse = await cloudinary.uploader.upload(img);
        img = uploadedResponse.secure_url; // Update img to the Cloudinary URL
      } catch (uploadError) {
        console.error("Cloudinary upload error in replyToComment:", uploadError);
        return res.status(500).json({ error: "Image upload failed." });
      }
    }
    // --- End Image Upload Logic ---

    const newReply = new Comment({
      user: userId,
      post: postId,
      text,
      img, // This will now be the Cloudinary URL or null
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
      select: "text img user",
      populate: {
        path: "user",
        select: "username fullName",
      },
    });

    if (
      parentComment.user &&
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

    // Populate comment owner to get their blocking status
    const comment = await Comment.findById(commentId).populate(
      "user",
      "blockedUsers blockedBy"
    );
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // --- START: Blocking check before liking/unliking a comment ---
    // CRITICAL FIX: Ensure comment.user exists
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
      // CRITICAL FIX: Ensure comment.user exists before sending notification
      if (
        comment.user &&
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

    // Populate comment owner to get their blocking status for checks
    const commentToDelete = await Comment.findById(commentId).populate(
      "user",
      "blockedUsers blockedBy"
    );
    if (!commentToDelete) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Populate post owner to get their blocking status for checks
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

    // --- START: Blocking check before deleting a comment ---
    // CRITICAL FIX: Defensive checks for user existence before performing blocking checks
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

    // The rest of your blocking logic for delete is sound assuming the above checks pass
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
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};
