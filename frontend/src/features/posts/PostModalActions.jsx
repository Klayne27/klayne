import { TbCalendarClock } from "react-icons/tb"
import EmojiPickerPopover from "../../components/common/EmojiPickerPopover"
import { PiSmiley } from "react-icons/pi"
import { BiImageAdd, BiPoll } from "react-icons/bi"

export const PostModalActions = ({
  feedType,
  showPollInputs,
  scheduledAt,
  selectedFile,
  isAnonymous,
  setIsAnonymous,
  fileInputRef,
  emojiButtonRef,
  showEmojiPickerPopover,
  popoverPosition,
  onFileInputClick,
  onPollClick,
  onEmojiClick,
  onScheduleClick,
  onCloseEmojiPicker,
  onEmojiSelect,
  onFileChange,
}) => {
  if (feedType === "venting") {
    return (
      <div className="flex w-full items-center justify-between gap-1 pr-2">
        <div className="flex gap-1">
          {!showPollInputs && !scheduledAt && (
            <BiImageAdd
              className="h-6 w-6 cursor-pointer text-primary hover:text-primary/80"
              onClick={onFileInputClick}
              title="Add image or video"
              aria-label="Add image or video"
            />
          )}

          {!selectedFile && !scheduledAt && (
            <BiPoll
              className="size-6 cursor-pointer text-primary hover:text-primary/80"
              onClick={onPollClick}
              title="Add a poll"
              aria-label="Add a poll"
            />
          )}

          <input type="file" accept="image/*,video/*" hidden ref={fileInputRef} />

          <div className="relative">
            <PiSmiley
              ref={emojiButtonRef}
              className="hidden cursor-pointer text-primary hover:text-primary/80 md:block"
              size={22}
              onClick={onEmojiClick}
              strokeWidth={10}
              title="Choose an emoji"
              aria-label="Choose an emoji"
            />
            {showEmojiPickerPopover && (
              <>
                <div
                  className="fixed inset-0 z-10 cursor-default bg-transparent"
                  onClick={onCloseEmojiPicker}
                />
                <div className="absolute -left-40 bottom-full z-10">
                  <EmojiPickerPopover
                    position={popoverPosition}
                    onClose={onCloseEmojiPicker}
                    onEmojiClick={onEmojiSelect}
                    triggerRef={emojiButtonRef}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500 md:text-sm">
          <input
            type="checkbox"
            className="checkbox-primary checkbox checkbox-xs"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
          />
          Post Anonymously
        </label>
      </div>
    )
  }

  return (
    <div className="ml-[52px] flex items-center gap-1">
      {!showPollInputs && !scheduledAt && (
        <BiImageAdd
          className="h-6 w-6 cursor-pointer text-primary hover:text-primary/80"
          onClick={onFileInputClick}
          title="Add image or video"
          aria-label="Add image or video"
        />
      )}

      <input
        type="file"
        accept="image/*,video/*"
        hidden
        ref={fileInputRef}
        onChange={onFileChange}
      />

      {!selectedFile && !scheduledAt && (
        <BiPoll
          className="size-6 cursor-pointer text-primary hover:text-primary/80"
          onClick={onPollClick}
          title="Add a poll"
          aria-label="Add a poll"
        />
      )}

      <div className="relative">
        <PiSmiley
          ref={emojiButtonRef}
          className="hidden cursor-pointer text-primary hover:text-primary/80 md:block"
          size={22}
          onClick={onEmojiClick}
          strokeWidth={10}
          title="Choose an emoji"
          aria-label="Choose an emoji"
        />
        {showEmojiPickerPopover && (
          <>
            <div
              className="fixed inset-0 z-10 cursor-default bg-transparent"
              onClick={onCloseEmojiPicker}
            />
            <div className="absolute -left-40 bottom-full z-10">
              <EmojiPickerPopover
                position={popoverPosition}
                onClose={onCloseEmojiPicker}
                onEmojiClick={onEmojiSelect}
                triggerRef={emojiButtonRef}
              />
            </div>
          </>
        )}
      </div>

      {!selectedFile && !showPollInputs && (
        <TbCalendarClock
          size={22}
          className="cursor-pointer text-primary hover:text-primary/80"
          onClick={onScheduleClick}
          title="Schedule post"
          aria-label="Schedule new post"
        />
      )}
    </div>
  )
}
