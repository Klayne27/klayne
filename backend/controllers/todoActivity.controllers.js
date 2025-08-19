import TodoActivity from "../models/todoActivity.model.js";

export const getMyActivities = async (req, res) => {
  try {
    const activities = await TodoActivity.find({ user: req.user._id })
      .sort({ timestamp: -1 }) // Sort by latest first
      .limit(50) // Limit to a reasonable number of activities
      .populate({
        path: "user",
        select: "username",
        populate: { path: "profileImg", model: "Image", select: "imageUrl" },
      })

    res.status(200).json(activities);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch activities" });
  }
};
