const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const character = require("./api/models/character");
const mongopwd = process.env.MONGO_DB_PWD;

app.use("/Chapters", express.static("Images/Comics"));
app.use("/Charas", express.static("Images/Characters"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const routeComic = require("./api/routes/comic");
const routeCharacter = require("./api/routes/character");

// Cache, will replace with Redis later on
app.locals.charaLst = [];

mongoose.connect("mongodb+srv://Admin:" + mongopwd + "@demo-cluster.jurs58l.mongodb.net/ChivalrousData?retryWrites=true&w=majority").then(
  // Cache list of characters as a JSON file with _id as key and nested JSON object with other details inside it
  // the empty JSON object- {}, means match all documents
  character
    .find({})
    .exec()
    .then((charArr) => {
      charArr.forEach((chara) => {
        const formatted = { objID: chara._id, name: chara.name, comics: chara.partofcomics, portrait: chara.thumbimage, bio: chara.bioimage };
        app.locals.charaLst.push(formatted);
      });
    })
    .catch((err) => {
      console.log(err);
    })
);

// Handle CORS errors. CORS: Cross-Origin Resorce Sharing
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  // Everytime the browser gets told to send a POST, PUT, etc., it sends an OPTIONS request first
  // to check wether it is allowed to send the method or not. This is to handle that and return a response
  if (req.method === "OPTIONS") {
    res.header("Acces-Control-Allow", "PUT,POST,PATCH,DELETE,GET");
    return res.status(200).json({});
  }
  next();
});

app.use("/comics", routeComic);
app.use("/characters", routeCharacter);

// Catch all errors
app.use((req, res, next) => {
  const error = new Error("No such route with given name found. Please check the documentation");
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.json({
    error: {
      message: error.message,
    },
  });
});
module.exports = app;
