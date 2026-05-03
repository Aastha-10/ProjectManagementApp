const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const Project = require("../models/Project");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const populateMessage = (query) => query
  .populate("sender", "name email role")
  .populate("recipients", "name email role")
  .populate("projectId", "name");

const canAccessProject = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return { allowed: false, project: null };

  const isMember = project.members.some((member) => member.toString() === userId);
  return { allowed: isMember, project };
};

router.get("/users", authMiddleware, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } }, "name email role").sort({ name: 1 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.get("/unread-count", authMiddleware, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      type: { $in: ["direct", "broadcast", "project-file"] },
      recipients: req.user.id,
      sender: { $ne: req.user.id },
      readBy: { $ne: req.user.id }
    });

    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.post("/read", authMiddleware, async (req, res) => {
  try {
    await Message.updateMany(
      {
        type: { $in: ["direct", "broadcast", "project-file"] },
        recipients: req.user.id,
        sender: { $ne: req.user.id },
        readBy: { $ne: req.user.id }
      },
      { $addToSet: { readBy: req.user.id } }
    );

    res.json({ msg: "Inbox marked as read" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.get("/messages", authMiddleware, async (req, res) => {
  try {
    const { type = "direct", userId, projectId } = req.query;
    let filter;

    if (type === "direct") {
      if (!userId) return res.status(400).json({ msg: "Select a user to view direct chat" });
      filter = {
        type: "direct",
        $or: [
          { sender: req.user.id, recipients: userId },
          { sender: userId, recipients: req.user.id }
        ]
      };
    } else if (type === "broadcast") {
      filter = req.user.role === "admin"
        ? { type: "broadcast" }
        : { type: "broadcast", recipients: req.user.id };
    } else if (type === "post") {
      const admins = await User.find({ role: "admin" }, "_id");
      filter = { type: "post", sender: { $in: admins.map((admin) => admin._id) } };
    } else if (type === "project-file") {
      filter = { type: "project-file" };
      if (projectId) filter.projectId = projectId;
      if (req.user.role !== "admin") {
        const projects = await Project.find({ members: req.user.id }, "_id");
        filter.projectId = projectId
          ? projectId
          : { $in: projects.map((project) => project._id) };
      }
    } else {
      return res.status(400).json({ msg: "Invalid inbox type" });
    }

    const messages = await populateMessage(Message.find(filter).sort({ createdAt: 1 }));

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.post("/direct", authMiddleware, async (req, res) => {
  try {
    const { recipientId, body, attachments = [] } = req.body;

    if (!recipientId) return res.status(400).json({ msg: "Recipient is required" });
    if (!body && attachments.length === 0) {
      return res.status(400).json({ msg: "Message or attachment is required" });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) return res.status(404).json({ msg: "Recipient not found" });

    const message = new Message({
      type: "direct",
      sender: req.user.id,
      recipients: [recipientId],
      body,
      readBy: [req.user.id],
      attachments
    });

    await message.save();
    res.status(201).json(await populateMessage(Message.findById(message._id)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.post("/broadcast", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const { recipientIds, body, attachments = [] } = req.body;

    if (!body && attachments.length === 0) {
      return res.status(400).json({ msg: "Broadcast text or attachment is required" });
    }

    const recipients = recipientIds?.length
      ? recipientIds
      : (await User.find({ role: "member" }, "_id")).map((user) => user._id);

    const message = new Message({
      type: "broadcast",
      sender: req.user.id,
      recipients,
      body,
      readBy: [req.user.id],
      attachments
    });

    await message.save();
    res.status(201).json(await populateMessage(Message.findById(message._id)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.post("/posts", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const { body, attachments = [] } = req.body;

    if (!body && attachments.length === 0) {
      return res.status(400).json({ msg: "Post text or attachment is required" });
    }

    const message = new Message({
      type: "post",
      sender: req.user.id,
      body,
      readBy: [req.user.id],
      attachments
    });

    await message.save();
    res.status(201).json(await populateMessage(Message.findById(message._id)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.post("/project-files", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const { projectId, body, assignmentTitle, attachments = [] } = req.body;

    if (!projectId) return res.status(400).json({ msg: "Project is required" });
    if (!body && !assignmentTitle && attachments.length === 0) {
      return res.status(400).json({ msg: "Add a note, assignment title, or attachment" });
    }

    const { allowed, project } = await canAccessProject(projectId, req.user.id);
    if (!project) return res.status(404).json({ msg: "Project not found" });

    if (!allowed && req.user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const recipients = project.members.filter((member) => member.toString() !== req.user.id);

    const message = new Message({
      type: "project-file",
      sender: req.user.id,
      recipients,
      projectId,
      body,
      assignmentTitle,
      readBy: [req.user.id],
      attachments
    });

    await message.save();
    res.status(201).json(await populateMessage(Message.findById(message._id)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
