// wardrobe.controller.js
import User from "../models/user.model.js";

const VALID_CATEGORIES = ["font", "ring", "overlay", "nameplate"];

const CATEGORY_MAP = {
  font: "fonts",
  ring: "rings",
  overlay: "overlays",
  nameplate: "nameplates",
};

export const getInventory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("inventory equipped");
    if (!user) return res.status(404).json({ error: "User not found." });
    res.status(200).json({ inventory: user.inventory, equipped: user.equipped });
  } catch (error) {
    console.error("Error in getInventory:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const equipItem = async (req, res) => {
  try {
    const { category, itemKey } = req.body;
    const userId = req.user._id;

    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: "Invalid category." });
    }

    const user = await User.findById(userId).select("inventory equipped");
    if (!user) return res.status(404).json({ error: "User not found." });

    if (itemKey !== null) {
      const inventoryCategory = CATEGORY_MAP[category];
      const owned = user.inventory[inventoryCategory] || [];
      if (!owned.includes(itemKey)) {
        return res.status(403).json({ error: "You do not own this item." });
      }
    }

    user.equipped[category] = itemKey;
    await user.save();

    res.status(200).json({ equipped: user.equipped });
  } catch (error) {
    console.error("Error in equipItem:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
