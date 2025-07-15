import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path"; // Import the 'path' module
import { fileURLToPath } from "url"; // For ES Modules to get __dirname

// Get the directory name of the current module in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import Conversation from "./models/conversation.model.js";
import Message from "./models/message.model.js";

// Import your Mongoose models

dotenv.config({ path: path.resolve(__dirname, '../.env') }); // Go up two levels to the root

const runMigration = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected for migration.");

    // --- Migrate Messages Collection ---
    console.log("Starting Message migration...");
    const messageResult = await Message.updateMany(
      { isEdited: { $exists: false } }, // Find documents where isEdited does not exist
      { $set: { isEdited: false } } // Set isEdited to false
    );
    console.log(
      `Message migration complete: Matched ${messageResult.matchedCount}, Modified ${messageResult.modifiedCount}`
    );

    // --- Migrate Conversations Collection (lastMessage.isEdited) ---
    console.log("Starting Conversation migration...");
    const conversationResult = await Conversation.updateMany(
      {
        "lastMessage.messageId": { $exists: true },
        "lastMessage.isEdited": { $exists: false },
      }, // Find conversations with a lastMessage and where lastMessage.isEdited does not exist
      { $set: { "lastMessage.isEdited": false } } // Set lastMessage.isEdited to false
    );
    console.log(
      `Conversation migration complete: Matched ${conversationResult.matchedCount}, Modified ${conversationResult.modifiedCount}`
    );

    console.log("Migration finished successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1); // Exit with error code
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("MongoDB disconnected.");
  }
};

runMigration();
