import { useCallback } from "react";
import { showAppToast } from "../../utils/showAppToast";

export const usePasteHandler = ({
  inputRef,
  input,
  setInput,
  setSelectedFile,
  setPreviewImage,
  fileInputRef,
  editingMessage = false,
  maxImageSizeMB = 5,
  onImagePasted,
  onTextPasted,
}) => {
  const handlePaste = useCallback(
    (e) => {
      e.preventDefault();

      if (editingMessage) {
        return;
      }

      const items = e.clipboardData.items;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();

          if (file) {
            if (!file.type.startsWith("image/")) {
              showAppToast("Pasted content is not a supported image type.", "error");
              setSelectedFile(null);
              if (fileInputRef && fileInputRef.current) fileInputRef.current.value = null;
              return;
            }

            if (file.size > maxImageSizeMB * 1024 * 1024) {
              showAppToast(
                `Pasted image size exceeds ${maxImageSizeMB}MB limit.`,
                "error"
              );
              setSelectedFile(null);
              if (fileInputRef && fileInputRef.current) fileInputRef.current.value = null;
              return;
            }

            setSelectedFile(file);
            const previewUrl = URL.createObjectURL(file);
            setPreviewImage(previewUrl);

            if (onImagePasted) {
              onImagePasted(file, previewUrl);
            }

            return; 
          }
        }
      }

      const pastedText = e.clipboardData.getData("text/plain");
      if (pastedText) {
        const inputElement = inputRef.current;
        if (inputElement) {
          const cursorStart = inputElement.selectionStart;
          const cursorEnd = inputElement.selectionEnd;

          const newText =
            input.substring(0, cursorStart) +
            pastedText +
            input.substring(cursorEnd);

          setInput(newText);

          if (onTextPasted) {
            onTextPasted(pastedText, newText);
          }

          setTimeout(() => {
            if (inputElement) {
              inputElement.selectionStart = cursorStart + pastedText.length;
              inputElement.selectionEnd = cursorStart + pastedText.length;
            }
          }, 0);
        }
      }
    },
    [
      inputRef,
      input,
      setInput,
      setSelectedFile,
      setPreviewImage,
      fileInputRef,
      maxImageSizeMB,
      onImagePasted,
      onTextPasted,
      editingMessage,
    ]
  );

  return handlePaste;
};
