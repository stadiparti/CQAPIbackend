/*
@copyright : ToXSL Technologies Pvt. Ltd. < www.toxsl.com >
@author     : Shiv Charan Panjeta < shiv@toxsl.com >
 
All Rights Reserved.
Proprietary and confidential :  All information contained herein is, and remains
the property of ToXSL Technologies Pvt. Ltd. and its partners.
Unauthorized copying of this file, via any medium is strictly prohibited.
*/

const mongoose = require('mongoose');

var itemReturnSchema = new mongoose.Schema({
    item_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'item'
    },
    item_request_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'itemRequest'
    },
    status:{
        type: String,
        enum: [0,1,2], // 0 => RequestToReturn, 1 => Rejected, 2 => Accepted
        default: 0
    },
    requestedBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'auth'
    },
},{timestamps: true});

module.exports = mongoose.model('ItemReturn', itemReturnSchema);