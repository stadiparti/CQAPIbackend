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

const group = new SCHEMA({
  owner_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "auth",
  },
  group_code: {
    type: String,
  },
  group_name: {
    type: String,
  },
  description: {
    type: String,
  },
  zip_code: {
    type: Number,
    default: ""
  },
  // admin_id:[{
  //     type:mongoose.Schema.Types.ObjectId,
  //     ref : 'auth'
  // }],
  // group_members:[{
  //     type:mongoose.Schema.Types.ObjectId,
  //     ref : 'auth'
  // }],
  // block_members : [{
  //     type:mongoose.Schema.Types.ObjectId,
  //     ref : 'auth'
  // }],
  image: {
    type: String,
    default: "",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "auth",
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "auth",
  },
  // createdAt: {
  //   type: Date,
  //   default: Date.now(),
  // },
  // updatedAt: {
  //   type: Date,
  //   default: Date.now(),
  // },
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
},{timestamps:true});

group.index({ location: "2dsphere" });
group.index({ request: 'text' });
module.exports = mongoose.model("group", group);