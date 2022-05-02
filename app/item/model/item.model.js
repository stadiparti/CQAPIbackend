/*
@copyright : ToXSL Technologies Pvt. Ltd. < www.toxsl.com >
@author     : Shiv Charan Panjeta < shiv@toxsl.com >
 
All Rights Reserved.
Proprietary and confidential :  All information contained herein is, and remains
the property of ToXSL Technologies Pvt. Ltd. and its partners.
Unauthorized copying of this file, via any medium is strictly prohibited.
*/

const mongoose = require('mongoose');
const PRIVATE = 'isPrivate';
const PUBLIC = 'isPublic';

var itemSchema = new mongoose.Schema({
    item_name:{
        type:String,
    },
    destription:{
        type:String,
    },
    free: {
        type: String,
        default:"0"
    },
    frequency: {
        type: String,
        enum:['Weekly', 'Daily', 'Monthly']
    },
    deposite_amount:{
        type:String,
        default:""
    },
    price:{
        type:String,
    },
    color: {
        type: String
    },
    model: {
        type: String
    },
    status: {
        type: String,
        enum:['Available', 'Borrowed','Deleted'],
        default: 'Available'
    },
    shared_level:{
        type:String,
        enum:['None', 'Avaliable', 'Unavaliable'],
        default: 'Avaliable'
    },
    cover_image:{
        type:String,
        default: ""
    },
    /* image:{
        type:Array
    }, */
    itemPic:[     
        {       
            image:{       
                type: String,       
            }     
        }   
    ],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'auth',
        index: true
    },
 
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'auth',
    },
    isReturnRequested:{
        type:Boolean,
        default: false
    },
    itemType: {
        type: String,
        enum: [PRIVATE,PUBLIC],
        default: PRIVATE
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
   
},{timestamps:true});

itemSchema.index({ location: "2dsphere" });
module.exports = mongoose.model('item', itemSchema);


// http://192.168.2.240:3023/item/getPrivateItem?longitude=76.70952&latitude=30.71320&type=&pageNo=1&pageLimit=10
// http://192.168.2.240:3023/item/myAllGroupItems?longitude=76.7087367&latitude=30.7141783&pageNo=1&pageLimit=1