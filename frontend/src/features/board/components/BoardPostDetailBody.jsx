// import { useEffect, useLayoutEffect, useRef, useState } from "react"
// import { useEditBoardComment, useEditBoardPost } from "../boardHooks/boardMutations"
// import { useOpenMoreActionsModal } from "../../../hooks/customHooks/useOpenMoreActionsModal"
// import { useEmojiPickerPopover } from "../../../hooks/customHooks/useEmojiPickerPopover"
// import { useMessagingMetaData } from "../../../hooks/customHooks/useMessagingMetaData"
// import { useAuthUser } from "../../auth/authHooks/useAuthUser"

// const toMessageShape = (post) => ({
//   ...post,
//   sender: post?.user, // useMessagingMetaData reads .sender
//   text: post?.content, // cosmetic alias
//   isDeletedByAdmin: post?.isDeletedByAdmin || false,
//   isDeletedByUser: post?.isDeletedByUser || false,
// })

// function BoardPostDetailBody() {
//   const { authUser } = useAuthUser()

//   const { editComment, isEditingComment } = useEditBoardComment(postId)
//   const { editBoardPost, isEditingPost } = useEditBoardPost()

//   const [editInput, setEditInput] = useState("")
//   const [editPostContent, setEditPostContent] = useState("")
//   const [isEditingPostInline, setIsEditingPostInline] = useState(false)
//   const [inlinePostContent, setInlinePostContent] = useState("")

//   const inlineTextareaRef = useRef(null)

//   const messageShape = toMessageShape(post)

//   const { isSentByCurrentUser, isEditable, groupedReactions, hasAnyReactions } =
//     useMessagingMetaData(messageShape, authUser)

//   const {
//     showEmojiPickerPopover,
//     popoverPosition,
//     handleOpenEmojiPickerPopover,
//     handleCloseEmojiPickerPopover,
//     setShowEmojiPickerPopover,
//   } = useEmojiPickerPopover()

//   const {
//     moreActionsModalPosition,
//     handleOpenMoreActionsModal,
//     setShowMoreActionsModal,
//     showMoreActionsModal,
//   } = useOpenMoreActionsModal({ setShowEmojiPickerPopover, isEditable, post })

//   useLayoutEffect(() => {
//     if (isEditingPostInline && inlineTextareaRef.current) {
//       inlineTextareaRef.current.style.height = "auto"
//       inlineTextareaRef.current.style.height = `${inlineTextareaRef.current.scrollHeight}px`
//     }
//   }, [inlinePostContent, isEditingPostInline])

//   useEffect(() => {
//     if (isEditingPostInline && inlineTextareaRef.current) {
//       const el = inlineTextareaRef.current

//       el.focus()

//       const length = el.value.length
//       el.setSelectionRange(length, length)
//     }
//   }, [isEditingPostInline])

//   const handleInlinePostEmojiClick = (emojiObject) => {
//     setInlinePostContent((prev) => prev + emojiObject.emoji)

//     // Refocus and auto-resize
//     setTimeout(() => {
//       if (inlineTextareaRef.current) {
//         inlineTextareaRef.current.focus()
//         inlineTextareaRef.current.style.height = "auto"
//         inlineTextareaRef.current.style.height = `${inlineTextareaRef.current.scrollHeight}px`
//       }
//     }, 0)
//   }

//   const handleCloseMoreActionsModal = () => {
//     setShowMoreActionsModal(false)
//   }

//   const handleCopyMessage = () => {
//     navigator.clipboard.writeText(post.content)
//     setShowMoreActionsModal(false)
//   }

//   const handleOpenEditPost = () => {
//     setInlinePostContent(post.content)
//     setIsEditingPostInline(true)
//     setShowMoreActionsModal(false)
//   }

//   const handleDeleteOwnMessage = () => {
//     deleteBoardPost(post._id)
//     setShowMoreActionsModal(false)
//   }

//   const handleOpenViewReactionsModal = (e) => {
//     e.stopPropagation()
//     setShowMoreActionsModal(false)
//     setShowViewReactionsModal(true)
//   }

//   const handleCancelEditPost = () => {
//     setIsEditingPostInline(false)
//   }

//   const handleSaveEditPost = () => {
//     if (!inlinePostContent.trim() || inlinePostContent.trim() === post.content) {
//       handleCancelEditPost()
//       return
//     }
//     editBoardPost(
//       { id: postId, content: inlinePostContent },
//       { onSuccess: () => setIsEditingPostInline(false) },
//     )
//   }

//   const handleEditKeyDown = (e) => {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault()
//       handleSaveEditPost()
//     }
//     if (e.key === "Escape") {
//       handleCancelEditPost()
//     }
//   }

//   return (
//     <div
//       className="group relative mb-2 border-accent transition hover:bg-gray-700/10"
//       onMouseEnter={!isEditingPostInline ? handleMouseEnter : undefined}
//       onMouseLeave={!isEditingPostInline ? handleMouseLeave : undefined}
//       onTouchStart={!isEditingPostInline ? handlePostTouchStart : undefined}
//       onTouchEnd={!isEditingPostInline ? handlePostTouchEnd : undefined}
//       onTouchMove={!isEditingPostInline ? handlePostTouchMove : undefined}
//       onTouchCancel={!isEditingPostInline ? handlePostTouchCancel : undefined}
//     >
//       <section className="p-4">
//         <div className="mb-3 flex items-center gap-2">
//           <Link to={`/profile/${post.user?.username}`}>
//             <img
//               src={getOptimizedImageUrl(post.user?.profileImg?.imageUrl, "avatar")}
//               className="h-9 w-9 rounded-full object-cover"
//               alt={post.user?.username}
//             />
//           </Link>
//           <div>
//             <Link to={`/profile/${post.user?.username}`} className="font-bold hover:underline">
//               {post.user?.fullName}
//             </Link>
//             <p className="text-xs text-slate-500">
//               @{post.user?.username} · {formatPostDate(post.createdAt)}
//             </p>
//           </div>
//         </div>

