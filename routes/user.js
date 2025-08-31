const { Router } = require("express");
const jwt = require("jsonwebtoken");
const { userAuthe, JWT_SECRET_USER } = require("../AuthMiddleware/userAuth");
const bcrypt = require("bcrypt");
const { z } = require("zod");
const { UserModel, PurchaseModel, CourseModel } = require("../db"); // Added CourseModel
const userRouter = Router();

// --- Signup ---
userRouter.post("/signup", async function (req, res) {
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
    
    await UserModel.create({
      email,
      password: hashedPassword,
      firstname: firstName,
      lastname: lastName,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully!",
      user: {
        firstName,
        lastName,
        email,
      }
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

// --- Login ---
userRouter.post("/login", async function (req, res) {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  try {
    const user = await UserModel.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign(
        { id: user._id.toString() },
        JWT_SECRET_USER,
        { expiresIn: "1h" }
      );

      return res.status(200).json({
        success: true,
        message: "Login successful!",
        token,
        user: {
          id: user._id,
          firstName: user.firstname,
          lastName: user.lastname,
          email: user.email
        }
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

// --- 1. View All Courses (Created by all admins) ---
userRouter.get("/explore", userAuthe, async function(req, res) {
  try {
    // Get all courses with admin details
    console.log("GET /user/explore userId:", req.userId); // <— here
    const courses = await CourseModel.find({})
      .populate('Admin', 'firstName lastName email') // Populate admin details
      .sort({ createdAt: -1 }); // Latest courses first

    // Get user's purchased courses
    const userPurchases = await PurchaseModel.find({ 
      UserId: req.userId 
    }).select('CourseId');
    
    const purchasedCourseIds = userPurchases.map(purchase => 
      purchase.CourseId.toString()
    );

    // Add purchase status to each course
    const coursesWithStatus = courses.map(course => ({
      ...course.toObject(),
      isPurchased: purchasedCourseIds.includes(course._id.toString())
    }));

    res.json({
      success: true,
      message: "Courses retrieved successfully",
      courses: coursesWithStatus,
      totalCourses: courses.length
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching courses" 
    });
  }
});

// --- Search Courses ---
userRouter.get("/search", userAuthe, async function(req, res) {
  const { q, category, minPrice, maxPrice } = req.query;
  
  try {
    let searchQuery = {};
    
    // Text search
    if (q) {
      searchQuery.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }
    
    // Price range filter
    if (minPrice || maxPrice) {
      searchQuery.price = {};
      if (minPrice) searchQuery.price.$gte = parseFloat(minPrice);
      if (maxPrice) searchQuery.price.$lte = parseFloat(maxPrice);
    }

    const courses = await CourseModel.find(searchQuery)
      .populate('Admin', 'firstName lastName email')
      .sort({ createdAt: -1 });

    // Get user's purchased courses
    const userPurchases = await PurchaseModel.find({ 
      UserId: req.userId 
    }).select('CourseId');
    
    const purchasedCourseIds = userPurchases.map(purchase => 
      purchase.CourseId.toString()
    );

    const coursesWithStatus = courses.map(course => ({
      ...course.toObject(),
      isPurchased: purchasedCourseIds.includes(course._id.toString())
    }));

    res.json({
      success: true,
      courses: coursesWithStatus,
      totalResults: courses.length,
      searchQuery: { q, category, minPrice, maxPrice }
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error during search" 
    });
  }
});

// --- 2. Purchase Course ---
userRouter.post("/purchase", userAuthe, async function(req, res) {
  const { courseid } = req.body;
  const userid = req.userId;

  if (!courseid) {
    return res.status(400).json({
      success: false,
      message: "Course ID is required"
    });
  }

  try {
    // Check if course exists
    const course = await CourseModel.findById(courseid);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    // Check if already purchased
    const alreadyPurchased = await PurchaseModel.findOne({
      UserId: userid,
      CourseId: courseid,
    });

    if (alreadyPurchased) {
      return res.status(400).json({
        success: false,
        message: "You have already purchased this course."
      });
    }

    // Create purchase record
    const purchase = await PurchaseModel.create({ 
      UserId: userid, 
      CourseId: courseid,
      purchaseDate: new Date(),
      amount: course.price || 0
    });

    // Populate course details in response
    const purchaseWithDetails = await PurchaseModel.findById(purchase._id)
      .populate('CourseId', 'title description price thumbnailUrl')
      .populate('UserId', 'firstname lastname email');

    res.json({
      success: true,
      message: "Course purchased successfully!",
      purchase: purchaseWithDetails
    });
  } catch (error) {
    console.error("Purchase error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error during purchase" 
    });
  }
});

// --- 3. Get User's Purchased Courses ---
userRouter.get("/mypurchase", userAuthe, async function(req, res) {
  try {
    const purchases = await PurchaseModel.find({ 
      UserId: req.userId 
    })
    .populate('CourseId', 'title description price thumbnailUrl videoUrl createdAt')
    .populate('UserId', 'firstname lastname email')
    .sort({ purchaseDate: -1 });

    const purchasedCourses = purchases.map(purchase => ({
      purchaseId: purchase._id,
      purchaseDate: purchase.purchaseDate,
      amount: purchase.amount,
      course: purchase.CourseId
    }));

    res.json({
      success: true,
      message: "Your purchased courses retrieved successfully",
      purchases: purchasedCourses,
      totalPurchases: purchases.length
    });
  } catch (error) {
    console.error("Error fetching purchases:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching your courses" 
    });
  }
});



// --- 4. Watch Course (Only if purchased) ---
userRouter.get("/watch/:courseid", userAuthe, async function(req, res) {
  const { courseid } = req.params;
  const userid = req.userId;

  try {
    // Check if user has purchased the course
    const purchase = await PurchaseModel.findOne({
      UserId: userid,
      CourseId: courseid,
    });

    if (!purchase) {
      return res.status(403).json({
        success: false,
        message: "You need to purchase this course to watch it"
      });
    }

    // Get full course details
    const course = await CourseModel.findById(courseid)
      .populate('Admin', 'firstName lastName email');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    res.json({
      success: true,
      message: "Course access granted",
      course: {
        ...course.toObject(),
        purchaseDate: purchase.purchaseDate,
        watchAccess: true
      }
    });
  } catch (error) {
    console.error("Watch course error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while accessing course" 
    });
  }
});

// --- 5. Get Course Details (Free preview) ---
userRouter.get("/course/:courseid", userAuthe, async function(req, res) {
  const { courseid } = req.params;
  
  try {
    const course = await CourseModel.findById(courseid)
      .populate('Admin', 'firstName lastName email');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    // Check if user has purchased
    const purchase = await PurchaseModel.findOne({
      UserId: req.userId,
      CourseId: courseid,
    });

    res.json({
      success: true,
      course: {
        ...course.toObject(),
        isPurchased: !!purchase,
        // Only show video URL if purchased
        videoUrl: purchase ? course.videoUrl : null
      }
    });
  } catch (error) {
    console.error("Get course error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching course details" 
    });
  }
});

module.exports = userRouter;