import express from "express";
import { protectRoute } from "../middleware/protectRoute.js"
import PushSubscription from "../models/pushSubscription.js"
import { sendPushNotification } from "../lib/utils/sendPush.js";

const router = express.Router();

router.post("/subscribe", protectRoute, async (req, res) => {
  const { endpoint, keys } = req.body;
  const userId = req.user._id;

  if (!endpoint || !keys) {
    return res.status(400).json({ error: "Invalid subscription data" });
  }

  try {
    // Check if a subscription for this user already exists
    let subscription = await PushSubscription.findOne({ userId });

    if (subscription) {
      // If it exists, update it
      subscription.endpoint = endpoint;
      subscription.p256dh = keys.p256dh;
      subscription.auth = keys.auth;
      await subscription.save();
    } else {
      // If not, create a new one
      subscription = new PushSubscription({
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });
      await subscription.save();
    }

    res.status(201).json({ message: "Subscription saved successfully." });
  } catch (error) {
    console.error("Error saving push subscription:", error);
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

router.post("/notify", protectRoute, async (req, res) => {
  const { userId, title, body, url } = req.body;
  try {
    const result = await sendPushNotification(userId, { title, body, url });
    res.status(200).json({ message: "Notification sent", result });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

export default router;
