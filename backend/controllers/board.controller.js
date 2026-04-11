import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import BoardPost from "../models/boardPost.model.js";
import Image from "../models/image.model.js";
import BoardComment from "../models/boardComment.model.js";
import {
  createAndSendBoardNotification,
  emitNewBoardPostCount,
  io,
  onlineUsersMap,
} from "../lib/socket.js";

const userProjection = {
  _id: 1,
  username: 1,
  fullName: 1,
  profileImg: 1,
  isVerified: 1,
  isGoldVerified: 1,
  badges: 1,
  preferredBadge: 1,
};

// Shared populate config for comments
const commentPopulate = [
  {
    path: "user",
    select:
      "username fullName profileImg isVerified isGoldVerified badges preferredBadge",
    populate: { path: "profileImg", select: "imageUrl" },
  },
  { path: "image", select: "imageUrl" },
  {
    path: "parentComment",
    select: "content user  ",
    populate: {
      path: "user",
      select: "username fullName profileImg",
      populate: { path: "profileImg", select: "imageUrl" },
    },
  },
  {
    // Populate boardPost just enough for the reply indicator
    path: "boardPost",
    select: "title user",
    populate: {
      path: "user",
      select: "username fullName",
    },
  },
  {
    path: "reactions.userId",
    select: "username fullName profileImg",
    populate: { path: "profileImg", select: "imageUrl" },
  },
];

const boardPostPopulate = [
  {
    path: "user",
    select:
      "username fullName profileImg isVerified isGoldVerified badges preferredBadge",
    populate: { path: "profileImg", select: "imageUrl" },
  },
  {
    path: "reactions.userId",
    select: "username fullName",
    populate: { path: "profileImg", select: "imageUrl" },
  },
  { path: "images", select: "imageUrl publicId" },
];

