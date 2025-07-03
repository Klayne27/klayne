import Notification from "../models/notification.model.js";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import Post from "../models/post.model.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import { emitUnreadNotificationStatus } from "../lib/socket.js";
import mongoose from "mongoose";

// Helper function to get blocking relationships for the current user
const getBlockingUsers = async (userId) => {
  if (!userId) {
    return { blockedByMe: [], blockedMe: [] };
  }
  const user = await User.findById(userId).select("blockedUsers blockedBy").lean();
  return {
    // Safely access blockedUsers and blockedBy, defaulting to empty arrays if undefined/null
    blockedByMe: user.blockedUsers?.map((id) => id.toString()) || [],
    blockedMe: user.blockedBy?.map((id) => id.toString()) || [],
  };
};

export const getUserProfile = async (req, res) => {
  const { username } = req.params;
  const currentUserId = req.user?._id;

  try {
    const user = await User.findOne({ username }).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // --- START: CHECK BLOCKING STATUS FOR PROFILE VIEW ---
    let isBlockedByYou = false;
    let hasBlockedYou = false;

    if (currentUserId && currentUserId.toString() !== user._id.toString()) {
      const currentUser = await User.findById(currentUserId).select(
        "blockedUsers blockedBy"
      );
      if (currentUser) {
        // Check if current user has blocked the viewed user
        isBlockedByYou = currentUser.blockedUsers.includes(user._id);
        // Check if the viewed user has blocked the current user
        hasBlockedYou = currentUser.blockedBy.includes(user._id);
      }
    }

    // If the current user is blocked by the target user, or vice versa,
    // we should signify this. For "Transparency", if `user` (the profile being viewed)
    // has blocked `currentUserId`, we need to return this information.
    // The frontend will then display the "You are blocked" message.
    if (hasBlockedYou) {
      return res.status(403).json({
        error: "You are blocked by this user.",
        isBlockedByYou: false, // You haven't blocked them
        hasBlockedYou: true, // They have blocked you
        username: user.username, // Provide minimal info for transparency
        fullName: user.fullName, // Provide minimal info for transparency
        profileImg: user.profileImg, // For displaying the profile itself, but no content
      });
    }
    // If current user blocked the other user, we can include this in the profile data
    // to inform the frontend (e.g., to disable follow/message buttons).
    const profileData = {
      ...user.toObject(), // Convert mongoose document to plain object
      isBlockedByYou: isBlockedByYou, // True if YOU blocked THEM
      hasBlockedYou: hasBlockedYou, // True if THEY blocked YOU
    };

    res.status(200).json(profileData);
    // --- END: CHECK BLOCKING STATUS FOR PROFILE VIEW ---
  } catch (error) {
    console.log("Error in getUserProfile: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const followUnfollowUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userToModify = await User.findById(id);
    const currentUser = await User.findById(req.user._id);

    if (id === req.user._id.toString()) {
      return res.status(400).json({ error: "You can't follow/unfollow yourself" });
    }

    if (!userToModify || !currentUser) {
      return res.status(400).json({ error: "User not found" });
    }

    // --- START: BLOCKING CHECK IN FOLLOW/UNFOLLOW ---
    // Check if current user has blocked userToModify
    if (currentUser.blockedUsers.includes(userToModify._id)) {
      return res
        .status(400)
        .json({ error: "You have blocked this user. Unblock them to follow/unfollow." });
    }
    // Check if userToModify has blocked current user
    if (userToModify.blockedUsers.includes(currentUser._id)) {
      return res
        .status(400)
        .json({ error: "This user has blocked you. You cannot follow them." });
    }
    // --- END: BLOCKING CHECK IN FOLLOW/UNFOLLOW ---

    const isFollowing = currentUser.following.includes(id);

    if (isFollowing) {
      await User.findByIdAndUpdate(id, { $pull: { followers: req.user._id } });
      await User.findByIdAndUpdate(req.user._id, { $pull: { following: id } });
      res.status(200).json({ message: "User unfollowed successfully" });
    } else {
      await User.findByIdAndUpdate(id, { $push: { followers: req.user._id } });
      await User.findByIdAndUpdate(req.user._id, { $push: { following: id } });
      const newNotification = new Notification({
        type: "follow",
        from: req.user._id,
        to: userToModify._id,
        read: false,
      });

      await newNotification.save();
      await emitUnreadNotificationStatus(userToModify._id.toString());

      res.status(200).json({ message: "User followed successfully" });
    }
  } catch (error) {
    console.log("Error in followUnfollowUser", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getSuggestedUsers = async (req, res) => {
  try {
    const userId = req.user?._id; // Safely access userId

    if (!userId) {
      return res.status(200).json([]); // Return empty array if not logged in
    }

    // Use the reliable getBlockingUsers helper
    const { blockedByMe, blockedMe } = await getBlockingUsers(userId);
    const blockedAndBlockingUsers = [...new Set([...blockedByMe, ...blockedMe])];

    // Get users the current user is already following
    const currentUserDoc = await User.findById(userId).select("following").lean();
    const usersFollowedByMe = currentUserDoc?.following?.map((id) => id.toString()) || [];

    // Combine all IDs to exclude from suggestions
    const excludeUserIds = [
      new mongoose.Types.ObjectId(userId), // Exclude current user
      ...usersFollowedByMe.map((id) => new mongoose.Types.ObjectId(id)), // Exclude followed users
      ...blockedAndBlockingUsers.map((id) => new mongoose.Types.ObjectId(id)), // Exclude blocked/blocking users
    ];

    const suggestedUsers = await User.aggregate([
      {
        $match: {
          _id: { $nin: excludeUserIds }, // Consolidated exclusion list
          blockedBy: { $nin: [new mongoose.Types.ObjectId(userId)] }, // Users who haven't blocked me
          // You might also want to ensure they haven't blocked me on their 'blockedUsers' list
          // This would require checking the `blockedUsers` array of the *suggested user*
          // which is harder in a single $match without an additional lookup.
          // For now, the `excludeUserIds` should cover if *I* blocked *them*.
          // The `blockedBy` filter covers if *they* blocked *me*.
        },
      },
      { $sample: { size: 10 } }, // Sample more than needed to ensure enough options after filtering
      { $limit: 4 }, // Limit to the desired number of suggestions
      {
        $project: {
          username: 1,
          fullName: 1,
          profileImg: 1,
          _id: 1,
          isVerified: 1,
          // Do not include password here (already handled by select in findById for current user)
        },
      },
    ]);

    // No need to delete user.password if you're explicitly projecting fields
    // suggestedUsers.forEach((user) => {
    //   delete user.password;
    // });

    res.status(200).json(suggestedUsers);
  } catch (error) {
    console.error("Error in getSuggestedUsers: ", error.message); // Log the specific error message
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateUser = async (req, res) => {
  const { fullName, email, username, currentPassword, newPassword, bio, link } = req.body;
  let { profileImg, coverImg } = req.body;

  const userId = req.user._id;

  try {
    let user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if ((!newPassword && currentPassword) || (!currentPassword && newPassword)) {
      return res
        .status(400)
        .json({ error: "Please provide both current password and new password" });
    }

    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res
          .status(409)
          .json({ error: "Username already taken. Please choose a different one." });
      }
    }

    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch)
        return res.status(400).json({ error: "Current password is incorrect" });
      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters long" });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    if (profileImg) {
      if (user.profileImg) {
        await cloudinary.uploader.destroy(user.profileImg.split("/").pop().split(".")[0]);
      }

      const uploadedResponse = await cloudinary.uploader.upload(profileImg);
      profileImg = uploadedResponse.secure_url;
    }

    if (coverImg) {
      if (user.coverImg) {
        await cloudinary.uploader.destroy(user.coverImg.split("/").pop().split(".")[0]);
      }

      const uploadedResponse = await cloudinary.uploader.upload(coverImg);
      coverImg = uploadedResponse.secure_url;
    }

    user.fullName = fullName || user.fullName;
    user.email = email || user.email;
    user.username = username || user.username;
    user.bio = bio;
    user.link = link;
    user.profileImg = profileImg || user.profileImg;
    user.coverImg = coverImg || user.coverImg;

    user = await user.save();

    user.password = null;

    return res.status(200).json(user);
  } catch (error) {
    console.error("Error in updateUser: ", error.message); // Add this
    res.status(500).json({ error: "Internal Server Error" }); // Add this
  }
};

export const getFollowingUsers = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).populate(
      "following",
      "username fullName profileImg isVerified"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user.following);
  } catch (error) {
    console.log("Error in getFollowingUsers: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getFollowers = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).populate(
      "followers",
      "username fullName profileImg isVerified"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user.followers);
  } catch (error) {
    console.log("Error in getFollowers: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deleteUserAccount = async (req, res) => {
  try {
    const { id } = req.params;

    if (id !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ error: "You are not authorized to delete this account." });
    }

    const userToDelete = await User.findById(id);
    if (!userToDelete) {
      return res.status(404).json({ error: "User not found." });
    }

    // --- START: CLEANUP BLOCKING ARRAYS ON ACCOUNT DELETION ---
    // Remove deleted user from all other users' blockedUsers and blockedBy lists
    await User.updateMany(
      { blockedUsers: userToDelete._id },
      { $pull: { blockedUsers: userToDelete._id } }
    );
    await User.updateMany(
      { blockedBy: userToDelete._id },
      { $pull: { blockedBy: userToDelete._id } }
    );
    // --- END: CLEANUP BLOCKING ARRAYS ON ACCOUNT DELETION ---

    if (userToDelete.profileImg) {
      const profileImgId = userToDelete.profileImg.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(profileImgId);
    }
    if (userToDelete.coverImg) {
      const coverImgId = userToDelete.coverImg.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(coverImgId);
    }

    const userPosts = await Post.find({ user: userToDelete._id });
    for (const post of userPosts) {
      if (post.img) {
        const postId = post.img.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(postId);
      }
      await Post.findByIdAndDelete(post._id);
    }

    await Post.updateMany(
      { likes: userToDelete._id },
      { $pull: { likes: userToDelete._id } }
    );

    await Post.updateMany(
      { "comments.user": userToDelete._id },
      { $pull: { comments: { user: userToDelete._id } } }
    );

    await User.updateMany(
      { following: userToDelete._id },
      { $pull: { following: userToDelete._id } }
    );

    await User.updateMany(
      { followers: userToDelete._id },
      { $pull: { followers: userToDelete._id } }
    );

    await Notification.deleteMany({
      $or: [{ from: userToDelete._id }, { to: userToDelete._id }],
    });

    const conversationsToDelete = await Conversation.find({
      participants: userToDelete._id,
    });

    for (const conversation of conversationsToDelete) {
      await Message.deleteMany({ conversationId: conversation._id });
      await Conversation.findByIdAndDelete(conversation._id);
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      message: "Account deleted successfully. All associated data has been removed.",
    });
  } catch (error) {
    console.error("Error in deleteUserAccount: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// uncomment if users dont want to be searched by blocked users
export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    // const currentUserId = req.user._id; // Get the ID of the authenticated user

    if (!q) {
      return res.status(200).json([]);
    }

    // const currentUser = await User.findById(currentUserId)
    //   .select("blockedUsers blockedBy")
    //   .lean();
    // const usersBlockedByMe = currentUser ? currentUser.blockedUsers : [];
    // const usersWhoBlockedMe = currentUser ? currentUser.blockedBy : [];

    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: "i" } },
        { fullName: { $regex: q, $options: "i" } },
      ],
      // _id: {
      //   $ne: currentUserId, // Don't show self in search
      //   $nin: usersBlockedByMe, // Don't show users I've blocked
      //   $nin: usersWhoBlockedMe, // Don't show users who have blocked me
      // },
    })
      .select("-password")
      .limit(10);

    res.status(200).json(users);
  } catch (error) {
    console.error("Error in searchUsers controller:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const blockUnblockUser = async (req, res) => {
  try {
    const { id: userToBlockId } = req.params; // ID of the user to block/unblock
    const currentUserId = req.user._id; // ID of the authenticated user

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
      // UNBLOCK LOGIC
      await User.findByIdAndUpdate(currentUserId, {
        $pull: { blockedUsers: userToBlockId },
      });
      await User.findByIdAndUpdate(userToBlockId, {
        $pull: { blockedBy: currentUserId },
      });

      const conversation = await Conversation.findOne({
        participants: { $all: [currentUserId, userToBlockId] },
      });

      if (conversation) {
        conversation.deletedFor = conversation.deletedFor.filter(
          (entry) =>
            entry.user.toString() !== currentUserId.toString() &&
            entry.user.toString() !== userToBlockId.toString()
        );
        await conversation.save();
      }

      // Return crucial information for client-side cache updates
      return res.status(200).json({
        message: "User unblocked successfully.",
        username: userToBlock.username, // Return the username of the target user
        isBlockedByYou: false, // You just unblocked them
        hasBlockedYou: userToBlock.blockedBy.includes(currentUserId), // Recalculate based on updated userToBlock
      });
    } else {
      // BLOCK LOGIC
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

      const conversation = await Conversation.findOne({
        participants: { $all: [currentUserId, userToBlockId] },
      });

      if (conversation) {
        if (
          !conversation.deletedFor.some(
            (entry) => entry.user.toString() === currentUserId.toString()
          )
        ) {
          conversation.deletedFor.push({ user: currentUserId });
        }
        if (
          !conversation.deletedFor.some(
            (entry) => entry.user.toString() === userToBlockId.toString()
          )
        ) {
          conversation.deletedFor.push({ user: userToBlockId });
        }
        await conversation.save();
      }

      // Return crucial information for client-side cache updates
      return res.status(200).json({
        message: "User blocked successfully.",
        username: userToBlock.username, // Return the username of the target user
        isBlockedByYou: true, // You just blocked them
        hasBlockedYou: userToBlock.blockedBy.includes(currentUserId), // Recalculate based on updated userToBlock
      });
    }
  } catch (error) {
    console.error("Error in blockUnblockUser: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
