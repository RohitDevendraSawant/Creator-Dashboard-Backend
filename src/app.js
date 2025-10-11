const cookieParser = require('cookie-parser');
const { urlencoded } = require('express');
const cors = require('cors');
const express = require('express');

const app = express();

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS,
    credentials: true,
}));
app.use(express.json());
app.use(urlencoded({extended: true}));
app.use(cookieParser());

module.exports = app;
