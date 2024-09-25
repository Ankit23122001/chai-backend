import mongoose,  {Schema} from "mongoose";

const subscriptionSchema = new Schema ({
    subscriber:{
        type: mongoose.Schema.Types.ObjectId,  //ONE WHO IS SUBSCRIBING
        ref : "User"
    },
    channel: {
        type: mongoose.Schema.Types.ObjectId,    // ONE TO WHOM SUBSCRIBER IS SUBCRIBING
        ref : "User"
    }
} , {timestamps: true}
)

export const Subscription = mongoose.model("Subscription", subscriptionSchema)