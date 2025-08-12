import admin from "firebase-admin";

const initFirebaseAdmin = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin SDK initialized successfully.");
  } else {
    console.error("FIREBASE_SERVICE_ACCOUNT_KEY is not defined.");
  }
};

export { admin, initFirebaseAdmin };
