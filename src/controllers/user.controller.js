import {  asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler( async (req, res) => {
    //GET USER DETAIL FROM FRONTEND
    //VALIDATION - NOT EMPTY
    //CHECK IF USER ALREADY EXIST: BY USERNAME AND EMAIL
    //CHECK FOR IMAGES, CHECK FOR AVATAR
    //UPLOAD THEM TO CLOUDINARY, AVATAR
    //CREATE USER OBJECT - CREATE ENTRY IN DB
    //REMOVE PASSWORD AND REFRESH TOKEN FIELD FROM RESPONSE
    //CHECK FOR USER CREATION
    //RETURN RESPONSE



    const {fullname, email, username, password } = req.body 
    console.log("email: ", email);

    //VALIDATION
    if(
        [fullname, email, username, password].some((fields) =>
        fields?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    /************* CHECK FOR USER EXISTENCE *************************** */
    const existedUser = User.findOne({
        $or: [{ username },{ email }]       //$or-> mongodb operator which check objects {username},{email} dupication in DB
    })

    if(existedUser){
        throw new ApiError( 409, "User with email or username already existed")
    }

    /*************************UPLOAD FILES IN LOCAL PATH *********************/
    const avatarLocalPath = req.files?.avatar[0]?.path;   //CHECK THE SYNTAX ON CHATGPT
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    /*********************UPLOAD ON CLOUDINARY ***********************************/
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if( !avatar){
        throw new ApiError(400, "Avatar file is required")
    }

    /************************CREATE USER OBJECT ********************/
     const user = await User.create({
        fullname, 
        email,
        username: username.toLowercase(),
        password,
        avatar: avatar.url, 
        coverImagee: coverImage?.url || ""
    })


    //REMOVE TOKENS AND CHECK CREATED USER
    const createdUser = await User.findOne(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500 , "Something went wrong while registering")
    }

    /*************************RETURN RESPONSE *************************/
    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registered successfully")
    )
})

export { registerUser }