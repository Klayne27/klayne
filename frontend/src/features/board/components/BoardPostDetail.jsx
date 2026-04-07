import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react"
import { IoChatbubbleSharp } from "react-icons/io5"
import { Link } from "react-router-dom"
import { useInView } from "react-intersection-observer"

import BoardCommentItem from "./BoardCommentItem"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { useBoardStore } from "../../../store/useBoardStore"
import { useGetBoardComments, useGetBoardPost } from "../boardHooks/boardQueries"
import {
  useDeleteBoardComment,
  useDeleteBoardPost,
  useEditBoardComment,
  useEditBoardPost,
  useReactToBoardComment,
  useReactToBoardPost,
} from "../boardHooks/boardMutations"
import LoadingSpinner from "../../../components/common/LoadingSpinner"
import { getOptimizedImageUrl } from "../../../utils/cloudinaryUtils"
import { formatPostDate } from "../../../utils/date"
import { renderClickableText } from "../../../utils/textUtils"
import { useMessagingMetaData } from "../../../hooks/customHooks/useMessagingMetaData"
import { useEmojiPickerPopover } from "../../../hooks/customHooks/useEmojiPickerPopover"
import { useMessageModalInteractions } from "../../../hooks/customHooks/useMessageModalInteractions"
import MessageActionsModal from "../../chat/common/components/MessageActionsModal"
import MessageReactions from "../../chat/common/components/MessageReactions"
import EmojiPickerPopover from "../../../components/common/EmojiPickerPopover"
import MoreMessageActionsModal from "../../chat/common/components/MoreMessageActionsModal"
import { useOpenMoreActionsModal } from "../../../hooks/customHooks/useOpenMoreActionsModal"
import ViewReactionsModal from "../../../components/common/ViewReactionsModal"
import { useProcessedMessage } from "../../../hooks/customHooks/useProcessedMessages"
import { useIsMobile } from "../../../hooks/customHooks/useIsMobile"
import MobileMessageActionsSlideUp from "../../chat/common/components/MobileMessageActionsSlideUp"
import SlideUpMenu, { SlideUpMenuContent } from "../../../components/common/SlideUpMenu"
import ReactionsSlideUpMenuContent from "../../../components/common/ReactionsSlideUpMenuContent"

import BoardPostInput from "./BoardPostInput"
import { PiSmiley } from "react-icons/pi"

