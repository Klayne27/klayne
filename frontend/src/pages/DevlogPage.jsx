import { useState } from "react"
import { useGetDevlogs } from "../features/devlog/devlogHooks/useGetDevlogs"
import {
  useCreateDevlog,
  useUpdateDevlog,
  useDeleteDevlog,
} from "../features/devlog/devlogHooks/useDevlogMutations"
import { useAuthUser } from "../features/auth/authHooks/useAuthUser"
import LoadingSpinner from "../components/common/LoadingSpinner"
import DevlogFormModal from "../features/devlog/DevlogFormModal"
import DevlogCard from "../features/devlog/DevlogCard"

// ── Page ──────────────────────────────────────────────────────────────────────
const DevlogPage = () => {
  const { authUser } = useAuthUser()
  const isAdmin = authUser?.isAdmin

  const { devlogs, totalCount, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useGetDevlogs()

  const { mutate: createDevlog, isPending: isCreating } = useCreateDevlog()
  const { mutate: updateDevlog, isPending: isUpdating } = useUpdateDevlog()
  const { mutate: deleteDevlog } = useDeleteDevlog()

  const [modal, setModal] = useState(null) // null | { mode: 'create' } | { mode: 'edit', devlog }

  const handleEdit = (devlog) => setModal({ mode: "edit", devlog })
  const handleCreate = () => setModal({ mode: "create" })
  const handleClose = () => setModal(null)

  const handleDelete = (id) => {
    if (window.confirm("Delete this devlog?")) deleteDevlog(id)
  }

  const handleCreateSubmit = (payload) => {
    createDevlog(payload, { onSuccess: handleClose })
  }

  const handleUpdateSubmit = (payload) => {
    updateDevlog(payload, { onSuccess: handleClose })
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* sticky header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-accent bg-base-100/80 px-4 py-3 backdrop-blur">
        <div>
          <h1 className="text-base font-black tracking-tight">Devlog</h1>
          {totalCount > 0 && (
            <p className="mt-0.5 text-xs text-base-content/40">{totalCount} entries</p>
          )}
        </div>
        {isAdmin && (
          <button onClick={handleCreate} className="btn btn-primary btn-sm gap-1">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Entry
          </button>
        )}
      </div>

      {/* content */}
      <div className="flex-1 p-4">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : devlogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-base-content/30">
            <svg
              className="h-12 w-12"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm font-medium">No devlogs yet</p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {devlogs.map((devlog) => (
              <DevlogCard
                key={devlog._id}
                devlog={devlog}
                isAdmin={isAdmin}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}

            {hasNextPage && (
              <button
                onClick={fetchNextPage}
                disabled={isFetchingNextPage}
                className="btn btn-ghost btn-sm mx-auto mt-2"
              >
                {isFetchingNextPage ? <LoadingSpinner size="xs" /> : "Load more"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* modal */}
      {modal && (
        <DevlogFormModal
          initial={modal.mode === "edit" ? modal.devlog : undefined}
          onClose={handleClose}
          onCreate={handleCreateSubmit}
          onUpdate={handleUpdateSubmit}
          isPending={isCreating || isUpdating}
        />
      )}
    </div>
  )
}

export default DevlogPage