// ── CREATE board post ────────────────────────────────────────────────────────
export const createBoardPost = async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    const imgs = req.body.imgs; // array of base64 strings, max 4
    const userId = req.user._id;

    if (!title?.trim()) {
      return res.status(400).json({ error: "Title is required." });
    }

    if (imgs && (!Array.isArray(imgs) || imgs.length > 4)) {
      return res.status(400).json({ error: "Maximum 4 images allowed." });
    }

    const parsedTags = Array.isArray(tags)
      ? tags.map((t) => t.trim()).filter(Boolean)
      : [];

    const newPost = new BoardPost({
      user: userId,
      title: title.trim(),
      content: content?.trim() || "",
      tags: parsedTags,
    });

    await newPost.save();

    // Upload all images in parallel
    if (imgs && imgs.length > 0) {
      const uploadedImages = await Promise.all(
        imgs.map(async (imgBase64) => {
          const uploaded = await cloudinary.uploader.upload(imgBase64, {
            upload_preset: "ml_posts",
          });

          const newImage = new Image({
            imageUrl: uploaded.secure_url,
            parentDocument: newPost._id,
            parentModel: "Post",
            uploadedBy: userId,
            publicId: uploaded.public_id,
          });
          await newImage.save();
          return newImage._id;
        }),
      );

      newPost.images = uploadedImages;
      await newPost.save();
    }

    if (onlineUsersMap && io) {
      for (const [onlineUserId] of onlineUsersMap.entries()) {
        if (onlineUserId.toString() !== userId.toString()) {
          await emitNewBoardPostCount(onlineUserId);
        }
      }
    }

    const populated = await BoardPost.findById(newPost._id).populate(boardPostPopulate);
    res.status(201).json(populated);
  } catch (error) {
    console.error("Error in createBoardPost:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── EDIT board post ───────────────────────────────────────────────────────────
export const editBoardPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const post = await BoardPost.findById(id);
    if (!post) return res.status(404).json({ error: "Board post not found." });
    if (!post.user.equals(userId)) {
      return res.status(403).json({ error: "Not authorized." });
    }

    post.content = content?.trim() || "";
    post.isEdited = true;
    await post.save();

    const populated = await BoardPost.findById(post._id).populate(boardPostPopulate);
    res.status(200).json(populated);
  } catch (error) {
    console.error("Error in editBoardPost:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── DELETE board post — cascade delete images ─────────────────────────────────
export const deleteBoardPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Populate images so we have access to the imageUrl strings
    const post = await BoardPost.findById(id).populate("images");
    if (!post) return res.status(404).json({ error: "Board post not found." });

    // Authorization check
    if (!post.user.equals(userId) && !req.user.isAdmin) {
      return res.status(403).json({ error: "Not authorized." });
    }

    // 1. Delete all images from Cloudinary and DB
    if (post.images && post.images.length > 0) {
      await Promise.all(
        post.images.map(async (img) => {
          if (img.imageUrl) {
            // Extract publicId from URL (Logic from your deleteMessage reference)
            // Example: https://res.cloudinary.com/.../v1234/folder/image_name.jpg
            // Result: image_name
            const publicId = img.imageUrl.split("/").pop().split(".")[0];

            try {
              await cloudinary.uploader.destroy(publicId);
            } catch (cloudErr) {
              console.error("Cloudinary error for image:", publicId, cloudErr.message);
              // We continue so the DB record still gets wiped even if Cloudinary fails
            }
          }
          // Remove the image document from your Image collection
          return Image.deleteOne({ _id: img._id });
        }),
      );
    }

    // 2. Cascade delete comments
    await BoardComment.deleteMany({ boardPost: id });

    // 3. Finally delete the post
    await BoardPost.deleteOne({ _id: id });

    res.status(200).json({ message: "Board post and all media deleted successfully." });
  } catch (error) {
    console.error("Error in deleteBoardPost:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── GET all board posts — update populate ─────────────────────────────────────
export const getBoardPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const totalCount = await BoardPost.countDocuments();

    const posts = await BoardPost.find()
      .sort({ isPinned: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate(boardPostPopulate)
      .lean();

    const hasNextPage = page * limit < totalCount;
    res.status(200).json({ posts, hasNextPage, totalCount });
  } catch (error) {
    console.error("Error in getBoardPosts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── GET single board post — update populate ───────────────────────────────────
export const getBoardPost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await BoardPost.findById(id).populate(boardPostPopulate).lean();

    if (!post) return res.status(404).json({ error: "Board post not found." });

    res.status(200).json(post);
  } catch (error) {
    console.error("Error in getBoardPost:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── REACT to board post ──────────────────────────────────────────────────────
export const reactToBoardPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!id || !emoji) {
      return res.status(400).json({ error: "Post ID and emoji are required." });
    }

    const post = await BoardPost.findById(id);
    if (!post) return res.status(404).json({ error: "Board post not found." });

    // Check if reaction exists (same logic as reactToMessage)
    const reactionExists = post.reactions.some(
      (r) => r.userId.toString() === userId.toString() && r.emoji === emoji,
    );

    let updatedPost;
    if (reactionExists) {
      updatedPost = await BoardPost.findOneAndUpdate(
        { _id: id },
        { $pull: { reactions: { userId: userId, emoji: emoji } } },
        { new: true },
      );
    } else {
      updatedPost = await BoardPost.findOneAndUpdate(
        { _id: id },
        { $push: { reactions: { emoji, userId: userId } } },
        { new: true },
      );
    }

    const populated = await BoardPost.findById(updatedPost._id)
      .populate({
        path: "user",
        select:
          "username fullName profileImg isVerified isGoldVerified badges preferredBadge",
        populate: { path: "profileImg", select: "imageUrl" },
      })
      .populate({
        path: "reactions.userId", // Populating the user info for the reaction
        select: "username fullName",
        populate: { path: "profileImg", select: "imageUrl" },
      })
      .populate({ path: "images", select: "imageUrl" });

    res.status(200).json(populated);
  } catch (error) {
    console.error("Error in reactToBoardPost:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── GET comments (updated to populate reactions.userId and parentComment) ────
export const getBoardComments = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const totalCount = await BoardComment.countDocuments({ boardPost: id });

    const comments = await BoardComment.find({ boardPost: id })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate(commentPopulate)
      .lean();

    const hasNextPage = page * limit < totalCount;
    const nextPage = hasNextPage ? page + 1 : undefined;
    res.status(200).json({ comments, hasNextPage, totalCount, nextPage });
  } catch (error) {
    console.error("Error in getBoardComments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── CREATE comment (updated — handle parentComment) ──────────────────────────
export const createBoardComment = async (req, res) => {
  try {
    const { id: boardPostId } = req.params;
    const { content, parentCommentId, isReplyToPost } = req.body; // ADD isReplyToPost
    let { img } = req.body;
    const userId = req.user._id;

    if (!content?.trim() && !img) {
      return res.status(400).json({ error: "Comment must have content or an image." });
    }

    const post = await BoardPost.findById(boardPostId).populate("user");
    if (!post) return res.status(404).json({ error: "Board post not found." });

    const postOwnerId = post.user._id; // extract ObjectId from populated user

    // Validate parentComment belongs to the same board post
    if (parentCommentId) {
      const parent = await BoardComment.findById(parentCommentId).populate("user");
      if (!parent || parent.boardPost.toString() !== boardPostId) {
        return res.status(400).json({ error: "Invalid parent comment." });
      }
    }

    let uploadedImgUrl = null;
    let imgPublicId = null;

    if (img) {
      const uploaded = await cloudinary.uploader.upload(img, {
        upload_preset: "ml_posts",
      });
      uploadedImgUrl = uploaded.secure_url;
      imgPublicId = uploaded.public_id;
    }

    const newComment = new BoardComment({
      boardPost: boardPostId,
      user: userId,
      content: content?.trim() || "",
      img: uploadedImgUrl,
      parentComment: parentCommentId || null,
      isReplyToPost: !parentCommentId && !!isReplyToPost, // only set if no parent comment
    });

    await newComment.save();

    if (img && uploadedImgUrl) {
      const newImage = new Image({
        imageUrl: uploadedImgUrl,
        parentDocument: newComment._id,
        parentModel: "Post",
        uploadedBy: userId,
        publicId: imgPublicId,
      });
      await newImage.save();
      newComment.image = newImage._id;
      await newComment.save();
    }

    await BoardPost.findByIdAndUpdate(boardPostId, { $inc: { commentsCount: 1 } });

    if (postOwnerId.toString() !== userId.toString()) {
      await createAndSendBoardNotification({
        from: userId,
        to: postOwnerId, // pass ObjectId, not the full user object
        type: "boardComment",
        boardPostId: post._id,
        boardCommentId: newComment._id,
      });
    }

    if (parentCommentId) {
      const parentComment = await BoardComment.findById(parentCommentId).select("user");
      if (parentComment && parentComment.user.toString() !== userId.toString()) {
        if (parentComment.user.toString() !== postOwnerId.toString()) {
          await createAndSendBoardNotification({
            from: userId,
            to: parentComment.user,
            type: "boardReply",
            boardPostId: post._id,
            boardCommentId: newComment._id,
          });
        }
      }
    }

    const populated = await BoardComment.findById(newComment._id).populate(
      commentPopulate,
    );
    res.status(201).json(populated);
  } catch (error) {
    console.error("Error in createBoardComment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── DELETE comment ───────────────────────────────────────────────────────────
export const deleteBoardComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    // 1. Find the comment and populate the image reference
    // In your schema, the field is likely 'image' (singular) or part of the document
    const comment = await BoardComment.findById(commentId).populate("image");
    if (!comment) return res.status(404).json({ error: "Comment not found." });

    // Authorization check
    if (!comment.user.equals(userId) && !req.user.isAdmin) {
      return res.status(403).json({ error: "Not authorized." });
    }

    // 2. Delete the associated image if it exists
    if (comment.image) {
      const img = comment.image;

      if (img.imageUrl) {
        // Extract publicId: takes 'image_name.jpg', then grabs 'image_name'
        const publicId = img.imageUrl.split("/").pop().split(".")[0];

        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (cloudErr) {
          console.error(
            "Cloudinary error for comment image:",
            publicId,
            cloudErr.message,
          );
        }
      }

      // Remove the image document from your Image collection
      await Image.deleteOne({ _id: img._id });
    }

    // 3. Decrement the post's comment count
    await BoardPost.findByIdAndUpdate(comment.boardPost, {
      $inc: { commentsCount: -1 },
    });

    // 4. Finally delete the comment
    await BoardComment.deleteOne({ _id: commentId });

    res.status(200).json({ message: "Comment and media deleted successfully." });
  } catch (error) {
    console.error("Error in deleteBoardComment:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── REACT to comment (updated — per-entry format matching Message) ────────────
export const reactToBoardComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!commentId || !emoji) {
      return res.status(400).json({ error: "Comment ID and emoji are required." });
    }

    const comment = await BoardComment.findById(commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found." });

    const reactionExists = comment.reactions.some(
      (r) => r.userId.toString() === userId.toString() && r.emoji === emoji,
    );

    let updatedComment;
    if (reactionExists) {
      updatedComment = await BoardComment.findOneAndUpdate(
        { _id: commentId },
        { $pull: { reactions: { userId: userId, emoji: emoji } } },
        { new: true },
      );
    } else {
      updatedComment = await BoardComment.findOneAndUpdate(
        { _id: commentId },
        { $push: { reactions: { emoji, userId: userId } } },
        { new: true },
      );
    }

    // Using your existing commentPopulate and adding reaction population
    const populated = await BoardComment.findById(updatedComment._id)
      .populate(commentPopulate)
      .populate({
        path: "reactions.userId",
        select: "username fullName",
        populate: { path: "profileImg", select: "imageUrl" },
      });

    res.status(200).json(populated);
  } catch (error) {
    console.error("Error in reactToBoardComment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── EDIT comment ─────────────────────────────────────────────────────────────
export const editBoardComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content?.trim()) {
      return res.status(400).json({ error: "Content cannot be empty." });
    }

    const comment = await BoardComment.findById(commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found." });
    if (!comment.user.equals(userId)) {
      return res.status(403).json({ error: "Not authorized." });
    }

    comment.content = content.trim();
    comment.isEdited = true;
    await comment.save();

    const populated = await BoardComment.findById(commentId).populate(commentPopulate);
    res.status(200).json(populated);
  } catch (error) {
    console.error("Error in editBoardComment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markBoardAsRead = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { lastReadBoardTimestamp: new Date() });
    res.status(200).json({ message: "ok" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
