const express = require("express");
const multer = require("multer");

const router = express.Router();

const storage = multer.diskStorage({
 destination: function (req, file, cb) {
   cb(null, "uploads/");
 },
 filename: function (req, file, cb) {
   cb(null, Date.now() + "_" + file.originalname);
 }
});

const upload = multer({ storage: storage });

module.exports = { router, upload };