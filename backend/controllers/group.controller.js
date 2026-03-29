import { v2 as cloudinary } from "cloudinary";
import { nanoid } from "nanoid";
import mongoose from "mongoose";
import Conversation from "../models/conversation.model.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Image from "../models/image.model.js";
import { io } from "../lib/socket.js";
import { getReceiverSocketIds } from "../lib/socket.js";

const POPULATE_MEMBER_USER = {
  path: "members.user",
  select:
    "username fullName isVerified isGoldVerified  badges",
  populate: { path: "profileImg", select: "imageUrl" },
};

const POPULATE_AVATAR = { path: "avatar", select: "imageUrl" };

function getMemberRole(conversation, userId) {
  const member = conversation.members.find(
    (m) => m.user.toString() === userId.toString(),
  );
  return member ? member.role : null;
}

function isMember(conversation, userId) {
  return conversation.members.some((m) => {
    const id = m.user?._id ?? m.user;
    return id?.toString() === userId.toString();
  });
}

function isAdminOrOwner(conversation, userId) {
  const role = getMemberRole(conversation, userId);
  return role === "admin" || role === "owner";
}

function emitGroupUpdate(conversation) {
  conversation.members.forEach((m) => {
    const userId = (m.user?._id ?? m.user).toString();
    const socketIds = getReceiverSocketIds(userId);
    if (socketIds.length > 0) {
      io.to(socketIds).emit("groupUpdated", conversation);
    }
  });
}

