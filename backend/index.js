const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/project");
const taskRoutes = require("./routes/task");
const inboxRoutes = require("./routes/inbox");
const authMiddleware = require("./middleware/authMiddleware");

const app = express();

app.use(cors({
  origin: ["http://localhost:3000", "https://imaginative-reflection-production-ea56.up.railway.app"],
  credentials: true
}));
app.use(express.json({ limit: "10mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/inbox", inboxRoutes);

app.get("/", (req, res) => res.send("API is running"));

app.get("/api/protected", authMiddleware, (req, res) => {
  res.json({ msg: "You are authenticated", user: req.user });
});

mongoose.connect(process.env.MONGO_URI, { family: 4 })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Railway injects PORT automatically - always use process.env.PORT
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
