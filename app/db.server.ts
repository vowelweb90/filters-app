import mongoose from "mongoose";

export async function dbconnection() {
  try {
    await mongoose.connect("mongodb://localhost:27017/bello-diamonds");
    console.log("Database connected");
  } catch (error) {
    console.log("Database Error: ", error);
  }
}
