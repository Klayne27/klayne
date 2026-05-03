import Post from "../models/post.model.js";
import Hashtag from "../models/hashtag.model.js";
import mongoose from "mongoose";

const POST_POPULATE = [
  {
    path: "user",
    select:
      "username fullName profileImg isVerified isGoldVerified isCha badges preferredBadge nameColor equipped",
    populate: { path: "profileImg", select: "imageUrl" },
  },
  { path: "image", select: "imageUrl" },
  {
    path: "repostedFrom",
    populate: [
      {
        path: "user",
        select:
          "username fullName profileImg isVerified isGoldVerified nameColor equipped",
        populate: { path: "profileImg", select: "imageUrl" },
      },
      { path: "image", select: "imageUrl" },
    ],
  },
];

// GET /api/hashtags/trending
export const getTrendingHashtags = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 30, 30);

    const trending = await Hashtag.find({ count: { $gt: 0 } })
      .sort({ count: -1 })
      .limit(limit)
      .lean();

    res.status(200).json(trending);
  } catch (error) {
    console.error("Error in getTrendingHashtags:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/hashtags/panel-trending
export const getPanelTrendingHashtags = async (req, res) => {
  try {
    const PANEL_LIMIT = 4;

    const trending = await Hashtag.find({ count: { $gt: 0 } })
      .sort({ count: -1 })
      .limit(PANEL_LIMIT)
      .lean();

    res.status(200).json(trending);
  } catch (error) {
    console.error("Error in getPanelTrendingHashtags:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/hashtags/:tag/posts?cursor=&limit=
export const getPostsByHashtag = async (req, res) => {
  try {
    const tag = req.params.tag.toLowerCase().replace(/^#/, "");
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const cursor = req.query.cursor;

    const query = {
      hashtags: tag,
      parentPost: null,
      isScheduled: false,
    };

    if (cursor) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const posts = await Post.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate(POST_POPULATE)
      .lean();

    const hasNextPage = posts.length > limit;
    const results = hasNextPage ? posts.slice(0, limit) : posts;
    const nextCursor = hasNextPage ? results[results.length - 1]._id : null;

    res.status(200).json({ posts: results, hasNextPage, nextCursor });
  } catch (error) {
    console.error("Error in getPostsByHashtag:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
