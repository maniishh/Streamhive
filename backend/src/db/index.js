
import mongoose from "mongoose";
import {DB_NAME} from '../constants.js';



const connectDB = async () => {
    try {
      let uri = process.env.MONGODB_URI ? process.env.MONGODB_URI.trim() : '';
      
      // Remove trailing slashes to prevent invalid double-slash namespaces like //videotube
      uri = uri.replace(/\/+$/, '');

      const connectionInstance = await mongoose.connect(uri, {
        dbName: DB_NAME,
        ssl: true,
        tlsAllowInvalidCertificates: false,
        tlsAllowInvalidHostnames: false,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      console.log(`\nDB connected successfully: ${connectionInstance.connection.host}\n`);
    } catch (error) {
        console.error("DB connection error", error);
        process.exit(1);
    }
  };
export default connectDB;
