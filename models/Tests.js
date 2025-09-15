// models/Test.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const QuestionSchema = new Schema({
  text: { type: String, required: true },
  options: [{ type: String, required: true }], // must have >=2
  correctIndex: { type: Number, required: true }, // 0-based
  marks: { type: Number, default: 1 },
  negativeMarks: { type: Number, default: 0 }, // optional
});

const TestSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  subject: { type: String, default: "" },
  durationMinutes: { type: Number, required: true }, // minutes
  totalMarks: { type: Number, default: 0 }, // auto-calculated
  questions: [QuestionSchema],
  createdBy: { type: Schema.Types.ObjectId, ref: 'admin', required: true },
  published: { type: Boolean, default: true }, // ✅ default true so visible
  allowRetake: { type: Boolean, default: false },
}, { timestamps: true });

// ✅ Auto-calc totalMarks from questions before save
TestSchema.pre('save', function (next) {
  if (this.questions && this.questions.length > 0) {
    this.totalMarks = this.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
  }
  next();
});

module.exports = mongoose.model('Test', TestSchema);