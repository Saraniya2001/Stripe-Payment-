import { type Request, type Response } from "express";
import stripe from "../config/stripe.js";
import { getPriceId } from "../utils/priceMap.js";
import User from "../models/user.js";
import { sendEmail } from "../utils/sendEmail.js";

const getUserFromRequest = async (req: Request) => {
  const userId = (req as any).user?.id ?? req.body.userId;

  if (!userId) {
    return null;
  }

  const user = await User.findById(userId);
  return user;
};

const getActiveStripeSubscriptionId = async (user: any) => {
  if (user.stripeSubscriptionId) {
    try {
      const existingSubscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

      if (existingSubscription && existingSubscription.status !== "canceled") {
        return existingSubscription.id;
      }
    } catch (error: any) {
      if (error?.code !== "resource_missing") {
        throw error;
      }
    }
  }

  if (!user.stripeCustomerId) {
    return null;
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    status: "all",
    limit: 10,
  });

  const activeSubscription = subscriptions.data.find((subscription) =>
    ["active", "trialing", "past_due", "unpaid"].includes(subscription.status)
  );

  return activeSubscription?.id ?? null;
};

const getSubscriptionInterval = async (subscriptionId: string | null | undefined) => {
  if (!subscriptionId) {
    return null;
  }

  try {
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    const recurringInterval = stripeSubscription.items.data[0]?.price?.recurring?.interval;

    if (recurringInterval === "month") {
      return "monthly";
    }

    if (recurringInterval === "year") {
      return "yearly";
    }

    return null;
  } catch (error: any) {
    if (error?.code === "resource_missing") {
      return null;
    }

    throw error;
  }
};

const canApplyCheckoutSessionToUser = (user: any, session: any) => {
  if (!user) {
    return false;
  }

  if (session.status !== "complete") {
    return false;
  }

  if (!session.subscription) {
    return false;
  }

  if (user.subscriptionStatus !== "active" || !user.stripeSubscriptionId) {
    return true;
  }

  return user.stripeSubscriptionId === session.subscription;
};

const syncCheckoutSessionToUser = async (session: any) => {
  const userId = session.metadata?.userId ?? session.client_reference_id;
  const plan = session.metadata?.plan ?? "starter";

  let updatedUser = null;

  if (userId) {
    const existingUser = await User.findById(userId);

    if (!canApplyCheckoutSessionToUser(existingUser, session)) {
      return existingUser;
    }

    updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        subscription: plan,
        subscriptionStatus: "active",
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
      },
      { returnDocument: "after" }
    );
  }

  if (!updatedUser && session.customer) {
    const existingUser = await User.findOne({ stripeCustomerId: session.customer });

    if (!canApplyCheckoutSessionToUser(existingUser, session)) {
      return existingUser;
    }

    updatedUser = await User.findOneAndUpdate(
      { stripeCustomerId: session.customer },
      {
        subscription: plan,
        subscriptionStatus: "active",
        stripeSubscriptionId: session.subscription,
      },
      { returnDocument: "after" }
    );
  }

  return updatedUser;
};

const shouldSendActivationEmail = (user: any) => {
  return user && (user.subscriptionStatus !== "active" || user.subscription === "none");
};

const sendSubscriptionActivationEmail = async (user: any, plan: string) => {
  if (!user?.email) {
    return;
  }

  await sendEmail(
    user.email,
    "Subscription Successful",
    `Hi ${user.name}, your ${plan} subscription is now active.`
  );
};

export const createSubscription = async (req: Request, res: Response) => {
  try {
    const { plan, interval, userId } = req.body;

    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const priceId = getPriceId(plan, interval);

    if (!priceId) {
      return res.status(400).json({ message: "Invalid plan" });
    }

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
      });

      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    const backendBaseUrl = process.env.BACKEND_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const frontendBaseUrl = process.env.FRONTEND_BASE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer: customerId,
      client_reference_id: user._id.toString(),
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: user._id.toString(),
        plan,
        interval,
      },
      success_url: `${backendBaseUrl}/api/subscription/success?session_id={CHECKOUT_SESSION_ID}&user_id=${encodeURIComponent(
        user._id.toString()
      )}&redirect_url=${encodeURIComponent(frontendBaseUrl)}`,
      cancel_url: `${backendBaseUrl}/api/subscription/fail?redirect_url=${encodeURIComponent(frontendBaseUrl)}`,
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Stripe error" });
  }
};

