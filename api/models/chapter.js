const mongoose = require("mongoose");

const chapterSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  chapterid: {
    type: String,
    unique: true,
  },
  comictitle: String,
  chapternumber: Number,
  chapterfiles: [String],
});

module.exports = mongoose.model("Chapters", chapterSchema);
