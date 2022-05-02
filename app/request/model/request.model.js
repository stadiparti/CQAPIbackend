/*
@copyright : ToXSL Technologies Pvt. Ltd. < www.toxsl.com >
@author     : Shiv Charan Panjeta < shiv@toxsl.com >
 
All Rights Reserved.
Proprietary and confidential :  All information contained herein is, and remains
the property of ToXSL Technologies Pvt. Ltd. and its partners.
Unauthorized copying of this file, via any medium is strictly prohibited.
*/

const mongoose = require('mongoose');

var itemRequest = new mongoose.Schema({
    item_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'item'
    },
    request_status:{
        type:String,
        enum: ["Requested","Accepted/Borrowed","Reject","Return"], // 1 => Request, 2 => Borrow-Accept, 3 => Borrow Return, 4 => Request Cancle, 5 => Shared
        default: "Requested"
    },
    request_type: {
        type: String
    },
    requestorName: {    // for manually entry
        type: String,
        default:""
    },
    createdBy: {
        type:mongoose.Schema.Types.ObjectId,
        ref: 'auth'
    },
    updatedBy: {
        type:mongoose.Schema.Types.ObjectId,
        ref: 'auth'
    }
  
},{timestamps:true});

module.exports = mongoose.model('itemRequest', itemRequest);