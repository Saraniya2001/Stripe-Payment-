import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

type SyncState = "idle" | "loading" | "success" | "error";

const SubscriptionResultPage = () => {
  const { outcome } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [message, setMessage] = useState("");

  const sessionId = searchParams.get("session_id");
  const isSuccess = outcome === "success";

  useEffect(() => {
    if (!isSuccess || !sessionId) {
      return;
    }

    let cancelled = false;

    const confirmSession = async () => {
      setSyncState("loading");

      try {
        await axios.get("http://localhost:5000/api/subscription/confirm-session", {
          params: { session_id: sessionId },
          withCredentials: true,
        });

        if (!cancelled) {
          setSyncState("success");
          setMessage("Your subscription is active now.");
        }
      } catch {
        if (!cancelled) {
          setSyncState("error");
          setMessage("We could not confirm the subscription automatically.");
        }
      }
    };

    void confirmSession();

    return () => {
      cancelled = true;
    };
  }, [isSuccess, sessionId]);

  return (
    <div className="subscription-page-result">
      <div className="subscription-result-card">
        <span className={`subscription-result-badge ${isSuccess ? "subscription-result-badge-success" : "subscription-result-badge-fail"}`}>
          {isSuccess ? "Payment successful" : "Payment canceled"}
        </span>

        <h1>{isSuccess ? "Subscription completed" : "Checkout was canceled"}</h1>

        <p>
          {isSuccess
            ? "Your payment was completed successfully. We are syncing your subscription details now."
            : "No worries. Your subscription was not changed, and you can try again whenever you are ready."}
        </p>

        {isSuccess && (
          <p className="subscription-result-status">
            {syncState === "loading" && "Confirming your subscription..."}
            {syncState === "success" && message}
            {syncState === "error" && message}
          </p>
        )}

        <div className="subscription-result-actions">
          <button className="auth-submit" onClick={() => navigate("/subscription")}>
            Go to Subscription
          </button>
          <Link className="secondary-button subscription-result-link" to="/dashboard">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionResultPage;
