import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await axios.post(
        "http://localhost:5000/api/auth/login",
        { email, password },
        { withCredentials: true }
      );

      navigate("/dashboard");
    } catch (error) {
      alert("Login failed");
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel auth-panel-copy">
        <span className="auth-badge">Welcome back</span>
        <h1>Sign in to continue</h1>
        <p>
          Pick up where you left off with a focused login experience designed
          for quick access.
        </p>
        <div className="auth-feature-list">
          <div>
            <strong>Secure session</strong>
            <span>Your login keeps using credentials-enabled requests.</span>
          </div>
          <div>
            <strong>Clear path</strong>
            <span>Land directly on your dashboard after signing in.</span>
          </div>
        </div>
      </section>

      <section className="auth-panel auth-panel-form">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form-header">
            <h2>Login</h2>
            <p>Enter your account details to access the dashboard.</p>
          </div>

          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button className="auth-submit" type="submit">
            Sign in
          </button>

          <p className="auth-switch">
            Need an account? <Link to="/">Create one</Link>
          </p>
        </form>
      </section>
    </main>
  );
};

export default Login;
