import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  addMembers,
  adminDeleteMessage,
  createGroup,
  deleteGroup,
  getGroup,
  getGroupConversations,
  getJoinRequests,
  getMembers,
  handleJoinRequest,
  joinViaInviteCode,
  kickMember,
  leaveGroup,
  regenerateInviteCode,
  transferOwnership,
  updateGroup,
  updateMemberRole,
} from "../controllers/group.controller.js";

const router = express.Router();

// Apply protection to all group routes
router.use(protectRoute);

// --- GROUP DISCOVERY & CREATION ---
router.get("/", getGroupConversations);
router.post("/", createGroup);
router.post("/join/:inviteCode", joinViaInviteCode);

// --- MEMBERSHIP MANAGEMENT ---
router.get("/:groupId/members", getMembers);
router.post("/:groupId/members", addMembers);
router.delete("/:groupId/leave", leaveGroup);
router.delete("/:groupId/members/:targetUserId", kickMember);
router.put("/:groupId/members/:targetUserId/role", updateMemberRole);

// --- INVITES & REQUESTS ---
router.get("/:groupId/invite", regenerateInviteCode);
router.get("/:groupId/join-requests", getJoinRequests);
router.put("/:groupId/join-requests/:requestId", handleJoinRequest);

// --- SETTINGS & ADMINISTRATION ---
router.put("/:groupId", updateGroup);
router.delete("/:groupId", deleteGroup);
router.put("/:groupId/transfer/:targetUserId", transferOwnership);
router.delete("/:groupId/messages/:messageId", adminDeleteMessage);

// --- SPECIFIC GROUP DATA ---
// Placed last to ensure it doesn't swallow routes like /join or /members
router.get("/:groupId", getGroup);

export default router;
