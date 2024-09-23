import {  asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


//METHOD FOR ACCESS TOKENS
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)  //User is taken from models file and holding its value in user object 
        const accessToken  = user.generateAccessToken()            
        const refreshToken  = user.generateRefreshToken()        

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false })
        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError (500, " Something went wrong while generating refresh and  access token")
        
    }
}

/**************************** USER REGISTRATION *******************************/
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
    //console.log("email: ", email);

    //VALIDATION
    if(
        [fullname, email, username, password].some((field) =>
        field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    /************* CHECK FOR USER EXISTENCE *************************** */
    const existedUser = await User.findOne({
        $or: [{ username },{ email }]       //$or-> mongodb operator which check objects {username},{email} duplication in DB
    })

    if(existedUser){
        throw new ApiError( 409, "User with email or username already existed")
    }

    /*************************UPLOAD FILES IN LOCAL PATH *********************/
    const avatarLocalPath = req.files?.avatar[0]?.path;   //CHECK THE SYNTAX ON CHATGPT
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0){
        coverImageLocalPath = req.files.coverImage[0].path
    }
    
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    if(!coverImageLocalPath){
        throw new ApiError(400, "coverImage file is required")
    }

    /*********************UPLOAD ON CLOUDINARY ***********************************/
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if( !coverImage){
        throw new ApiError(400, "coverImage file is required")
    }
    if( !avatar){
        throw new ApiError(400, "Avatar file is required")
    }

    /************************CREATE USER OBJECT ********************/
     const user = await User.create({
        fullname, 
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar.url, 
        coverImagee: coverImage?.url || "", 
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




/********************************LOGIN LOGIC ********************************************/
const loginUser = asyncHandler ( async (req, res) => {
    //REQ BODY => DATA
    //USERNAME OR EMAIL
    //FIND THE USER
    //PASSWORD CHECK
    //ACCESS AND REFRESH TOKEN
    //SEND COOKIE

    const { email, username, password} = req.body
    if(!(username || email)){
        throw new ApiError(400, "username or email is required")
    }

     const user =await User.findOne({
        $or: [{username}, {email}],
    })

    if(!user){
        throw new ApiError( 404 , "User does not exist ")
    }

    const isPasswordvalid = await user.isPasswordCorrect(password)
    if(!isPasswordvalid){
        throw new ApiError(401, "Invalid password")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select(" -password -refreshToken")

    //COOKIES
    const options = {
        httpOnly: true,
        secure : true
    }
    return res
    .status(200)
    .cookie("accessToken" , accessToken)
    .cookie("refreshToken", refreshToken)
    .json(
        new ApiResponse (
            200 ,
             {
                 user : loggedInUser, accessToken, refreshToken
             },
             'User Logged in Successfully'
        )
    )
} )




/****************************LOGGED OUT ***************************/

    //FIND USER -jwt token(auth.middleware.js)
    //CLEAR REFRESH TOKEN FROM DB

const logoutUser = asyncHandler(async (req , res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly :true,
        secure : true
    }
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse (200, {}, "User Logged Out"))
})



/*********************************** ENDPOINT OF REFRESH ACCESS TOKEN IN CASE OF EXPIRY *********************/
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "unauthorised request")
    }

    //VERIFICATION OF REFRESH ACCESS TOKEN
    try {
        const decodeToken = jwt.verify(
            incomingRefreshToken, 
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById|(decodeToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh Token is expired or used")
        }
    
        const options = {
            httpOnly : true,
            secure : true
        }
    
        const {accessToken , newrefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken" , accessToken , options)
        .cookie("refreshToken", newrefreshToken, options)
        .json(
            new ApiResponse(200, 
                {accessToken, refreshToken : newrefreshToken},
                 "Access Token Refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
 }