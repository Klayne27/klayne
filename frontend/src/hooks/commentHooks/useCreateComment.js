import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addCommentApi, replyToCommentApi } from "../../api/commentsApi";
import toast from "react-hot-toast";
import { useAuthUser } from "../authHooks/useAuthUser";

export const useCreateComment = (postId, parentCommentId = null) => {
  const queryClient = useQueryClient();
  const { authUser: currentUser } = useAuthUser();

  const commentsQueryKey = parentCommentId
    ? ["comments", postId, parentCommentId, "replies"]
    : ["comments", postId];

  const { mutate: createComment, isPending: isCreatingComment } = useMutation({
    mutationFn: async ({ text, img }) => {
      if (parentCommentId) {
        return replyToCommentApi({ postId, parentCommentId, text, img });
      } else {
        return addCommentApi({ postId, text, img });
      }
    },
    onMutate: async ({ text, img }) => {
      if (!currentUser?._id) {
        console.warn("No authenticated user ID for optimistic comment update.");
        return;
      }
      // Cancel queries
      await queryClient.cancelQueries({ queryKey: commentsQueryKey });
      await queryClient.cancelQueries({ queryKey: ["post", postId] });
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      await queryClient.cancelQueries({ queryKey: ["bookmarkedPosts"] });
      await queryClient.cancelQueries({
        queryKey: ["pinnedPosts", currentUser.username],
      }); // Assuming pinned posts are per user

      // Store previous data
      const previousComments = queryClient.getQueryData(commentsQueryKey);
      const previousPostData = queryClient.getQueryData(["post", postId]);
      const previousPostsData = queryClient.getQueryData(["posts"]);
      const previousBookmarkedPostsData = queryClient.getQueryData(["bookmarkedPosts"]);
      const previousPinnedPostsData = queryClient.getQueryData([
        "pinnedPosts",
        currentUser.username,
      ]);

      const tempId = `optimistic-${Date.now()}-${Math.random()}`;
      const newOptimisticComment = {
        _id: tempId,
        user: {
          _id: currentUser._id,
          username: currentUser.username,
          fullName: currentUser.fullName,
          profileImg: currentUser.profileImg,
          isVerified: currentUser.isVerified,
        },
        post: postId,
        text: text,
        img: img,
        parentComment: parentCommentId,
        likes: [],
        repliesCount: 0,
        createdAt: new Date().toISOString(),
        isOptimistic: true,
      };

      // A. OPTIMISTIC UPDATE FOR COMMENTS LIST (for the current post/parent comment)
      queryClient.setQueryData(commentsQueryKey, (oldData) => {
        const newPages = oldData?.pages ? [...oldData.pages] : [];
        if (newPages.length === 0) {
          newPages.push({ comments: [], hasNextPage: false });
        }
        // Add new comment to the first page (assuming comments are ordered chronologically/reverse)
        newPages[0] = {
          ...newPages[0],
          comments: [...newPages[0].comments, newOptimisticComment].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          ),
        };
        return { ...oldData, pages: newPages };
      });

      // Helper to update commentsCount on a post object
      const updatePostCommentsCount = (post) => {
        const targetPost = post.repostedFrom ? post.repostedFrom : post;
        return post.repostedFrom
          ? {
              ...post,
              repostedFrom: {
                ...targetPost,
                commentsCount: (targetPost.commentsCount || 0) + 1,
              },
            }
          : {
              ...post,
              commentsCount: (targetPost.commentsCount || 0) + 1,
            };
      };

      // B. OPTIMISTIC UPDATE FOR SINGLE POST DETAIL PAGE (commentsCount)
      if (previousPostData) {
        queryClient.setQueryData(["post", postId], (oldPostData) => {
          if (!oldPostData) return oldPostData;
          return updatePostCommentsCount(oldPostData);
        });
      }

      // C. OPTIMISTIC UPDATE FOR ALL POSTS LIST (commentsCount)
      queryClient.setQueryData(["posts"], (oldData) => {
        if (!oldData || !Array.isArray(oldData.pages)) return oldData;
        const newPages = oldData.pages.map((page) => ({
          ...page,
          posts: page.posts.map((post) => {
            if (post._id === postId || post.repostedFrom?._id === postId) {
              return updatePostCommentsCount(post);
            }
            return post;
          }),
        }));
        return { ...oldData, pages: newPages };
      });

      // D. OPTIMISTIC UPDATE FOR BOOKMARKED POSTS LIST (commentsCount)
      queryClient.setQueryData(["bookmarkedPosts"], (oldData) => {
        if (!oldData || !Array.isArray(oldData.pages)) return oldData;
        const newPages = oldData.pages.map((page) => ({
          ...page,
          posts: page.posts.map((post) => {
            if (post._id === postId || post.repostedFrom?._id === postId) {
              return updatePostCommentsCount(post);
            }
            return post;
          }),
        }));
        return { ...oldData, pages: newPages };
      });

      // E. OPTIMISTIC UPDATE FOR PINNED POSTS LIST (commentsCount)
      queryClient.setQueryData(["pinnedPosts", currentUser.username], (oldData) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        return oldData.map((post) => {
          if (post._id === postId || post.repostedFrom?._id === postId) {
            return updatePostCommentsCount(post);
          }
          return post;
        });
      });

      // F. Optimistic update for parent comment repliesCount
      if (parentCommentId) {
        const parentCommentsListQueryKey = ["comments", postId];
        await queryClient.cancelQueries({ queryKey: parentCommentsListQueryKey });
        const previousParentCommentsData = queryClient.getQueryData(
          parentCommentsListQueryKey
        );

        if (previousParentCommentsData) {
          queryClient.setQueryData(
            parentCommentsListQueryKey,
            (oldParentCommentsData) => {
              if (!oldParentCommentsData) return oldParentCommentsData;
              const updatedPages = oldParentCommentsData.pages.map((page) => ({
                ...page,
                comments: page.comments.map((comment) =>
                  comment._id === parentCommentId
                    ? { ...comment, repliesCount: (comment.repliesCount || 0) + 1 }
                    : comment
                ),
              }));
              return { ...oldParentCommentsData, pages: updatedPages };
            }
          );
        }
      }

      return {
        previousComments,
        previousPostData,
        previousPostsData,
        previousBookmarkedPostsData,
        previousPinnedPostsData,
        previousParentCommentsData: parentCommentId
          ? queryClient.getQueryData(["comments", postId]) // This might be already captured above. Be careful not to overwrite.
          : undefined,
        newOptimisticCommentId: tempId,
      };
    },
    onSuccess: (newRealComment, variables, context) => {
      toast.success(parentCommentId ? "Reply added!" : "Comment added!");

      // Update the optimistic comment with real data
      queryClient.setQueryData(commentsQueryKey, (oldData) => {
        const newPages = oldData?.pages ? [...oldData.pages] : [];
        if (newPages.length === 0) {
          newPages.push({ comments: [], hasNextPage: false });
        }
        newPages[0] = {
          ...newPages[0],
          comments: newPages[0].comments.map((comment) =>
            comment._id === context.newOptimisticCommentId
              ? { ...newRealComment, isOptimistic: false }
              : comment
          ),
        };
        newPages[0].comments.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        return { ...oldData, pages: newPages };
      });

      // Invalidate all relevant queries to ensure fresh data and accurate counts
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarkedPosts"] });
      queryClient.invalidateQueries({ queryKey: ["pinnedPosts"] });
      if (parentCommentId) {
        queryClient.invalidateQueries({ queryKey: ["comments", postId] }); // Invalidate parent comments list
      }
    },
    onError: (error, variables, context) => {
      toast.error(error.message || "Failed to add comment.");
      // Rollback optimistic updates
      if (context.previousComments) {
        queryClient.setQueryData(commentsQueryKey, context.previousComments);
      }
      if (context.previousPostData) {
        queryClient.setQueryData(["post", postId], context.previousPostData);
      }
      if (context.previousPostsData) {
        queryClient.setQueryData(["posts"], context.previousPostsData);
      }
      if (context.previousBookmarkedPostsData) {
        queryClient.setQueryData(
          ["bookmarkedPosts"],
          context.previousBookmarkedPostsData
        );
      }
      if (context.previousPinnedPostsData && currentUser?.username) {
        queryClient.setQueryData(
          ["pinnedPosts", currentUser.username],
          context.previousPinnedPostsData
        );
      }
      if (parentCommentId && context.previousParentCommentsData) {
        queryClient.setQueryData(
          ["comments", postId],
          context.previousParentCommentsData
        );
      }
    },
  });

  return { createComment, isCreatingComment };
};
