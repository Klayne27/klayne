import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

import { app, io, onlineUsersMap, server } from "./lib/socket.js";

import todoActivityRoutes from "./routes/todoActivities.routes.js"
import todoListRoutes from "./routes/todoList.routes.js"
import todoRoutes from "./routes/todo.routes.js"
import studyRoutes from "./routes/study.routes.js";
import pushRoutes from "./routes/push.routes.js";
import imageRoutes from "./routes/image.routes.js";
import publicChatRoutes from "./routes/publicChat.routes.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import postRoutes from "./routes/post.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import messageRoutes from "./routes/message.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import connectMongoDB from "./db/connectMongoDB.js";
import { publishScheduledPosts } from "./cron/scheduledPostPublisher.js";

dotenv.config();

import { initPush } from "./lib/utils/sendPush.js";
import { initFirebaseAdmin } from "./config/firebaseAdmin.js";

initPush();
initFirebaseAdmin();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/public-chat", publicChatRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/study", studyRoutes);
app.use("/api/todos", todoRoutes)
app.use("/api/todolists", todoListRoutes);
app.use("/api/activities", todoActivityRoutes)


if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "/frontend/dist")));

  app.get("/*splat", (req, res) => {
    res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
  });
}

setInterval(() => {
  publishScheduledPosts(io, onlineUsersMap);
}, 60 * 1000);

server.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await connectMongoDB();
  console.log("MongoDB connected.");
});
