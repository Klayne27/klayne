import webpush from "web-push";
import PushSubscription from "../../models/pushSubscription.js";

export const initPush = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    console.error("VAPID keys are not set. Check your .env file and dotenv setup.");
    throw new Error("VAPID keys are missing.");
  }

  webpush.setVapidDetails("mailto:weavonklayne@gmail.com", publicKey, privateKey);
};

export const sendPushNotification = async (userId, payload) => {
  try {
    // Get ALL active subscriptions for the user
    const subscriptions = await PushSubscription.find({
      userId,
      isActive: true,
    });

    if (subscriptions.length === 0) {
      console.warn(`No push subscriptions found for user ${userId}`);
      return;
    }

    const message = JSON.stringify(payload);
    const results = [];

    // Send to all user's devices
    for (const subscription of subscriptions) {
      try {
        const result = await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          message
        );
        results.push({ success: true, subscriptionId: subscription._id });
      } catch (error) {
        console.error(`Failed to send to subscription ${subscription._id}:`, error);

        // Handle different error types
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription is no longer valid
          await PushSubscription.findByIdAndUpdate(subscription._id, { isActive: false });
        } else if (error.statusCode === 413) {
          // Payload too large
          console.warn("Payload too large for subscription:", subscription._id);
        }

        results.push({ success: false, subscriptionId: subscription._id, error });
      }
    }

    return results;
  } catch (error) {
    console.error(`Failed to send push notifications to user ${userId}:`, error);
    throw error;
  }
};

// New function to clean up invalid subscriptions
export const cleanupInvalidSubscriptions = async () => {
  try {
    const deleted = await PushSubscription.deleteMany({ isActive: false });
    console.log(`Cleaned up ${deleted.deletedCount} invalid subscriptions`);
  } catch (error) {
    console.error("Error cleaning up subscriptions:", error);
  }
};
