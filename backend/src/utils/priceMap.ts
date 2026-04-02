export const getPriceId = (plan: string, interval: string) => {
  if (plan === "starter" && interval === "monthly") {
    return process.env.STRIPE_PRICE_STARTER_MONTHLY;
  }

  if (plan === "starter" && interval === "yearly") {
    return process.env.STRIPE_PRICE_STARTER_YEARLY;
  }

  if (plan === "pro" && interval === "monthly") {
    return process.env.STRIPE_PRICE_PRO_MONTHLY;
  }

  if (plan === "pro" && interval === "yearly") {
    return process.env.STRIPE_PRICE_PRO_YEARLY;
  }

  return null;
};