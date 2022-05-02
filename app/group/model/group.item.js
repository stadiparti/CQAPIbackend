const mongoose = require('mongoose');

var groupItemSchema = new mongoose.Schema({
    group_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'group'
    },
    item_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'item',
        index: true
    },
    status:{
        type:String,
        enum:['Active', 'Blocked'],
        default: 'Active',
    },
    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'auth'
    },
    updatedBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'auth'
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

groupItemSchema.index({ location: "2dsphere" });
module.exports = mongoose.model('GroupItem', groupItemSchema);