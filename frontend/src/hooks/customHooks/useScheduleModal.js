import { useCallback } from "react"
import { usePostModalStore } from "../../store/usePostModalStore"

export const useScheduleModal = () => {
  const {
    scheduledAt,
    showSchedulePostModal,
    isScheduledPostsModalOpen,
    isEditScheduledPostModalOpen,
    postToEdit,
    setScheduledAt,
    setShowSchedulePostModal,
    setIsScheduledPostsModalOpen,
    setIsEditScheduledPostModalOpen,
    setPostToEdit,
    clearConflictingStates,
  } = usePostModalStore()

  const openScheduleModal = useCallback(() => {
    setShowSchedulePostModal(true)
    clearConflictingStates(["schedule"])
  }, [setShowSchedulePostModal, clearConflictingStates])

  const closeScheduleModal = useCallback(() => {
    setShowSchedulePostModal(false)
  }, [setShowSchedulePostModal])

  const handleScheduleConfirm = useCallback(
    (isoDateTime) => {
      setScheduledAt(isoDateTime)
      setShowSchedulePostModal(false)
    },
    [setScheduledAt, setShowSchedulePostModal],
  )

  const removeSchedule = useCallback(() => {
    setScheduledAt(null)
    setShowSchedulePostModal(false)
  }, [setScheduledAt, setShowSchedulePostModal])

  const openScheduledPostsList = useCallback(() => {
    setIsScheduledPostsModalOpen(true)
    setShowSchedulePostModal(false)
    setIsEditScheduledPostModalOpen(false)
    setPostToEdit(null)
  }, [
    setIsScheduledPostsModalOpen,
    setShowSchedulePostModal,
    setIsEditScheduledPostModalOpen,
    setPostToEdit,
  ])

  const closeScheduledPostsList = useCallback(() => {
    setIsScheduledPostsModalOpen(false)
    setShowSchedulePostModal(true)
  }, [setIsScheduledPostsModalOpen, setShowSchedulePostModal])

  const selectPostForEdit = useCallback(
    (post) => {
      setIsScheduledPostsModalOpen(false)
      setPostToEdit(post)
      setIsEditScheduledPostModalOpen(true)
    },
    [setIsScheduledPostsModalOpen, setPostToEdit, setIsEditScheduledPostModalOpen],
  )

  const closeEditModal = useCallback(() => {
    setIsEditScheduledPostModalOpen(false)
    setPostToEdit(null)
    setIsScheduledPostsModalOpen(true)
  }, [setIsEditScheduledPostModalOpen, setPostToEdit, setIsScheduledPostsModalOpen])

  return {
    scheduledAt,
    showSchedulePostModal,
    isScheduledPostsModalOpen,
    isEditScheduledPostModalOpen,
    postToEdit,
    openScheduleModal,
    closeScheduleModal,
    handleScheduleConfirm,
    removeSchedule,
    openScheduledPostsList,
    closeScheduledPostsList,
    selectPostForEdit,
    closeEditModal,
  }
}
