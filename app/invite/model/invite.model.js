/*
@copyright : ToXSL Technologies Pvt. Ltd. < www.toxsl.com >
@author     : Shiv Charan Panjeta < shiv@toxsl.com >
 
All Rights Reserved.
Proprietary and confidential :  All information contained herein is, and remains
the property of ToXSL Technologies Pvt. Ltd. and its partners.
Unauthorized copying of this file, via any medium is strictly prohibited.
*/

"use strict";
const mongoose = require("mongoose"); // import mongoose for set by of schema
const SCHEMA = mongoose.Schema;

const invite = new SCHEMA({
    group_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref : 'group'
    },
    sender_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref : 'auth'
    },
    receiver_phone: {
        type: Number
    },
    receiver_email: {
        type: String
    },
    status: {
        type: Number,
        enum: [1,2,3], // 1 => Invited, 2 => Accepted, 3 => Rejected
        default: 1
    },
    // receiver_id:{
    //     type:mongoose.Schema.Types.ObjectId,
    //     ref : 'auth'
    // },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'auth'
    }
},{timestamps:true});

module.exports = mongoose.model("invite",invite);