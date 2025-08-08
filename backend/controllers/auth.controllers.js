import { generateTokenAndSetCookie } from "../lib/utils/generateToken.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

export const signup = async (req, res) => {
  try {
    let { fullName, username, email, password } = req.body;

    fullName = fullName.trim();
    username = username.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (username.length === 0) {
      return res.status(400).json({ error: "Username cannot be empty." });
    }

    if (fullName.length === 0) {
      return res.status(400).json({ error: "Full Name cannot be empty." });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username is already taken" });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: "Email is already taken" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long" });
    }

    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      username,
      email,
      password: hashedPassword,
    });

    if (newUser) {
      generateTokenAndSetCookie(newUser._id, res);
      await newUser.save();

      const populatedUser = await User.findById(newUser._id)
        .populate("profileImg", "imageUrl")
        .populate("coverImg", "imageUrl")
        .select("-password");

      res.status(201).json({
        _id: populatedUser._id,
        fullName: populatedUser.fullName,
        username: populatedUser.username,
        email: populatedUser.email,
        followers: populatedUser.followers,
        following: populatedUser.following,
        profileImg: populatedUser.profileImg,
        coverImg: populatedUser.coverImg,
      });
    } else {
      res.status(400).json({ error: "Invalid user data" });
    }
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    const isPasswordCorrect = await bcrypt.compare(password, user?.password || "");

    if (!user || !isPasswordCorrect) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    generateTokenAndSetCookie(user._id, res);

    const populatedUser = await User.findById(user._id)
      .populate("profileImg", "imageUrl")
      .populate("coverImg", "imageUrl")
      .select("-password");

    res.status(200).json({
      _id: populatedUser._id,
      fullName: populatedUser.fullName,
      username: populatedUser.username,
      email: populatedUser.email,
      followers: populatedUser.followers,
      following: populatedUser.following,
      profileImg: populatedUser.profileImg,
      coverImg: populatedUser.coverImg,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const logout = async (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("profileImg", "imageUrl")
      .populate("coverImg", "imageUrl")
      .select("-password");
    return res.status(200).json(user);
  } catch (error) {
    console.log("Error in getMe controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
