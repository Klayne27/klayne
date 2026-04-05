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

    if (!emoji) return res.status(400).json({ error: "Emoji is required." });

    const post = await BoardPost.findById(id);
    if (!post) return res.status(404).json({ error: "Board post not found." });

    const existing = post.reactions.find((r) => r.emoji === emoji);

    if (existing) {
      const userIndex = existing.users.findIndex((u) => u.equals(userId));
      if (userIndex !== -1) {
        existing.users.splice(userIndex, 1);
        if (existing.users.length === 0) {
          post.reactions = post.reactions.filter((r) => r.emoji !== emoji);
        }
      } else {
        existing.users.push(userId);
      }
    } else {
      post.reactions.push({ emoji, users: [userId] });
    }

    await post.save();

    const populated = await BoardPost.findById(id)
      .populate({
        path: "user",
        select:
          "username fullName profileImg isVerified isGoldVerified badges preferredBadge",
        populate: { path: "profileImg", select: "imageUrl" },
      })
      .populate({ path: "image", select: "imageUrl" });

    res.status(200).json(populated);
  } catch (error) {
    console.error("Error in reactToBoardPost:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── GET comments ─────────────────────────────────────────────────────────────
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
      .populate({
        path: "user",
        select:
          "username fullName profileImg isVerified isGoldVerified badges preferredBadge",
        populate: { path: "profileImg", select: "imageUrl" },
      })
      .populate({ path: "image", select: "imageUrl" })
      .lean();

    const hasNextPage = page * limit < totalCount;

    res.status(200).json({ comments, hasNextPage, totalCount });
  } catch (error) {
    console.error("Error in getBoardComments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── CREATE comment ───────────────────────────────────────────────────────────
export const createBoardComment = async (req, res) => {
  try {
    const { id: boardPostId } = req.params;
    const { content } = req.body;
    let { img } = req.body;
    const userId = req.user._id;

    if (!content?.trim() && !img) {
      return res.status(400).json({ error: "Comment must have content or an image." });
    }

    const post = await BoardPost.findById(boardPostId);
    if (!post) return res.status(404).json({ error: "Board post not found." });

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

    const populated = await BoardComment.findById(newComment._id)
      .populate({
        path: "user",
        select:
          "username fullName profileImg isVerified isGoldVerified badges preferredBadge",
        populate: { path: "profileImg", select: "imageUrl" },
      })
      .populate({ path: "image", select: "imageUrl" });

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

// ── REACT to comment ─────────────────────────────────────────────────────────
export const reactToBoardComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!emoji) return res.status(400).json({ error: "Emoji is required." });

    const comment = await BoardComment.findById(commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found." });

    const existing = comment.reactions.find((r) => r.emoji === emoji);

    if (existing) {
      const userIndex = existing.users.findIndex((u) => u.equals(userId));
      if (userIndex !== -1) {
        existing.users.splice(userIndex, 1);
        if (existing.users.length === 0) {
          comment.reactions = comment.reactions.filter((r) => r.emoji !== emoji);
        }
      } else {
        existing.users.push(userId);
      }
    } else {
      comment.reactions.push({ emoji, users: [userId] });
    }

    await comment.save();

    const populated = await BoardComment.findById(commentId)
      .populate({
        path: "user",
        select:
          "username fullName profileImg isVerified isGoldVerified badges preferredBadge",
        populate: { path: "profileImg", select: "imageUrl" },
      })
      .populate({ path: "image", select: "imageUrl" });

    res.status(200).json(populated);
  } catch (error) {
    console.error("Error in reactToBoardComment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
