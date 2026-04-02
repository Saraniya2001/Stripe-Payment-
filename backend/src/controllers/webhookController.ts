import { type Request, type Response } from "express";
import stripe from "../config/stripe.js";
import User from "../models/user.js";
import { sendEmail } from "../utils/sendEmail.js";

export const handleWebhook = async (req: Request, res: Response) => {
  console.log("[webhook] hit");

  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.log("[webhook] missing STRIPE_WEBHOOK_SECRET");
    return res.status(500).send("Webhook configuration error");
  }

  if (!sig) {
    console.log("[webhook] missing stripe-signature header");
    return res.status(400).send("Missing stripe signature");
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.log("[webhook] signature verification failed:", err?.message);
    return res.status(400).send("Webhook Error");
  }

  console.log("[webhook] event:", event.type, "id:", event.id);

  switch (event.type) {

    // PAYMENT SUCCESS (FIRST TIME)
    case "checkout.session.completed": {
      const session = event.data.object as any;

      const userId = session.metadata?.userId ?? session.client_reference_id;
      const plan = session.metadata?.plan ?? "starter";

      try {
        let updated: any = null;

        //  Update using userId
        if (userId) {
          updated = await User.findByIdAndUpdate(
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

        // Fallback using Stripe customer ID
        if (!updated && session.customer) {
          updated = await User.findOneAndUpdate(
            { stripeCustomerId: session.customer },
            {
              subscription: plan,
              subscriptionStatus: "active",
              stripeSubscriptionId: session.subscription,
            },
            { returnDocument: "after" }
          );
        }

        if (!updated) {
          console.log("[webhook] user not found for checkout");
        } else {
          console.log("[webhook] user subscription updated");

          //  SEND EMAIL
          await sendEmail(
            updated.email,
            "Subscription Successful 🎉",
            `Hi ${updated.name}, your ${plan} subscription is now active.`
          );
        }

      } catch (error) {
        console.log("[webhook] db update error:", error);
      }

      break;
    }

    // RECURRING PAYMENT SUCCESS
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as any;

      try {
        const updated = await User.findOneAndUpdate(
          { stripeCustomerId: invoice.customer },
          { subscriptionStatus: "active" },
          { returnDocument: "after" }
        );

        if (!updated) {
          console.log("[webhook] no user found for invoice customer");
        } else {
          console.log("[webhook] invoice marked user active");

          //  SEND EMAIL
          await sendEmail(
            updated.email,
            "Payment Successful 💰",
            "Your subscription payment was successful."
          );
        }

      } catch (error) {
        console.log("[webhook] invoice update error:", error);
      }

      break;
    }

    //  SUBSCRIPTION CANCELED
    case "customer.subscription.deleted": {
      const subscription = event.data.object as any;

      try {
        const updated = await User.findOneAndUpdate(
          { stripeSubscriptionId: subscription.id },
          {
            subscription: "none",
            subscriptionStatus: "inactive",
            stripeSubscriptionId: null,
          },
          { returnDocument: "after" }
        );

        if (!updated) {
          console.log("[webhook] no user found for subscription");
        } else {
          console.log("[webhook] subscription canceled in db");

          //  SEND EMAIL
          await sendEmail(
            updated.email,
            "Subscription Canceled ❌",
            "Your subscription has been canceled."
          );
        }

      } catch (error) {
        console.log("[webhook] cancel update error:", error);
      }

      break;
    }

    default:
      console.log("[webhook] unhandled event:", event.type);
  }

  res.status(200).json({ received: true });
};
