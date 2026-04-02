import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";

const app = express();

app.use("/api/webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(cookieParser());

app.use(cors(
  {
    origin:"http://localhost:3000",
    credentials:true
  }
));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/webhook", webhookRoutes);

app.get("/", (req, res) => {
  res.send("API is running");
});


export default app;
