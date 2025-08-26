export const getTypingMessage = (users) => {
  if (users.length === 0) return "";

  const names = users.map((u) => u.username);
  const isEditingAny = users.some((u) => u.isEditing);

  const verb = isEditingAny ? "editing" : "typing";

  if (users.length === 1) {
    return `${names[0]} is ${verb}`;
  }
  if (users.length === 2) {
    return `${names.join(" and ")} are ${verb}`;
  }
  return "Several people are typing";
};
