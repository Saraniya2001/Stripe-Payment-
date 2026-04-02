
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Register from "./pages/register";
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import SubscriptionPage from "./pages/subscription";
import SubscriptionResultPage from "./pages/subscriptionResult";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route path="/subscription/:outcome" element={<SubscriptionResultPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
