import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await axios.post("http://localhost:5000/api/auth/register", {
        name,
        email,
        password,
  
      } ,{ withCredentials: true });
           

      alert("Registered successfully");
      navigate("/login");
    } catch (error) {
      alert("Error");
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel auth-panel-copy">
        <span className="auth-badge">Stripe Project</span>
        <h1>Create your account</h1>
        <p>
          Start managing your workspace with a cleaner, calmer onboarding
          flow.
        </p>
        <div className="auth-feature-list">
          <div>
            <strong>Fast setup</strong>
            <span>Register in a minute and move straight into the app.</span>
          </div>
          <div>
            <strong>Simple workflow</strong>
            <span>Focused screens with the essentials up front.</span>
          </div>
        </div>
      </section>

      <section className="auth-panel auth-panel-form">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form-header">
            <h2>Register</h2>
            <p>Fill in your details to create a new account.</p>
          </div>

          <label className="auth-field">
            <span>Name</span>
            <input
              type="text"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

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
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button className="auth-submit" type="submit">
            Create account
          </button>

          <p className="auth-switch">
            Already registered? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </section>
    </main>
  );
};

export default Register;
