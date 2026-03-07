import mongoose from "mongoose";

const checklistItemSchema = new mongoose.Schema(
  {
    checkPoint: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["House Keeper", "Laundry"],
      default: "House Keeper",
      index: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    order: {
      type: Number,
      default: 0,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

checklistItemSchema.index({ type: 1, isActive: 1 });

const ChecklistItem = mongoose.model("ChecklistItem", checklistItemSchema);

export default ChecklistItem;
