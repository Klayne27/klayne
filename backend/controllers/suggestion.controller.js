import Suggestion from "../models/suggestion.model.js";
import { v2 as cloudinary } from "cloudinary";

export const submitSuggestion = async (req, res) => {
  try {
    const { type, title, description, img } = req.body;

    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ error: "Title and description are required." });
    }

    let uploadedImgUrl = null;
    let imgPublicId = null;

    if (img) {
      const uploaded = await cloudinary.uploader.upload(img, {
        upload_preset: "ml_posts", // reuse the same preset as posts
      });
      uploadedImgUrl = uploaded.secure_url;
      imgPublicId = uploaded.public_id;
    }

    const suggestion = await Suggestion.create({
      user: req.user._id,
      type: type || "idea",
      title: title.trim(),
      description: description.trim(),
      img: uploadedImgUrl,
      imgPublicId,
    });

    res.status(201).json(suggestion);
  } catch (error) {
    console.error("Error in submitSuggestion:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllSuggestions = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: "Unauthorized." });
    }

    const { status, type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [suggestions, total] = await Promise.all([
      Suggestion.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate({
          path: "user",
          select: "username fullName profileImg isVerified",
          populate: { path: "profileImg", select: "imageUrl" },
        }),
      Suggestion.countDocuments(filter),
    ]);

    res.status(200).json({
      suggestions,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    console.error("Error in getAllSuggestions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateSuggestionStatus = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: "Unauthorized." });
    }

    const { id } = req.params;
    const { status, adminNote } = req.body;

    const suggestion = await Suggestion.findByIdAndUpdate(
      id,
      { ...(status && { status }), ...(adminNote !== undefined && { adminNote }) },
      { new: true },
    ).populate("user", "username fullName");

    if (!suggestion) return res.status(404).json({ error: "Suggestion not found." });

    res.status(200).json(suggestion);
  } catch (error) {
    console.error("Error in updateSuggestionStatus:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteSuggestion = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: "Unauthorized." });
    }

    const { id } = req.params;
    const suggestion = await Suggestion.findByIdAndDelete(id);
    if (!suggestion) return res.status(404).json({ error: "Suggestion not found." });

    // Clean up the attached image from Cloudinary if one exists
    if (suggestion.imgPublicId) {
      await cloudinary.uploader.destroy(suggestion.imgPublicId);
    }

    res.status(200).json({ message: "Deleted." });
  } catch (error) {
    console.error("Error in deleteSuggestion:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
