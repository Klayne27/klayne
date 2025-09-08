import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: false,
      minLength: 6,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple null values
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isGoldVerified: {
      type: Boolean,
      default: false,
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    blockedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    forceBlackTheme: {
      type: Boolean,
      default: false,
    },
    profileImg: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Image",
      default: null,
    },
    coverImg: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Image",
      default: null,
    },
    bio: {
      type: String,
      default: "",
    },
    link: {
      type: String,
      default: "",
    },
    likedPosts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        default: [],
      },
    ],
    likedTodoLists: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TodoList",
        default: [],
      },
    ],
    pinnedPosts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        default: [],
      },
    ],
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isBannedInPublicChat: {
      type: Boolean,
      default: false,
    },
    lastReadPublicChatTimestamp: {
      type: Date,
      default: null,
    },
    lastReadVentFeedTimestamp: {
      type: Date,
      default: null,
    },
    lastReadFeedTimestamp: {
      type: Date,
      default: null,
    },
    totalStudyDuration: {
      type: Number,
      default: 0,
    },
    isVacationMode: {
      type: Boolean,
      default: false,
    },
    vacationModeStartDate: {
      type: Date,
      default: null,
    },
    studyStreak: {
      type: Number,
      default: 0,
    },
    longestStudyStreak: {
      type: Number,
      default: 0,
    },
    lastStudyDate: {
      type: Date,
      default: null,
    },
    monthlyStudyStreak: {
      type: Number,
      default: 0,
    },
    lastMonthlyStudyDate: {
      type: Date,
      default: null,
    },
    monthlyStats: {
      studyDuration: {
        type: Number,
        default: 0,
      },
      sessionsCompleted: {
        type: Number,
        default: 0,
      },
      xpEarned: {
        type: Number,
        default: 0,
      },
      lastResetMonth: {
        type: String,
        default: null,
      },
    },
    badges: [
      {
        type: String,
        default: [],
      },
    ],
    preferredBadge: {
      type: String,
      default: null,
    },
    pomodoroSettings: {
      sessionDuration: { type: Number, default: 25 },
      shortBreakDuration: { type: Number, default: 5 },
      longBreakDuration: { type: Number, default: 15 },
      sessionsBeforeLongBreak: { type: Number, default: 4 },
      sessionGoalCount: { type: Number, default: 0 },
      autoplay: { type: Boolean, default: true },
      isMuted: { type: Boolean, default: false },
      volumeLevel: { type: Number, default: 0.5, min: 0.0, max: 1.0 }, // ADD THIS LINE
      skipBreaks: {
        type: Boolean,
        default: false,
      },
    },
    totalSessionsCompleted: {
      type: Number,
      default: 0,
    },
    pomodoroXP: {
      type: Number,
      default: 0,
    },
    pomodoroLevel: {
      type: Number,
      default: 0,
    },
    isLikedFeedPrivate: {
      type: Boolean,
      default: true,
    },
    statusPreference: {
      type: String,
      enum: ["online", "offline"],
      default: "online",
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
