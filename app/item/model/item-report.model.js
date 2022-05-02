/*
@copyright : ToXSL Technologies Pvt. Ltd. < www.toxsl.com >
@author     : Shiv Charan Panjeta < shiv@toxsl.com >
 
All Rights Reserved.
Proprietary and confidential :  All information contained herein is, and remains
the property of ToXSL Technologies Pvt. Ltd. and its partners.
Unauthorized copying of this file, via any medium is strictly prohibited.
*/

const mongoose = require('mongoose');

var reportItem = new mongoose.Schema({
    item_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'Item',
    },
    group_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'group'
    },
    report_type:{
        type:String,
        enum:["Spam", "Inappropriate"]
    },
    report_status:{
        type:String,
        default: "Reported",
        enum:["Reported", "Rejected", "Accepted"]
    },
    report_status_remark:{
        type:String,
    },
    reported_by:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'auth'
    },
  
    updatedBy: {
        type:mongoose.Schema.Types.ObjectId,
        ref: 'auth'
    }
   
},{timestamps:true});


module.exports = mongoose.model('report-item', reportItem);