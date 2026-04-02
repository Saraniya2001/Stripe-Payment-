import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required:true,
        },
        email:{
            type: String,
            unique:true,
            required:true
        },
         password: {
            type: String,
            required: true,
        },

        // Subscription fields
        subscription: {
        type: String,
        default: "none", // starter / pro
        },

        subscriptionStatus: {
        type: String,
        default: "inactive", // active / inactive
        },

        stripeCustomerId: {
        type: String,
        },

        stripeSubscriptionId: {
        type: String,
        },
    },
    {
        timestamps:true,
    }

);

const User = mongoose.model("User", userSchema);

export default User;

