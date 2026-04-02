import { type Request, type Response, type NextFunction } from "express";

export const protect = (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.cookies.user;

    if (!user) {
      return res.status(401).json({
        message: "Not authorized. Please login.",
      });
    }

    // attach user to request (optional)
    (req as any).user = user;

    next();
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
};