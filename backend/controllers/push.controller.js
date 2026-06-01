import PushSubscription from "../models/pushSubscription.js";

export const subscribe = async (req, res) => {
  try {
    const { endpoint, keys, deviceId } = req.body;
    const userId = req.user._id;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: "Missing required subscription data" });
    }

    const deviceInfo = {
      userAgent: req.headers["user-agent"] || "Unknown",
      deviceId: deviceId || `device_${Date.now()}`,
    };

    const subscription = await PushSubscription.findOneAndUpdate(
      { userId, endpoint },
      {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        deviceInfo,
        isActive: true,
      },
      { upsert: true, new: true, runValidators: true },
    );

    res.status(201).json({
      message: "Subscription saved successfully",
      subscriptionId: subscription._id,
    });
  } catch (error) {
    console.error("Error saving push subscription:", error);
    if (error.code === 11000) {
      return res.status(409).json({ error: "Subscription already exists" });
    }
    res.status(500).json({ error: "Failed to save subscription" });
  }
};

export const getStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    const activeSubscriptions = await PushSubscription.find({
      userId,
      isActive: true,
    }).select("deviceInfo endpoint createdAt");

    res.json({
      hasActiveSubscription: activeSubscriptions.length > 0,
      subscriptionCount: activeSubscriptions.length,
      devices: activeSubscriptions.map((sub) => ({
        id: sub._id,
        deviceInfo: sub.deviceInfo,
        endpoint: sub.endpoint.substring(0, 50) + "...",
        subscribedAt: sub.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error checking subscription status:", error);
    res.status(500).json({ error: "Failed to check subscription status" });
  }
};
