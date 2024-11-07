// models/Building.js
const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    name: { type: String, required: true },
    day: { type: String, required: true },
    inTime: { type: String, required: true },
    outTime: { type: String },
    outDay: { type: String },
});

const roomSchema = new mongoose.Schema({
    roomNumber: { type: Number, required: true },
    roomName: { type: String }, // Add this line
    logs: [logSchema],
});


const buildingSchema = new mongoose.Schema({
    name: { type: String, required: true },
    rooms: [roomSchema],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // References the User schema
        required: true
    },
});

module.exports = mongoose.model('Building', buildingSchema);
