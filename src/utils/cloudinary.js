//FILE UPLOADATION
import {v2 as cloudinary} from "cloudinary";
import fs from "fs"


cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET// Click 'View API Keys' above to copy your API secret
});


//FILE UPLOADING STEPS
const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //UPLOAD THE FILE ON CLOUDINARY
        const response = await cloudinary.uploader.upload(localFilePath, { resource_type: "auto"})

        //FILE HAS BEEN UPLOADED SUCCESSFULLY
       // console.log("file is uploaded on cloudinary", response.url);
       fs.unlinkSync(localFilePath) 
       return response;
    } catch (error) {
        fs.unlinkSync (localFilePath) // REMOVE THE LOCALLY SAVED TEMPORARY FILE AS THE UPLOAD OPERATION GOT FAILED
        return null;
    }
}


export { uploadOnCloudinary }