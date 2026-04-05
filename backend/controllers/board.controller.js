import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import BoardPost from "../models/boardPost.model.js";
import Image from "../models/image.model.js";
import BoardComment from "../models/boardComment.model.js";

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
    select: "content user isDeletedByUser isDeletedByAdmin",
    populate: {
      path: "user",
      select: "username fullName profileImg",
      populate: { path: "profileImg", select: "imageUrl" },
    },
  },
  {
    path: "reactions.userId",
    select: "username fullName profileImg",
    populate: { path: "profileImg", select: "imageUrl" },
  },
];

// ── GET all board posts (paginated) ──────────────────────────────────────────
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
      .populate({
        path: "user",
        select:
          "username fullName profileImg isVerified isGoldVerified badges preferredBadge",
        populate: { path: "profileImg", select: "imageUrl" },
      })
      .populate({
        path: "reactions.userId",
        select: "username fullName",
        populate: { path: "profileImg", select: "imageUrl" },
      })
      .populate({ path: "image", select: "imageUrl" })
      .lean();

    const hasNextPage = page * limit < totalCount;

    res.status(200).json({ posts, hasNextPage, totalCount });
  } catch (error) {
    console.error("Error in getBoardPosts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── GET single board post ────────────────────────────────────────────────────
export const getBoardPost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await BoardPost.findById(id)
      .populate({
        path: "user",
        select:
          "username fullName profileImg isVerified isGoldVerified badges preferredBadge",
        populate: { path: "profileImg", select: "imageUrl" },
      })
      .populate({
        path: "reactions.userId",
        select: "username fullName",
        populate: { path: "profileImg", select: "imageUrl" },
      })
      .populate({ path: "image", select: "imageUrl" })
      .lean();

    if (!post) return res.status(404).json({ error: "Board post not found." });

    res.status(200).json(post);
  } catch (error) {
    console.error("Error in getBoardPost:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── CREATE board post ────────────────────────────────────────────────────────
export const createBoardPost = async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    let { img } = req.body;
    const userId = req.user._id;

    if (!title?.trim()) {
      return res.status(400).json({ error: "Title is required." });
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

    const parsedTags = Array.isArray(tags)
      ? tags.map((t) => t.trim()).filter(Boolean)
      : [];

    const newPost = new BoardPost({
      user: userId,
      title: title.trim(),
      content: content?.trim() || "",
      img: uploadedImgUrl,
      imgPublicId,
      tags: parsedTags,
    });

    await newPost.save();

    if (img && uploadedImgUrl) {
      const newImage = new Image({
        imageUrl: uploadedImgUrl,
        parentDocument: newPost._id,
        parentModel: "Post",
        uploadedBy: userId,
        publicId: imgPublicId,
      });
      await newImage.save();
      newPost.image = newImage._id;
      await newPost.save();
    }

    const populated = await BoardPost.findById(newPost._id)
      .populate({
        path: "user",
        select:
          "username fullName profileImg isVerified isGoldVerified badges preferredBadge",
        populate: { path: "profileImg", select: "imageUrl" },
      })
      .populate({ path: "image", select: "imageUrl" });

    res.status(201).json(populated);
  } catch (error) {
    console.error("Error in createBoardPost:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── DELETE board post ────────────────────────────────────────────────────────
export const deleteBoardPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await BoardPost.findById(id);
    if (!post) return res.status(404).json({ error: "Board post not found." });

    if (!post.user.equals(userId) && !req.user.isAdmin) {
      return res.status(403).json({ error: "Not authorized." });
    }

    if (post.imgPublicId) {
      await cloudinary.uploader.destroy(post.imgPublicId);
      await Image.deleteOne({ parentDocument: post._id });
    }

    await BoardComment.deleteMany({ boardPost: id });
    await BoardPost.deleteOne({ _id: id });

    res.status(200).json({ message: "Board post deleted." });
  } catch (error) {
    console.error("Error in deleteBoardPost:", error);
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
      .populate({ path: "image", select: "imageUrl" });

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
    res.status(200).json({ comments, hasNextPage, totalCount });
  } catch (error) {
    console.error("Error in getBoardComments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── CREATE comment (updated — handle parentComment) ──────────────────────────
export const createBoardComment = async (req, res) => {
  try {
    const { id: boardPostId } = req.params;
    const { content, parentCommentId } = req.body;
    let { img } = req.body;
    const userId = req.user._id;

    if (!content?.trim() && !img) {
      return res.status(400).json({ error: "Comment must have content or an image." });
    }

    const post = await BoardPost.findById(boardPostId);
    if (!post) return res.status(404).json({ error: "Board post not found." });

    // Validate parentComment belongs to the same board post
    if (parentCommentId) {
      const parent = await BoardComment.findById(parentCommentId);
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

    const comment = await BoardComment.findById(commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found." });

    if (!comment.user.equals(userId) && !req.user.isAdmin) {
      return res.status(403).json({ error: "Not authorized." });
    }

    await BoardPost.findByIdAndUpdate(comment.boardPost, { $inc: { commentsCount: -1 } });
    await BoardComment.deleteOne({ _id: commentId });

    res.status(200).json({ message: "Comment deleted.", commentId });
  } catch (error) {
    console.error("Error in deleteBoardComment:", error);
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
