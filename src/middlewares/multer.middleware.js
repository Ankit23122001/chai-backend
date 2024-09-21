import multer from "multer";

const storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, "./public/temp") //location where the files will be saved temporarily before uploadation
    },
    filename: function(req, file, cb){
        cb (null, file.originalname)
    }
})

export const upload = nulter({
    storage,
})