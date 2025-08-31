// Import the Router object from express to create course-related routes
const { Router } = require("express");
const courseRouter = Router();

// Import purchaseModel and courseModel to interact with the database
const { PurchaseModel, CourseModel } = require("../db");

// Import middleware to authenticate users
const { userAuthe } = require("../AuthMiddleware/userAuth");

/**
 * POST /purchase
 * Allows an authenticated user to purchase a course.
 */
courseRouter.post("/purchase", userAuthe, async (req, res) => {
  try {
    const userId = req.userId;
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid courseId",
      });
    }

    // Check if course exists
    const course = await CourseModel.findById(courseId).lean();
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if already purchased
    const existingPurchase = await PurchaseModel.findOne({ courseId, userId });
    if (existingPurchase) {
      return res.status(400).json({
        success: false,
        message: "You have already purchased this course",
      });
    }

    // Create purchase
    await PurchaseModel.create({ courseId, userId });

    return res.status(201).json({
      success: true,
      message: "Course purchased successfully",
      courseId: courseId,
    });
  } catch (err) {
    console.error("Purchase error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error while purchasing course",
    });
  }
});

/**
 * GET /preview
 * Returns a list of all courses (public endpoint, no login required).
 */
courseRouter.get("/preview", userAuthe ,async (req, res) => {
  try {
    // Only return essential fields (no sensitive info)
    const courses = await CourseModel
      .find({}, "title description price")
      .lean();

    return res.status(200).json({
      success: true,
      courses: courses,
    });
  } catch (err) {
    console.error("Preview error:", err);
    return res.status(500).json({
      success: false,
      message: "Error fetching courses",
    });
  }
});

// Export router
module.exports = courseRouter;