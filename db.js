// db.js
const mongoose = require("mongoose");
const { Schema, Types: { ObjectId } } = mongoose;

const User = new Schema({
  email: { type: String, unique: true },
  password: String,
  firstName: String,
  lastName: String
}, { timestamps: true });

const Admin = new Schema({
  email: { type: String, unique: true },
  password: String,
  firstName: String,
  lastName: String
}, { timestamps: true });

const Course = new Schema({
  title: { type: String, required: true },
  description: String,
  videoUrl: { type: String },        // ✅ standardized
  thumbnailUrl: { type: String },    // ✅ standardized
  price: { type: Number, default: 0 },
  Admin: { type: ObjectId, ref: "admin", required: true }
}, { timestamps: true });

const Purchase = new Schema({
  UserId: { type: ObjectId, ref: "users", required: true },
  CourseId: { type: ObjectId, ref: "course", required: true },
  purchaseDate: { type: Date, default: Date.now },
  amount: { type: Number, default: 0 }
}, { timestamps: true });

const Upload = new Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ["material", "paper"], required: true }, // category
  fileUrl: { type: String, required: true },
  viewUrl: { type: String }, // Viewer-friendly URL
  publicId: { type: String }, // Cloudinary public ID for future operations
  originalName: { type: String }, // Original filename
  fileSize: { type: Number }, // File size in bytes
  mimeType: { type: String }, // File MIME type
  Admin: { type: mongoose.Schema.Types.ObjectId, ref: "admin", required: true }, // ✅ updated
}, { timestamps: true });

const MaterialModel = mongoose.model("upload", Upload);
const UserModel = mongoose.model("users", User);
const AdminModel = mongoose.model("admin", Admin);
const CourseModel = mongoose.model("course", Course);
const PurchaseModel = mongoose.model("purchase", Purchase);

module.exports = {
  UserModel,
  AdminModel,
  CourseModel,
  PurchaseModel,
  MaterialModel
};