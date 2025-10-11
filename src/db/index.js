const mongoose = require('mongoose');
const { DB_NAME } = require('../constants');


const connectToDb = async () => {
    try {
        const connectInstance = await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`);
        console.log("Connected to db.");
    } catch (error) {
        console.log("MONGO CONNECTION FAILED: ", error);
        process.exit(1);
    }
}

module.exports = connectToDb;