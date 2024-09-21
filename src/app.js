import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";


const app = express();

//USING CORS AS IT WILL ONLY ALLOW SERVER TO ACCEPT REQUEST FROM THE DEFINED ORIGIN & WILL BLOCK OTHER REQUEST API
app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials : true
}))

//TO ACCEPT JSON DATA
app.use(express.json({limit: "16kb"}))

app.use(express.urlencoded({extended: true , limit : "16kb"}))

//PUBLIC ASSET
app.use(express.static("public"))

//COOKIE-PARSER
app.use(cookieParser());

export { app }