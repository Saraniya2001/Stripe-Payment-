import express from "express";
import {
  cancelSubscription,
  confirmSubscriptionSession,
  createSubscription,
  getMySubscription,
  subscriptionFailPage,
  subscriptionSuccessPage,
  updateSubscription,
} from "../controllers/subscriptionController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", protect, createSubscription);
router.get("/me", protect, getMySubscription);
router.get("/confirm-session", protect, confirmSubscriptionSession);
router.post("/cancel", protect, cancelSubscription);
router.post("/update", protect, updateSubscription);
router.get("/success", subscriptionSuccessPage);
router.get("/fail", subscriptionFailPage);

export default router;
