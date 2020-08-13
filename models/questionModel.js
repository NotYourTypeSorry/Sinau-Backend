const mongoose = require('mongoose');
const Exam = require('./examModel');

const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, 'A question must have an answer']
    },
    choices: [
      {
        type: String,
        minLength: 2,
        maxLength: 5,
        required: [true, 'A question must have a choices']
      }
    ],
    correctAnswer: {
      type: Number,
      required: [true, 'A question must have an correct answer']
    },
    questiontype: {
      type: String,
      enum: ['a', 'b', 'c', 'd'],
      default: 'a'
    },
    session: {
      type: String,
      required: [true, 'A question must have a session']
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'catastrophic'],
      default: 'medium'
    },
    exam: {
      type: mongoose.Schema.ObjectId,
      ref: 'Exam',
      required: [true, 'Question must belong to an exam']
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

questionSchema.index({ exam: 1, session: 1 });

//* DOCUMENT MIDDLEWARE

questionSchema.post('save', async function() {
  await this.constructor.calcAverageRatings(this.exam);
});

//* QUERY MIDDLEWARE

questionSchema.pre(/^findOneAnd/, async function(next) {
  this.r = await this.findOne();
  next();
});

questionSchema.post(/^findOneAnd/, async function() {
  await this.r.constructor.calcQuestions(this.r.exam);
});

questionSchema.statics.calcQuestions = async function(examId) {
  const stats = await this.aggregate([
    {
      $match: { exam: examId }
    },
    {
      $group: {
        _id: '$exam',
        totalQuestions: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    await Exam.findByIdAndUpdate(examId, {
      totalQuestions: stats[0].totalQuestions
    });
  }
};

const Question = mongoose.model('Question', questionSchema);

module.exports = Question;