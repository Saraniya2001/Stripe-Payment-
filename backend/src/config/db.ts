import mongoose from "mongoose";

export const connectdb = async () => {
    try {
        console.log("MONGO ", process.env.MONGO_URI)
        const conn = await mongoose.connect(process.env.MONGO_URI!)
        console.log("MongoDB connected")
    } catch (error:any) {
        console.log("mongodb connection error",error.message)
        process.exit(1)
    }
}