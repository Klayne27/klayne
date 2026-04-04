import PostModal from "./PostModal"
import { useAppStore } from "../../../store/useAppStore"

function CreatePostModal() {
  const { showCreatePostModal, setShowCreatePostModal } = useAppStore()

  return (
    <>
      <button onClick={() => setShowCreatePostModal(true)}>Create Post</button>
      {showCreatePostModal && (
        <PostModal mode="create" onClose={() => setShowCreatePostModal(false)} />
      )}
    </>
  )
}

export default CreatePostModal
