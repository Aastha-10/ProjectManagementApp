const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project"
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  taskType: {
    type: String,
    enum: ["task", "personal"],
    default: "task"
  },
  status: {
    type: String,
    enum: ["todo", "in-progress", "done"],
    default: "todo"
  },
  deadline: {
    type: Date
  },
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  source: {
    type: String,
    enum: ["manual", "email"],
    default: "manual"
  },
  emailFrom: {
    type: String
  },
  emailSubject: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model("Task", taskSchema);
