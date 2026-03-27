import Devlog from "../models/devlog.model.js";

// GET /api/devlogs?page=1&limit=10
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
        select: "_id username fullName profileImg isAdmin isVerified isGoldVerified",
        populate: {
          path: "profileImg",
          select: "imageUrl",
        },
      });
    const hasNextPage = page * limit < totalCount;

    res.status(200).json({ devlogs, hasNextPage, totalCount });
  } catch (error) {
    console.error("Error in getDevlogs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/devlogs/:id
export const getDevlog = async (req, res) => {
  try {
    const devlog = await Devlog.findById(req.params.id).populate({
      path: "author",
      select: "_id username fullName profileImg isAdmin isVerified isGoldVerified",
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

// POST /api/devlogs  (admin only)
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

    const populated = await devlog.populate({
      path: "author",
      select: "_id username fullName profileImg isAdmin isVerified isGoldVerified",
      populate: {
        path: "profileImg",
        select: "imageUrl",
      },
    });

    res.status(201).json(populated);
  } catch (error) {
    console.error("Error in createDevlog:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// PUT /api/devlogs/:id  (admin only)
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

    const populated = await devlog.populate({
      path: "author",
      select: "_id username fullName profileImg isAdmin isVerified isGoldVerified",
      populate: {
        path: "profileImg",
        select: "imageUrl",
      },
    });

    res.status(200).json(populated);
  } catch (error) {
    console.error("Error in updateDevlog:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// DELETE /api/devlogs/:id  (admin only)
export const deleteDevlog = async (req, res) => {
  try {
    const devlog = await Devlog.findById(req.params.id);
    if (!devlog) return res.status(404).json({ error: "Devlog not found" });

    await Devlog.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Devlog deleted successfully" });
  } catch (error) {
    console.error("Error in deleteDevlog:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
