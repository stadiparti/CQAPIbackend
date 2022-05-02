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
const VALIDATOR = require("validator"); // for check email validators

const notification = new SCHEMA({
    sendBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'auth'
    },
    sendTo:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'auth'
    },
   message:{
    type: String
   },
    status:{
        type: String,
        enum:["seen","unseen"],
        default:"unseen"
    },
    title:{
        type: String
    },
    image:{
        type: String
    },
    item_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'item'
    },
    group_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'group'
    },
    req_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'GroupMember'
    },

    item_req_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'itemRequest'
    },
    item_return_req_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'ItemReturn'
    },
    body:{
        type: String
    },
    notificationType: {
        type: String
    }
},{timestamps:true});


module.exports = mongoose.model("notification", notification);
