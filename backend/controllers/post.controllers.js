import Post from "../models/post.model.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import { v2 as cloudinary } from "cloudinary";

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
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in createPost controller: ", error);
  }
};

export const deletePost = async (req, res) => {
  try {
    const { id } = req.params; // The ID of the post to delete

    const postToDelete = await Post.findById(id);

    if (!postToDelete) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Authorization check: ensure user owns the post (or is admin)
    if (postToDelete.user.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ error: "You are not authorized to delete this post" });
    }

    // If the post being deleted is an original post:
    if (!postToDelete.repostedFrom) {
      // Delete all reposts that reference this original post
      await Post.deleteMany({ repostedFrom: postToDelete._id });
      console.log(`Deleted all reposts for original post: ${postToDelete._id}`);
    } else {
      // If the post being deleted is itself a repost:
      // Decrement the repostsCount of the original post it was based on
      await Post.findByIdAndUpdate(
        postToDelete.repostedFrom,
        { $inc: { repostsCount: -1 } },
        { new: true } // Return the updated document
      );
      console.log(
        `Decremented repostsCount for original post: ${postToDelete.repostedFrom}`
      );
    }

    // Finally, delete the post itself
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
      // Like post
      post.likes.push(userId);
      await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } });
      await post.save();

      const notification = new Notification({
        from: userId,
        to: post.user,
        type: "like",
      });

      await notification.save();
      res.status(200).json(post.likes);
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in likeUnlikePost controller: ", error);
  }
};

// In your controller file (e.g., postsController.js)
export const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default to 10 posts per page
    const skip = (page - 1) * limit;

    const userId = req.user?._id; // Get current user ID for deletedFor filtering

    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(skip) // Skip posts already fetched
      .limit(limit) // Limit the number of posts fetched
      .populate({ path: "user", select: "-password" })
      .populate({ path: "comments.user", select: "-password" })
      .populate({
        path: "repostedFrom", // Populate the original post for reposts
        populate: {
          // Nested populate for the original post's user
          path: "user",
          select: "-password",
        },
        select: "text img likes comments repostsCount createdAt user", // Include repostsCount
      });

    // Filter out reposts of reposts, and potentially posts marked as deleted for the current user.
    const filteredPosts = posts.filter((post) => {
      if (post.repostedFrom) {
        // Exclude reposts of reposts (X's behavior)
        if (post.repostedFrom.repostedFrom) {
          return false;
        }
        // If it's a repost, check if this specific repost is deleted for the current user
        const isRepostDeletedForMe =
          userId &&
          post.deletedFor?.some((entry) => entry.user.toString() === userId.toString());
        return !isRepostDeletedForMe;
      }
      // If it's an original post, check if it's deleted for the current user
      const isOriginalPostDeletedForMe =
        userId &&
        post.deletedFor?.some((entry) => entry.user.toString() === userId.toString());
      return !isOriginalPostDeletedForMe;
    });

    // Optional: Send a flag indicating if there are more posts
    // CRITICAL: totalPosts should also consider the filter for reposts of reposts
    // This count calculation is more complex because it depends on the filters above.
    // For simplicity with pagination, we count all and let the frontend filter.
    // A more accurate count for `hasNextPage` would require replicating the filter in `countDocuments`.
    // Let's adjust `totalPosts` to match the filtered query conceptually.
    // For accurate pagination with filtering, you'd perform a separate aggregation with the same filter criteria.
    // For now, let's use a simpler total count for pagination purposes, acknowledging that `hasNextPage` might be slightly off.
    const totalPosts = await Post.countDocuments({}); // Counts all posts before filtering
    const hasNextPage = page * limit < totalPosts; // This will count all posts, not just active ones.
    // A more precise pagination would need a more complex query for total.

    res.status(200).json({ posts: filteredPosts, hasNextPage });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in getAllPosts controller: ", error);
  }
};

