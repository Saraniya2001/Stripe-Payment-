import { type Request, type Response } from "express";
import User from "../models/user.js";
import bcrypt from "bcrypt";
import { sendEmail } from "../utils/sendEmail.js";

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // 1. Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create new user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    await sendEmail(
      user.email,
      "Welcome to Stripe App",
      `Hi ${user.name}, your account has been created successfully. Welcome aboard.`
    );

    // 4. Send response (DON'T send password)
    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 1. Check if user exists
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    // 2. Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    // 3. Store user info in cookie
    res.cookie(
      "user",
      {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      {
        httpOnly: true,
        secure: false, // true in production
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      }
    );

    // 4. Send response
    res.status(200).json({
      message: "Login successful",
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
};

export const logoutUser = (req: Request, res: Response) => {
  try {
    // Clear the cookie
    res.clearCookie("user");

    res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
};
