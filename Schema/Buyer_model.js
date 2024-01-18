const mongoose = require('mongoose');
const Buyer = new mongoose.Schema({
    name: String,
    username: String,
    password: String,
    otp: { type: String },
});

module.exports = mongoose.model('Buyer', Buyer);