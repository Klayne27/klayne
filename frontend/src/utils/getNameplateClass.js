import { WARDROBE_CONFIG } from "../features/wardrobe/wardrobeConfig"

export const getNameplateClass = (nameplateKey) => {
  if (!nameplateKey) return ""
  return WARDROBE_CONFIG[nameplateKey]?.nameplateClass || ""
}
