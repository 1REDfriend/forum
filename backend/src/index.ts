import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.routes.js";
import forumRoutes from "./routes/forum.routes.js";
import threadRoutes from "./routes/thread.routes.js";
import postRoutes from "./routes/post.routes.js";
import userRoutes from "./routes/user.routes.js";
import searchRoutes from "./routes/search.routes.js";
import likeRoutes from "./routes/like.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { apiRateLimiter } from "./middlewares/rateLimit.middleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3636;

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow images to be served cross-origin
  })
);

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '5mb' }));

// Serve uploaded files statically
const uploadsDir = path.join(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadsDir));

// Global rate limiter (generous, just prevents abuse)
app.use(apiRateLimiter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use('/auth', authRoutes);
app.use('/forums', forumRoutes);
app.use('/threads', threadRoutes);
app.use('/posts', postRoutes);
app.use('/users', userRoutes);
app.use('/search', searchRoutes);
app.use('/likes', likeRoutes);
app.use('/upload', uploadRoutes);

app.get("/", (_req, res) => {
  res.send("IT.FORUM — Express + Drizzle backend is running.");
});

// Error handling middleware should be the last middleware
app.use(errorHandler);

app.listen(port, () => {
  console.log(`[IT.FORUM] Server listening on port ${port}`);
});
