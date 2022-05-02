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

const auth = new SCHEMA({
    email:{
        type:String,
        unique: true,
        trim : true,
        required:true
    },
    first_name:{
        type:String
    },
    socketId:{
        type:String
    },
    last_name:{
        type:String
    },
    phone_no:{
        type:String,
        unique: true,
        required:true
    },
    countryCode:{
        type:String,
    },
    isOnline:{
        type:Boolean,
        default:false
    },
    address:{
        type:String
    },
    zip_code:{
        type:String,
    },
    verification_code:{
        type:Number,
    },
    status:{
        type:Boolean,
        default:false
    },
    otp_verified:{
        type:Boolean,
        default:false
    },
    is_check: {
        type: Boolean,
        default: false
    },
    profile_image:{
        type: String,
        default: "",
    },
   
    location: {
        type: {
          type: String,
          default: "Point",
        },
        coordinates: {
          type: [Number],
          default: [0, 0],
        },
    },
    adsCount:{
        type: Number,
        default: 0
    },
    emailToken:{
        type: String,
    },
    email_verified:{
        type:Boolean,
        default:false
    },
    fcmToken: {
        type: String
    },
    deviceToken: {
        type: String
    },
    devicetype: {
        type: String
    },
    deviceName: {
        type: String
    },
    token: {
        type: String
    }
},{
    timestamps:true
});
auth.index({ location: "2dsphere" });
auth.index({ request: 'text' });
module.exports = mongoose.model("auth", auth);