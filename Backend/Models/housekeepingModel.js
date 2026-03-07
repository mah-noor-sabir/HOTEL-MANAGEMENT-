import mongoose from "mongoose";

const cleaningTaskSchema = new mongoose.Schema(
  {
    taskNumber: {
      type: String,
      unique: true,
      index: true,
    },

    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },

    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },

    roomType: {
      type: String,
      enum: ["Standard", "Deluxe", "Executive", "Family"],
      default: "Standard",
    },

    floor: {
      type: Number,
      default: 0,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    empName: {
      type: String,
      required: true,
      trim: true,
    },

    empId: {
      type: String,
      default: "",
      trim: true,
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    assignedAt: {
      type: Date,
      default: Date.now,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Under Progress", "Completed"],
      default: "Pending",
      index: true,
    },

    checklist: [
      {
        item: { type: String, required: true },
        completed: { type: Boolean, default: false },
        notes: { type: String, default: "" },
      },
    ],

    completedAt: {
      type: Date,
      default: null,
    },

    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    images: [
      {
        url: { type: String, default: "" },
        public_id: { type: String, default: "" },
      },
    ],

    isAssigned: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Auto-generate task number
cleaningTaskSchema.pre("save", function () {
  if (!this.taskNumber) {
    const stamp = Date.now().toString().slice(-6);
    this.taskNumber = `CLN-${new Date().getFullYear()}-${stamp}`;
  }

  // Set completedAt when status changes to Completed
  if (this.isModified("status") && this.status === "Completed") {
    this.completedAt = new Date();
  }
});

// Indexes for efficient queries
cleaningTaskSchema.index({ assignedTo: 1, status: 1, date: -1 });
cleaningTaskSchema.index({ roomNumber: 1, date: -1 });
cleaningTaskSchema.index({ status: 1, date: -1 });

const CleaningTask = mongoose.model("CleaningTask", cleaningTaskSchema);

export default CleaningTask;
