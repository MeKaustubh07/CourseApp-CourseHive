const { Router } = require("express");
const jwt = require("jsonwebtoken");
const { adminAuthe, JWT_SECRET_ADMIN } = require("../AuthMiddleware/adminAuth");
const bcrypt = require("bcrypt");
const { z } = require("zod");
const mongoose = require("mongoose");
const axios = require("axios");
const { AdminModel, CourseModel , MaterialModel } = require("../db");

const adminRouter = Router();

const multer = require("multer");
const cloudinary = require("./config/cloudinary");

/// Use multer memory storage for buffer access
const storage = multer.memoryStorage();
const upload = multer({ storage });


// Helper function to validate ObjectId (updated)
const isValidObjectId = (id) => {
  if (!id || typeof id !== 'string') return false;
  return mongoose.Types.ObjectId.isValid(id);
};

// --- SIGNUP ---
adminRouter.post("/signup", async function (req, res) {
  const zodvalidate = z.object({
    email: z.string().email().min(3).max(100),
    password: z
      .string()
      .min(3)
      .max(30)
      .refine((password) => /[A-Z]/.test(password), {
        message: "Required at least one uppercase character",
      })
      .refine((password) => /[a-z]/.test(password), {
        message: "Required at least one lowercase character",
      })
      .refine((password) => /[0-9]/.test(password), {
        message: "Required at least one number",
      })
      .refine((password) => /[!@#$%^&*]/.test(password), {
        message: "Required at least one special character",
      }),
    firstName: z.string().min(3).max(100),
    lastName: z.string().min(3).max(100),
  });

  const finalvalidate = zodvalidate.safeParse(req.body);
  if (!finalvalidate.success) {
    return res.status(400).json({
      success: false,
      message: "Incorrect Credentials",
      errors: finalvalidate.error.issues.map((issue) => ({
        message: issue.message,
      })),
    });
  }

  try {
    const { email, password, firstName, lastName } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    await AdminModel.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
    });
    return res.status(201).json({
      success: true,
      message: "Admin created successfully!",
      user: { firstName, lastName, email }
    });
  } catch (er) {
    if (er.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// --- LOGIN ---
adminRouter.post("/login", async function (req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }
  try {
    const user = await AdminModel.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign({ id: user._id.toString() }, JWT_SECRET_ADMIN, {
        expiresIn: "1h",
      });
      return res.status(200).json({
        success: true,
        message: "Login successful!",
        token,
        user: { firstName: user.firstName, lastName: user.lastName, email: user.email }
      });
    } else {
      return res.status(401).json({
        success: false,
        message: "Wrong Username or Password!",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// --- Enhanced Cloudinary Upload Function ---
const uploadToCloudinary = (fileBuffer, options) => {
  return new Promise((resolve, reject) => {
    console.log(`🔄 Starting Cloudinary upload with options:`, options);
    
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        console.error("❌ Cloudinary upload error:", error);
        reject(error);
      } else {
        console.log("✅ Cloudinary upload success:");
        console.log("📷 URL:", result.secure_url);
        console.log("🆔 Public ID:", result.public_id);
        console.log("📏 Size:", result.bytes, "bytes");
        resolve(result);
      }
    });
    
    stream.end(fileBuffer);
  });
};

// --- Add Course with Better Error Handling ---
adminRouter.post(
  "/addcourse",
  adminAuthe,
  upload.fields([{ name: "thumbnailUrl" }, { name: "videoUrl" }]),
  async (req, res) => {
    try {

      console.log("📂 Files:", req.files); // 👀 log files
      console.log("📋 Body:", req.body);   // 👀 log text fields
      
      const { title, description, price } = req.body;
      const adminId = req.userid;

      console.log("🚀 Course creation started");
      console.log("📋 Form data:", { title, description, price });
      console.log("👤 Admin ID:", adminId);

      let thumbnailUrl = null;
      let videoUrl = null;

      // Upload thumbnail if provided
      if (req.files.thumbnailUrl && req.files.thumbnailUrl[0]) {
        console.log("⬆️ Uploading thumbnail to Cloudinary...");

        const result = await uploadToCloudinary(req.files.thumbnailUrl[0].buffer, {
          folder: "course_thumbnails",
          resource_type: "image",
          public_id: `thumbnail_${Date.now()}`,
          overwrite: true,
          transformation: [
            { width: 800, height: 600, crop: "fill" },
            { quality: "auto" },
            { format: "jpeg" }
          ]
        });

        thumbnailUrl = result.secure_url;
        console.log("✅ Thumbnail uploaded:", thumbnailUrl);
      } else {
        console.log("⚠️ No thumbnail file provided");
      }

      // Upload video if provided
      if (req.files.videoUrl && req.files.videoUrl[0]) {
        console.log("⬆️ Uploading video to Cloudinary...");
       
        const result = await uploadToCloudinary(req.files.videoUrl[0].buffer, {
          folder: "course_videos",
          resource_type: "video",
          public_id: `video_${Date.now()}`,
          overwrite: true,
          transformation: [{ quality: "auto" }]
        });

        videoUrl = result.secure_url;
        console.log("✅ Video uploaded:", videoUrl);
      } else {
        console.log("⚠️ No video file provided");
      }

      // Save to DB
      console.log("💾 Saving course to DB...");
      const newCourse = await CourseModel.create({
        title,
        description,
        price: price || 0,
        thumbnailUrl: thumbnailUrl,   // ✅ match frontend
        videoUrl: videoUrl,           // ✅ match frontend
        Admin: adminId
      });
      
      await newCourse.save();
      console.log("✅ Course created:", newCourse._id);

      // Send consistent response
      res.status(201).json({
        success: true,
        message: "Course created successfully!",
        course: {
          _id: newCourse._id,
          title: newCourse.title,
          description: newCourse.description,
          price: newCourse.price,
          thumbnailUrl: newCourse.thumbnail, // always use normalized keys
          videoUrl: newCourse.video,
          Admin: newCourse.Admin
        }
      });
    } catch (err) {
      console.error("❌ Course creation error:", err);
      res.status(500).json({
        success: false,
        error: "Course creation failed",
        details: err.message
      });
    }
  }
);

/**
 * 👉 View all courses created by logged-in admin
 */
adminRouter.get("/mycourses", adminAuthe, async function (req, res) {
  const adminId = req.userid;
  try {
    const courses = await CourseModel.find({ Admin: adminId });
    const formatted = courses.map(c => ({
      _id: c._id,
      title: c.title,
      description: c.description,
      price: c.price,
      thumbnailUrl: c.thumbnailUrl || null,
      videoUrl: c.videoUrl || null,
      Admin: c.Admin
    }));

    res.json({ success: true, courses: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching courses", error: error.message });
  }
});

/**
 * 👉 Edit a course (by ID in request body)
 */
adminRouter.put("/editcourse", adminAuthe, async (req, res) => {
  const adminId = req.userid;
  const { courseId, title, description, videoUrl, thumbnailUrl, price } = req.body;

  if (!isValidObjectId(courseId)) {
    return res.status(400).json({ success: false, message: "Invalid course ID format" });
  }

  try {
    const courseObjectId = new mongoose.Types.ObjectId(courseId);

    const existingCourse = await CourseModel.findOne({ _id: courseObjectId, Admin: adminId });
    if (!existingCourse) {
      return res.status(404).json({ success: false, message: "Course not found or unauthorized" });
    }

    if (title !== undefined) existingCourse.title = title;
    if (description !== undefined) existingCourse.description = description;
    if (thumbnailUrl !== undefined) existingCourse.thumbnailUrl = thumbnailUrl;
    if (videoUrl !== undefined) existingCourse.videoUrl = videoUrl;
    if (price !== undefined) existingCourse.price = price;

    const updatedCourse = await existingCourse.save();

    res.json({
      success: true,
      message: "Course updated successfully",
      course: updatedCourse,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating course", error: err.message });
  }
});

/**
 * 👉 Delete a course (by ID in request body)
 */
adminRouter.delete("/deletecourse", adminAuthe, async (req, res) => {
  const adminId = req.userid;
  const { courseId } = req.body;

  if (!isValidObjectId(courseId)) {
    return res.status(400).json({ success: false, message: "Invalid course ID format" });
  }

  try {
    const courseObjectId = new mongoose.Types.ObjectId(courseId);

    const course = await CourseModel.findOne({ _id: courseObjectId, Admin: adminId });
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found or unauthorized" });
    }

    await CourseModel.deleteOne({ _id: courseObjectId });

    res.json({
      success: true,
      message: "Course deleted successfully",
      deletedCourse: { id: course._id, title: course.title },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete course", error: err.message });
  }
});


// Add these routes to your existing admin.js file

/**
 * 📚 Get Admin's Own Materials (Authenticated)
 */
adminRouter.get("/materials", adminAuthe, async (req, res) => {
  try {
    const materials = await MaterialModel.find({ Admin: req.userid }).sort({ createdAt: -1 });
    res.json({ success: true, materials });
  } catch (error) {
    console.error("❌ Error fetching admin materials:", error);
    res.status(500).json({ success: false, error: "Failed to fetch materials" });
  }
});

/**
 * 📄 Delete Material
 */
adminRouter.delete("/materials/:id", adminAuthe, async (req, res) => {
  try {
    const materialDoc = await MaterialModel.findOne({ _id: req.params.id, Admin: req.userid });
    if (!materialDoc) return res.status(404).json({ success: false, error: "Not found or unauthorized" });

    await MaterialModel.findByIdAndDelete(materialDoc._id);
    res.json({ success: true, message: "Material deleted successfully" });
  } catch (error) {
    console.error("❌ Delete failed:", error);
    res.status(500).json({ success: false, error: "Delete failed" });
  }
});

// Update your existing public routes to avoid confusion
// Rename these routes to distinguish from admin routes

/**
 * 📚 Public Materials (for students)
 */
adminRouter.get("/public/materials", async (req, res) => {
  try {
    const materials = await MaterialModel.find({ type: "material" }).sort({ createdAt: -1 });
    res.json({ success: true, materials });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch materials" });
  }
});

/**
 * 📄 Public Papers (for students)  
 */
adminRouter.get("/public/papers", async (req, res) => {
  try {
    const papers = await MaterialModel.find({ type: "paper" }).sort({ createdAt: -1 });
    res.json({ success: true, papers });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch papers" });
  }
});

adminRouter.post("/materials/upload", adminAuthe, upload.single("file"), async (req, res) => {
  try {
    const { title, type } = req.body;
    if (!req.file) return res.status(400).json({ success: false, error: "No file uploaded" });
    
    // ✅ Correct configuration for documents
    const result = await uploadToCloudinary(req.file.buffer, {
      resource_type: "raw", // This is correct for PDFs/documents
      folder: "study_uploads",
      public_id: `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`,
      type: "upload", // Make it public
      access_mode: "public"
    });

    const newUpload = await MaterialModel.create({
      title,
      type,
      // Store only the secure_url
      fileUrl: result.secure_url,   // ✅ public link, works for preview & download
      publicId: result.public_id,
      originalName: req.file.originalname,
      fileSize: result.bytes,
      mimeType: req.file.mimetype,
      Admin: req.userid,
    });

    console.log("✅ Upload successful:", {
      title,
      url: result.secure_url,
      resourceType: result.resource_type
    });

    res.json({ success: true, material: newUpload });
  } catch (error) {
    console.error("❌ Upload failed:", error);
    res.status(500).json({ success: false, error: "Upload failed" });
  }
});


adminRouter.get("/materials/download/:id", adminAuthe, async (req, res) => {
  try {
    const material = await MaterialModel.findOne({
      _id: req.params.id,
      Admin: req.userid,
    });

    if (!material) {
      return res.status(404).json({ success: false, error: "Material not found" });
    }

    // ✅ No auth required for public Cloudinary URLs
    const response = await axios.get(material.fileUrl, {
      responseType: "arraybuffer",
    });

    res.set({
      "Content-Disposition": `attachment; filename="${material.originalName || "file"}"`,
      "Content-Type": response.headers["content-type"] || "application/octet-stream",
    });

    res.send(response.data);
  } catch (err) {
    console.error("❌ Download error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: "Download failed",
      details: err.message, // send actual error for debugging
    });
  }
});

module.exports = adminRouter;