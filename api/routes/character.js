const express = require("express");
const router = express.Router();
const Character = require("../models/character");
const Comic = require("../models/comic");
const mongoose = require("mongoose");
const multer = require("multer");

/* 
  Functionalities:
  GET:
    baseurl/characters
      -> Get an array of all characters in the database
  
  POST:
    baseurl/characters/NewChara
      -> Requires a character name in JSON body. Creates new character
    baseurl/characters/NewCharaArr
*/

const storage = multer.diskStorage({
  destination: (req, file, saveLocation) => {
    saveLocation(null, "./Images/Characters/");
  },
  filename: (req, file, saveFile) => {
    try {
      const charaName = req.body.charaname;
      const fileMime = file.mimetype.split("/");
      const fileExtension = "." + fileMime[fileMime.length - 1];
      let fileCharacteristic = "";
      if (file.fieldname === "characterportrait") {
        fileCharacteristic += "_Portrait";
      } else if (file.fieldname === "characterbio") {
        fileCharacteristic += "_Bio";
      }
      const newFileName = charaName.replaceAll(" ", "_") + fileCharacteristic + fileExtension;
      saveFile(null, newFileName);
    } catch (error) {
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

// Generic get request, respond with a list of all character names and their thumbnail portrait or guild board thumbnail
router.get("/", (req, res, next) => {
  let characters = req.app.locals.charaLst;
  res.header("Content-Type", "application/JSON");
  res.status(200).send(characters);
});

router.post(
  "/NewChara",
  upload.fields([
    { name: "characterportrait", maxCount: 1 },
    { name: "characterbio", maxCount: 1 },
  ]),
  (req, res, next) => {
    const charID = new mongoose.Types.ObjectId();
    const charName = req.body.charaname;
    let portraitPath = "";
    if (req.files["characterportrait"] !== undefined) {
      portraitPath = "/Charas/" + req.files["characterportrait"][0].filename;
    }
    let bioPath = "";
    if (req.files["characterbio"] !== undefined) {
      bioPath = "/Charas/" + req.files["characterbio"][0].filename;
    }
    const newChara = new Character({
      _id: charID,
      name: charName,
      thumbimage: portraitPath,
      bioimage: bioPath,
    });
    newChara
      .save()
      .then((result) => {
        const addedChara = { objID: charID, name: charName, comics: [], portrait: portraitPath, bio: bioPath };
        req.app.locals.charaLst.push(addedChara);
        res.status(200).json({
          message: `Successfully created character ${charName}`,
          newChara: addedChara,
        });
      })
      .catch((err) => {
        res.status(500).json({
          error: err.message,
        });
      });
  }
);

// add Multiple characters to Database
router.post("/NewCharaArr", (req, res, next) => {
  const charAmt = req.body.charaArr.length;
  const charArr = req.body.charaArr;
  const dbArr = charArr.map((element) => {
    return new Character({ _id: new mongoose.Types.ObjectId(), name: element });
  });
  Character.insertMany(dbArr)
    .then((result) => {
      const newCharsArr = result.map((chara) => {
        const formatted = {
          objID: chara._id,
          name: chara.name,
          comics: chara.partofcomics,
          portrait: "",
          bio: "",
        };
        return formatted;
      });
      req.app.locals.charaLst = [...req.app.locals.charaLst, ...newCharsArr];
      res.status(200).json({
        message: `Successfully created ${charAmt} characters`,
        charasAdded: newCharsArr,
      });
    })
    .catch((err) => {
      res.status(500).json({
        message: err.message,
      });
    });
});

router.post("/DeleteChara", (req, res, next) => {
  const charName = req.body.character;
  // Remove character from all comics
  Comic.updateMany({ characters: charName }, { $pull: { characters: charName } }).then((result) => {
    // Delete character
    Character.deleteOne({ name: charName }).then((result) => {
      res.status(200).json({ message: "Successfully deleted character " + charName });
    });
  });
});

router.post("/AddToComic", (req, res, next) => {
  const chLst = req.body.characters;
  const comicTtl = req.body.comicTitle;
  Character.updateMany({ name: { $in: chLst } }, { $push: { partofcomics: comicTtl } }, { new: true })
    .then((result) => {
      let updatesAmt = chLst.length;
      const idxToUpdate = [];
      req.app.locals.charaLst.every((char, idx) => {
        if (chLst.includes(char.name)) {
          idxToUpdate.push(idx);
          updatesAmt--;
        }
        return updatesAmt <= 1;
      });
      const updatesArr = [];
      idxToUpdate.forEach((idx) => {
        req.app.locals.charaLst[idx].comics.push(comicTtl);
        updatesArr.push(req.app.locals.charaLst[idx]);
      });
      res
        .status(200)
        .json({ message: `Successfully linked ${chLst.length} characters to ${comicTtl}`, updatesIndex: idxToUpdate, updatedChars: updatesArr });
    })
    .catch((err) => {
      res.status(500).json({ message: err.message });
    });
});

router.post(
  "/UpdateChara",
  upload.fields([
    { name: "characterportrait", maxCount: 1 },
    { name: "characterbio", maxCount: 1 },
  ]),
  (req, res, next) => {
    let updateOps = {};
    if (req.body.charaname !== undefined) {
      updateOps["name"] = req.body.charaname;
    }
    if (req.files["characterportrait"] !== undefined) {
      updateOps["thumbimage"] = "/Charas/" + req.files["characterportrait"][0].filename;
    }
    if (req.files["characterbio"] !== undefined) {
      updateOps["bioimage"] = "/Charas/" + req.files["characterbio"][0].filename;
    }
    Character.findOneAndUpdate({ _id: req.body.charaID }, { $set: updateOps }, { new: true })
      .then((result) => {
        const formattedChar = {
          objID: result._id,
          name: result.name,
          comics: result.partofcomics,
          portrait: `${result.thumbimage}?${new Date().getTime()}`,
          bio: `${result.bioimage}?${new Date().getTime()}`,
          //Adding Date as a get url so client side recognises that image has changed
        };
        const updateAt = req.app.locals.charaLst.findIndex((chara) => chara.objID === req.body.charaID);
        req.app.locals.charaLst[updateAt] = formattedChar;
        res.status(200).json({ message: "Successfully updated character.", updatedChar: formattedChar });
      })
      .catch((err) => res.status(500).json({ error: err.message }));
  }
);

module.exports = router;