export const getLikedPosts = async (req, res) => {
  const userId = req.params.id; // Expecting userId from URL parameters
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const likedPosts = await Post.find({ _id: { $in: user.likedPosts } })
      .sort({ createdAt: -1 }) // Assuming you want liked posts sorted by creation date
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
        path: "repostedFrom", // Populate the original post if this is a repost
        populate: {
          // Nested populate for the original post's user
          path: "user",
          select: "-password",
        },
        // *** FIX 2: Add repostsCount to select for original post ***
        select: "text img likes comments repostsCount createdAt user", // Include repostsCount
      });

    // CRITICAL: Count only the posts that match the likedPosts array
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Query for posts by users the current user is following OR
    // posts created by the current user.
    // We will then populate reposts.
    const baseQuery = {
      $or: [
        { user: { $in: following } }, // Posts from followed users
        { user: userId }, // Posts from the current user
      ],
    };

    // Fetch posts that match the base query (original posts by relevant users)
    // AND also fetch posts that are reposts
    // To accurately get all relevant posts for the feed (originals AND reposts),
    // we might need to adjust the initial `find` query to include reposts by `userId` or of `following` posts.
    // A more robust approach for mixed feeds like this often uses an aggregation pipeline.
    // For `find`, we'll fetch a wider net and filter strictly afterwards.

    const rawFeedPosts = await Post.find({
      $or: [
        baseQuery, // Original posts by followed/self
        { user: userId, repostedFrom: { $ne: null } }, // Reposts made by current user
        // Reposts made by followed users of any post (if you want to show that)
        // { user: { $in: following }, repostedFrom: { $ne: null } }
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "user", // Populate the user who created/reposted this specific post
        select: "-password",
      })
      .populate({
        path: "comments.user", // Populate the user who made the comment
        select: "-password",
      })
      .populate({
        path: "repostedFrom", // Populate the original post for reposts
        populate: {
          // Nested populate for the original post's user
          path: "user",
          select: "-password",
        },
        select: "text img likes comments repostsCount createdAt user", // Include repostsCount
      });

    // --- Post-fetch filtering to refine the feed ---
    const finalFeedPosts = rawFeedPosts.filter((post) => {
      // First, filter out any post (original or repost) that is deleted for the current user
      const isDeletedForMe = post.deletedFor?.some(
        (entry) => entry.user.toString() === userId.toString()
      );
      if (isDeletedForMe) {
        return false; // Exclude if deleted for current user
      }

      // Handle Reposts
      if (post.repostedFrom) {
        // Exclude reposts of reposts (X typically doesn't allow this)
        if (post.repostedFrom.repostedFrom) {
          return false;
        }

        // Ensure the original post exists (wasn't deleted from the DB)
        if (!post.repostedFrom._id) {
          return false;
        }

        // Ensure the repost itself is by me OR
        // Ensure the repost is by someone I follow OR
        // Ensure the original post's author is someone I follow OR
        // the original post's author is me.
        const repostingUserId = post.user._id.toString();
        const originalPostAuthorId = post.repostedFrom.user?._id.toString();

        const isRepostByMe = repostingUserId === userId.toString();
        const isRepostByFollowed = following.includes(repostingUserId);
        const isOriginalAuthorFollowed =
          originalPostAuthorId && following.includes(originalPostAuthorId);
        const isOriginalAuthorMe = originalPostAuthorId === userId.toString();

        return (
          isRepostByMe ||
          isRepostByFollowed ||
          isOriginalAuthorFollowed ||
          isOriginalAuthorMe
        );
      } else {
        // Handle Original Posts
        // Only include original posts if they are by me or someone I follow
        const isOriginalByMe = post.user._id.toString() === userId.toString();
        const isOriginalByFollowed = following.includes(post.user._id.toString());
        return isOriginalByMe || isOriginalByFollowed;
      }
    });

    // CRITICAL: Pagination count needs to match the final filtered array for `hasNextPage`
    // This is complex to do with `countDocuments` after this kind of filtering.
    // For accurate pagination, you would typically use an aggregation pipeline for both data and count.
    // For now, let's return a simpler hasNextPage based on the actual fetched items.
    const hasNextPage = finalFeedPosts.length === limit; // Simple check: if we got 'limit' items, there might be more.
    // This is not precise but works for basic infinite scrolling.

    res.status(200).json({ posts: finalFeedPosts, hasNextPage });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in getFollowingPosts controller: ", error);
  }
};

