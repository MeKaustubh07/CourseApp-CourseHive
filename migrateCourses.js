// migrateCourses.js
const mongoose = require("mongoose");
const { CourseModel } = require("./db"); // adjust path

const MONGO_URI = "mongodb+srv://kaustubhmp007:Rutherfordium104@cluster0.hqjhttn.mongodb.net/CourseSelling-App"; // replace with your DB

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const courses = await CourseModel.find();

    for (let c of courses) {
      if (c.thumbnail && !c.thumbnailUrl) c.thumbnailUrl = c.thumbnail;
      if (c.video && !c.videoUrl) c.videoUrl = c.video;
      await c.save();
      console.log(`Updated course: ${c.title}`);
    }

    console.log("🎉 Migration complete!");
    process.exit();
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
})();