import Devlog from "../models/devlog.model.js";
import DevlogComment from "../models/devlogComment.model.js";

const AUTHOR_PROJECTION =
  "_id username fullName profileImg isAdmin isCha isVerified isGoldVerified";

export const getDevlogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalCount = await Devlog.countDocuments();

    const devlogs = await Devlog.find()
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "author",
        select: AUTHOR_PROJECTION,
        populate: {
          path: "profileImg",
          select: "imageUrl"
        }
      });

    const hasNextPage = page * limit < totalCount;

    res.status(200).json({ devlogs, hasNextPage, totalCount });
  } catch (error) {
    console.error("Error in getDevlogs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getDevlog = async (req, res) => {
  try {
    const devlog = await Devlog.findById(req.params.id).populate({
      path: "author",
      select: AUTHOR_PROJECTION,
      populate: {
        path: "profileImg",
        select: "imageUrl",
      },
    });

    if (!devlog) return res.status(404).json({ error: "Devlog not found" });

    res.status(200).json(devlog);
  } catch (error) {
    console.error("Error in getDevlog:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createDevlog = async (req, res) => {
  try {
    const { title, body, tag, isPinned } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: "Title and body are required" });
    }

    const devlog = await Devlog.create({
      title,
      body,
      tag: tag || "",
      isPinned: isPinned || false,
      author: req.user._id,
    });

    const populated = await devlog.populate("author", AUTHOR_PROJECTION);

    res.status(201).json(populated);
  } catch (error) {
    console.error("Error in createDevlog:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateDevlog = async (req, res) => {
  try {
    const { title, body, tag, isPinned } = req.body;

    const devlog = await Devlog.findById(req.params.id);
    if (!devlog) return res.status(404).json({ error: "Devlog not found" });

    if (title !== undefined) devlog.title = title;
    if (body !== undefined) devlog.body = body;
    if (tag !== undefined) devlog.tag = tag;
    if (isPinned !== undefined) devlog.isPinned = isPinned;

    await devlog.save();

    const populated = await devlog.populate("author", AUTHOR_PROJECTION);

    res.status(200).json(populated);
  } catch (error) {
    console.error("Error in updateDevlog:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteDevlog = async (req, res) => {
  try {
    const devlog = await Devlog.findById(req.params.id);
    if (!devlog) return res.status(404).json({ error: "Devlog not found" });

    await DevlogComment.deleteMany({ devlog: req.params.id });
    await Devlog.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Devlog deleted successfully" });
  } catch (error) {
    console.error("Error in deleteDevlog:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const likeDevlog = async (req, res) => {
  try {
    const userId = req.user._id;
    const devlog = await Devlog.findById(req.params.id);

    if (!devlog) return res.status(404).json({ error: "Devlog not found" });

    const alreadyLiked = devlog.likes.some((id) => id.equals(userId));

    if (alreadyLiked) {
      devlog.likes = devlog.likes.filter((id) => !id.equals(userId));
    } else {
      devlog.likes.push(userId);
    }

    await devlog.save();

    res.status(200).json({
      likes: devlog.likes,
      isLiked: !alreadyLiked,
    });
  } catch (error) {
    console.error("Error in likeDevlog:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getDevlogComments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const devlog = await Devlog.findById(req.params.id).select("_id");
    if (!devlog) return res.status(404).json({ error: "Devlog not found" });

    const totalCount = await DevlogComment.countDocuments({ devlog: req.params.id });

    const comments = await DevlogComment.find({ devlog: req.params.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "author",
        select: AUTHOR_PROJECTION,
        populate: {
          path: "profileImg",
          select: "imageUrl",
        },
      });;

    const hasNextPage = page * limit < totalCount;

    res.status(200).json({ comments, hasNextPage, totalCount });
  } catch (error) {
    console.error("Error in getDevlogComments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createDevlogComment = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Comment text is required" });
    }

    const devlog = await Devlog.findById(req.params.id);
    if (!devlog) return res.status(404).json({ error: "Devlog not found" });

    const comment = await DevlogComment.create({
      devlog: req.params.id,
      author: req.user._id,
      text: text.trim(),
    });

    await Devlog.findByIdAndUpdate(req.params.id, { $inc: { commentsCount: 1 } });

    const populated = await comment.populate({
      path: "author",
      select: AUTHOR_PROJECTION,
      populate: {
        path: "profileImg",
        select: "imageUrl",
      },
    });;

    res.status(201).json(populated);
  } catch (error) {
    console.error("Error in createDevlogComment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteDevlogComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await DevlogComment.findById(commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const isAuthor = comment.author.equals(userId);
    const isAdmin = req.user.isAdmin;

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ error: "Not authorized to delete this comment" });
    }

    await DevlogComment.findByIdAndDelete(commentId);
    await Devlog.findByIdAndUpdate(req.params.id, {
      $inc: { commentsCount: -1 },
    });

    res.status(200).json({ message: "Comment deleted" });
  } catch (error) {
    console.error("Error in deleteDevlogComment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const likeDevlogComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await DevlogComment.findById(commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const alreadyLiked = comment.likes.some((id) => id.equals(userId));

    if (alreadyLiked) {
      comment.likes = comment.likes.filter((id) => !id.equals(userId));
    } else {
      comment.dislikes = comment.dislikes.filter((id) => !id.equals(userId));
      comment.likes.push(userId);
    }

    await comment.save();

    res.status(200).json({
      likes: comment.likes,
      dislikes: comment.dislikes,
      isLiked: !alreadyLiked,
    });
  } catch (error) {
    console.error("Error in likeDevlogComment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const dislikeDevlogComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await DevlogComment.findById(commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const alreadyDisliked = comment.dislikes.some((id) => id.equals(userId));

    if (alreadyDisliked) {
      comment.dislikes = comment.dislikes.filter((id) => !id.equals(userId));
    } else {
      comment.likes = comment.likes.filter((id) => !id.equals(userId));
      comment.dislikes.push(userId);
    }

    await comment.save();

    res.status(200).json({
      likes: comment.likes,
      dislikes: comment.dislikes,
      isDisliked: !alreadyDisliked,
    });
  } catch (error) {
    console.error("Error in dislikeDevlogComment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
