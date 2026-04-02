import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

type ProfileResponse = {
  user?: {
    name?: string;
    email?: string;
  };
};

const Dashboard = () => {
  const [user, setUser] = useState({ name: "", email: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get<ProfileResponse>(
          "http://localhost:5000/api/users/profile",
          { withCredentials: true }
        );

        setUser({
          name: response.data.user?.name ?? "Guest User",
          email: response.data.user?.email ?? "No email available",
        });
      } catch (error) {
        navigate("/login");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await axios.post(
        "http://localhost:5000/api/auth/logout",
        {},
        { withCredentials: true }
      );
      navigate("/login");
    } catch (error) {
      alert("Logout failed");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const avatarText = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";

  return (
    <div className="dashboard-page">
      <Navbar
        name={user.name || "Profile"}
        avatarText={avatarText}
        onProfileClick={() => setShowProfile((current) => !current)}
      />
      <div className="dashboard-shell">
        {!showProfile && (
          <section className="dashboard-empty-state">
            <span className="dashboard-eyebrow">Dashboard</span>
            <h1>Welcome to your dashboard</h1>
            <p>Click the profile button above to view your details.</p>
            <button
              className="auth-submit"
              type="button"
              onClick={() => navigate("/subscription")}
            >
              Manage Subscription
            </button>
          </section>
        )}

        {showProfile && (
          <section className="profile-grid">
            <article className="profile-card">
              <div className="profile-card-header">
                <div className="profile-avatar">{avatarText}</div>
                <div className="profile-card-copy">
                  <span className="dashboard-eyebrow">My profile</span>
                  <h2>{isLoading ? "Loading profile..." : user.name}</h2>
                  <p>
                    {isLoading
                      ? "Fetching your account details."
                      : "Your basic account information is shown below."}
                  </p>
                </div>
              </div>

              <div className="profile-details">
                <div className="profile-detail-item">
                  <span>Full name</span>
                  <strong>{isLoading ? "Please wait..." : user.name}</strong>
                </div>
                <div className="profile-detail-item">
                  <span>Email address</span>
                  <strong>{isLoading ? "Please wait..." : user.email}</strong>
                </div>
                <div className="profile-detail-item">
                  <span>Status</span>
                  <strong>{isLoading ? "Checking..." : "Authenticated"}</strong>
                </div>
              </div>

              <button
                className="logout-button"
                type="button"
                onClick={handleLogout}
                disabled={isLoading || isLoggingOut}
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </article>
          </section>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
