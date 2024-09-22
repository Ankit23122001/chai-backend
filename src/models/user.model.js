import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";


const userSchema = new Schema(
    {
        username : {
            require : true,
            type : String,
            unique : true,
            lowercase : true,
            trim : true,
            index: true   //THIS WILL MAKE IT MORE SEARCHABLE
        },
        email : {
            require : true,
            type : String,
            unique : true,
            lowercase : true,
            trim : true,
        },
        fullname : {
            require : true,
            type : String,
            trim : true,
            index: true
        },
        avatar :{
            type: String,  //cloudinary url
            required : trusted
        },
        coverImage :{
            type : String,  //cloudinary url
        },
        watchHistory :[
            {
                type : Schema.Types.objectId,
                ref : "Video"
            }
        ],
        password :{
            type : String,
            require : [true, 'Password is required']
        },
        refreshToken :{
            type : String,
        }
    },
    {
        timestamps : true
    }
)

//HOOK FOR HASHING PASSWORD
userSchema.pre("save", async function (next) {
    if( !this.isModified ("password")) return next();

    this.password = await bcrypt.hash(this.password ,10)
    next()
})

//METHODS TO DECRYPT PASSWORD FOR CHECKING VALIDATION
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

//JWT TOKENS
userSchema.methods.generateAccessToken = function(){
    return jwt.sign (
        {
            _id: this.id,
            email: this.email,
            username: this.username,
            fullname: this.fullname
        },
        process.env.ACCESS-TOKEN_SECRET,
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY,
        }
    )
}

//REFRESH TOKEN
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign (
        {
            _id: this.id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn : process.env.REFRESH_TOKEN_EXPIRY,
        }
    )
}


export const User = mongoose.model("User" , userSchema)