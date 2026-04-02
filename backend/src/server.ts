import "dotenv/config";
import app from "./app.js";
import { connectdb } from "./config/db.js";

const port = process.env.PORT || 5000;

const startServer = async () => {
  await connectdb();

  app.listen(port, () => {
    console.log(`app running on port ${port}`);
  });
};

startServer();
