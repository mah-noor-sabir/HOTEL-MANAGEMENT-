import mongoose from "mongoose";

const serviceRequestSchema = new mongoose.Schema(
  {
    requestNumber: {
      type: String,
      unique: true,
      index: true,
    },

    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    guestSnapshot: {
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
    },

    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },

    serviceType: {
      type: String,
      required: true,
      enum: [
        "Housekeeping",
        "Room Service",
        "Maintenance",
        "Concierge",
        "Laundry",
        "Other",
      ],
      index: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
    },

    priority: {
      type: String,
      required: true,
      enum: ["Low", "Normal", "High", "Urgent"],
      default: "Normal",
      index: true,
    },

    status: {
      type: String,
      required: true,
      enum: ["Pending", "In Progress", "Completed", "Cancelled"],
      default: "Pending",
      index: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    assignedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    response: {
      type: String,
      default: "",
      trim: true,
    },

    responseBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    responseAt: {
      type: Date,
      default: null,
    },

    images: [
      {
        url: { type: String, default: "" },
        public_id: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

// Auto-generate request number
serviceRequestSchema.pre("save", function () {
  if (!this.requestNumber) {
    const stamp = Date.now().toString().slice(-6);
    this.requestNumber = `SVC-${new Date().getFullYear()}-${stamp}`;
  }

  // Set completedAt when status changes to Completed
  if (this.isModified("status") && this.status === "Completed") {
    this.completedAt = new Date();
  }
});

// Indexes for efficient queries
serviceRequestSchema.index({ guest: 1, createdAt: -1 });
serviceRequestSchema.index({ status: 1, priority: -1 });
serviceRequestSchema.index({ serviceType: 1, status: 1 });

const ServiceRequest = mongoose.model("ServiceRequest", serviceRequestSchema);

export default ServiceRequest;
