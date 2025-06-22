import Post from "../models/post.model.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import { v2 as cloudinary } from "cloudinary";
import { emitUnreadNotificationStatus, io, onlineUsersMap } from "../lib/socket.js";

export const createPost = async (req, res) => {
  try {
    const { text } = req.body;
    let { img } = req.body;

    const userId = req.user._id.toString();

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!text && !img) {
      return res.status(404).json({ error: "Post must have a text or image" });
    }

    if (img) {
      const uploadedResponse = await cloudinary.uploader.upload(img);
      img = uploadedResponse.secure_url;
    }

    const newPost = new Post({
      user: userId,
      text,
      img,
    });

    await newPost.save();

    for (const [onlineUserId, socketIdsSet] of onlineUsersMap.entries()) {
      if (onlineUserId.toString() !== userId.toString()) {
        socketIdsSet.forEach((socketId) => {
          io.to(socketId).emit("newPostAvailable");
        });
      }
    }
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in createPost controller: ", error);
  }
};

export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const postToDelete = await Post.findById(id);

    if (!postToDelete) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (postToDelete.user.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ error: "You are not authorized to delete this post" });
    }
    if (!postToDelete.repostedFrom) {
      await Post.deleteMany({ repostedFrom: postToDelete._id });
    } else {
      await Post.findByIdAndUpdate(
        postToDelete.repostedFrom,
        { $inc: { repostsCount: -1 } },
        { new: true }
      );
    }
    await Post.deleteOne({ _id: id });

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error in deletePost controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const commentOnPost = async (req, res) => {
  try {
    const { text } = req.body;
    const postId = req.params.id;
    const userId = req.user._id;

    if (!text) {
      return res.status(400).json({ error: "Text field is required" });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comment = { user: userId, text };

    post.comments.push(comment);
    await post.save();

    const newComment = post.comments[post.comments.length - 1];

    res.status(200).json(newComment);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in commentOnPost controller: ", error);
  }
};

export const likeUnlikePost = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id: postId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const userLikedPost = post.likes.includes(userId);

    if (userLikedPost) {
      await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
      await User.updateOne({ _id: userId }, { $pull: { likedPosts: postId } });

      const updatedLikes = post.likes.filter((id) => id.toString() !== userId.toString());
      res.status(200).json(updatedLikes);
    } else {
      post.likes.push(userId);
      await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } });
      await post.save();

      if (post.user.toString() !== userId.toString()) {
        const notification = new Notification({
          from: userId,
          to: post.user,
          type: "like",
          postId: postId,
          read: false,
        });

        await notification.save();

        await emitUnreadNotificationStatus(post.user.toString());
      }
      res.status(200).json(post.likes);
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in likeUnlikePost controller: ", error);
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const userId = req.user?._id;

    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "user", select: "-password" })
      .populate({ path: "comments.user", select: "-password" })
      .populate({
        path: "repostedFrom",
        populate: {
          path: "user",
          select: "-password",
        },
        select: "text img likes comments repostsCount createdAt user",
      });

    const filteredPosts = posts.filter((post) => {
      if (post.repostedFrom) {
        if (post.repostedFrom.repostedFrom) {
          return false;
        }
        const isRepostDeletedForMe =
          userId &&
          post.deletedFor?.some((entry) => entry.user.toString() === userId.toString());
        return !isRepostDeletedForMe;
      }
      const isOriginalPostDeletedForMe =
        userId &&
        post.deletedFor?.some((entry) => entry.user.toString() === userId.toString());
      return !isOriginalPostDeletedForMe;
    });

    const totalPosts = await Post.countDocuments({});
    const hasNextPage = page * limit < totalPosts;

    res.status(200).json({ posts: filteredPosts, hasNextPage });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in getAllPosts controller: ", error);
  }
};

export const getLikedPosts = async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const likedPosts = await Post.find({ _id: { $in: user.likedPosts } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      })
      .populate({
        path: "repostedFrom",
        populate: {
          path: "user",
          select: "-password",
        },
        select: "text img likes comments repostsCount createdAt user",
      });

    const totalLikedPosts = await Post.countDocuments({ _id: { $in: user.likedPosts } });
    const hasNextPage = page * limit < totalLikedPosts;

    res.status(200).json({ posts: likedPosts, hasNextPage });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in getLikedPosts controller: ", error);
  }
};

export const getFollowingPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const following = user.following;

    if (following.length === 0) {
      return res.status(200).json({ posts: [], hasNextPage: false });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const baseQuery = {
      user: { $in: following },
    };

    const rawFeedPosts = await Post.find({
      $or: [baseQuery, { user: { $in: following }, repostedFrom: { $ne: null } }],
      "deletedFor.user": { $ne: userId },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      })
      .populate({
        path: "repostedFrom",
        populate: {
          path: "user",
          select: "-password",
        },
        select: "text img likes comments repostsCount createdAt user",
      });

    const finalFeedPosts = rawFeedPosts.filter((post) => {
      const isDeletedForMe = post.deletedFor?.includes(userId.toString());
      if (isDeletedForMe) {
        return false;
      }

      if (post.repostedFrom) {
        if (post.repostedFrom.repostedFrom) {
          return false;
        }

        if (!post.repostedFrom) {
          return false;
        }
        if (!post.repostedFrom._id) {
          return false;
        }

        const repostingUserId = post.user._id.toString();
        const isRepostByFollowed = following.includes(repostingUserId);

        return isRepostByFollowed;
      } else {
        const isOriginalByFollowed = following.includes(post.user._id.toString());
        return isOriginalByFollowed;
      }
    });

    const hasNextPage = finalFeedPosts.length === limit;

    res.status(200).json({ posts: finalFeedPosts, hasNextPage });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in getFollowingPosts controller: ", error);
  }
};

