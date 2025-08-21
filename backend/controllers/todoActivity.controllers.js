import TodoActivity from "../models/todoActivity.model.js";

export const getMyActivities = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = 30;
    const skip = page * limit;

    const activitiesDocs = await TodoActivity.find({ user: req.user._id })
      .sort({ createdAt: -1 }) // Sort by latest first
      .skip(skip)
      .limit(limit) // Limit to a reasonable number of activities
      .populate({
        path: "user",
        select: "username",
        populate: { path: "profileImg", model: "Image", select: "imageUrl" },
      })
      .populate({ path: "todoList", select: "name icon color" })
      .lean();

    // Attach listMeta (use todoList if exists, else snapshot)
    const activities = activitiesDocs.map((act) => ({
      ...act,
      listMeta: act.todoList || act.listSnapshot || null,
    }));

    const hasNextPage = activities.length === limit;

    res.status(200).json({ activities, hasNextPage });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch activities" });
  }
};