const formatDateSeparator = (dateStr) => {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return "Today"
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday"
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

const toMessageShape = (post) => ({
  ...post,
  sender: post?.user, // useMessagingMetaData reads .sender
  text: post?.content, // cosmetic alias
  isDeletedByAdmin: post?.isDeletedByAdmin || false,
  isDeletedByUser: post?.isDeletedByUser || false,
})

const BoardPostDetail = ({ postId, onClose }) => {
  const { authUser } = useAuthUser()
  const replyingToComment = useBoardStore((s) => s.replyingToComment)
  const replyingToPost = useBoardStore((s) => s.replyingToPost)
  const activeCommentModalId = useBoardStore((s) => s.activeCommentModalId)
  const setActiveCommentModalId = useBoardStore((s) => s.setActiveCommentModalId)
  const setReplyingToPost = useBoardStore((s) => s.setReplyingToPost)
  const isPostSlideMenuOpen = useBoardStore((s) => s.isPostSlideMenuOpen)
  const postForSlideMenu = useBoardStore((s) => s.postForSlideMenu)
  const openPostSlideMenu = useBoardStore((s) => s.openPostSlideMenu)
  const closePostSlideMenu = useBoardStore((s) => s.closePostSlideMenu)
  const isEditingPostInline = useBoardStore((s) => s.isEditingPostInline)
  const setIsEditingPostInline = useBoardStore((s) => s.setIsEditingPostInline)

  const inlineTextareaRef = useRef(null)
  const floatingInputRef = useRef(null)
  const postRef = useRef(null)

  const [showViewReactionsModal, setShowViewReactionsModal] = useState(false)
  const [showSlideUpReactionsMenu, setShowSlideUpReactionsMenu] = useState(false)

  // const [isEditingPostInline, setIsEditingPostInline] = useState(false)
  const [inlinePostContent, setInlinePostContent] = useState("")

  const { post, isLoading } = useGetBoardPost(postId)
  const { editBoardPost, isEditingPost } = useEditBoardPost()

  const messageShape = toMessageShape(post)

  const { isSentByCurrentUser, isEditable, groupedReactions, hasAnyReactions } =
    useMessagingMetaData(messageShape, authUser)

  const moreEmojisButtonRef = useRef(null)
  const addReactionButtonRef = useRef(null)
  const commentRefs = useRef({})
  const isMobile = useIsMobile()
  const postMoreEmojisButtonRef = useRef(null)

  const {
    showEmojiPickerPopover,
    popoverPosition,
    handleOpenEmojiPickerPopover,
    handleCloseEmojiPickerPopover,
    setShowEmojiPickerPopover,
  } = useEmojiPickerPopover()

  // Replace the existing useMessageModalInteractions call for the post with:
  const {
    handleMouseEnter,
    handleMouseLeave,
    handleTouchStart: handlePostTouchStart,
    handleTouchEnd: handlePostTouchEnd,
    handleTouchMove: handlePostTouchMove,
    handleTouchCancel: handlePostTouchCancel,
    showModal,
  } = useMessageModalInteractions(
    post?._id,
    setActiveCommentModalId,
    activeCommentModalId,
    () => openPostSlideMenu(messageShape), // long press opens slide menu for the post
  )

  const {
    comments,
    isLoading: isLoadingComments,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetBoardComments(postId)

  const {
    moreActionsModalPosition,
    handleOpenMoreActionsModal,
    setShowMoreActionsModal,
    showMoreActionsModal,
  } = useOpenMoreActionsModal({ setShowEmojiPickerPopover, isEditable, post })

  const { deleteComment } = useDeleteBoardComment(postId)
  const { deleteBoardPost } = useDeleteBoardPost()
  const { reactToPost } = useReactToBoardPost()
  const { reactToComment } = useReactToBoardComment(postId)

  useLayoutEffect(() => {
    if (isEditingPostInline && inlineTextareaRef.current) {
      inlineTextareaRef.current.style.height = "auto"
      inlineTextareaRef.current.style.height = `${inlineTextareaRef.current.scrollHeight}px`
    }
  }, [inlinePostContent, isEditingPostInline])

  useEffect(() => {
    if (replyingToComment || replyingToPost) {
      setTimeout(() => floatingInputRef.current?.focus(), 0)
    }
  }, [replyingToComment, floatingInputRef, replyingToPost])

  useEffect(() => {
    if (isEditingPostInline && inlineTextareaRef.current) {
      const el = inlineTextareaRef.current

      el.focus()

      const length = el.value.length
      el.setSelectionRange(length, length)
    }
  }, [isEditingPostInline])

  const handleJumpToComment = useCallback((commentId) => {
    const node = commentRefs.current[commentId]
    if (!node) return
    node.scrollIntoView({ behavior: "smooth", block: "center" })
    node.classList.add("bg-primary/10")
    setTimeout(() => node.classList.remove("bg-primary/10"), 1500)
  }, [])

  const mappedForProcessing = comments.map((c) => ({ ...c, sender: c.user }))
  const processedComments = useProcessedMessage(mappedForProcessing, null)

  const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1 })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleInlinePostEmojiClick = (emojiObject) => {
    setInlinePostContent((prev) => prev + emojiObject.emoji)

    // Refocus and auto-resize
    setTimeout(() => {
      if (inlineTextareaRef.current) {
        inlineTextareaRef.current.focus()
        inlineTextareaRef.current.style.height = "auto"
        inlineTextareaRef.current.style.height = `${inlineTextareaRef.current.scrollHeight}px`
      }
    }, 0)
  }

  const handleJumpToPost = useCallback(() => {
    const node = postRef.current
    if (!node) return

    node.scrollIntoView({ behavior: "smooth", block: "center" })

    node.classList.add("bg-primary/10")
    setTimeout(() => node.classList.remove("bg-primary/10"), 1500)
  }, [])

  const handleReactionClick = (id, emoji) => {
    reactToPost({ id: id, emoji })
  }

  const handleCloseMoreActionsModal = () => {
    setShowMoreActionsModal(false)
  }

  const handleEmojiPickerSelect = (emojiData) => {
    reactToPost({ id: post._id, emoji: emojiData.emoji })
    handleCloseEmojiPickerPopover()
  }

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(post.content)
    setShowMoreActionsModal(false)
  }

  const handleDeleteOwnMessage = () => {
    deleteBoardPost(post._id)
    setShowMoreActionsModal(false)
  }

  const handleOpenViewReactionsModal = (e) => {
    e.stopPropagation()
    setShowMoreActionsModal(false)
    setShowViewReactionsModal(true)
  }

  const handleCloseViewReactionsModal = () => {
    setShowViewReactionsModal(false)
  }

  const handleOpenEditPost = () => {
    setInlinePostContent(post.content)
    setIsEditingPostInline(true)
    setShowMoreActionsModal(false)
  }

  const handleCancelEditPost = () => {
    setIsEditingPostInline(false)
  }

  const handleSaveEditPost = () => {
    if (!inlinePostContent.trim() || inlinePostContent.trim() === post.content) {
      handleCancelEditPost()
      return
    }
    editBoardPost(
      { id: postId, content: inlinePostContent },
      { onSuccess: () => setIsEditingPostInline(false) },
    )
  }

  const handleEditKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSaveEditPost()
    }
    if (e.key === "Escape") {
      handleCancelEditPost()
    }
  }

  const handleOpenSlideUpReactionsMenu = (e) => {
    // e.stopPropagation()
    setShowMoreActionsModal(false)
    setShowSlideUpReactionsMenu(true)
    closePostSlideMenu()
  }

  const handleCloseSlideUpReactionsMenu = () => {
    setShowSlideUpReactionsMenu(false)
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!post) return null

  const isBoardPostOwner = authUser?._id === post.user?._id || authUser?._id === post.user

  return (
    <div className="group relative flex h-full min-w-0 flex-col bg-base-100">
      {" "}
      {/* Scrollable Area */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Header */}
        <div className="mt-6 flex items-center gap-3 px-4 py-3">
          <h2 className="mb-4 flex flex-col gap-4 break-words text-4xl font-semibold leading-tight">
            <span>
              <IoChatbubbleSharp size={44} className="text-primary" />
            </span>
            {post.title}
            {post.isEdited && (
              <span className="text-sm font-normal italic text-slate-500">(edited)</span>
            )}
          </h2>
        </div>

        {/* Post body */}
        <div
          className="group relative mb-2 border-accent transition hover:bg-gray-700/10"
          onMouseEnter={!isEditingPostInline ? handleMouseEnter : undefined}
          onMouseLeave={!isEditingPostInline ? handleMouseLeave : undefined}
          onTouchStart={!isEditingPostInline ? handlePostTouchStart : undefined}
          onTouchEnd={!isEditingPostInline ? handlePostTouchEnd : undefined}
          onTouchMove={!isEditingPostInline ? handlePostTouchMove : undefined}
          onTouchCancel={!isEditingPostInline ? handlePostTouchCancel : undefined}
          ref={postRef}
        >
          <section className="p-4">
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

            {/* Content — editable inline when editing */}
            {isEditingPostInline ? (
              <div className="flex flex-col">
                {/* Container for Textarea and Emoji Button */}
                <div className="relative w-full">
                  <textarea
                    ref={inlineTextareaRef}
                    value={inlinePostContent}
                    onChange={(e) => setInlinePostContent(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    placeholder="Content"
                    className="w-full resize-none overflow-hidden break-words rounded-lg border border-primary/40 bg-base-200 py-2 pl-3 pr-10 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
                    disabled={isEditingPost}
                  />

                  {/* Floating Emoji Button */}
                  <div className="absolute right-2 top-2">
                    <button
                      type="button"
                      onClick={(e) => handleOpenEmojiPickerPopover(e)}
                      className="text-slate-500 transition-colors hover:text-primary"
                    >
                      <PiSmiley size={22} />
                    </button>

                    {/* Localized Popover */}
                    {showEmojiPickerPopover && (
                      <div className="absolute bottom-full right-0 z-50 mb-2">
                        <div
                          className="fixed inset-0 z-[-1]"
                          onClick={handleCloseEmojiPickerPopover}
                        />
                        <EmojiPickerPopover
                          position={popoverPosition}
                          onClose={handleCloseEmojiPickerPopover}
                          onEmojiClick={handleInlinePostEmojiClick}
                          triggerRef={moreEmojisButtonRef} // Optional based on your component needs
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
                  <span>
                    escape to{" "}
                    <button
                      type="button"
                      onClick={handleCancelEditPost}
                      className="text-primary hover:underline"
                    >
                      cancel
                    </button>
                    {" · "}enter to{" "}
                    <button
                      type="button"
                      onClick={handleSaveEditPost}
                      disabled={isEditingPost}
                      className="text-primary hover:underline disabled:opacity-50"
                    >
                      save
                    </button>
                  </span>
                </div>
              </div>
            ) : (
              <>
                {post.content && (
                  <p className="whitespace-pre-wrap break-words leading-relaxed">
                    {renderClickableText(post.content)}
                  </p>
                )}
                {post.images?.length > 0 && (
                  <div
                    className={`mt-3 grid gap-1 ${
                      post.images.length === 1
                        ? "grid-cols-1"
                        : post.images.length === 2
                          ? "grid-cols-2"
                          : post.images.length === 3
                            ? "grid-cols-2"
                            : "grid-cols-2"
                    }`}
                  >
                    {post.images.map((img, i) => (
                      <Link
                        key={img._id || i}
                        to={`/images/${img._id}`}
                        className={`relative overflow-hidden rounded-md border border-accent ${
                          post.images.length === 3 && i === 0 ? "col-span-2" : ""
                        }`}
                      >
                        <img
                          src={img.imageUrl}
                          alt={`post image ${i + 1}`}
                          className="aspect-square w-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                      </Link>
                    ))}
                  </div>
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
              </>
            )}
          </section>

          {/* Hide action bar while editing inline */}
          {!isEditingPostInline && (
            <>
              <MessageActionsModal
                message={messageShape}
                isSentByCurrentUser={false}
                showModal={showModal}
                messageContentStyle={{}}
                onReactionClick={handleReactionClick}
                moreEmojisButtonRef={moreEmojisButtonRef}
                handleOpenEmojiPickerPopover={handleOpenEmojiPickerPopover}
                onReplyClick={() => setReplyingToPost(true)}
                onOpenMoreActionsModal={handleOpenMoreActionsModal}
              />

              {showMoreActionsModal && (
                <MoreMessageActionsModal
                  message={messageShape}
                  onCloseMoreActionsModal={handleCloseMoreActionsModal}
                  moreActionsModalPosition={moreActionsModalPosition}
                  onReplyClick={() => setReplyingToPost(true)}
                  onEditClick={handleOpenEditPost} // ← opens inline edit
                  onCopyMessage={handleCopyMessage}
                  onDeleteOwnMessage={handleDeleteOwnMessage}
                  reactToComment={reactToPost}
                  isEditable={isEditable}
                  isSentByCurrentUser={isSentByCurrentUser}
                  onOpenViewReactionsModal={handleOpenViewReactionsModal}
                  isBoardPostOwner={isBoardPostOwner}
                  postId={postId}
                />
              )}
            </>
          )}
        </div>
        <div className="border-b-8 border-t border-accent">
          {/* Reactions row */}
          {hasAnyReactions && (
            <div className="p-2">
              <MessageReactions
                groupedReactions={groupedReactions}
                currentUser={authUser}
                isSentByCurrentUser={false}
                messageContentStyle={{}}
                addReactionButtonRef={addReactionButtonRef}
                handleOpenEmojiPickerPopover={handleOpenEmojiPickerPopover}
                message={messageShape}
                onReactionClick={handleReactionClick}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col">
          {isLoadingComments ? (
            <div className="flex justify-center py-6">
              <LoadingSpinner size="md" />
            </div>
          ) : processedComments.length === 0 ? (
            <p className="py-12 text-center text-sm italic text-gray-500">
              No comments yet. Start the conversation!
            </p>
          ) : (
            <>
              {processedComments.map((comment) => (
                <div
                  key={comment._id}
                  ref={(el) => {
                    commentRefs.current[comment._id] = el
                  }}
                  className="transition-colors duration-500"
                >
                  {/* Date separator */}
                  {comment.isNewDay && (
                    <div className="relative my-4 flex items-center px-4">
                      <div className="flex-1 border-t border-accent" />
                      <span className="mx-3 flex-shrink-0 text-xs font-semibold text-slate-500">
                        {formatDateSeparator(comment.createdAt)}
                      </span>
                      <div className="flex-1 border-t border-accent" />
                    </div>
                  )}
                  <BoardCommentItem
                    comment={comment}
                    boardPostId={postId}
                    post={post}
                    onReact={reactToComment}
                    onDelete={deleteComment}
                    onJumpToComment={handleJumpToComment}
                    onJumpToPost={handleJumpToPost}
                  />
                </div>
              ))}

              {/* Auto-load sentinel — replaces the "Load more" button */}
              <div ref={loadMoreRef} className="py-2 text-center">
                {isFetchingNextPage && <LoadingSpinner size="sm" />}
              </div>
            </>
          )}
        </div>
      </div>
      {/* FLOATING INPUT BAR */}
      {authUser && <BoardPostInput post={post} floatingInputRef={floatingInputRef} />}
      {/* Emoji picker portal */}
      {showEmojiPickerPopover && (
        <EmojiPickerPopover
          position={popoverPosition}
          onClose={handleCloseEmojiPickerPopover}
          onEmojiClick={handleEmojiPickerSelect}
          triggerRef={moreEmojisButtonRef}
        />
      )}
      <SlideUpMenu isOpen={showSlideUpReactionsMenu} onClose={handleCloseSlideUpReactionsMenu}>
        <SlideUpMenuContent
          className="flex h-[50vh] w-full flex-col overflow-y-auto"
          disablePullToRefresh={true}
        >
          <ReactionsSlideUpMenuContent
            reactions={post.reactions ? post.reactions : []}
            onClose={handleCloseViewReactionsModal}
          />
        </SlideUpMenuContent>
      </SlideUpMenu>
      {showViewReactionsModal && (
        <ViewReactionsModal
          isOpen={showViewReactionsModal}
          onClose={handleCloseViewReactionsModal}
          reactions={post.reactions ? post.reactions : []}
        />
      )}
      {isMobile && post && (
        <MobileMessageActionsSlideUp
          isOpen={isPostSlideMenuOpen && postForSlideMenu?._id === post._id}
          onClose={closePostSlideMenu}
          message={messageShape}
          isBoardPostOwner={isBoardPostOwner}
          isEditable={isEditable}
          isSentByCurrentUser={isSentByCurrentUser}
          onReactionClick={(_, emoji) => reactToPost({ id: post._id, emoji })}
          onReplyClick={() => {
            setReplyingToPost(true)
            closePostSlideMenu()
          }}
          onEditClick={() => {
            handleOpenEditPost()
            closePostSlideMenu()
          }}
          onCopyMessage={() => {
            navigator.clipboard.writeText(post.content)
            closePostSlideMenu()
          }}
          onDeleteOwnMessage={() => {
            deleteBoardPost(post._id)
            closePostSlideMenu()
          }}
          handleOpenEmojiPickerPopover={handleOpenEmojiPickerPopover}
          moreEmojisButtonRef={postMoreEmojisButtonRef}
          // onOpenSlideUpReactionsMenu={(e) => {
          //   e.stopPropagation()
          //   closePostSlideMenu()
          // }}
          onOpenSlideUpReactionsMenu={handleOpenSlideUpReactionsMenu}
          postId={postId}
        />
      )}
    </div>
  )
}

export default BoardPostDetail
