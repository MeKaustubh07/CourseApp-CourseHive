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
  type: { type: String, enum: ["material", "paper"], required: true },
  fileUrl: { type: String, required: true }, // store Cloudinary's secure_url
  publicId: { type: String }, // for future delete/transformations
  originalName: { type: String },
  fileSize: { type: Number },
  mimeType: { type: String },
  Admin: { type: mongoose.Schema.Types.ObjectId, ref: "admin", required: true },
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