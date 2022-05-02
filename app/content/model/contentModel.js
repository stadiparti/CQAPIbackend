/*
@copyright : ToXSL Technologies Pvt. Ltd. < www.toxsl.com >
@author     : Shiv Charan Panjeta < shiv@toxsl.com >
 
All Rights Reserved.
Proprietary and confidential :  All information contained herein is, and remains
the property of ToXSL Technologies Pvt. Ltd. and its partners.
Unauthorized copying of this file, via any medium is strictly prohibited.
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const content = new schema({
  
    subject : {
        type : String,
    },

    description : {
        type : String,
    },

    email : {
        type : String,
    },
    
    added_by : {
        type :mongoose.Schema.Types.ObjectId,
        ref : 'auth'
    },    
},{
    timestamps: true
});

module.exports = mongoose.model("content",content);