import { type Request, type Response } from "express";

export const getProfile = (req: Request, res: Response) => {
  res.json({
    message: "Welcome to profile",
    user: (req as any).user,
  });
};