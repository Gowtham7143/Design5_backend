const mongoose = require('mongoose');
const Seller = new mongoose.Schema({
    name: String,
    username: String,
    password: String,
});

module.exports = mongoose.model('Seller', Seller);