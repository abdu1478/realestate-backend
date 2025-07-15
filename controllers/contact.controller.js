const { UserMessage} = require("../models/model");
const dotenv = require("dotenv");

dotenv.config();

exports.submitMessage = async (req, res, next) => {
  try {
    const { fullName, email, phone, message, propertyId, sourcePage } =
      req.body;

    // Create new message document
    const userMessage = new UserMessage({
      fullName,
      email,
      phone,
      message,
      subject: req.body.subject || "General Inquiry",
      sourcePage: sourcePage || "Contact Us Page",
      propertyId: propertyId || null,
      userId: req.user?.id || null,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    await userMessage.save();

    res.status(201).json({
      success: true,
      message: "Message submitted successfully",
      data: userMessage,
    });
    console.log(
      "Message submitted successfully:",
      req.headers["user-agent"],
      req.ip
    );
  } catch (error) {
    console.error("Error submitting message:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to submit message",
    });
  }
};