export const getMySubscription = async (req: Request, res: Response) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const normalizedStatus = user.subscriptionStatus === "active" ? "active" : "inactive";
    const activeInterval = normalizedStatus === "active" ? await getSubscriptionInterval(user.stripeSubscriptionId) : null;

    return res.status(200).json({
      subscription: user.subscription ?? "none",
      activeInterval,
      subscriptionStatus: normalizedStatus,
      stripeCustomerId: user.stripeCustomerId ?? null,
      stripeSubscriptionId: user.stripeSubscriptionId ?? null,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch subscription" });
  }
};

export const confirmSubscriptionSession = async (req: Request, res: Response) => {
  try {
    const sessionId = req.query.session_id as string | undefined;

    if (!sessionId) {
      return res.status(400).json({ message: "Missing session_id" });
    }

    const userBeforeSync = await getUserFromRequest(req);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    await syncCheckoutSessionToUser(session);

    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (shouldSendActivationEmail(userBeforeSync)) {
      await sendSubscriptionActivationEmail(user, session.metadata?.plan ?? "starter");
    }

    const activeInterval = user.subscription === "none" ? null : await getSubscriptionInterval(user.stripeSubscriptionId);

    return res.status(200).json({
      subscription: user.subscription ?? "none",
      activeInterval,
      subscriptionStatus: user.subscription === "none" ? "inactive" : "active",
      stripeCustomerId: user.stripeCustomerId ?? null,
      stripeSubscriptionId: user.stripeSubscriptionId ?? null,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to confirm subscription session" });
  }
};

export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const stripeSubscriptionId = await getActiveStripeSubscriptionId(user);

    if (!stripeSubscriptionId) {
      return res.status(400).json({ message: "No active subscription found" });
    }

    const canceledSubscription = await stripe.subscriptions.cancel(stripeSubscriptionId);

    user.subscription = "none";
    user.stripeSubscriptionId = null;
    user.subscriptionStatus = "inactive";
    await user.save();

    await sendEmail(
      user.email,
      "Subscription Canceled",
      `Hi ${user.name}, your subscription has been canceled successfully.`
    );

    return res.status(200).json({
      message: "Subscription canceled successfully",
      stripeStatus: canceledSubscription.status,
      canceledAt: canceledSubscription.canceled_at,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to cancel subscription" });
  }
};

export const updateSubscription = async (req: Request, res: Response) => {
  try {
    const { plan, interval } = req.body;

    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (!user.stripeSubscriptionId) {
      return res.status(400).json({ message: "No active subscription found" });
    }

    const newPriceId = getPriceId(plan, interval);

    if (!newPriceId) {
      return res.status(400).json({ message: "Invalid plan" });
    }

    const currentSubscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    const currentItem = currentSubscription.items.data[0];

    if (!currentItem) {
      return res.status(400).json({ message: "Subscription item not found" });
    }

    const updatedSubscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: false,
      proration_behavior: "create_prorations",
      items: [
        {
          id: currentItem.id,
          price: newPriceId,
        },
      ],
      metadata: {
        userId: user._id.toString(),
        plan,
        interval,
      },
    });

    user.subscription = plan;
    user.subscriptionStatus = "active";
    await user.save();

    return res.status(200).json({
      message: "Subscription updated successfully",
      stripeSubscriptionId: updatedSubscription.id,
      stripeStatus: updatedSubscription.status,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update subscription" });
  }
};

export const subscriptionSuccessPage = async (req: Request, res: Response) => {
  try {
    const sessionId = req.query.session_id as string | undefined;
    const redirectUrl = (req.query.redirect_url as string | undefined) || process.env.FRONTEND_BASE_URL || "http://localhost:3000";

    if (!sessionId) {
      return res.status(400).send("<h2>Missing session_id</h2>");
    }

    const userId = req.query.user_id as string | undefined;
    const userBeforeSync = userId ? await User.findById(userId) : null;
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const updatedUser = await syncCheckoutSessionToUser(session);

    if (updatedUser && shouldSendActivationEmail(userBeforeSync)) {
      await sendSubscriptionActivationEmail(updatedUser, session.metadata?.plan ?? "starter");
    }

    return res.redirect(
      `${redirectUrl}/subscription/success?session_id=${encodeURIComponent(session.id)}&status=${encodeURIComponent(
        session.status ?? "complete"
      )}`
    );
  } catch (error) {
    console.error(error);
    return res.status(500).send("<h2>Could not verify successful checkout session.</h2>");
  }
};

export const subscriptionFailPage = (req: Request, res: Response) => {
  const redirectUrl = (req.query.redirect_url as string | undefined) || process.env.FRONTEND_BASE_URL || "http://localhost:3000";
  return res.redirect(`${redirectUrl}/subscription/fail`);
};
