import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  getGroupConversations,
  getGroup,
  updateGroup,
  addMembers,
  kickMember,
  leaveGroup,
  updateMemberRole,
  deleteGroup,
  regenerateInviteCode,
  joinViaInviteCode,
  getJoinRequests,
  handleJoinRequest,
  getMembers,
  adminDeleteMessage,
  transferOwnership,
  createGroup,
} from "../controllers/group.controller.js";

const router = express.Router();

router.post("/", protectRoute, createGroup);
router.get("/", protectRoute, getGroupConversations);
router.get("/:groupId", protectRoute, getGroup);
router.put("/:groupId", protectRoute, updateGroup);
router.delete("/:groupId", protectRoute, deleteGroup);

router.post("/:groupId/members", protectRoute, addMembers);
router.delete("/:groupId/members/:targetUserId", protectRoute, kickMember);
router.delete("/:groupId/leave", protectRoute, leaveGroup);
router.put("/:groupId/members/:targetUserId/role", protectRoute, updateMemberRole);
router.put("/:groupId/transfer/:targetUserId", protectRoute, transferOwnership);

router.get("/:groupId/invite", protectRoute, regenerateInviteCode);
router.post("/join/:inviteCode", protectRoute, joinViaInviteCode);

router.get("/:groupId/join-requests", protectRoute, getJoinRequests);
router.put("/:groupId/join-requests/:requestId", protectRoute, handleJoinRequest);

router.get("/:groupId/members", protectRoute, getMembers);

router.delete("/:groupId/messages/:messageId", protectRoute, adminDeleteMessage);

export default router;
