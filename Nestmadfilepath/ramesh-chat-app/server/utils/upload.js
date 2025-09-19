
// const multer = require("multer");
// const path = require("path");

// const storage = multer.diskStorage({
//   destination: (_, __, cb) => cb(null, path.join(__dirname, "..", "uploads")),
//   filename: (_, file, cb) =>
//     cb(null, Date.now() + path.extname(file.originalname))
// });

// // Accept images, videos, audio, and documents
// const fileFilter = (_, file, cb) => {
//   const filetypes = /jpeg|jpg|png|gif|mp4|mov|avi|mkv|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|mp3|wav|zip/;
//   const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
//   const mimetype = filetypes.test(file.mimetype);

//   if (extname && mimetype) {
//     return cb(null, true);
//   } else {
//     cb("Error: File type not supported!");
//   }
// };

// module.exports = multer({ storage, fileFilter });


const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// Accept all file types
const fileFilter = (req, file, cb) => {
  cb(null, true); // Accept all files
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter
});

module.exports = upload;
