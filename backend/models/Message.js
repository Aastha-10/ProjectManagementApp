const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema({
  name: String,
  type: String,
  size: Number,
  dataUrl: String
}, { _id: false });

const messageSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["direct", "broadcast", "post", "project-file"],
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  recipients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project"
  },
  body: {
    type: String,
    default: ""
  },
  assignmentTitle: {
    type: String,
    default: ""
  },
  attachments: [attachmentSchema]
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);
