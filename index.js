const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const userRouter = require("./routes/user");
const courseRouter = require("./routes/courses");
const adminRouter = require("./routes/admin");

const app = express();
app.use(express.json());

// Middlewar
app.use(cors({
  origin: "https://course-hive-kmp.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
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