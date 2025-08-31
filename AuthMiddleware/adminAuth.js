const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

// Import JWT_SECRET_ADMIN from your config file
const { JWT_SECRET_ADMIN } = require("../config");

async function adminAuthe(req, res, next) {
    let token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "No token provided!"
        });
    }

    // Remove "Bearer " prefix if present
    if (token.startsWith('Bearer ')) {
        token = token.slice(7);
    }

    try {
        const userdetails = jwt.verify(token, JWT_SECRET_ADMIN);
        
        if (userdetails && userdetails.id) {
            // Convert string ID to ObjectId for proper comparison
            req.userid = new mongoose.Types.ObjectId(userdetails.id);
            console.log("🔍 Decoded admin ID:", req.userid.toString());
            next();
        } else {
            return res.status(401).json({
                success: false,
                message: "Invalid token structure!"
            });
        }
    } catch (error) {
        console.error("❌ JWT verification error:", error.message);
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token!"
        });
    }
}

module.exports = {
    adminAuthe,
    JWT_SECRET_ADMIN
};