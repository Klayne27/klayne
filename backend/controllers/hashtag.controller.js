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
    const limit = Math.min(parseInt(req.query.limit) || 10, 25);

    // "Recent trending": used in the last 7 days, sorted by count desc
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const trending = await Hashtag.find({
      count: { $gt: 0 },
      lastUsed: { $gte: since },
    })
      .sort({ count: -1, lastUsed: -1 })
      .limit(limit)
      .lean();

    // If fewer than `limit` recent results, pad with all-time popular
    if (trending.length < limit) {
      const existingTags = trending.map((t) => t.tag);
      const allTime = await Hashtag.find({
        count: { $gt: 0 },
        tag: { $nin: existingTags },
      })
        .sort({ count: -1 })
        .limit(limit - trending.length)
        .lean();

      trending.push(...allTime);
    }

    res.status(200).json(trending);
  } catch (error) {
    console.error("Error in getTrendingHashtags:", error);
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
      parentPost: null, // top-level posts only
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
