import { useAppStore } from "../../../store/useAppStore"
import PostModal from "./PostModal"

function EditPostModal({post}) {
  const { showEditPostModal, setShowEditPostModal } = useAppStore()

  return (
    <>
      {showEditPostModal && (
        <PostModal
          mode="edit"
          editPost={post}
          title="Edit Your Post"
          onClose={() => setShowEditPostModal(false)}
        />
      )}
    </>
  )
}

export default EditPostModal
