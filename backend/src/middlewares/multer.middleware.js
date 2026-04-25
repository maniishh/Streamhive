import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
        // Add a unique suffix to prevent filename collisions when two
        // users upload a file with the same name at the same time.
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + '-' + file.originalname)
    }
});

//  Add file size limits to prevent out-of-memory crashes on the server.
// 500 MB cap for videos; multer will reject larger files with a 413 error
// before they even reach the controller.
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500 MB max per file
    }
});


export {upload}; 
