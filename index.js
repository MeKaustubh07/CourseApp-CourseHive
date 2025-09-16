const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const userRouter = require("./routes/user");
const courseRouter = require("./routes/courses");
const adminRouter = require("./routes/admin");

const app = express();
app.use(express.json());

// Enhanced CORS for mobile compatibility
app.use(cors({
  origin: ["https://course-hive-kmp.vercel.app", "http://localhost:5174", "http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  optionsSuccessStatus: 200 // For mobile compatibility
}));

// Add specific headers for mobile OAuth
app.use((req, res, next) => {
  res.header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

app.options("*", cors());

// Routers
app.use("/api/user", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/courses", courseRouter);

app.get('/RunTest', (req, res) => {
     res.status(200).json({ status: 'OK' });
   });

// DB + Server
async function main() {
  await mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch((er) => console.log("❌ Mongo Connection Error: ", er));

  app.listen(3000, "0.0.0.0", () => 
    console.log("🚀 Server running on http://0.0.0.0:3000")
  );
}
main();