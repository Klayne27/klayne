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
    isCha: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isGoldVerified: {
      type: Boolean,
      default: false,
    },
    nameColor: {
      type: String,
      default: null, // null = use default theme color
      match: [/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Invalid hex color"],
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    followRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
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
    mutedUsers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        muteType: {
          type: String,
          enum: ["standard", "total"],
          default: "standard",
        },
        mutedAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    // forceBlackTheme: {
    //   type: Boolean,
    //   default: false,
    // },
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

    pinnedPosts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        default: [],
      },
    ],
    // user.model.js — update inventory and equipped only
    inventory: {
      themes: [{ type: String }],
      fonts: [{ type: String }],
      rings: [{ type: String }],
      // overlays: [{ type: String }],
      nameplates: [{ type: String }], // NEW
    },
    equipped: {
      theme: { type: String, default: null },
      font: { type: String, default: null },
      ring: { type: String, default: null },
      overlay: { type: String, default: null },
      nameplate: { type: String, default: null }, // NEW
    },
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
      default: Date.now,
    },
    lastReadVentFeedTimestamp: {
      type: Date,
      default: null,
    },
    lastReadFeedTimestamp: {
      type: Date,
      default: null,
    },
    lastReadICFeedTimestamp: {
      type: Date,
      default: null,
    },
    lastReadBoardTimestamp: { type: Date, default: Date.now },
    badges: [
      {
        type: String,
        default: [],
      },
    ],
    isLikedFeedPrivate: {
      type: Boolean,
      default: true,
    },
    levelOfEducation: {
      type: String,
      enum: [
        "Middle School",
        "High School",
        "Undergraduate",
        "Postgraduate",
        "Vocational",
        "Self-Taught",
        "Other",
        "",
      ],
      default: "",
    },
    majorOrField: {
      type: String, // e.g., "Computer Science" or "Arts"
      trim: true,
      default: "",
    },
    relationshipStatus: {
      type: String,
      enum: [
        "Single",
        "In a relationship",
        "It's complicated",
        "Casually Dating",
        "Engaged",
        "Married",
        "",
      ],
      default: "",
    },
    statusPreference: {
      type: String,
      enum: ["online", "offline"],
      default: "online",
    },
    resetPasswordToken: {
      type: String,
      default: undefined,
    },
    resetPasswordExpires: {
      type: Date,
      default: undefined,
    },
    likedTodoLists: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TodoList",
        default: [],
      },
    ],
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
    weeklyStats: {
      studyDuration: { type: Number, default: 0 },
      sessionsCompleted: { type: Number, default: 0 },
      xpEarned: { type: Number, default: 0 },
      weekStart: { type: String, default: null }, // ISO string of the Monday this week started
    },
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
    studyHistory: [
      {
        date: { type: String, required: true }, // Format: "YYYY-MM-DD"
        count: { type: Number, default: 0 }, // Number of sessions that day
        duration: { type: Number, default: 0 }, // Total seconds studied that day
      },
    ],
    isPomodoroPrivate: {
      type: Boolean,
      default: false,
    },
    activeSession: {
      isActive: { type: Boolean, default: false },
      type: { type: String, enum: ["work", "break"], default: null },
      startTime: { type: Date, default: null },
      expectedEndTime: { type: Date, default: null },
      sessionCount: { type: Number, default: 0 },
    },
    note: {
      text: { type: String, default: null, maxlength: 60 },
      emoji: { type: String, default: null },
      expiresAt: { type: Date, default: null }, // null = never expires
    },
    mutedConversations: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", default: [] },
    ],
    isPublicChatMuted: { type: Boolean, default: false },
    // pomodoroBackground: { type: String, default: null },
    pomodoroBackgroundUrl: { type: String, default: null }, // custom Cloudinary URL
    pomodoroBackgroundPublicId: { type: String, default: null }, // stored at upload for reliable deletion
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

export default User;
