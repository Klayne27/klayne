import Notification from "../models/notification.model.js";
import ActiveSession from "../models/activeSession.model.js";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import Post from "../models/post.model.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import { createAndSendNotification, emitFollowRequestCount, io } from "../lib/socket.js";
import mongoose from "mongoose";
import PublicChatMessage from "../models/publicMessage.model.js";
import { getBlockingUsers, getMutedUsers } from "../lib/utils/helpers.js";
import Image from "../models/image.model.js";
import { admin } from "../config/firebaseAdmin.js";
import PushSubscription from "../models/pushSubscription.js";
import DevlogComment from "../models/devlogComment.model.js";
import Devlog from "../models/devlog.model.js";
import BoardPost from "../models/boardPost.model.js";
import BoardComment from "../models/boardComment.model.js";

export const getUserProfile = async (req, res) => {
  const { username } = req.params;
  const currentUserId = req.user?._id;

  try {
    const user = await User.findOne({ username })
      .select("-password -email")
      .populate({
        path: "pinnedPosts",
        populate: {
          path: "user",
          select:
            "username fullName profileImg isCha isVerified isGoldVerified badges preferredBadge nameColor equipped",
        },
      })
      .populate("profileImg", "imageUrl")
      .populate("coverImg", "imageUrl");

    if (!user) return res.status(404).json({ error: "User not found" });

    let isBlockedByYou = false;
    let hasBlockedYou = false;
    let hasRequestedFollow = false;

    if (currentUserId && currentUserId.toString() !== user._id.toString()) {
      const currentUser = await User.findById(currentUserId).select(
        "blockedUsers blockedBy",
      );
      if (currentUser) {
        isBlockedByYou = currentUser.blockedUsers.some((id) => id.equals(user._id));
        hasBlockedYou = currentUser.blockedBy.some((id) => id.equals(user._id));
      }
      // Check if current user has a pending follow request
      hasRequestedFollow = user.followRequests.some((id) => id.equals(currentUserId));
    }

    if (hasBlockedYou) {
      return res.status(403).json({
        error: "You are blocked by this user.",
        isBlockedByYou: false,
        hasBlockedYou: true,
        username: user.username,
        fullName: user.fullName,
        profileImg: user.profileImg,
        coverImg: user.coverImg,
        isCha: user.isCha,
        isVerified: user.isVerified,
        isGoldVerified: user.isGoldVerified,
      });
    }

    const userObj = user.toObject();

    const profileData = {
      ...userObj,
      // Only expose the raw requests array to the owner (for count)
      followRequests: currentUserId?.equals(user._id)
        ? userObj.followRequests
        : undefined,
      followRequestsCount: currentUserId?.equals(user._id)
        ? user.followRequests.length
        : undefined,
      // Visitors only need these two booleans
      hasRequestedFollow,
      isBlockedByYou,
      hasBlockedYou,
    };

    res.status(200).json(profileData);
  } catch (error) {
    console.error("Error in getUserProfile:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getFollowingUsers = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?._id;

    const user = await User.findById(userId).populate({
      path: "following",
      select:
        "username fullName isCha isVerified isGoldVerified badges preferredBadge nameColor followRequests isPrivate",
      populate: {
        path: "profileImg",
        select: "imageUrl",
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    // Map to add hasRequestedFollow boolean
    const followingWithStatus = user.following.map((u) => {
      const userObj = u.toObject ? u.toObject() : u;
      const hasRequestedFollow = currentUserId
        ? userObj.followRequests?.some((id) => id.toString() === currentUserId.toString())
        : false;

      delete userObj.followRequests; // Remove array from payload
      return { ...userObj, hasRequestedFollow };
    });

    res.status(200).json(followingWithStatus);
  } catch (error) {
    console.log("Error in getFollowingUsers: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?._id;

    const user = await User.findById(userId).populate({
      path: "followers",
      select:
        "username fullName isCha isVerified isGoldVerified badges preferredBadge nameColor equipped followRequests isPrivate",
      populate: {
        path: "profileImg",
        select: "imageUrl",
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const followersWithStatus = user.followers.map((u) => {
      const userObj = u.toObject ? u.toObject() : u;
      const hasRequestedFollow = currentUserId
        ? userObj.followRequests?.some((id) => id.toString() === currentUserId.toString())
        : false;

      delete userObj.followRequests;
      return { ...userObj, hasRequestedFollow };
    });

    res.status(200).json(followersWithStatus);
  } catch (error) {
    console.log("Error in getFollowers: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const followUnfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (userId === currentUserId.toString()) {
      return res.status(400).json({ error: "You can't follow/unfollow yourself" });
    }

    const [userToModify, currentUser] = await Promise.all([
      User.findById(userId),
      User.findById(currentUserId),
    ]);

    if (!userToModify || !currentUser) {
      return res.status(400).json({ error: "User not found" });
    }

    if (currentUser.blockedUsers.includes(userToModify._id)) {
      return res
        .status(400)
        .json({ error: "You have blocked this user. Unblock them to follow." });
    }
    if (userToModify.blockedUsers.includes(currentUser._id)) {
      return res
        .status(400)
        .json({ error: "This user has blocked you. You cannot follow them." });
    }

    const isFollowing = currentUser.following.map(String).includes(userId);
    const hasPendingRequest = userToModify.followRequests
      .map(String)
      .includes(currentUserId.toString());

    if (isFollowing) {
      // ── UNFOLLOW ───────────────────────────────────────────────────────────
      await Promise.all([
        User.findByIdAndUpdate(userId, { $pull: { followers: currentUserId } }),
        User.findByIdAndUpdate(currentUserId, { $pull: { following: userId } }),
        Conversation.updateOne(
          { participants: { $all: [currentUserId, userId] } },
          { $addToSet: { hiddenFor: currentUserId } },
          { timestamps: false },
        ),
      ]);

      return res
        .status(200)
        .json({ message: "Unfollowed successfully.", action: "unfollowed" });
    } else if (hasPendingRequest) {
      // ── CANCEL PENDING REQUEST ─────────────────────────────────────────────
      await User.findByIdAndUpdate(userId, { $pull: { followRequests: currentUserId } });
      // Emit updated count to target
      await emitFollowRequestCount(userId);

      return res
        .status(200)
        .json({ message: "Follow request cancelled.", action: "cancelled" });
    } else if (userToModify.isPrivate) {
      // ── SEND FOLLOW REQUEST (private profile) ──────────────────────────────
      await User.findByIdAndUpdate(userId, {
        $addToSet: { followRequests: currentUserId },
      });
      await emitFollowRequestCount(userId);

      return res
        .status(200)
        .json({ message: "Follow request sent.", action: "requested" });
    } else {
      // ── FOLLOW (public profile) ────────────────────────────────────────────
      await Promise.all([
        User.findByIdAndUpdate(userId, { $addToSet: { followers: currentUserId } }),
        User.findByIdAndUpdate(currentUserId, { $addToSet: { following: userId } }),
      ]);

      const existingConv = await Conversation.findOne({
        participants: { $all: [currentUserId, userId] },
      });

      if (existingConv) {
        await Conversation.updateOne(
          { _id: existingConv._id },
          { $pull: { hiddenFor: currentUserId } },
          { timestamps: false },
        );
      } else {
        await new Conversation({
          participants: [currentUserId, userId],
          hiddenFor: [userToModify._id],
        }).save();
      }

      await createAndSendNotification({
        type: "follow",
        from: currentUserId,
        to: userToModify._id,
      });

      return res
        .status(200)
        .json({ message: "Followed successfully.", action: "followed" });
    }
  } catch (error) {
    console.error("Error in followUnfollowUser:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getSuggestedUsers = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(200).json([]);

    const { blockedByMe, blockedMe } = await getBlockingUsers(userId);
    const { total: totalMutedIds } = await getMutedUsers(userId);
    const totalMutedObjectIds = totalMutedIds.map(
      (id) => new mongoose.Types.ObjectId(id),
    );
    const blockedAndBlockingUsers = [...new Set([...blockedByMe, ...blockedMe])];

    const currentUserDoc = await User.findById(userId).select("following").lean();
    const usersFollowedByMe = currentUserDoc?.following?.map((id) => id.toString()) || [];

    const excludeUserIds = [
      new mongoose.Types.ObjectId(userId),
      ...usersFollowedByMe.map((id) => new mongoose.Types.ObjectId(id)),
      ...blockedAndBlockingUsers.map((id) => new mongoose.Types.ObjectId(id)),
      ...totalMutedObjectIds,
    ];

    const suggestedUsers = await User.aggregate([
      {
        $match: {
          _id: { $nin: excludeUserIds },
          blockedBy: { $nin: [new mongoose.Types.ObjectId(userId)] },
        },
      },
      { $sample: { size: 3 } },
      { $limit: 3 },
      {
        $lookup: {
          from: "images",
          localField: "profileImg",
          foreignField: "_id",
          as: "profileImg",
        },
      },
      { $unwind: { path: "$profileImg", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          username: 1,
          fullName: 1,
          profileImg: 1,
          _id: 1,
          isCha: 1,
          isVerified: 1,
          isGoldVerified: 1,
          badges: 1,
          preferredBadge: 1,
          nameColor: 1,
          equipped: 1,
          isPrivate: 1, // ADDED
          followRequests: 1, // ADDED
        },
      },
    ]);

    // Process the results to add hasRequestedFollow
    const finalSuggestions = suggestedUsers.map((user) => {
      const hasRequestedFollow = user.followRequests?.some(
        (id) => id.toString() === userId.toString(),
      );

      delete user.followRequests;
      return { ...user, hasRequestedFollow: !!hasRequestedFollow };
    });

    res.status(200).json(finalSuggestions);
  } catch (error) {
    console.error("Error in getSuggestedUsers: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getSuggestedUsersPage = async (req, res) => {
  try {
    const userId = req.user?._id;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    if (!userId)
      return res.status(200).json({ users: [], hasNextPage: false, nextPage: null });

    const { blockedByMe, blockedMe } = await getBlockingUsers(userId);
    const { total: totalMutedIds } = await getMutedUsers(userId);

    const blockedAndBlocking = [...new Set([...blockedByMe, ...blockedMe])];
    const currentUserDoc = await User.findById(userId).select("following").lean();
    const usersFollowedByMe = currentUserDoc?.following?.map((id) => id.toString()) || [];

    const excludeIds = [
      new mongoose.Types.ObjectId(userId),
      ...usersFollowedByMe.map((id) => new mongoose.Types.ObjectId(id)),
      ...blockedAndBlocking.map((id) => new mongoose.Types.ObjectId(id)),
      ...totalMutedIds.map((id) => new mongoose.Types.ObjectId(id)),
    ];

    const users = await User.find({
      _id: { $nin: excludeIds },
      blockedBy: { $nin: [new mongoose.Types.ObjectId(userId)] },
    })
      .sort({ followersCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit + 1)
      .populate({ path: "profileImg", select: "imageUrl" })
      .select(
        // Added "followRequests" to the selection
        "username fullName bio profileImg isCha isVerified isGoldVerified badges preferredBadge nameColor equipped followersCount isPrivate followRequests",
      )
      .lean();

    const hasNextPage = users.length > limit;
    const rawResults = hasNextPage ? users.slice(0, limit) : users;

    // Map through results to determine if a follow request is pending
    const results = rawResults.map((user) => {
      const hasRequestedFollow = user.followRequests?.some(
        (id) => id.toString() === userId.toString(),
      );

      // We remove the full array from the object to keep the JSON response small
      delete user.followRequests;

      return {
        ...user,
        hasRequestedFollow: !!hasRequestedFollow,
      };
    });

    res.status(200).json({
      users: results,
      hasNextPage,
      nextPage: hasNextPage ? page + 1 : null,
    });
  } catch (error) {
    console.error("Error in getSuggestedUsersPage:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateUser = async (req, res) => {
  const {
    fullName,
    email,
    currentPassword,
    newPassword,
    bio,
    link,
    confirmNewPassword,
    relationshipStatus,
    levelOfEducation, // Added
    majorOrField, // Added
    isPrivate,
    isLikedFeedPrivate,
  } = req.body;
  let { username } = req.body;
  const { profileImg, coverImg } = req.body;

  const userId = req.user._id;

  try {
    let user = await User.findById(userId)
      .populate("profileImg", "imageUrl")
      .populate("coverImg", "imageUrl");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (email !== undefined && email !== user.email) {
      const existingUserWithEmail = await User.findOne({ email });
      if (existingUserWithEmail) {
        return res.status(409).json({ error: "Email is already taken." });
      }
    }

    if (username !== undefined && username !== user.username) {
      username = username.trim();

      const endsWithSpecialChar = /[^a-zA-Z0-9]$/;
      if (endsWithSpecialChar.test(username)) {
        return res
          .status(400)
          .json({ error: "Handle must end with a letter or a number." });
      }

      const existingUserWithUsername = await User.findOne({ username });
      if (existingUserWithUsername) {
        return res.status(409).json({ error: "Handle is already taken." });
      }
    }

    if ((newPassword && !currentPassword) || (!newPassword && currentPassword)) {
      return res
        .status(400)
        .json({ error: "Please provide both current and new password" });
    }

    if (newPassword && currentPassword) {
      if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ error: "New passwords do not match" });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }
      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters long" });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    } // --- Profile Image Logic --- // Check if profileImg is a non-empty string before processing

    if (profileImg || profileImg === "") {
      if (user.profileImg) {
        const publicId = user.profileImg.imageUrl.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
        await Image.findByIdAndDelete(user.profileImg._id);
      }

      if (profileImg === "") {
        user.profileImg = null;
      } else {
        // No need for 'else if (profileImg)' because the outer 'if' already guarantees it
        const uploadedResponse = await cloudinary.uploader.upload(profileImg, {
          upload_preset: "ml_avatars",
        });
        const newProfileImage = await Image.create({
          imageUrl: uploadedResponse.secure_url,
          parentDocument: userId,
          parentModel: "User",
          uploadedBy: userId,
        });
        user.profileImg = newProfileImage._id;
      }
    }

    if (coverImg || coverImg === "") {
      if (user.coverImg) {
        const publicId = user.coverImg.imageUrl.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
        await Image.findByIdAndDelete(user.coverImg._id);
      }

      if (coverImg === "") {
        user.coverImg = null;
      } else {
        const uploadedResponse = await cloudinary.uploader.upload(coverImg, {
          upload_preset: "ml_covers",
        });
        const newCoverImage = await Image.create({
          imageUrl: uploadedResponse.secure_url,
          parentDocument: userId,
          parentModel: "User",
          uploadedBy: userId,
        });
        user.coverImg = newCoverImage._id;
      }
    }

    if (fullName !== undefined) user.fullName = fullName;
    if (email !== undefined) user.email = email;
    if (username !== undefined) user.username = username;
    if (bio !== undefined) user.bio = bio;
    if (link !== undefined) user.link = link;
    if (isPrivate !== undefined) user.isPrivate = isPrivate;
    if (isLikedFeedPrivate !== undefined) user.isLikedFeedPrivate = isLikedFeedPrivate;

    if (relationshipStatus !== undefined) {
      user.relationshipStatus = relationshipStatus;
    }

    if (levelOfEducation !== undefined) user.levelOfEducation = levelOfEducation;
    if (majorOrField !== undefined) user.majorOrField = majorOrField;

    await user.save(); // Re-fetch the user to ensure all fields, including the new images, are populated

    const updatedUser = await User.findById(userId)
      .populate("profileImg", "imageUrl")
      .populate("coverImg", "imageUrl")
      .select("-password");

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error in updateUser: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// PATCH /api/users/privacy
export const updatePrivacySettings = async (req, res) => {
  try {
    const { isPrivate, isLikedFeedPrivate, isPomodoroPrivate } = req.body;
    const userId = req.user._id;

    const updateFields = {};
    if (isPrivate !== undefined) updateFields.isPrivate = Boolean(isPrivate);
    if (isLikedFeedPrivate !== undefined)
      updateFields.isLikedFeedPrivate = Boolean(isLikedFeedPrivate);
    if (isPomodoroPrivate !== undefined)
      updateFields.isPomodoroPrivate = Boolean(isPomodoroPrivate);

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: "No valid fields provided." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true },
    )
      .populate("profileImg", "imageUrl")
      .populate("coverImg", "imageUrl")
      .select("-password");

    // ── Live dashboard sync when Pomodoro privacy is toggled ──────────────
    if (isPomodoroPrivate !== undefined) {
      const activeSession = await ActiveSession.findOne({
        user: userId,
        isBreak: false,
        isPaused: { $ne: true },
      });

      const now = new Date();

      // FIX: guard against stale/extended scheduledEndTime by computing
      // remaining from now. If the heartbeat previously extended scheduledEndTime,
      // we don't want that inflated value going to viewers.
      const isActuallyActive =
        activeSession && activeSession.scheduledEndTime > now && !activeSession.isPaused;

      if (isActuallyActive) {
        if (isPomodoroPrivate) {
          io.to("live_pomodoro").emit("live_session_stopped", {
            userId: userId.toString(),
          });
        } else {
          // FIX: recompute expectedEndTime and startTime from what the session
          // actually has — don't rely on any extended scheduledEndTime value.
          // expectedEndTime is the original scheduledEndTime as stored; since we
          // removed the heartbeat extension, this is now always accurate.
          io.to("live_pomodoro").emit("live_session_started", {
            userId: userId.toString(),
            username: updatedUser.username,
            fullName: updatedUser.fullName,
            profileImg: updatedUser.profileImg
              ? {
                  _id: updatedUser.profileImg._id,
                  imageUrl: updatedUser.profileImg.imageUrl,
                }
              : null,
            nameColor: updatedUser.nameColor,
            equipped: updatedUser.equipped ?? null,
            expectedEndTime: activeSession.scheduledEndTime.getTime(),
            startTime: activeSession.startTime.getTime(),
            sessionCount: activeSession.sessionCount,
            pomodoroLevel: updatedUser.pomodoroLevel ?? 0,
            totalStudyDuration: updatedUser.totalStudyDuration ?? 0,
            totalSessionsCompleted: updatedUser.totalSessionsCompleted ?? 0,
          });
        }
      }
    }

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error in updatePrivacySettings:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deleteUserAccount = async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId !== req.user._id.toString()) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const userToDelete = await User.findById(userId);
    if (!userToDelete) return res.status(404).json({ error: "User not found." });

    // --- STEP 1: CALCULATE REPLIES BEFORE DELETING POSTS ---
    const userReplies = await Post.find({ user: userId, parentPost: { $ne: null } });
    const replyCountsPerPost = userReplies.reduce((acc, reply) => {
      const parentId = reply.parentPost.toString();
      acc[parentId] = (acc[parentId] || 0) + 1;
      return acc;
    }, {});

    const replyUpdatePromises = Object.keys(replyCountsPerPost).map((parentId) =>
      Post.findByIdAndUpdate(parentId, {
        $inc: { repliesCount: -replyCountsPerPost[parentId] },
      }),
    );
    await Promise.all(replyUpdatePromises);

    // --- STEP 2: CALCULATE DEVLOG COMMENTS ---
    const userDevlogComments = await DevlogComment.find({ author: userId });
    if (userDevlogComments.length > 0) {
      const commentsPerDevlog = userDevlogComments.reduce((acc, comment) => {
        const devlogId = comment.devlog.toString();
        acc[devlogId] = (acc[devlogId] || 0) + 1;
        return acc;
      }, {});

      const devlogUpdatePromises = Object.keys(commentsPerDevlog).map((devlogId) =>
        Devlog.findByIdAndUpdate(devlogId, {
          $inc: { commentsCount: -commentsPerDevlog[devlogId] },
        }),
      );
      await Promise.all(devlogUpdatePromises);
    }

    // --- STEP 3: REPOSTS COUNT FIX ---
    // Instead of -1, we should decrement by the actual number of reposts the user has
    // but updateMany with $inc -1 works if the user can only repost a post once.
    await Post.updateMany(
      { repostedBy: userId },
      { $pull: { repostedBy: userId }, $inc: { repostsCount: -1 } },
    );

    const userImages = await Image.find({ uploadedBy: userId });
    for (const image of userImages) {
      const publicId = image.imageUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    }

    // --- STEP 4: MEDIA CLEANUP (Cloudinary) ---
    const userPosts = await Post.find({ user: userId });
    for (const post of userPosts) {
      if (post.video) {
        const videoId = post.video.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(videoId, { resource_type: "video" });
      }
      // If you have image public IDs, delete them here too
    }

    // --- STEP 5: DELETE ACTUAL RECORDS ---
    await Post.deleteMany({ user: userId });
    await DevlogComment.deleteMany({ author: userId });
    await Image.deleteMany({ uploadedBy: userId });
    await PushSubscription.deleteMany({ userId: userId });
    await Notification.deleteMany({ $or: [{ from: userId }, { to: userId }] });
    await PublicChatMessage.deleteMany({ sender: userId });
    await BoardPost.deleteMany({ user: userId });
    await BoardComment.deleteMany({ user: userId });

    // --- STEP 6: ARRAY CLEANUP (Likes/Follows) ---
    await Post.updateMany(
      { $or: [{ likes: userId }, { bookmarkedBy: userId }] },
      { $pull: { likes: userId, bookmarkedBy: userId } },
    );
    await Devlog.updateMany({ likes: userId }, { $pull: { likes: userId } });
    await User.updateMany(
      {
        $or: [
          { following: userId },
          { followers: userId },
          { blockedUsers: userId },
          { blockedBy: userId },
        ],
      },
      {
        $pull: {
          following: userId,
          followers: userId,
          blockedUsers: userId,
          blockedBy: userId,
        },
      },
    );

    // Final Account Deletion
    if (userToDelete.firebaseUid) await admin.auth().deleteUser(userToDelete.firebaseUid);
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "Account deleted successfully." });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user._id; // Assuming auth middleware provides this

    if (!q) {
      return res.status(200).json([]);
    }

    // 1. Fetch current user to check privacy status
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) return res.status(404).json({ error: "User not found" });

    // 2. Build the query
    const query = {
      $or: [
        { username: { $regex: `^${q}`, $options: "i" } },
        { fullName: { $regex: `^${q}`, $options: "i" } },
      ],
      _id: { $ne: currentUserId }, // Always exclude self from mentions
    };

    // 3. Apply privacy filter: Limit to followers if user is private
    if (currentUser.isPrivate) {
      query._id = {
        $in: currentUser.followers,
        $ne: currentUserId,
      };
    }

    const users = await User.find(query)
      .select("-password -email")
      .populate("profileImg", "imageUrl")
      .limit(5);

    res.status(200).json(users);
  } catch (error) {
    console.error("Error in searchUsers controller:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const blockUnblockUser = async (req, res) => {
  try {
    const { userToBlockId } = req.params;
    const currentUserId = req.user._id;

    if (userToBlockId.toString() === currentUserId.toString()) {
      return res.status(400).json({ error: "You cannot block yourself." });
    }

    const currentUser = await User.findById(currentUserId);
    const userToBlock = await User.findById(userToBlockId);

    if (!currentUser || !userToBlock) {
      return res.status(404).json({ error: "User not found." });
    }

    const isCurrentlyBlocked = currentUser.blockedUsers.includes(userToBlockId);

    if (isCurrentlyBlocked) {
      await User.findByIdAndUpdate(currentUserId, {
        $pull: { blockedUsers: userToBlockId },
      });
      await User.findByIdAndUpdate(userToBlockId, {
        $pull: { blockedBy: currentUserId },
      });

      return res.status(200).json({
        message: "User unblocked successfully.",
        username: userToBlock.username,
        isBlockedByYou: false,
        hasBlockedYou: userToBlock.blockedBy.includes(currentUserId),
      });
    } else {
      await User.findByIdAndUpdate(currentUserId, {
        $push: { blockedUsers: userToBlockId },
      });
      await User.findByIdAndUpdate(userToBlockId, {
        $push: { blockedBy: currentUserId },
      });

      const currentUserWasFollowing = currentUser.following.includes(userToBlockId);
      const userToBlockWasFollowing = userToBlock.following.includes(currentUserId);

      if (currentUserWasFollowing) {
        await User.findByIdAndUpdate(currentUserId, {
          $pull: { following: userToBlockId },
        });
        await User.findByIdAndUpdate(userToBlockId, {
          $pull: { followers: currentUserId },
        });
      }
      if (userToBlockWasFollowing) {
        await User.findByIdAndUpdate(userToBlockId, {
          $pull: { following: currentUserId },
        });
        await User.findByIdAndUpdate(currentUserId, {
          $pull: { followers: userToBlockId },
        });
      }

      return res.status(200).json({
        message: "User blocked successfully.",
        username: userToBlock.username,
        isBlockedByYou: true,
        hasBlockedYou: userToBlock.blockedBy.includes(currentUserId),
      });
    }
  } catch (error) {
    console.error("Error in blockUnblockUser: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const adminDeleteUserAccount = async (req, res) => {
  try {
    // 1. Authorization check
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({
        error: "Forbidden: Only administrators can delete other user accounts.",
      });
    }

    const { userIdToDelete } = req.params;

    const userToDelete = await User.findById(userIdToDelete);
    if (!userToDelete) {
      return res.status(404).json({ error: "User not found." });
    }

    if (userToDelete.isAdmin) {
      return res.status(403).json({
        error: "Admin accounts cannot be deleted.",
      });
    }

    if (userIdToDelete === req.user._id.toString()) {
      return res.status(400).json({
        error: "Please use the 'Delete My Account' option to delete your own account.",
      });
    }

    // --- STEP A: CALCULATE REPLIES BEFORE DELETING POSTS ---
    const userReplies = await Post.find({
      user: userIdToDelete,
      parentPost: { $ne: null },
    });
    const replyCountsPerPost = userReplies.reduce((acc, reply) => {
      const parentId = reply.parentPost.toString();
      acc[parentId] = (acc[parentId] || 0) + 1;
      return acc;
    }, {});

    const replyUpdatePromises = Object.keys(replyCountsPerPost).map((parentId) =>
      Post.findByIdAndUpdate(parentId, {
        $inc: { repliesCount: -replyCountsPerPost[parentId] },
      }),
    );
    await Promise.all(replyUpdatePromises);

    // --- STEP B: CALCULATE DEVLOG COMMENTS BEFORE DELETING ---
    const userDevlogComments = await DevlogComment.find({ author: userIdToDelete });
    if (userDevlogComments.length > 0) {
      const commentsPerDevlog = userDevlogComments.reduce((acc, comment) => {
        const devlogId = comment.devlog.toString();
        acc[devlogId] = (acc[devlogId] || 0) + 1; // Fixed: Use devlogId as key
        return acc;
      }, {});

      const devlogUpdatePromises = Object.keys(commentsPerDevlog).map((devlogId) =>
        Devlog.findByIdAndUpdate(devlogId, {
          $inc: { commentsCount: -commentsPerDevlog[devlogId] },
        }),
      );
      await Promise.all(devlogUpdatePromises);
    }

    // --- STEP C: CLEANUP REPOST COUNTS ---
    await Post.updateMany(
      { repostedBy: userIdToDelete },
      { $pull: { repostedBy: userIdToDelete }, $inc: { repostsCount: -1 } },
    );

    // --- STEP D: MEDIA CLEANUP (Cloudinary) ---
    const userImages = await Image.find({ uploadedBy: userIdToDelete });
    for (const image of userImages) {
      const publicId = image.imageUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    }

    const userPosts = await Post.find({ user: userIdToDelete });
    for (const post of userPosts) {
      if (post.video) {
        const videoId = post.video.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(videoId, { resource_type: "video" });
      }
    }

    // --- STEP E: MASS DELETE ACTUAL RECORDS ---
    await Image.deleteMany({ uploadedBy: userIdToDelete });
    await Post.deleteMany({ user: userIdToDelete });
    await DevlogComment.deleteMany({ author: userIdToDelete });
    await PushSubscription.deleteMany({ userId: userIdToDelete });
    await Notification.deleteMany({
      $or: [{ from: userIdToDelete }, { to: userIdToDelete }],
    });
    await PublicChatMessage.deleteMany({ sender: userIdToDelete });
    await DevlogComment.deleteMany({ author: userIdToDelete });
    await BoardPost.deleteMany({ user: userIdToDelete });
    await BoardComment.deleteMany({ user: userIdToDelete });

    // --- STEP F: ARRAY CLEANUP (Likes, Bookmarks, Follows, Blocks) ---
    await Post.updateMany(
      {
        $or: [
          { likes: userIdToDelete },
          { bookmarkedBy: userIdToDelete },
          { mentionedUsers: userIdToDelete },
        ],
      },
      {
        $pull: {
          likes: userIdToDelete,
          bookmarkedBy: userIdToDelete,
          mentionedUsers: userIdToDelete,
        },
      },
    );
    await Devlog.updateMany(
      { likes: userIdToDelete },
      { $pull: { likes: userIdToDelete } },
    );
    await DevlogComment.updateMany(
      { $or: [{ likes: userIdToDelete }, { dislikes: userIdToDelete }] },
      { $pull: { likes: userIdToDelete, dislikes: userIdToDelete } },
    );
    await User.updateMany(
      {
        $or: [
          { following: userIdToDelete },
          { followers: userIdToDelete },
          { blockedUsers: userIdToDelete },
          { blockedBy: userIdToDelete },
        ],
      },
      {
        $pull: {
          following: userIdToDelete,
          followers: userIdToDelete,
          blockedUsers: userIdToDelete,
          blockedBy: userIdToDelete,
        },
      },
    );
    await PublicChatMessage.updateMany(
      {},
      { $pull: { reactions: { userId: userIdToDelete } } },
    );

    // --- STEP G: MESSAGES & CONVERSATIONS ---
    const conversationsToDelete = await Conversation.find({
      participants: userIdToDelete,
    });
    const conversationIds = conversationsToDelete.map((conv) => conv._id);
    await Message.deleteMany({ conversationId: { $in: conversationIds } });
    await Conversation.deleteMany({ _id: { $in: conversationIds } });

    // --- STEP H: FIREBASE & USER DOCUMENT ---
    if (userToDelete.firebaseUid) {
      await admin.auth().deleteUser(userToDelete.firebaseUid);
    }
    await User.findByIdAndDelete(userIdToDelete);

    res.status(200).json({
      message: `Account of ${userToDelete.username} and all associated data deleted successfully.`,
    });
  } catch (error) {
    console.error("Error in adminDeleteUserAccount: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const toggleLikedFeedPrivacy = async (req, res) => {
  try {
    const userId = req.user._id;
    const { isPrivate } = req.body;

    if (typeof isPrivate !== "boolean") {
      return res.status(400).json({ error: "Invalid value for isPrivate" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.isLikedFeedPrivate = isPrivate;
    await user.save();

    res.status(200).json({
      message: "Liked feed privacy updated successfully",
      isLikedFeedPrivate: user.isLikedFeedPrivate,
    });
  } catch (error) {
    console.error("Error toggling liked feed privacy:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateStatusPreference = async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.user._id;

    if (!["online", "offline"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { statusPreference: status },
      { new: true, select: "-password -email" }, // new:true returns the updated doc, select excludes the password
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found." });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating status preference:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getVacationModeStatus = async (req, res) => {
  try {
    // Select both fields
    const user = await User.findById(req.user.id).select(
      "isVacationMode vacationModeStartDate",
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Return both fields in the response
    res.json({
      isVacationMode: user.isVacationMode,
      vacationModeStartDate: user.vacationModeStartDate,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const toggleVacationMode = async (req, res) => {
  try {
    const { isVacationMode } = req.body;
    if (typeof isVacationMode !== "boolean") {
      return res.status(400).json({ message: "Invalid value for isVacationMode" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isVacationMode = isVacationMode;

    // If turning vacation mode ON, set the start date.
    if (isVacationMode) {
      user.vacationModeStartDate = new Date();
    }
    // IMPORTANT: Do not set it to null when turning it OFF here.
    // The endStudySession controller will handle that when the vacation is "used".

    await user.save();

    res.json({
      message: "Vacation mode updated successfully",
      isVacationMode: user.isVacationMode,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const updatePreferredBadge = async (req, res) => {
  const { preferredBadge } = req.body;
  const userId = req.user._id;

  try {
    // Find the user and check if the badge is valid
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    } // Validate that the preferredBadge is one of the user's earned badges or null

    if (
      preferredBadge !== null &&
      preferredBadge !== "" &&
      !user.badges.includes(preferredBadge)
    ) {
      return res
        .status(400)
        .json({ error: "You cannot select a badge you have not earned." });
    } // Update the field

    user.preferredBadge = preferredBadge;
    await user.save();

    res.status(200).json({ message: "Preferred badge updated successfully." });
  } catch (error) {
    console.error("Error updating preferred badge:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const updateNameColor = async (req, res) => {
  try {
    const { nameColor } = req.body;
    const userId = req.user._id;

    // Allow null to reset to default
    if (nameColor !== null && !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(nameColor)) {
      return res.status(400).json({ error: "Invalid hex color value." });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { nameColor: nameColor ?? null },
      { new: true, select: "-password -email" },
    );

    if (!user) return res.status(404).json({ error: "User not found." });

    res.status(200).json({ nameColor: user.nameColor });
  } catch (error) {
    console.error("Error in updateNameColor:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserStats = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username }).select("_id").lean();
    if (!user) return res.status(404).json({ error: "User not found." });

    const result = await Post.aggregate([
      {
        $match: {
          user: user._id,
          isVent: { $ne: true },
          repostedFrom: null, // original posts only — not reposts of others
        },
      },
      {
        $group: {
          _id: null,
          totalLikes: { $sum: { $size: "$likes" } },
          totalReposts: { $sum: "$repostsCount" },
        },
      },
    ]);

    const stats = result[0] ?? { totalLikes: 0, totalReposts: 0 };
    res.status(200).json(stats);
  } catch (error) {
    console.error("Error in getUserStats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const muteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { muteType } = req.body; // "standard" | "total"
    const currentUserId = req.user._id;

    if (currentUserId.toString() === userId.toString()) {
      return res.status(400).json({ error: "You cannot mute yourself." });
    }

    if (!["standard", "total"].includes(muteType)) {
      return res.status(400).json({ error: "Invalid mute type." });
    }

    const currentUser = await User.findById(currentUserId).select("following mutedUsers");

    // const isFollowing = currentUser.following.some(
    //   (id) => id.toString() === userId.toString(),
    // );
    // if (!isFollowing) {
    //   return res
    //     .status(400)
    //     .json({ error: "You must follow a user before muting them." });
    // }

    const existingIdx = currentUser.mutedUsers.findIndex(
      (m) => m.user.toString() === userId.toString(),
    );

    if (existingIdx !== -1) {
      currentUser.mutedUsers[existingIdx].muteType = muteType;
    } else {
      currentUser.mutedUsers.push({ user: userId, muteType });
    }

    await currentUser.save();
    res.status(200).json({ isMuted: true, muteType });
  } catch (error) {
    console.error("Error in muteUser:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const unmuteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    await User.findByIdAndUpdate(currentUserId, {
      $pull: { mutedUsers: { user: new mongoose.Types.ObjectId(userId) } },
    });

    res.status(200).json({ isMuted: false, muteType: null });
  } catch (error) {
    console.error("Error in unmuteUser:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMuteStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const currentUser = await User.findById(currentUserId).select("mutedUsers").lean();
    const mute = currentUser?.mutedUsers?.find(
      (m) => m.user.toString() === userId.toString(),
    );

    res.status(200).json({
      isMuted: !!mute,
      muteType: mute?.muteType || null,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── GET pending follow requests for the logged-in user ────────────────────────
export const getFollowRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("followRequests")
      .populate({
        path: "followRequests",
        select:
          "username fullName profileImg isCha isVerified isGoldVerified badges preferredBadge nameColor equipped",
        populate: { path: "profileImg", select: "imageUrl" },
      });

    res.status(200).json(user?.followRequests ?? []);
  } catch (error) {
    console.error("Error in getFollowRequests:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── ACCEPT a follow request ───────────────────────────────────────────────────
export const acceptFollowRequest = async (req, res) => {
  try {
    const { requesterId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId).select("followRequests");
    if (!user.followRequests.map(String).includes(requesterId)) {
      return res.status(404).json({ error: "Follow request not found." });
    }

    await Promise.all([
      User.findByIdAndUpdate(userId, { $pull: { followRequests: requesterId } }),
      User.findByIdAndUpdate(userId, { $addToSet: { followers: requesterId } }),
      User.findByIdAndUpdate(requesterId, { $addToSet: { following: userId } }),
    ]);

    // Conversation handling
    const existingConv = await Conversation.findOne({
      participants: { $all: [userId, requesterId] },
    });
    if (existingConv) {
      await Conversation.updateOne(
        { _id: existingConv._id },
        { $pull: { hiddenFor: requesterId } },
        { timestamps: false },
      );
    } else {
      await new Conversation({
        participants: [userId, requesterId],
        hiddenFor: [userId],
      }).save();
    }

    // Notify the requester that their request was accepted
    await createAndSendNotification({
      type: "followRequestAccepted",
      from: userId,
      to: requesterId,
    });

    // Update request count badge for current user
    await emitFollowRequestCount(userId.toString());

    res.status(200).json({ message: "Follow request accepted." });
  } catch (error) {
    console.error("Error in acceptFollowRequest:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── DECLINE a follow request ──────────────────────────────────────────────────
export const declineFollowRequest = async (req, res) => {
  try {
    const { requesterId } = req.params;
    const userId = req.user._id;

    await User.findByIdAndUpdate(userId, { $pull: { followRequests: requesterId } });
    await emitFollowRequestCount(userId.toString());

    res.status(200).json({ message: "Follow request declined." });
  } catch (error) {
    console.error("Error in declineFollowRequest:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
