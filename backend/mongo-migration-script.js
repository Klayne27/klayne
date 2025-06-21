// mongo-migration-script.js (Run this once, separately from your main app)
import mongoose from "mongoose";
import Post from "./models/post.model.js";
import dotenv from "dotenv";
import path from "path"; // Import the 'path' module
import { fileURLToPath } from 'url'; // For ES Modules to get __dirname

// Get __dirname equivalent for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure dotenv to load the .env file from the project root
// Adjust 'path.resolve(__dirname, '../../.env')' based on your exact script location
// If your script is directly in 'backend/', then '../../.env' should work.
// If your script is in 'backend/scripts/', it would be '../../../.env'.
dotenv.config({ path: path.resolve(__dirname, '../.env') }); // <--- CRITICAL CHANGE

console.log("Attempting to connect with MONGO_URI:", process.env.MONGO_URI); // Debug log


async function migrateRepostCounts() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB for migration.");

    // Find all original posts (where repostedFrom is null)
    const originalPosts = await Post.find({ repostedFrom: null });

    for (const post of originalPosts) {
      // Count how many documents have this post's ID in their repostedFrom field
      const repostsCount = await Post.countDocuments({ repostedFrom: post._id });
      // Update the original post with the correct count
      await Post.updateOne({ _id: post._id }, { $set: { repostsCount: repostsCount } });
      console.log(`Updated repostsCount for post ${post._id} to ${repostsCount}`);
    }

    console.log("Migration complete!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.disconnect();
  }
}

migrateRepostCounts();