export const createGroup = async (req, res) => {
  try {
    const { name, description, isPrivate, memberIds } = req.body;
    let { avatar } = req.body;
    const userId = req.user._id.toString();

    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Group name is required." });
    }

    const uniqueInvited = [
      ...new Set((memberIds || []).map((id) => id.toString())),
    ].filter((id) => id !== userId);

    const validUsers = await User.find({ _id: { $in: uniqueInvited } }).select("_id");
    const validIds = validUsers.map((u) => u._id.toString());

    const members = [
      { user: userId, role: "owner" },
      ...validIds.map((id) => ({ user: id, role: "member" })),
    ];
    const participants = members.map((m) => m.user);

    const inviteCode = nanoid(10);

    const group = new Conversation({
      isGroup: true,
      name: name.trim(),
      description: description || "",
      isPrivate: isPrivate || false,
      members,
      participants,
      inviteCode,
    });

    await group.save();

    if (avatar && avatar !== "") {
      const uploaded = await cloudinary.uploader.upload(avatar, {
        upload_preset: "ml_avatars",
      });

      const newImage = await Image.create({
        imageUrl: uploaded.secure_url,
        parentDocument: group._id,
        parentModel: "Conversation",
        uploadedBy: userId,
        publicId: uploaded.public_id,
      });

      group.avatar = newImage._id;
      await group.save();
    }

    const populated = await Conversation.findById(group._id)
      .populate(POPULATE_MEMBER_USER)
      .populate(POPULATE_AVATAR);

    validIds.forEach((memberId) => {
      const socketIds = getReceiverSocketIds(memberId);
      if (socketIds.length > 0) {
        io.to(socketIds).emit("addedToGroup", populated);
      }
    });

    res.status(201).json(populated);
  } catch (error) {
    console.error("Error in createGroup:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroupConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await Conversation.find({
      isGroup: true,
      "members.user": userId,
    })
      .populate(POPULATE_MEMBER_USER)
      .populate(POPULATE_AVATAR)
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json(groups);
  } catch (error) {
    console.error("Error in getGroupConversations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Conversation.findOne({
      _id: groupId,
      isGroup: true,
    })
      .populate(POPULATE_MEMBER_USER)
      .populate(POPULATE_AVATAR);

    if (!group) return res.status(404).json({ error: "Group not found." });

    if (!isMember(group, userId)) {
      return res.status(403).json({ error: "You are not a member of this group." });
    }

    res.status(200).json(group);
  } catch (error) {
    console.error("Error in getGroup:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─── update group info ────────────────────────────────────────────────────────

export const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, isPrivate } = req.body;
    let { avatar } = req.body; // base64 string or empty string
    const userId = req.user._id;

    // 1. Populate avatar initially to get the imageUrl for deletion
    const group = await Conversation.findOne({ _id: groupId, isGroup: true }).populate(
      "avatar",
    );
    if (!group) return res.status(404).json({ error: "Group not found." });

    if (!isAdminOrOwner(group, userId)) {
      return res.status(403).json({ error: "Only admins can update group info." });
    }

    if (name !== undefined) group.name = name.trim();
    if (description !== undefined) group.description = description;
    if (isPrivate !== undefined) group.isPrivate = isPrivate;

    // --- Group Avatar Logic (Mirrored from updateUser) ---
    if (avatar || avatar === "") {
      // Delete old avatar if it exists
      if (group.avatar) {
        const publicId = group.avatar.imageUrl.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
        await Image.findByIdAndDelete(group.avatar._id);
      }

      if (avatar === "") {
        group.avatar = null;
      } else {
        const uploadedResponse = await cloudinary.uploader.upload(avatar, {
          upload_preset: "ml_avatars",
        });

        const newGroupImage = await Image.create({
          imageUrl: uploadedResponse.secure_url,
          parentDocument: group._id,
          parentModel: "Conversation",
          uploadedBy: userId,
          publicId: uploadedResponse.public_id, // Storing this is good practice
        });
        group.avatar = newGroupImage._id;
      }
    }

    await group.save();

    const populated = await Conversation.findById(group._id)
      .populate(POPULATE_MEMBER_USER)
      .populate(POPULATE_AVATAR);

    emitGroupUpdate(populated);
    res.status(200).json(populated);
  } catch (error) {
    console.error("Error in updateGroup:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─── member directory (searchable) ───────────────────────────────────────────

export const getMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { search = "", page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const group = await Conversation.findOne({ _id: groupId, isGroup: true }).populate({
      path: "members.user",
      select:
        "username fullName isVerified isGoldVerified badges ",
      populate: { path: "profileImg", select: "imageUrl" },
    });

    if (!group) return res.status(404).json({ error: "Group not found." });

    if (!isMember(group, userId)) {
      return res.status(403).json({ error: "You are not a member of this group." });
    }

    let members = group.members;

    if (search.trim()) {
      const lower = search.toLowerCase();
      members = members.filter((m) => {
        const u = m.user;
        if (!u || typeof u !== "object") return false;
        return (
          u.username?.toLowerCase().includes(lower) ||
          u.fullName?.toLowerCase().includes(lower)
        );
      });
    }

    const total = members.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginated = members.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      members: paginated,
      total,
      hasNextPage: skip + paginated.length < total,
    });
  } catch (error) {
    console.error("Error in getMembers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─── add members ──────────────────────────────────────────────────────────────

export const addMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userIds } = req.body;
    const userId = req.user._id;

    const group = await Conversation.findOne({ _id: groupId, isGroup: true });
    if (!group) return res.status(404).json({ error: "Group not found." });

    if (!isAdminOrOwner(group, userId)) {
      return res.status(403).json({ error: "Only admins can add members." });
    }

    const toAdd = [...new Set((userIds || []).map((id) => id.toString()))].filter(
      (id) => !isMember(group, id),
    );

    if (toAdd.length === 0) {
      return res.status(400).json({ error: "All users are already members." });
    }

    const validUsers = await User.find({ _id: { $in: toAdd } }).select("_id");
    const validIds = validUsers.map((u) => u._id.toString());

    group.members.push(...validIds.map((id) => ({ user: id, role: "member" })));
    group.participants.push(...validIds.map((id) => new mongoose.Types.ObjectId(id)));

    await group.save();

    const populated = await Conversation.findById(group._id)
      .populate(POPULATE_MEMBER_USER)
      .populate(POPULATE_AVATAR);

    validIds.forEach((newMemberId) => {
      const socketIds = getReceiverSocketIds(newMemberId);
      if (socketIds.length > 0) {
        io.to(socketIds).emit("addedToGroup", populated);
      }
    });

    emitGroupUpdate(populated);
    res.status(200).json(populated);
  } catch (error) {
    console.error("Error in addMembers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─── kick member ──────────────────────────────────────────────────────────────

export const kickMember = async (req, res) => {
  try {
    const { groupId, targetUserId } = req.params;
    const userId = req.user._id.toString();

    const group = await Conversation.findOne({ _id: groupId, isGroup: true });
    if (!group) return res.status(404).json({ error: "Group not found." });

    if (!isAdminOrOwner(group, userId)) {
      return res.status(403).json({ error: "Only admins can kick members." });
    }

    const targetRole = getMemberRole(group, targetUserId);
    if (!targetRole) {
      return res.status(404).json({ error: "User is not a member of this group." });
    }

    // Admins cannot kick the owner, admins cannot kick other admins
    if (targetRole === "owner") {
      return res.status(403).json({ error: "Cannot kick the group owner." });
    }
    if (targetRole === "admin" && getMemberRole(group, userId) !== "owner") {
      return res.status(403).json({ error: "Only the owner can kick admins." });
    }

    group.members = group.members.filter((m) => m.user.toString() !== targetUserId);
    group.participants = group.participants.filter((p) => p.toString() !== targetUserId);

    await group.save();

    const populated = await Conversation.findById(group._id)
      .populate(POPULATE_MEMBER_USER)
      .populate(POPULATE_AVATAR);

    // Tell the kicked user they were removed
    const kickedSocketIds = getReceiverSocketIds(targetUserId);
    if (kickedSocketIds.length > 0) {
      io.to(kickedSocketIds).emit("removedFromGroup", {
        groupId: group._id,
        groupName: group.name,
      });
    }

    emitGroupUpdate(populated);
    res.status(200).json(populated);
  } catch (error) {
    console.error("Error in kickMember:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─── leave group ──────────────────────────────────────────────────────────────

export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id.toString();

    const group = await Conversation.findOne({ _id: groupId, isGroup: true });
    if (!group) return res.status(404).json({ error: "Group not found." });

    if (!isMember(group, userId)) {
      return res.status(400).json({ error: "You are not a member of this group." });
    }

    const role = getMemberRole(group, userId);

    // Owner must transfer ownership or delete the group instead
    if (role === "owner") {
      return res.status(400).json({
        error:
          "You are the owner. Transfer ownership or delete the group before leaving.",
      });
    }

    group.members = group.members.filter((m) => m.user.toString() !== userId);
    group.participants = group.participants.filter((p) => p.toString() !== userId);

    await group.save();

    const populated = await Conversation.findById(group._id)
      .populate(POPULATE_MEMBER_USER)
      .populate(POPULATE_AVATAR);

    emitGroupUpdate(populated);
    res.status(200).json({ message: "Left group successfully." });
  } catch (error) {
    console.error("Error in leaveGroup:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─── promote / demote member ──────────────────────────────────────────────────

export const updateMemberRole = async (req, res) => {
  try {
    const { groupId, targetUserId } = req.params;
    const { role } = req.body; // "admin" or "member"
    const userId = req.user._id.toString();

    if (!["admin", "member"].includes(role)) {
      return res.status(400).json({ error: "Role must be 'admin' or 'member'." });
    }

    const group = await Conversation.findOne({ _id: groupId, isGroup: true });
    if (!group) return res.status(404).json({ error: "Group not found." });

    // Only owner can change roles
    if (getMemberRole(group, userId) !== "owner") {
      return res.status(403).json({ error: "Only the owner can change roles." });
    }

    const member = group.members.find((m) => m.user.toString() === targetUserId);
    if (!member) {
      return res.status(404).json({ error: "User is not a member of this group." });
    }
    if (member.role === "owner") {
      return res.status(400).json({ error: "Cannot change the owner's role." });
    }

    member.role = role;
    await group.save();

    const populated = await Conversation.findById(group._id)
      .populate(POPULATE_MEMBER_USER)
      .populate(POPULATE_AVATAR);

    emitGroupUpdate(populated);
    res.status(200).json(populated);
  } catch (error) {
    console.error("Error in updateMemberRole:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─── delete group ─────────────────────────────────────────────────────────────

export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id.toString();

    // 1. Populate avatar so we have the imageUrl for deletion
    const group = await Conversation.findOne({ _id: groupId, isGroup: true }).populate(
      "avatar",
    );
    if (!group) return res.status(404).json({ error: "Group not found." });

    if (getMemberRole(group, userId) !== "owner") {
      return res.status(403).json({ error: "Only the owner can delete the group." });
    }

    // 2. Notify all members before deleting
    group.members.forEach((m) => {
      const socketIds = getReceiverSocketIds(m.user.toString());
      if (socketIds.length > 0) {
        io.to(socketIds).emit("groupDeleted", { groupId: group._id });
      }
    });

    // 3. Clean up Group Avatar (Mirrored from updateUser logic)
    if (group.avatar) {
      const publicId = group.avatar.imageUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId);
      await Image.findByIdAndDelete(group.avatar._id);
    }

    // 4. (Optional but Recommended) Clean up all message images in Cloudinary
    // This finds all Image docs where parentDocument is this group
    const relatedImages = await Image.find({ parentDocument: group._id });
    for (const img of relatedImages) {
      const pId = img.imageUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(pId);
    }
    await Image.deleteMany({ parentDocument: group._id });

    // 5. Final database cleanup
    await Message.deleteMany({ conversationId: group._id });
    await Conversation.deleteOne({ _id: group._id });

    res.status(200).json({ message: "Group deleted successfully." });
  } catch (error) {
    console.error("Error in deleteGroup:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─── regenerate invite link ───────────────────────────────────────────────────

export const regenerateInviteCode = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id.toString();

    const group = await Conversation.findOne({ _id: groupId, isGroup: true });
    if (!group) return res.status(404).json({ error: "Group not found." });

    if (!isAdminOrOwner(group, userId)) {
      return res.status(403).json({ error: "Only admins can regenerate invite links." });
    }

    group.inviteCode = nanoid(10);
    await group.save();

    res.status(200).json({ inviteCode: group.inviteCode });
  } catch (error) {
    console.error("Error in regenerateInviteCode:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─── join via invite code ─────────────────────────────────────────────────────

export const joinViaInviteCode = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const userId = req.user._id.toString();

    const group = await Conversation.findOne({ inviteCode, isGroup: true });
    if (!group) {
      return res.status(404).json({ error: "Invalid or expired invite link." });
    }

    if (isMember(group, userId)) {
      return res.status(400).json({ error: "You are already a member of this group." });
    }

    // Check for existing pending request
    const existingRequest = group.joinRequests.find(
      (r) => r.user.toString() === userId && r.status === "pending",
    );

    if (group.isPrivate) {
      if (existingRequest) {
        return res
          .status(400)
          .json({ error: "You already have a pending join request." });
      }
      group.joinRequests.push({ user: userId, status: "pending" });
      await group.save();
      return res
        .status(200)
        .json({ message: "Join request sent. Waiting for admin approval." });
    }

    // Public group — join immediately
    group.members.push({ user: userId, role: "member" });
    group.participants.push(new mongoose.Types.ObjectId(userId));
    await group.save();

    const populated = await Conversation.findById(group._id)
      .populate(POPULATE_MEMBER_USER)
      .populate(POPULATE_AVATAR);

    emitGroupUpdate(populated);

    const joiningUserSocketIds = getReceiverSocketIds(userId);
    if (joiningUserSocketIds.length > 0) {
      io.to(joiningUserSocketIds).emit("addedToGroup", populated);
    }

    res.status(200).json(populated);
  } catch (error) {
    console.error("Error in joinViaInviteCode:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─── get join requests ────────────────────────────────────────────────────────

export const getJoinRequests = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Conversation.findOne({ _id: groupId, isGroup: true }).populate({
      path: "joinRequests.user",
      select: "username fullName badges",
      populate: { path: "profileImg", select: "imageUrl" },
    });

    if (!group) return res.status(404).json({ error: "Group not found." });

    if (!isAdminOrOwner(group, userId)) {
      return res.status(403).json({ error: "Only admins can view join requests." });
    }

    const pending = group.joinRequests.filter((r) => r.status === "pending");
    res.status(200).json(pending);
  } catch (error) {
    console.error("Error in getJoinRequests:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─── handle join request ──────────────────────────────────────────────────────

export const handleJoinRequest = async (req, res) => {
  try {
    const { groupId, requestId } = req.params;
    const { action } = req.body; // "approve" or "reject"
    const userId = req.user._id.toString();

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ error: "Action must be 'approve' or 'reject'." });
    }

    const group = await Conversation.findOne({ _id: groupId, isGroup: true });
    if (!group) return res.status(404).json({ error: "Group not found." });

    if (!isAdminOrOwner(group, userId)) {
      return res.status(403).json({ error: "Only admins can handle join requests." });
    }

    const request = group.joinRequests.id(requestId);
    if (!request || request.status !== "pending") {
      return res.status(404).json({ error: "Pending request not found." });
    }

    const requestUserId = request.user.toString();

    if (action === "approve") {
      request.status = "approved";
      group.members.push({ user: requestUserId, role: "member" });
      group.participants.push(new mongoose.Types.ObjectId(requestUserId));
      await group.save();

      const populated = await Conversation.findById(group._id)
        .populate(POPULATE_MEMBER_USER)
        .populate(POPULATE_AVATAR);

      // Tell the approved user they're now in the group
      const approvedSocketIds = getReceiverSocketIds(requestUserId);
      if (approvedSocketIds.length > 0) {
        io.to(approvedSocketIds).emit("addedToGroup", populated);
      }

      emitGroupUpdate(populated);
      return res.status(200).json({ message: "Request approved.", group: populated });
    } else {
      request.status = "rejected";
      await group.save();

      const rejectedSocketIds = getReceiverSocketIds(requestUserId);
      if (rejectedSocketIds.length > 0) {
        io.to(rejectedSocketIds).emit("joinRequestRejected", {
          groupId: group._id,
          groupName: group.name,
        });
      }

      return res.status(200).json({ message: "Request rejected." });
    }
  } catch (error) {
    console.error("Error in handleJoinRequest:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


// ─── admin delete message ─────────────────────────────────────────────────────

export const adminDeleteMessage = async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const userId = req.user._id.toString();

    const group = await Conversation.findOne({ _id: groupId, isGroup: true });
    if (!group) return res.status(404).json({ error: "Group not found." });

    if (!isAdminOrOwner(group, userId)) {
      return res.status(403).json({ error: "Only admins can delete messages." });
    }

    const message = await Message.findOne({
      _id: messageId,
      conversationId: groupId,
    });
    if (!message) return res.status(404).json({ error: "Message not found." });

    message.isDeletedByAdmin = true;
    message.deletedByAdmin = userId;
    await message.save();

    // Emit to all group members so the UI updates instantly
    group.members.forEach((m) => {
      const socketIds = getReceiverSocketIds(m.user.toString());
      if (socketIds.length > 0) {
        io.to(socketIds).emit("messageDeletedByAdmin", {
          messageId,
          conversationId: groupId,
          deletedBy: userId,
        });
      }
    });

    res.status(200).json({ message: "Message deleted by admin." });
  } catch (error) {
    console.error("Error in adminDeleteMessage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─── transfer ownership ───────────────────────────────────────────────────────

export const transferOwnership = async (req, res) => {
  try {
    const { groupId, targetUserId } = req.params;
    const userId = req.user._id.toString();

    const group = await Conversation.findOne({ _id: groupId, isGroup: true });
    if (!group) return res.status(404).json({ error: "Group not found." });

    if (getMemberRole(group, userId) !== "owner") {
      return res.status(403).json({ error: "Only the owner can transfer ownership." });
    }

    const newOwner = group.members.find((m) => m.user.toString() === targetUserId);
    if (!newOwner) {
      return res.status(404).json({ error: "Target user is not a member." });
    }

    // Demote current owner to admin, promote target to owner
    group.members = group.members.map((m) => {
      if (m.user.toString() === userId) return { ...m.toObject(), role: "admin" };
      if (m.user.toString() === targetUserId) return { ...m.toObject(), role: "owner" };
      return m;
    });

    await group.save();

    const populated = await Conversation.findById(group._id)
      .populate(POPULATE_MEMBER_USER)
      .populate(POPULATE_AVATAR);

    emitGroupUpdate(populated);
    res.status(200).json(populated);
  } catch (error) {
    console.error("Error in transferOwnership:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
