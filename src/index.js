require('dotenv').config();

const app = require('./app');
const connectToDb = require("./db");

const PORT = process.env.PORT || 3000;

connectToDb().then(() => {
    app.listen(PORT, () => {
        console.log("Server running on port,", PORT);
    })
})