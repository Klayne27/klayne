export const getTypingMessage = (users) => {
  if (users.length === 0) return ""; // Should ideally not be called if users.length is 0

  const names = users.map((u) => u.username);
  const isEditingAny = users.some((u) => u.isEditing); // Check if *any* typing user is editing

  // Determine the verb based on whether anyone is editing
  const verb = isEditingAny ? "editing" : "typing";

  if (users.length === 1) {
    return `${names[0]} is ${verb}`;
  }
  if (users.length === 2) {
    return `${names.join(" and ")} are ${verb}`;
  }
  return "Several people are typing"; // Or "Several people are editing" if isEditingAny is true for some
};
