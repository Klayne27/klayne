import { useState, useRef } from "react"
import { FaArrowLeft, FaTrashCan } from "react-icons/fa6"
import { Link } from "react-router-dom"
import { useGetBoardComments, useGetBoardPost } from "../boardHooks/boardQueries"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import {
  useCreateBoardComment,
  useDeleteBoardComment,
  useDeleteBoardPost,
  useReactToBoardComment,
  useReactToBoardPost,
} from "../boardHooks/boardMutations"
import LoadingSpinner from "../../../components/common/LoadingSpinner"
import { getOptimizedImageUrl } from "../../../utils/cloudinaryUtils"
import { formatPostDate } from "../../../utils/date"
import { renderClickableText } from "../../../utils/textUtils"
import { useAppStore } from "../../../store/useAppStore"
import { IoClose } from "react-icons/io5"
import { BiImageAdd } from "react-icons/bi"

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "👀"]

const ReactionBar = ({ reactions, onReact, currentUserId }) => (
  <div className="mt-2 flex flex-wrap items-center gap-1">
    {reactions?.map((r) => {
      const reacted = r.users.some((u) => (u?._id || u)?.toString() === currentUserId)
      return (
        <button
          key={r.emoji}
          onClick={() => onReact(r.emoji)}
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-sm transition ${
            reacted ? "bg-primary/20 text-primary" : "bg-gray-700/40 hover:bg-gray-700/70"
          }`}
        >
          <span>{r.emoji}</span>
          <span className="text-xs">{r.users.length}</span>
        </button>
      )
    })}
    <div className="relative">
      <EmojiPicker onPick={onReact} />
    </div>
  </div>
)

const EmojiPicker = ({ onPick }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full bg-gray-700/40 px-2 py-0.5 text-sm hover:bg-gray-700/70"
      >
        +
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 flex gap-1 rounded-xl border border-accent bg-base-100 p-2 shadow-lg">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                onClick={() => {
                  onPick(e)
                  setOpen(false)
                }}
                className="rounded p-1 text-lg hover:bg-gray-700/40"
              >
                {e}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const BoardPostDetail = ({ postId, onClose }) => {
  const { authUser } = useAuthUser()
  const { post, isLoading } = useGetBoardPost(postId)
  const openImageModal = useAppStore((state) => state.openImageModal)
  const {
    comments,
    isLoading: isLoadingComments,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetBoardComments(postId)
  const { createComment, isCreatingComment } = useCreateBoardComment(postId)
  const { deleteComment } = useDeleteBoardComment(postId)
  const { deleteBoardPost } = useDeleteBoardPost()
  const { reactToPost } = useReactToBoardPost()
  const { reactToComment } = useReactToBoardComment(postId)

  const [commentInput, setCommentInput] = useState("")
  const [previewImg, setPreviewImg] = useState(null)
  const [imgBase64, setImgBase64] = useState(null)
  const commentRef = useRef(null)
  const fileRef = useRef(null)

  const handleSubmitComment = (e) => {
    e.preventDefault()
    if (!commentInput.trim()) return
    createComment(
      { content: commentInput, img: imgBase64 },
      {
        onSuccess: () => setCommentInput(""),
      },
    )
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPreviewImg(URL.createObjectURL(file))
    const reader = new FileReader()
    reader.onloadend = () => setImgBase64(reader.result)
    reader.readAsDataURL(file)
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!post) return null

  const isOwner = authUser?._id === post.user?._id || authUser?._id === post.user

  return (
    <div className="flex h-full flex-col">
      {/* Detail header */}
      <div className="flex items-center gap-3 border-b border-accent px-4 py-3">
        <button
          onClick={onClose}
          className="flex-shrink-0 rounded-full p-2 transition hover:bg-gray-800 md:hidden"
        >
          <FaArrowLeft className="h-4 w-4" />
        </button>
        <h2 className="flex-1 truncate text-lg font-bold">{post.title}</h2>
        {(isOwner || authUser?.isAdmin) && (
          <button
            onClick={() => {
              deleteBoardPost(postId)
              onClose()
            }}
            className="rounded-full p-2 text-red-500 transition hover:bg-red-500/10"
          >
            <FaTrashCan size={14} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Post body */}
        <div className="border-b border-accent px-4 py-4">
          <div className="mb-3 flex items-center gap-2">
            <Link to={`/profile/${post.user?.username}`}>
              <img
                src={getOptimizedImageUrl(post.user?.profileImg?.imageUrl, "avatar")}
                className="h-9 w-9 rounded-full object-cover"
                alt={post.user?.username}
              />
            </Link>
            <div>
              <Link to={`/profile/${post.user?.username}`} className="font-bold hover:underline">
                {post.user?.fullName}
              </Link>
              <p className="text-xs text-slate-500">
                @{post.user?.username} · {formatPostDate(post.createdAt)}
              </p>
            </div>
          </div>

          {post.content && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {renderClickableText(post.content)}
            </p>
          )}

          {post.image?.imageUrl && (
            <Link to={`/images/${post.image?._id}`}>
              <img
                src={post.image.imageUrl}
                alt="post"
                className="mt-3 max-h-80 w-full rounded-2xl border border-accent object-contain"
              />
            </Link>
          )}

          {post.tags?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <ReactionBar
            reactions={post.reactions}
            onReact={(emoji) => reactToPost({ id: postId, emoji })}
            currentUserId={authUser?._id}
          />
        </div>

        {/* Comments */}
        <div className="flex flex-col">
          {isLoadingComments ? (
            <div className="flex justify-center py-6">
              <LoadingSpinner size="md" />
            </div>
          ) : comments.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No comments yet.</p>
          ) : (
            comments.map((comment) => (
              <div key={comment._id} className="border-b border-accent px-4 py-3">
                <div className="flex items-start gap-2">
                  <Link to={`/profile/${comment.user?.username}`}>
                    <img
                      src={getOptimizedImageUrl(comment.user?.profileImg?.imageUrl, "avatar")}
                      className="mt-0.5 h-8 w-8 flex-shrink-0 rounded-full object-cover"
                      alt={comment.user?.username}
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/profile/${comment.user?.username}`}
                          className="text-sm font-bold hover:underline"
                        >
                          {comment.user?.fullName}
                        </Link>
                        <span className="text-xs text-slate-500">
                          · {formatPostDate(comment.createdAt)}
                        </span>
                      </div>
                      {(authUser?._id === comment.user?._id || authUser?.isAdmin) && (
                        <button
                          onClick={() => deleteComment(comment._id)}
                          className="text-slate-500 transition hover:text-red-500"
                        >
                          <FaTrashCan size={12} />
                        </button>
                      )}
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm">{comment.content}</p>
                    {comment.image?.imageUrl && (
                      <img
                        src={comment.image.imageUrl}
                        className="mt-2 max-h-48 rounded-xl border border-accent object-contain"
                        alt="comment"
                      />
                    )}
                    <ReactionBar
                      reactions={comment.reactions}
                      onReact={(emoji) => reactToComment({ commentId: comment._id, emoji })}
                      currentUserId={authUser?._id}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="py-3 text-center text-sm text-primary hover:underline"
            >
              {isFetchingNextPage ? <LoadingSpinner size="sm" /> : "Load more comments"}
            </button>
          )}
        </div>
      </div>

      {/* Comment input */}
      {authUser && (
        <form onSubmit={handleSubmitComment} className="border-t border-accent p-3">
          <div className="flex items-center gap-2">
            <img
              src={getOptimizedImageUrl(authUser?.profileImg?.imageUrl, "avatar")}
              className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
              alt="you"
            />
            <input
              ref={commentRef}
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 rounded-full bg-gray-700/30 px-4 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={isCreatingComment}
            />
            {previewImg && (
              <div className="relative w-fit">
                <img
                  src={previewImg}
                  className="max-h-40 rounded-xl object-contain"
                  alt="preview"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPreviewImg(null)
                    setImgBase64(null)
                  }}
                  className="absolute -right-2 -top-2 rounded-full bg-slate-600 p-1 text-white hover:bg-slate-500"
                >
                  <IoClose size={14} />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1 text-primary transition hover:text-primary/80"
            >
              <BiImageAdd size={22} />
            </button>
            <input type="file" accept="image/*" hidden ref={fileRef} onChange={handleImageChange} />
            <button
              type="submit"
              disabled={isCreatingComment || !commentInput.trim()}
              className="flex-shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary/80 disabled:bg-slate-600 disabled:text-black"
            >
              {isCreatingComment ? <LoadingSpinner size="xs" /> : "Post"}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default BoardPostDetail
