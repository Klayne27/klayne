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
    const subscription = await PushSubscription.findOne({ userId });

    if (!subscription) {
      console.warn(`No push subscription found for user ${userId}`);
      return;
    }

    const message = JSON.stringify(payload);

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

    return result;
  } catch (error) {
    console.error(`Failed to send push notification to user ${userId}:`, error);
    if (error.statusCode === 410) {
      console.warn(`Subscription for user ${userId} is no longer valid. Deleting...`);
      await PushSubscription.deleteOne({ userId });
    }
    throw error;
  }
};
