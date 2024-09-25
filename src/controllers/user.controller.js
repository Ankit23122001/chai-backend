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




/**************************************CHANGE PASSWORD *******************/
  const changeCurrentpassword = asyncHandler( async( req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)     //AUTH MIDDLEWARE INJECTION
    //FROM USER MODEL ISPASSWORD CORRECT METHOD IMPORTED
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)   

    if(!isPasswordCorrect){
        throw new ApiError (400, "Invalid old password")
    }

    //AT THIS POINT NEW PASSWORD IS CREATED AND BEFORE SAVING IN DB IT WILL PASS THROUGH HOOK FOR HASHING PASSWORD METHOD IN USER MODEL
    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse (200, {}, "Password changed successfully"))
})



/***********************GET CURRENT USER*************************/ 
const getCurrentuser = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(200, req.user,"Current user fetch successfully")
})


/********************************UPDATE ACOUNT DETAILS*******************************/
const updateAccountDetails = asyncHandler ( async ( req, res) => {
    const {fullname, email } = req.body

    if(!(fullname || email)){
        throw new ApiError(400, "All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,                    //AUTH MIDDLEWARE USED TO FIND ID THROUGH JWT VERIFY METHOD
        {
            $set : {                //MONGODB OPERATOR FOR QUERY
                fullname,
                email : email
            }
        },
        {new : true}                       //WILL SAVE NEW DATA AFTER UPDATE
    ).select (" -password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details update successfully"))
})


/***********************************************FOR UPDATING AVATAR ************************/
const updateUserAvatar = asyncHandler( async (req, res) =>
     {
        const avatarLocalPath = req.files?.path                //FETCHING DATA FROM USER

        if(!avatarLocalPath){
            throw new ApiError( 400 , "Avatar file is missing")
        }

        const avatar = await uploadOnCloudinary(avatarLocalPath)

        if(!avatar.url){
            throw new ApiError(400, "Error while updating on avatar")
        }

        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set : {
                    avatar : avatar.url             //UPDATING AVATAR FILE
                }
            }
            ,{new : true}
        ).select ("-password")
        return res
       .status(200)
       .json(new ApiResponse(200, "Avatar updated successfully"))
})


/*********************************************FOR UPDATING COVERIMAGE *************************/
const updateuUserCoverImage = asyncHandler( async (req, res) =>
    {
       const coverImageLocalPath = req.file?.path                //FETCHING DATA FROM USER

       if(!coverImageLocalPath){
           throw new ApiError( 400 , "coverImage file is missing")
       }

       const coverImage = await uploadOnCloudinary(coverImageLocalPath)

       if(!coverImage.url){
           throw new ApiError(400, "Error while updating on coverImage")
       }

       const user = await User.findByIdAndUpdate(
           req.user?._id,
           {
               $set : {
                coverImage: coverImage.url             //UPDATING AVATAR FILE
               }
           },
            {new : true}
       ).select ("-password")

       return res
       .status(200)
       .json(new ApiResponse(200, "Cover Image updated successfully"))
})
export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentpassword,
    getCurrentuser,
    updateAccountDetails,
    updateUserAvatar,
    updateuUserCoverImage
 }