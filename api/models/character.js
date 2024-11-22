const mongoose = require("mongoose");

const charaSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: {
    type: String,
    unique: true,
  },
  partofcomics: {
    type: [String],
    default: [],
  },
  thumbimage: {
    type: String,
    default: "",
  },
  bioimage: {
    type: String,
    default: "",
  },
});

module.exports = mongoose.model("Characters", charaSchema);
