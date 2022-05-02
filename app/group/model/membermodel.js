const mongoose = require("mongoose");

var memberSchema = new mongoose.Schema(
  {
    group_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "group",
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
    },
    role: {
      type: String,
      enum: ["Member", "Admin", "", "Owner"],
      default: "Member",
    },
    member_status: {
      type: String,
      enum: ["Group Member", "Group-left", "Blocked", "Banned", ""],
      default: "Group Member",
    },
    status: {
      type: String,
      enum: ["Approve", "Pending", "Reject", "RequestToJoin", "Blocked"],
      default: "Pending",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GroupMember", memberSchema);