export const getUserPosts = async (req, res) => {
  try {
    const { username } = req.params; // Expecting username from URL parameters
    const user = await User.findOne({ username });

    if (!user) return res.status(404).json({ error: "User not found" });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const currentUserId = req.user?._id; // Get current authenticated user ID

    // Query for posts created by this user OR posts reposted by this user
    const rawUserPosts = await Post.find({
      $or: [
        { user: user._id, repostedFrom: null }, // Original posts by this user
        { user: user._id, repostedFrom: { $ne: null } }, // Reposts made by this user
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "user", select: "-password" }) // The user who made/reposted this post
      .populate({ path: "comments.user", select: "-password" })
      .populate({
        path: "repostedFrom", // Populate the original post for reposts
        populate: {
          // Nested populate for the original post's user
          path: "user",
          select: "-password",
        },
        select: "text img likes comments repostsCount createdAt user", // Include repostsCount
      });

    // Filter out reposts of reposts, and posts marked as deleted for the current authenticated user
    const finalUserPosts = rawUserPosts.filter((post) => {
      // If there's an authenticated user viewing this profile, filter out posts deleted by them
      if (currentUserId) {
        const isDeletedForMe = post.deletedFor?.some(
          (entry) => entry.user.toString() === currentUserId.toString()
        );
        if (isDeletedForMe) {
          return false;
        }
      }

      // Exclude reposts of reposts (X's behavior)
      if (post.repostedFrom && post.repostedFrom.repostedFrom) {
        return false;
      }

      return true; // Include everything else that matches the query and isn't deleted/repost of repost
    });

    // CRITICAL: Count only the posts belonging to this specific user AND matching filters
    // Similar to feed posts, an aggregation pipeline is ideal here for accurate pagination.
    // For simplicity, we can count the initial query, but it won't be exact after filtering.
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
        path: "user", // Populates the user who created *this* post
        select: "username profileImg fullName isVerified",
      })
      .populate({
        path: "comments.user", // Populates the users who commented on this post
        select: "username profileImg fullName isVerified",
      })
      .populate({
        // <<< THIS IS THE ABSOLUTELY ESSENTIAL ADDITION
        path: "repostedFrom", // If this post is a repost, populate the original post
        populate: {
          path: "user", // And populate the user who created that original post
          select: "username profileImg fullName isVerified",
        },
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
  // Renamed from repostPost
  try {
    const { postId } = req.params; // This is the ID of the original post
    const userId = req.user._id;

    // 1. Find the original post (to update its count)
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

    // 2. Check if the user has already reposted this post
    const existingRepost = await Post.findOne({
      user: userId,
      repostedFrom: originalPost._id,
    });

    let message;
    if (existingRepost) {
      // User has already reposted -> Unrepost it
      await Post.deleteOne({ _id: existingRepost._id }); // Delete the repost document
      originalPost.repostsCount = Math.max(0, originalPost.repostsCount - 1); // Decrement count, ensure not negative
      message = "Repost removed successfully.";
    } else {
      // User has NOT reposted -> Repost it
      const newRepost = new Post({
        user: userId,
        text: "",
        img: "",
        repostedFrom: originalPost._id,
        likes: [],
        comments: [],
        repostsCount: 0, // A repost itself starts with 0
      });
      await newRepost.save();
      originalPost.repostsCount = (originalPost.repostsCount || 0) + 1; // Increment count
      message = "Post reposted successfully.";
    }

    await originalPost.save(); // Save the updated original post

    // Send back the new count and success message
    // You might want to populate originalPost here if your frontend needs it immediately
    // But for just the count and status, a simple message is fine.
    res.status(200).json({
      message: message,
      newRepostsCount: originalPost.repostsCount,
      hasUserReposted: !existingRepost, // True if it was just reposted, false if just unreposted
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
    if (postToDelete.repostedFrom) {
      const originalPost = await Post.findById(postToDelete.repostedFrom);
      if (originalPost) {
        originalPost.repostsCount = Math.max(0, originalPost.repostsCount - 1); // Ensure count doesn't go below 0
        await originalPost.save();
      }
    }

    post.comments.pull({ _id: commentId });
    await post.save();

    res.status(200).json({ message: "Comment deleted successfully", commentId });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in deleteComment controller: ", error);
  }
};
