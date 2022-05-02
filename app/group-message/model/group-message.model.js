const mongoose = require('mongoose');

var group_message = new mongoose.Schema({
    group_id:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'auth'
    },
    user_id:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'auth'
    },
    message:{
        type:String,
    },
    status:{
        type: Boolean,
        default: false,
    },
 
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'auth'
    }
},{timestamps:true});

module.exports = mongoose.model('GroupMessage', group_message);