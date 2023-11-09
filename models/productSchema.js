const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    "id": Number,
    "title": String,
    "price": String,
    "description": String,
    "category": String,
    "image": String,
    "sold": Boolean,
    "dateOfSale":Date
})

const data = new mongoose.model("products",productSchema);
module.exports = data;
