import Image from "../models/image.model.js";

export const getImageById = async (req, res) => {
  try {
    const { imageId } = req.params;

    const image = await Image.findById(imageId).populate({
      path: "uploadedBy",
      select: "username fullName profileImg",
    });

    // If no image is found, return a 404 error.
    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }

    res.status(200).json(image);
  } catch (error) {
    console.error("Error in getImageById controller: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};