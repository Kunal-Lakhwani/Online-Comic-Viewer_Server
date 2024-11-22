const express = require("express");
const router = express.Router();
const Comic = require("../models/comic");
const mongoose = require("mongoose");
const multer = require("multer");
const Chapter = require("../models/chapter");
const Character = require("../models/character");

/* 
    Functionalities:
    GET:
      baseurl/comics
        -> Get info of all comics in the db. Can take loadFromTimestamp and loadAmt args.
        -> to load after last comic updated on loadFromTimeStamp to loadAmt comics.

      baseurl/comics/:comicTitle/:chapterNumber
        -> Get images associated with a specific chapter of a comic.

    POST:
      baseurl/comics/CreateComic
        -> Create a new comic entry in the database.
        -> Takes JSON body with comic title and array of characters involved as request body.

      baseurl/comics/UploadChapter
        -> Add new chapter to existing comic.
        -> Takes form data with comic title, chapter number, image array as request body.
        -> Optionally can take an array of characters which can be appended to the comic.
*/

let fileIdx = 1;

const storage = multer.diskStorage({
  destination: (req, file, saveLocation) => {
    saveLocation(null, "./Images/Comics/");
  },
  filename: (req, file, saveFile) => {
    try {
      const comicTitle = req.body.comictitle.replaceAll(" ", "_");
      const chapterNumber = (req.body.chapternumber < 10 ? "_0" : "_") + req.body.chapternumber;
      const imgCount = "_" + (fileIdx < 10 ? "0" : "") + fileIdx;
      const fileMime = file.mimetype.split("/");
      const fileExtension = "." + fileMime[fileMime.length - 1];
      const newFileName = "" + comicTitle + chapterNumber + imgCount + fileExtension;
      saveFile(null, newFileName);
      fileIdx++;
    } catch (error) {
      // saveFile({ message: "Error, please make sure that the files are sent at the end of the chapter info" });
      saveFile({ message: error.message });
    }
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image.png") {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file format"), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

/*
    body{
      loadFromTimestamp: Updation date-time of last object loaded
      loadAmt: Amount of more documents to load
    }
*/

router.get("/", (req, res, next) => {
  //  TODO: Implement loadFromTimeStamp and loadAmt on clientside

  //If loadFromTimeStamp is empty, set it to tomorrows date to fetch most recent comics
  const loadFrom = req.body.loadFromTimeStamp || new Date() + 1;
  // const loadAmt = Number(req.body.loadAmt) || 20;
  let formattedArr = [];
  // Get all comics within the given limit whose creation timestamp is less than loadFrom
  Comic.find({ lastupdatetimestamp: { $lt: loadFrom } })
    .sort("lastupdatetimestamp")
    .exec()
    .then((loadedComics) => {
      formattedArr = loadedComics.map((ldComic) => {
        return {
          Title: ldComic.title,
          Chapters: ldComic.chapters,
          Characters: ldComic.characters,
          CreatedAt: ldComic.creationtimestamp,
          UpdatedAt: ldComic.lastupdatetimestamp,
          Status: ldComic.status,
        };
      });
      res.header("Content-Type", "application/JSON");
      res.status(200).send(formattedArr);
    });
});

// Returns first image of every chapter in a comic. Takes chapter _id array as body
router.get("/ChapterThumbnails", (req, res, next) => {
  const chapterLst = req.body.chapterslst;
  console.log("Sent request: " + JSON.stringify(req.body));
  Chapter.find({ _id: { $in: chapterLst } })
    .select("chapterfiles")
    .exec()
    .then((docLst) => {
      // TODO figure out a way to fetch only first image of a chapter
      const thumbnails = docLst.map((doc) => {
        return doc.chapterfiles[0];
      });
      res.status(200).json({
        thumbnails: thumbnails,
      });
    })
    .catch((err) => {
      res.status(500).json({ message: err.message });
    });
});

// Return all images associated with a comic

router.get("/:comictitle/All", (req, res, next) => {
  const chTitle = req.params.comictitle;
  const chID = chTitle.toLocaleLowerCase().replace(" ", "");
  Chapter.find({ chapterid: { $regex: chID, $options: "i" } })
    .select("chapterfiles")
    .exec()
    .then((chapters) => {
      let fileArr = [];

      chapters.forEach((chapterDoc) => {
        fileArr = fileArr.concat(chapterDoc.chapterfiles);
      });

      const response = {
        count: fileArr.length,
        images: fileArr,
      };
      res.status(200).json({
        message: "Fetching images of " + chTitle,
        payload: response,
      });
    });
});

/*
    Returns all images associated with specified chapter
*/

router.get("/:comictitle/:chapternumber", (req, res, next) => {
  const chTitle = req.params.comictitle;
  const chNum = req.params.chapternumber;
  const chID = chTitle.toLocaleLowerCase().replace(" ", "") + (chNum < 10 ? "0" : "") + chNum;
  // const chID = req.body.chapterID;
  Chapter.findOne({ chapterid: chID })
    .select("chapterfiles")
    .exec()
    .then((fileArr) => {
      const response = {
        count: fileArr.chapterfiles.length,
        images: fileArr.chapterfiles,
      };
      res.status(200).json({
        message: "Fetching images of " + chTitle + " chapter " + chNum,
        payload: response,
      });
    });
});

/*
  Create new comic
  body: 
  {
    comictitle: <Title of comic>,
    characterlst: <Array of characters>,
  }
*/

router.post("/CreateComic", (req, res, next) => {
  const newComicID = new mongoose.Types.ObjectId();
  const charaArr = req.body.characterlst;
  const dte = new Date();
  const curDate = dte.getMonth() + "/" + (dte.getDate() < 10 ? "0" : "") + dte.getDate() + "/" + dte.getFullYear();
  const newComic = new Comic({
    _id: newComicID,
    title: req.body.comictitle,
    characters: charaArr,
  });
  newComic
    .save()
    .then((result) => {
      const resComic = {
        Title: result.title,
        Chapters: result.chapters,
        Characters: result.characters,
        CreatedAt: result.creationtimestamp,
        UpdatedAt: result.lastupdatetimestamp,
        Status: result.status,
      };
      res.status(200).json({
        message: `Successfully created new Comic titled ${req.body.comictitle} on ${curDate}`,
        comicDetails: resComic,
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err.message,
      });
    });
});

router.post("/DeleteComic", (req, res, next) => {
  const comicTitle = req.body.comicTitle;
  // Delete all chapters under this comic
  Chapter.deleteMany({ comictitle: comicTitle }).then((result) => {
    // Remove this comic from all characters
    Character.updateMany({ partofcomics: comicTitle }, { $pull: { partofcomics: comicTitle } }).then((result) => {
      // Finally delete the comic
      Comic.deleteOne({ title: comicTitle }).then((result) => {
        res.status(200).json({ message: "Succesfully deleted comic " + comicTitle });
      });
    });
  });
});

router.post("/DeleteChapter", (req, res, next) => {
  const chapterID = req.body.chapterID;
  const comicTitle = req.body.comicTitle;
  Comic.findOneAndUpdate({ title: comicTitle }, { $pull: { chapters: chapterID } }, { new: true }).then((result) => {
    const resComic = {
      Title: result.title,
      Chapters: result.chapters,
      Characters: result.characters,
      CreatedAt: result.creationtimestamp,
      UpdatedAt: result.lastupdatetimestamp,
      Status: result.status,
    };
    Chapter.deleteOne({ chapterid: chapterID }).then((result) => {
      res.status(200).json({ message: `Deleted ${chapterID}`, updatedComic: resComic });
    });
  });
});

/*
  Add new chapter to existing comic
*/
router.post(
  "/UploadChapter", // Route

  (req, res, next) => {
    // initialize the indexer for the name
    fileIdx = 1;
    next();
  },

  upload.any("chaptercontent"),

  //Save in database and notify client
  (req, res, next) => {
    const title = req.body.comictitle;
    const chNum = req.body.chapternumber;
    const chNumStr = (chNum < 10 ? "0" : "") + chNum;
    const charArr = req.body.newcharacters; // String containing CSV of new characters to be added
    let responseMessage = `Successfully saved ${title} chapter ${chNum}`;
    const pathArr = req.files.map((file) => {
      return "/Chapters/" + file.filename;
    });
    if (charArr != undefined) {
      // TODO: Update Comic table
      responseMessage += `Added ${charArr} to Comic characters list`;
    }

    const chapterID = title.replaceAll(" ", "").toLowerCase() + chNumStr;
    const newChapter = new Chapter({
      _id: new mongoose.Types.ObjectId(),
      chapterid: chapterID,
      comictitle: title,
      chapternumber: chNum,
      chapterfiles: pathArr,
    });
    newChapter
      .save()
      .then((result) => {
        Comic.findOneAndUpdate(
          { title: { $regex: req.body.comictitle, $options: "i" } },
          { $push: { chapters: chapterID }, $set: { lastupdatetimestamp: new Date() } },
          { new: true }
          //If you set new: true it returns the document after updation, otherwise it sends old document
        )
          .then((result) => {
            const resComic = {
              Title: result.title,
              Chapters: result.chapters,
              Characters: result.characters,
              CreatedAt: result.creationtimestamp,
              UpdatedAt: result.lastupdatetimestamp,
              Status: result.status,
            };
            res.status(200).json({
              message: responseMessage,
              updatedComic: resComic,
            });
          })
          .catch((err) => {
            res.status(500).json({
              error: err.message,
            });
          });
      })
      .catch((err) => {
        res.status(500).json(err);
      });
  }
);

module.exports = router;
