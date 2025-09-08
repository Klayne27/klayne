import express from "express";
import { protectRoute } from "../middleware/protectRoute.js"
import PushSubscription from "../models/pushSubscription.js"
import { sendPushNotification } from "../lib/utils/sendPush.js";

const router = express.Router();

router.post("/subscribe", protectRoute, async (req, res) => {
  try {
    const { endpoint, keys, deviceId } = req.body;
    const userId = req.user._id;

    // Validate required fields
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: "Missing required subscription data" });
    }

    // Extract device info from request
    const deviceInfo = {
      userAgent: req.headers['user-agent'] || 'Unknown',
      deviceId: deviceId || `device_${Date.now()}`, // Fallback if no deviceId provided
    };

    // Use upsert to handle existing subscriptions for this endpoint
    const subscription = await PushSubscription.findOneAndUpdate(
      { userId, endpoint }, // Find by userId and endpoint to handle same device re-subscribing
      {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        deviceInfo,
        isActive: true, // Ensure it's marked as active
      },
      { 
        upsert: true, // Create if doesn't exist
        new: true,    // Return updated document
        runValidators: true // Run schema validators
      }
    );

    res.status(201).json({ 
      message: "Subscription saved successfully",
      subscriptionId: subscription._id 
    });
  } catch (error) {
    console.error("Error saving push subscription:", error);
    
    // Handle duplicate key errors (in case of race conditions)
    if (error.code === 11000) {
      return res.status(409).json({ error: "Subscription already exists" });
    }
    
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

router.post("/notify", protectRoute, async (req, res) => {
  try {
    const { userId, title, body, url, targetDevice } = req.body;

    // Validate input
    if (!userId || !title || !body) {
      return res.status(400).json({ error: "userId, title, and body are required" });
    }

    const payload = { title, body, url };

    // If targetDevice is specified, send only to that device
    if (targetDevice) {
      // Implementation would need modification to sendPushNotification function
      // For now, we'll send to all devices
    }

    const results = await sendPushNotification(userId, payload);

    // Count successful and failed sends
    const successful = results.filter((r) => r.success).length;
    const failed = results.length - successful;

    res.status(200).json({
      message: "Notification processing completed",
      results: {
        total: results.length,
        successful,
        failed,
        details: results,
      },
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

router.get("/status", protectRoute, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get count of active subscriptions and list of devices
    const activeSubscriptions = await PushSubscription.find({
      userId,
      isActive: true,
    }).select("deviceInfo endpoint createdAt");

    const subscriptionCount = activeSubscriptions.length;

    res.json({
      hasActiveSubscription: subscriptionCount > 0,
      subscriptionCount,
      devices: activeSubscriptions.map((sub) => ({
        id: sub._id,
        deviceInfo: sub.deviceInfo,
        endpoint: sub.endpoint.substring(0, 50) + "...", // Truncate for privacy
        subscribedAt: sub.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error checking subscription status:", error);
    res.status(500).json({ error: "Failed to check subscription status" });
  }
});

export default router;
