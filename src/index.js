import dotenv from "dotenv";

//IMPORT OF DB CONNECTION WRITTEN IN DB FOLDER 
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path : './env'
})


connectDB()

//AS DB IS CONNECTED IN ASYNC METHOD IT WILL RETURN A PROMISE CALLED .THEN() & .CATCH()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running at port : ${process.env.PORT}`);
        
    })
})
.catch((err) => {
    console.log("Mongo db connection failed !!", err);
    
})
