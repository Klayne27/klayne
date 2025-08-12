import { admin } from "../config/firebaseAdmin.js";
import { generateTokenAndSetCookie } from "../lib/utils/generateToken.js";
import Image from "../models/image.model.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken"

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

export const googleAuth = async (req, res) => {
  const { idToken } = req.body;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    let user = await User.findOne({ email });

    if (user) {
      if (!user.googleId) {
        user.googleId = uid;

        if (!user.profileImg && picture) {
          const newProfileImage = new Image({
            imageUrl: picture,
            parentDocument: user._id,
            parentModel: "User",
            uploadedBy: user._id,
          });
          await newProfileImage.save();
          user.profileImg = newProfileImage._id;
        }
        await user.save();
        console.log("Existing user linked Google account successfully.");
      } else if (user.googleId !== uid) {
        // This is a rare edge case: a different Google account is trying to link
        // to an existing email. This should be a security error.
        console.error("Attempt to link a different Google account to an existing user.");
        return res
          .status(400)
          .json({ error: "Email is already associated with another account." });
      }

      // If the user already has a googleId, they are simply logging in.
    } else {
      // 2. This is a completely new user. Create a new user document.
      let baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
      let username = baseUsername;
      let userExists = await User.findOne({ username });
      let count = 1;
      while (userExists) {
        username = `${baseUsername}${count}`;
        userExists = await User.findOne({ username });
        count++;
      }

      user = new User({
        fullName: name,
        username: username,
        email: email,
        password: null, // As per our previous discussion
        googleId: uid, // Set the googleId for the new user
      });

      if (picture) {
        const newProfileImage = new Image({
          imageUrl: picture,
          parentDocument: user._id,
          parentModel: "User",
          uploadedBy: user._id,
        });
        await newProfileImage.save();
        user.profileImg = newProfileImage._id;
      }

      await user.save();
      console.log("New Google user created successfully.");
    }

    // Now, generate a token and send back the populated user.
    generateTokenAndSetCookie(user._id, res);

    const populatedUser = await User.findById(user._id)
      .populate("profileImg", "imageUrl")
      .populate("coverImg", "imageUrl")
      .select("-password");

    res.status(200).json(populatedUser);
  } catch (error) {
    console.error("Error with Google authentication:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found with that email address." });
    }

    const resetToken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 3. Create the email content
    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Reset Request",
      html: `
    <div style="font-family: sans-serif; text-align: center; padding: 20px;">
      <h1 style="color: #333;">Password Reset</h1>
      <p style="font-size: 16px; color: #555;">You requested a password reset. Click the button below to set a new password:</p>
      <a href="${resetUrl}" style="background-color: #1D9BF0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-top: 20px;">
        Reset Password
      </a>
      <p style="font-size: 14px; color: #999; margin-top: 20px;">This link is valid for 15 minutes.</p>
    </div>
  `,
    };

    // 4. Send the email
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Password reset link sent to your email." });
  } catch (error) {
    console.error("Error in forgotPassword controller:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id);

    if (!user) {
      return res.status(404).json({ error: "Invalid or expired token." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    console.error("Error in resetPassword controller:", error.message);
    res.status(400).json({ error: "Invalid or expired token." });
  }
};