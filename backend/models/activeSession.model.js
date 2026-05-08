import mongoose from "mongoose";

const activeSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    startTime: { type: Date, required: true },
    plannedDuration: { type: Number, required: true }, // minutes
    scheduledEndTime: { type: Date, required: true },
    isPaused: { type: Boolean, default: false },
    pausedRemainingSeconds: { type: Number, default: null },
    pausedAt: { type: Date, default: null },
    isBreak: { type: Boolean, default: false },
    sessionCount: { type: Number, default: 0 },
    taskId: { type: mongoose.Schema.Types.ObjectId, default: null },
    lastHeartbeat: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// MongoDB TTL: auto-delete stale records 5 min after their scheduled end
// This handles the case where the client crashes and never calls endSession
activeSessionSchema.index({ scheduledEndTime: 1 }, { expireAfterSeconds: 300 });

export default mongoose.model("ActiveSession", activeSessionSchema);
