import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";  //DB_NAME IMPORTED FROM CONSTANTS FILE

//DB CONNECTION LOGIC
const connectDB = async() => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
        
    } catch (error) {
        console.log("MONGODB CONNECTION ERROR", error);
        process.exit(1)
    }
}

export default connectDB