//         {/* Content — editable inline when editing */}
//         {isEditingPostInline ? (
//           <div className="flex flex-col">
//             {/* Container for Textarea and Emoji Button */}
//             <div className="relative w-full">
//               <textarea
//                 ref={inlineTextareaRef}
//                 value={inlinePostContent}
//                 onChange={(e) => setInlinePostContent(e.target.value)}
//                 onKeyDown={handleEditKeyDown}
//                 placeholder="Content"
//                 className="w-full resize-none overflow-hidden break-words rounded-lg border border-primary/40 bg-base-200 py-2 pl-3 pr-10 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
//                 disabled={isEditingPost}
//               />

//               {/* Floating Emoji Button */}
//               <div className="absolute right-2 top-2">
//                 <button
//                   type="button"
//                   onClick={(e) => handleOpenEmojiPickerPopover(e)}
//                   className="text-slate-500 transition-colors hover:text-primary"
//                 >
//                   <PiSmiley size={22} />
//                 </button>

//                 {/* Localized Popover */}
//                 {showEmojiPickerPopover && (
//                   <div className="absolute bottom-full right-0 z-50 mb-2">
//                     <div className="fixed inset-0 z-[-1]" onClick={handleCloseEmojiPickerPopover} />
//                     <EmojiPickerPopover
//                       position={popoverPosition}
//                       onClose={handleCloseEmojiPickerPopover}
//                       onEmojiClick={handleInlinePostEmojiClick}
//                       triggerRef={null} // Optional based on your component needs
//                     />
//                   </div>
//                 )}
//               </div>
//             </div>

//             {/* Footer Actions */}
//             <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
//               <span>
//                 escape to{" "}
//                 <button
//                   type="button"
//                   onClick={handleCancelEditPost}
//                   className="text-primary hover:underline"
//                 >
//                   cancel
//                 </button>
//                 {" · "}enter to{" "}
//                 <button
//                   type="button"
//                   onClick={handleSaveEditPost}
//                   disabled={isEditingPost}
//                   className="text-primary hover:underline disabled:opacity-50"
//                 >
//                   save
//                 </button>
//               </span>
//             </div>
//           </div>
//         ) : (
//           <>
//             {post.content && (
//               <p className="whitespace-pre-wrap break-words leading-relaxed">
//                 {renderClickableText(post.content)}
//               </p>
//             )}
//             {post.images?.length > 0 && (
//               <div
//                 className={`mt-3 grid gap-1 ${
//                   post.images.length === 1
//                     ? "grid-cols-1"
//                     : post.images.length === 2
//                       ? "grid-cols-2"
//                       : post.images.length === 3
//                         ? "grid-cols-2"
//                         : "grid-cols-2"
//                 }`}
//               >
//                 {post.images.map((img, i) => (
//                   <Link
//                     key={img._id || i}
//                     to={`/images/${img._id}`}
//                     className={`relative overflow-hidden rounded-md border border-accent ${
//                       post.images.length === 3 && i === 0 ? "col-span-2" : ""
//                     }`}
//                   >
//                     <img
//                       src={img.imageUrl}
//                       alt={`post image ${i + 1}`}
//                       className="aspect-square w-full object-cover transition-transform duration-300 hover:scale-105"
//                     />
//                   </Link>
//                 ))}
//               </div>
//             )}
//             {post.tags?.length > 0 && (
//               <div className="mt-3 flex flex-wrap gap-1">
//                 {post.tags.map((tag) => (
//                   <span
//                     key={tag}
//                     className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
//                   >
//                     #{tag}
//                   </span>
//                 ))}
//               </div>
//             )}
//           </>
//         )}
//       </section>

//       {/* Hide action bar while editing inline */}
//       {!isEditingPostInline && (
//         <>
//           <MessageActionsModal
//             message={messageShape}
//             isSentByCurrentUser={false}
//             showModal={showModal}
//             messageContentStyle={{}}
//             onReactionClick={handleReactionClick}
//             moreEmojisButtonRef={moreEmojisButtonRef}
//             handleOpenEmojiPickerPopover={handleOpenEmojiPickerPopover}
//             onReplyClick={() => setReplyingToPost(true)}
//             onOpenMoreActionsModal={handleOpenMoreActionsModal}
//           />

//           {showMoreActionsModal && (
//             <MoreMessageActionsModal
//               message={messageShape}
//               onCloseMoreActionsModal={handleCloseMoreActionsModal}
//               moreActionsModalPosition={moreActionsModalPosition}
//               onReplyClick={() => setReplyingToPost(true)}
//               onEditClick={handleOpenEditPost} // ← opens inline edit
//               onCopyMessage={handleCopyMessage}
//               onDeleteOwnMessage={handleDeleteOwnMessage}
//               reactToComment={reactToPost}
//               isEditable={isEditable}
//               isSentByCurrentUser={isSentByCurrentUser}
//               onOpenViewReactionsModal={handleOpenViewReactionsModal}
//               isBoardPostOwner={isBoardPostOwner}
//               postId={postId}
//             />
//           )}
//         </>
//       )}
//     </div>
//   )
// }

// export default BoardPostDetailBody
