const mongoose = require("mongoose");
const character = require("./character");

// Any datatype/Schema encapsulated in [] becomes an Array datatype
// We pass it in as an object because we also need to set the default return value as undefined.
// Otherwise it passes [] as default value which may break stuff as we expect an array output from the query
// and an empty array qualifies as one.

const comicSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  title: {
    type: String,
    unique: true,
  },
  characters: [String],
  chapters: {
    type: [String],
    default: [],
  },
  creationtimestamp: {
    type: Date,
    default: Date.now(),
  },
  lastupdatetimestamp: {
    type: Date,
    default: Date.now(),
  },
  status: {
    type: String,
    enum: ["Ongoing", "Complete"],
    default: "Ongoing",
  },
});

module.exports = mongoose.model("Comics", comicSchema);