export const getUserPosts = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });

    if (!user) return res.status(404).json({ error: "User not found" });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const currentUserId = req.user?._id;

    const rawUserPosts = await Post.find({
      $or: [
        { user: user._id, repostedFrom: null },
        { user: user._id, repostedFrom: { $ne: null } },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "user", select: "-password" })
      .populate({ path: "comments.user", select: "-password" })
      .populate({
        path: "repostedFrom",
        populate: {
          path: "user",
          select: "-password",
        },
        select: "text img likes comments repostsCount createdAt user", // Include repostsCount
      });

    const finalUserPosts = rawUserPosts.filter((post) => {
      if (currentUserId) {
        const isDeletedForMe = post.deletedFor?.some(
          (entry) => entry.user.toString() === currentUserId.toString()
        );
        if (isDeletedForMe) {
          return false;
        }
      }

      if (post.repostedFrom && post.repostedFrom.repostedFrom) {
        return false;
      }

      return true;
    });

    const totalUserPosts = await Post.countDocuments({
      $or: [
        { user: user._id, repostedFrom: null },
        { user: user._id, repostedFrom: { $ne: null } },
      ],
    });
    const hasNextPage = page * limit < totalUserPosts;

    res.status(200).json({ posts: finalUserPosts, hasNextPage });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in getUserPosts controller: ", error);
  }
};

export const getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate({
        path: "user",
        select: "username profileImg fullName isVerified",
      })
      .populate({
        path: "comments.user",
        select: "username profileImg fullName isVerified",
      })
      .populate({
        path: "repostedFrom",
        populate: [
          {
            path: "user",
            select: "username profileImg fullName isVerified",
          },
          {
            path: "comments.user",
            select: "username profileImg fullName isVerified",
          },
        ],
        select: "text img likes comments repostsCount createdAt user",
      });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.status(200).json(post);
  } catch (error) {
    console.error("Error in getPost controller", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const repostPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const originalPost = await Post.findById(postId);
    if (!originalPost) {
      return res.status(404).json({ error: "Original post not found." });
    }

    if (
      !originalPost.repostedFrom &&
      originalPost.user.toString() === userId.toString()
    ) {
      return res.status(400).json({ error: "You cannot repost your own post." });
    }

    const existingRepost = await Post.findOne({
      user: userId,
      repostedFrom: originalPost._id,
    });

    let message;
    if (existingRepost) {
      await Post.deleteOne({ _id: existingRepost._id });
      originalPost.repostsCount = Math.max(0, originalPost.repostsCount - 1);
      message = "Repost removed successfully.";
    } else {
      const newRepost = new Post({
        user: userId,
        text: "",
        img: "",
        repostedFrom: originalPost._id,
        likes: [],
        comments: [],
        repostsCount: 0,
      });
      await newRepost.save();
      originalPost.repostsCount = (originalPost.repostsCount || 0) + 1;
      message = "Post reposted successfully.";
    }

    await originalPost.save();

    res.status(200).json({
      message: message,
      newRepostsCount: originalPost.repostsCount,
      hasUserReposted: !existingRepost,
    });
  } catch (error) {
    console.error("Error in toggleRepost controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const checkIfUserReposted = async (req, res) => {
  try {
    const { originalPostId } = req.params;
    const userId = req.user._id;

    const existingRepost = await Post.findOne({
      user: userId,
      repostedFrom: originalPostId,
    });

    res.status(200).json({ hasReposted: !!existingRepost });
  } catch (error) {
    console.error("Error in checkIfUserReposted controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const commentToDelete = post.comments.id(commentId);

    if (!commentToDelete) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (commentToDelete.user.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ error: "You are not authorized to delete this comment" });
    }

    // If it's a repost being deleted, decrement the original post's count
    // if (postToDelete.repostedFrom) {
    //   const originalPost = await Post.findById(postToDelete.repostedFrom);
    //   if (originalPost) {
    //     originalPost.repostsCount = Math.max(0, originalPost.repostsCount - 1); // Ensure count doesn't go below 0
    //     await originalPost.save();
    //   }
    // }

    post.comments.pull({ _id: commentId });
    await post.save();

    res.status(200).json({ message: "Comment deleted successfully", commentId });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in deleteComment controller: ", error);
  }
};

export const likeUnlikeComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params; // Get post ID and comment ID from params
    const userId = req.user._id; // Authenticated user ID

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Find the specific comment within the post
    const comment = post.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    const userLikedComment = comment.likes.includes(userId);

    if (userLikedComment) {
      // Unlike the comment
      comment.likes.pull(userId); // Use .pull() to remove element from array
      await post.save();
      res.status(200).json({ message: "Comment unliked successfully!" });
    } else {
      // Like the comment
      comment.likes.push(userId); // Add user to likes array

      // Create a notification for the comment owner if they are not the current user
      // and they are not liking their own comment
      if (comment.user.toString() !== userId.toString()) {
        await Notification.create({
          from: userId,
          to: comment.user, // The owner of the comment
          type: "commentLike", // New type for comment likes
        });
        // Emit real-time unread notification status
        await emitUnreadNotificationStatus(comment.user.toString());
      }

      await post.save();
      res.status(200).json({ message: "Comment liked successfully!" });
    }
  } catch (error) {
    console.log("Error in likeUnlikeComment controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};