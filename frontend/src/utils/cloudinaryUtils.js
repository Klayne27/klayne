export const getOptimizedImageUrl = (url, type = "post") => {
  if (!url) return "/avatar-placeholder.png"
  if (!url) return "/cover.png"

  if (!url || url.includes("placeholder") || url.includes("cover.png")) {
    return url || (type === "avatar" ? "/avatar-placeholder.png" : "/cover.png")
  }
  
  if (!url.includes("cloudinary.com")) return url

  let params = "f_auto,q_auto"

  switch (type) {
    case "avatar":
      params += ",w_150,h_150,c_fill,g_face" // Small square, centered on face
      break
    case "cover":
      params += ",w_800,h_300,c_fill" // Wide rectangle
      break
    case "post":
      params += ",w_600,c_limit" // Standard feed width
      break
    case "large":
      params += ",w_1200,c_limit" // For the "Expanded/Modal" view
      break
    default:
      params += ",w_600"
  }

  return url.replace("/upload/", `/upload/${params}/`)
}
