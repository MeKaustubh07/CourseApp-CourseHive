// models/Attempt.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const AnswerSchema = new Schema({
  questionIndex: { type: Number, required: true }, // index in test.questions
  selectedIndex: { type: Number, required: false }, // null if skipped
  isCorrect: { type: Boolean, default: false },
  marksObtained: { type: Number, default: 0 },
});

const AttemptSchema = new Schema({
  testId: { type: Schema.Types.ObjectId, ref: 'Test', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'users', required: true },

  startedAt: { type: Date, default: Date.now },
  submittedAt: { type: Date }, // null until submitted
  durationTakenSeconds: { type: Number, default: 0 },

  answers: [AnswerSchema],
  score: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },

  status: { 
    type: String, 
    enum: ['in-progress', 'submitted', 'graded', 'auto-submitted'], 
    default: 'in-progress' 
  },
}, { timestamps: true });

// ✅ Virtual for quick leaderboard fetch
AttemptSchema.virtual('percentage').get(function () {
  return this.maxScore > 0 ? (this.score / this.maxScore) * 100 : 0;
});

module.exports = mongoose.model('Attempt', AttemptSchema);