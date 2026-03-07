import mongoose from "mongoose";

const maintenanceRequestSchema = new mongoose.Schema(
  {
    requestNumber: {
      type: String,
      unique: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      enum: [
        "Electrical",
        "Plumbing",
        "HVAC",
        "Carpentry",
        "Appliances",
        "Other",
      ],
      index: true,
    },

    priority: {
      type: String,
      required: true,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
      index: true,
    },

    status: {
      type: String,
      required: true,
      enum: ["pending", "in-progress", "completed", "cancelled"],
      default: "pending",
      index: true,
    },

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    reporterSnapshot: {
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      role: { type: String, default: "" },
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    assigneeSnapshot: {
      name: { type: String, default: "" },
      role: { type: String, default: "" },
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    assignedAt: {
      type: Date,
      default: null,
    },

    statusHistory: [
      {
        status: {
          type: String,
          enum: ["pending", "in-progress", "completed", "cancelled"],
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
        notes: {
          type: String,
          default: "",
          trim: true,
        },
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

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancelReason: {
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

    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

// Auto-generate request number
maintenanceRequestSchema.pre("save", function () {
  if (!this.requestNumber) {
    const stamp = Date.now().toString().slice(-6);
    this.requestNumber = `MNT-${new Date().getFullYear()}-${stamp}`;
  }

  // Track status changes
  if (this.isModified("status")) {
    this.statusHistory.push({
      status: this.status,
      updatedBy: this.status === "completed" ? this.completedBy : this.status === "cancelled" ? this.cancelledBy : this._id,
      updatedAt: new Date(),
    });
  }

  // Set completedAt when status changes to completed
  if (this.isModified("status") && this.status === "completed") {
    this.completedAt = new Date();
  }

  // Set cancelledAt when status changes to cancelled
  if (this.isModified("status") && this.status === "cancelled") {
    this.cancelledAt = new Date();
  }
});

// Indexes for efficient queries
maintenanceRequestSchema.index({ status: 1, priority: -1, createdAt: -1 });
maintenanceRequestSchema.index({ category: 1, status: 1 });
maintenanceRequestSchema.index({ reportedBy: 1, createdAt: -1 });
maintenanceRequestSchema.index({ assignedTo: 1, status: 1 });

const MaintenanceRequest = mongoose.model(
  "MaintenanceRequest",
  maintenanceRequestSchema
);

export default MaintenanceRequest;
