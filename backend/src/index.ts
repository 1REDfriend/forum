import "dotenv/config";
import express from "express";
import authRoutes from "./routes/auth.routes.js";
import forumRoutes from "./routes/forum.routes.js";
import threadRoutes from "./routes/thread.routes.js";
import postRoutes from "./routes/post.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/forums', forumRoutes);
app.use('/threads', threadRoutes);
app.use('/posts', postRoutes);

app.get("/", (req, res) => {
  res.send("Hello World! Forum Express + Drizzle backend is running.");
});

// Error handling middleware should be the last middleware
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

