const mongoose = require('mongoose');
const dotenv=require('dotenv')
dotenv.config();
const db=process.env.DATABASE

mongoose.connect(db,{
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(()=>console.log("db connected")).catch((error)=>console.log(error));