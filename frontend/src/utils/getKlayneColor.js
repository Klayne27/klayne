export const getKlayneColor = (theme) => {
  switch (theme) {
    case "black":
      return "bg-transparent"
    case "light":
      return "bg-primary"
    case "valentine":
      return "bg-primary"
    case "wireframe":
      return "bg-primary"
    case "lemonade":
      return "bg-primary"
    case "cupcake":
      return "bg-primary"
    case "nord":
      return "bg-primary"
    case "pastel":
      return "bg-primary"
    case "retro":
      return "bg-primary"
    default:
      "bg-transparent"
  }
}
