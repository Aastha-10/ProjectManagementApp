const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const Project = require("../models/Project");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// POST /api/tasks - Create project tasks or personal todos
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, description, projectId, assignedTo, deadline, priority, source, emailFrom, emailSubject, taskType } = req.body;

    if (!title) {
      return res.status(400).json({ msg: "Title is required" });
    }

    const taskPriority = Number(priority || 3);
    if (!Number.isInteger(taskPriority) || taskPriority < 1 || taskPriority > 5) {
      return res.status(400).json({ msg: "Priority must be between 1 and 5" });
    }

    const isAdmin = req.user.role === "admin";
    const isPersonalTodo = taskType === "personal" || !isAdmin;
    const taskProjectId = !isPersonalTodo && isAdmin ? projectId : undefined;
    const taskAssignedTo = isPersonalTodo ? req.user.id : assignedTo;

    if (!isPersonalTodo && !taskAssignedTo) {
      return res.status(400).json({ msg: "Assigned member is required" });
    }

    if (!isPersonalTodo) {
      const assignedUser = await User.findById(taskAssignedTo);
      if (!assignedUser || assignedUser.role !== "member") {
        return res.status(400).json({ msg: "Tasks can only be assigned to members" });
      }
    }

    if (taskProjectId) {
      const project = await Project.findById(taskProjectId);
      if (!project) return res.status(404).json({ msg: "Project not found" });
    }

    const task = new Task({
      title,
      description,
      taskType: isPersonalTodo ? "personal" : "task",
      projectId: taskProjectId || undefined,
      assignedTo: taskAssignedTo,
      status: "todo",
      deadline,
      priority: taskPriority,
      source: source === "email" ? "email" : "manual",
      emailFrom,
      emailSubject
    });

    await task.save();
    res.status(201).json(task);

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/tasks?projectId=xxx - Get tasks for a project
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { projectId, scope } = req.query;
    const filter = {};

    if (scope === "personal") {
      filter.assignedTo = req.user.id;
      filter.$or = [
        { taskType: "personal" },
        { taskType: { $exists: false }, projectId: { $exists: false } }
      ];
    } else {
      filter.$or = [
        { taskType: "task" },
        { taskType: { $exists: false }, projectId: { $exists: true } }
      ];

      if (projectId) filter.projectId = projectId;

      // Members only see assigned shared tasks; admins see shared tasks for all members.
      if (req.user.role !== "admin") {
        filter.assignedTo = req.user.id;
      }
    }

    const tasks = await Task.find(filter)
      .populate("assignedTo", "name email")
      .populate("projectId", "name");

    res.json(tasks);

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/tasks/dashboard - Dashboard stats
router.get("/dashboard", authMiddleware, async (req, res) => {
  try {
    const sharedTaskFilter = {
      $or: [
        { taskType: "task" },
        { taskType: { $exists: false }, projectId: { $exists: true } }
      ]
    };
    const filter = req.user.role === "admin"
      ? sharedTaskFilter
      : { ...sharedTaskFilter, assignedTo: req.user.id };
    const now = new Date();

    const [total, todo, inProgress, done, overdue] = await Promise.all([
      Task.countDocuments(filter),
      Task.countDocuments({ ...filter, status: "todo" }),
      Task.countDocuments({ ...filter, status: "in-progress" }),
      Task.countDocuments({ ...filter, status: "done" }),
      Task.countDocuments({ ...filter, status: { $ne: "done" }, deadline: { $lt: now } })
    ]);

    res.json({ total, todo, inProgress, done, overdue });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// PATCH /api/tasks/:id/status - Update task status
router.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    if (!["todo", "in-progress", "done"].includes(status)) {
      return res.status(400).json({ msg: "Invalid status value" });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: "Task not found" });

    // Personal todos are private to the creator. Shared tasks can be updated by admin or assignee.
    const isAssigned = task.assignedTo?.toString() === req.user.id;
    if (task.taskType === "personal" && !isAssigned) {
      return res.status(403).json({ msg: "Not authorized to update this todo" });
    }

    if (!isAssigned && req.user.role !== "admin") {
      return res.status(403).json({ msg: "Not authorized to update this task" });
    }

    task.status = status;
    await task.save();

    res.json(task);

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// DELETE /api/tasks/:id - Delete task (Admin only)
router.delete("/:id", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ msg: "Task not found" });

    res.json({ msg: "Task deleted" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
