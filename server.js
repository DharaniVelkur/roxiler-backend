const express = require('express');
const dotenv = require('dotenv');
const app = express();
var cors = require("cors");
require('./db/conn');
const router = require("./router")
dotenv.config();
app.use(express.json());
app.use(cors());
app.use(router);


app.listen(process.env.PORT, () =>{console.log("Server listening on port",process.env.PORT)})