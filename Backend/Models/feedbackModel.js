import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    guestName: {
      type: String,
      required: true,
      trim: true,
    },

    guestEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    roomNumber: {
      type: String,
      default: "",
      trim: true,
    },

    category: {
      type: String,
      required: true,
      enum: [
        "Service",
        "Cleanliness",
        "Facilities",
        "Staff",
        "Food",
        "Other",
      ],
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    comments: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true,
    },

    status: {
      type: String,
      enum: ["New", "Acknowledged", "In Review", "Resolved"],
      default: "New",
      index: true,
    },

    adminResponse: {
      type: String,
      default: "",
      trim: true,
    },

    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    respondedAt: {
      type: Date,
      default: null,
    },

    isPublic: {
      type: Boolean,
      default: false,
    },

    helpful: {
      type: Number,
      default: 0,
    },

    notHelpful: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
feedbackSchema.index({ guest: 1, createdAt: -1 });
feedbackSchema.index({ rating: 1, createdAt: -1 });
feedbackSchema.index({ category: 1, rating: 1 });
feedbackSchema.index({ status: 1, createdAt: -1 });

const Feedback = mongoose.model("Feedback", feedbackSchema);

export default Feedback;
