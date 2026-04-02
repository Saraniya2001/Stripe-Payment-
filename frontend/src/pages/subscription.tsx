import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";

type SubscriptionState = {
  subscription: string;
  activeInterval: "monthly" | "yearly" | null;
  subscriptionStatus: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

type PlanCard = {
  plan: "starter" | "pro";
  title: string;
  description: string;
  features: string[];
  highlight: string;
  billing: Array<{
    interval: "monthly" | "yearly";
    priceLabel: string;
    badge?: string;
  }>;
};

type PlanActionMode = "subscribe" | "change";

type PlanDialogState = {
  plan: "starter" | "pro";
  mode: PlanActionMode;
} | null;

const plans: PlanCard[] = [
  {
    plan: "starter",
    title: "Starter",
    description: "A clean entry plan for individuals and growing teams.",
    highlight: "Best for getting started",
    features: ["Core subscription access", "Basic usage limits", "Email support"],
    billing: [
      { interval: "monthly", priceLabel: "$5 / month" },
      { interval: "yearly", priceLabel: "$50 / year", badge: "Save 2 months" },
    ],
  },
  {
    plan: "pro",
    title: "Pro",
    description: "More power, more speed, and priority support for heavier usage.",
    highlight: "Best for advanced usage",
    features: ["Advanced features", "Priority processing", "Priority support"],
    billing: [
      { interval: "monthly", priceLabel: "$10 / month" },
      { interval: "yearly", priceLabel: "$100 / year", badge: "Save 2 months" },
    ],
  },
];

const toLabel = (value: string) => {
  if (!value || value === "none") {
    return "No plan";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
};

const SubscriptionPage = () => {
  const [user, setUser] = useState({ name: "", email: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionState>({
    subscription: "none",
    activeInterval: null,
    subscriptionStatus: "inactive",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
  });
  const [planDialog, setPlanDialog] = useState<PlanDialogState>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const avatarText = useMemo(
    () =>
      user.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") || "U",
    [user.name]
  );

  const checkoutStatus = searchParams.get("checkout");
  const checkoutSessionId = searchParams.get("session_id");

  const fetchData = async () => {
    try {
      const [profileRes, subscriptionRes] = await Promise.all([
        axios.get("http://localhost:5000/api/users/profile", { withCredentials: true }),
        axios.get("http://localhost:5000/api/subscription/me", { withCredentials: true }),
      ]);

      setUser({
        name: profileRes.data.user?.name ?? "Guest User",
        email: profileRes.data.user?.email ?? "No email",
      });
      setSubscription(subscriptionRes.data);
    } catch (error) {
      navigate("/login");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!checkoutStatus) {
      return;
    }

    if (checkoutStatus === "cancel") {
      return;
    }

    if (checkoutStatus !== "success") {
      return;
    }

    let cancelled = false;

    const syncSubscriptionAfterCheckout = async () => {
      setIsWorking(true);

      try {
        if (checkoutSessionId) {
          const confirmedResponse = await axios.get("http://localhost:5000/api/subscription/confirm-session", {
            params: { session_id: checkoutSessionId },
            withCredentials: true,
          });

          setSubscription(confirmedResponse.data);

          if (confirmedResponse.data?.subscriptionStatus === "active") {
            return;
          }
        }

        for (let attempt = 0; attempt < 5; attempt += 1) {
          const response = await axios.get("http://localhost:5000/api/subscription/me", {
            withCredentials: true,
          });

          setSubscription(response.data);

          if (response.data?.subscriptionStatus === "active") {
            return;
          }

          await new Promise((resolve) => window.setTimeout(resolve, 1500));
        }
      } catch {
      } finally {
        if (!cancelled) {
          setIsWorking(false);
          setSearchParams({}, { replace: true });
        }
      }
    };

    void syncSubscriptionAfterCheckout();

    return () => {
      cancelled = true;
    };
  }, [checkoutSessionId, checkoutStatus, setSearchParams]);

  const dismissCheckoutState = () => {
    setSearchParams({}, { replace: true });
  };

  const isCurrentPlan = (plan: "starter" | "pro") =>
    subscription.subscription === plan && subscription.subscriptionStatus === "active";

  const isCurrentBillingOption = (plan: "starter" | "pro", interval: "monthly" | "yearly") =>
    isCurrentPlan(plan) && subscription.activeInterval === interval;

  const canChangeThisPlan = (plan: "starter" | "pro") => canManageSubscription && isCurrentPlan(plan);

  const canManageSubscription =
    subscription.subscriptionStatus === "active" || Boolean(subscription.stripeSubscriptionId);

  const handleSubscribe = async (plan: "starter" | "pro", interval: "monthly" | "yearly") => {
    try {
      setIsWorking(true);

      const response = await axios.post(
        "http://localhost:5000/api/subscription/create",
        { plan, interval },
        { withCredentials: true }
      );

      if (response.data?.url) {
        window.location.href = response.data.url;
        return;
      }
    } catch (error) {
      alert("Failed to create subscription");
    } finally {
      setIsWorking(false);
    }
  };

  const handleUpdate = async (plan: "starter" | "pro", interval: "monthly" | "yearly") => {
    try {
      setIsWorking(true);

      await axios.post(
        "http://localhost:5000/api/subscription/update",
        { plan, interval },
        { withCredentials: true }
      );

      await fetchData();
    } catch (error) {
      alert(axios.isAxiosError(error) ? error.response?.data?.message ?? "Failed to update subscription" : "Failed to update subscription");
    } finally {
      setIsWorking(false);
    }
  };

  const openPlanDialog = (plan: "starter" | "pro", mode: PlanActionMode) => {
    setPlanDialog({ plan, mode });
  };

  const closePlanDialog = () => {
    setPlanDialog(null);
  };

  const handlePlanIntervalSelect = async (interval: "monthly" | "yearly") => {
    if (!planDialog) {
      return;
    }

    const { plan, mode } = planDialog;
    closePlanDialog();

    if (mode === "subscribe") {
      await handleSubscribe(plan, interval);
      return;
    }

    await handleUpdate(plan, interval);
  };

  const handleCancel = async () => {
    try {
      setIsWorking(true);

      await axios.post(
        "http://localhost:5000/api/subscription/cancel",
        {},
        { withCredentials: true }
      );

      await fetchData();
    } catch (error) {
      alert(axios.isAxiosError(error) ? error.response?.data?.message ?? "Failed to cancel subscription" : "Failed to cancel subscription");
    } finally {
      setIsWorking(false);
    }
  };

  const statusTone = subscription.subscriptionStatus === "active" ? "success" : "neutral";

  return (
    <div className="dashboard-page">
      <Navbar name={user.name || "Profile"} avatarText={avatarText} onProfileClick={() => navigate("/dashboard")} />

      <div className="subscription-shell">
        <section className="subscription-hero">
          <h1>Manage your Subscription</h1>
        </section>

        {checkoutStatus && (
          <section
            className={`checkout-feedback ${checkoutStatus === "success" ? "checkout-feedback-success" : "checkout-feedback-warning"}`}
          >
            <div>
              <span className="checkout-feedback-label">{checkoutStatus === "success" ? "Success" : "Checkout canceled"}</span>
              <h2>
                {checkoutStatus === "success"
                  ? "Your subscription completed!"
                  : "Your subscription failed, please try again"}
              </h2>
              <p>
                {checkoutStatus === "success"
                  ? "Stay on this page for a moment and the subscription status will refresh automatically."
                  : "You can review the plans below and try again whenever you are ready."}
              </p>
            </div>
            <button className="secondary-button checkout-feedback-close" onClick={dismissCheckoutState}>
              Dismiss
            </button>
          </section>
        )}

        <section>
          <article className="subscription-status-card">
            <div className="status-card-header">
              <div>
                <span className={`status-pill status-pill-${statusTone}`}>{toLabel(subscription.subscriptionStatus)}</span>
                <h2>Current subscription</h2>
              </div>
              <button className="cancel-button" disabled={isWorking || isLoading || !canManageSubscription} onClick={handleCancel}>
                {isWorking ? "Processing..." : "Cancel Subscription"}
              </button>
            </div>

            <div className="subscription-status-grid">
              <div>
                <span>Plan</span>
                <strong>{isLoading ? "Loading..." : toLabel(subscription.subscription)}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{isLoading ? "Loading..." : toLabel(subscription.subscriptionStatus)}</strong>
              </div>
              <div>
                <span>Account</span>
                <strong>{user.email || "Loading..."}</strong>
              </div>
            </div>
          </article>
        </section>

        <section className="plan-grid">
          {plans.map((item) => (
            <article key={item.plan} className={`plan-card ${isCurrentPlan(item.plan) ? "plan-card-active" : ""}`}>
              <div className="plan-card-head">
                <div className="plan-card-title-group">
                  <span className="plan-highlight">{item.highlight}</span>
                  <h3>{item.title}</h3>
                </div>
                {isCurrentPlan(item.plan) && <span className="plan-current-badge">Current Plan</span>}
              </div>

              <p className="plan-description">{item.description}</p>

              <ul>
                {item.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              <div className="plan-pricing-preview">
                {item.billing.map((option) => (
                  <div
                    key={option.interval}
                    className={`plan-pricing-row ${isCurrentBillingOption(item.plan, option.interval) ? "plan-pricing-row-active" : ""}`}
                  >
                    <div>
                      <strong>{option.interval === "monthly" ? "Monthly" : "Yearly"}</strong>
                      <span>{option.priceLabel}</span>
                    </div>
                    {isCurrentBillingOption(item.plan, option.interval) && <b>Active</b>}
                    {option.badge && <em>{option.badge}</em>}
                  </div>
                ))}
              </div>

              <div className="plan-actions">
                <button
                  className="auth-submit"
                  disabled={isWorking || isLoading || isCurrentPlan(item.plan)}
                  onClick={() => openPlanDialog(item.plan, "subscribe")}
                >
                  {isCurrentPlan(item.plan) ? "Active" : "Subscribe"}
                </button>

                <button
                  className="secondary-button"
                  disabled={isWorking || isLoading || !canChangeThisPlan(item.plan)}
                  onClick={() => openPlanDialog(item.plan, "change")}
                >
                  Change
                </button>
              </div>
            </article>
          ))}
        </section>

      </div>

      {planDialog && (
        <div className="plan-dialog-backdrop" onClick={closePlanDialog}>
          <div className="plan-dialog" onClick={(event) => event.stopPropagation()}>
            <span className="plan-dialog-label">{planDialog.mode === "subscribe" ? "Choose billing" : "Change billing"}</span>
            <h2>{`Select ${toLabel(planDialog.plan)} billing`}</h2>
            <p>
              {planDialog.mode === "subscribe"
                ? "Choose monthly or yearly before continuing to subscription checkout."
                : "Choose the billing interval you want to move this plan to."}
            </p>

            <div className="plan-dialog-options">
              {plans
                .find((item) => item.plan === planDialog.plan)
                ?.billing.map((option) => (
                  <button
                    key={option.interval}
                    className="plan-dialog-option"
                    disabled={isWorking}
                    onClick={() => void handlePlanIntervalSelect(option.interval)}
                  >
                    <strong>{option.interval === "monthly" ? "Monthly" : "Yearly"}</strong>
                    <span>{option.priceLabel}</span>
                    {option.badge && <em>{option.badge}</em>}
                  </button>
                ))}
            </div>

            <button className="secondary-button plan-dialog-close" disabled={isWorking} onClick={closePlanDialog}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPage;
