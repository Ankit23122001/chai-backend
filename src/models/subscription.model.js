import mongoose,  {Schema, Types} from "mongoose";

const subscriptionSchema = new Schema ({
    subscriber:{
        type: mongoose.Schema.Types.ObjectId,  //ONE WHO IS SUBSCRIBING
        ref : "User"
    },
    channel: {
        type: mongoose.Schema.Types.ObjectId,  
        ref : "User"
    }
} , {timestamps: true}
)

export const Subscription = mongoose.model("Subscription", subscriptionSchema)