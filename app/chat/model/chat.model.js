const mongoose = require('mongoose'); // Erase if already required
const SCHEMA = mongoose.Schema;

const pointSchema = new SCHEMA({
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  });

const CHAT = new SCHEMA({
    senderId: {
        ref: "auth",
        type: mongoose.Types.ObjectId,
    },
    receiverId: {
        ref: "auth",
        type: mongoose.Types.ObjectId,
    },
    chatId:{
        ref: "chatConstant",
        type: mongoose.Types.ObjectId,
    },
    itemId: {
      ref: "item",
      type: mongoose.Types.ObjectId,
  },
    type: {
        type: Number,
        enum: [0, 1, 2,3,4], //0=>text,1=>file,2=>location,3=>video 4=>json
        default: 0,
    },
    requestJson:{
      ref: "itemRequest",
      type: mongoose.Types.ObjectId
    },

    returnJson:{
      ref: "ItemReturn",
      type: mongoose.Types.ObjectId
    },

    isSeen:{
      type:Boolean,
      default:false
    },

    deletedBy:[{
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth"
  }],

    message: {
        type: String
    },
    file: {
        type: String,
    },
    location: pointSchema    
},{timestamps:true});

/**
 * chat constant for chat started between two users
 */
const CHATCONSTANT = new SCHEMA({
    senderId: {
        ref: "auth",
        type: mongoose.Types.ObjectId,
    },
    receiverId: {
        ref: "auth",
        type: mongoose.Types.ObjectId,
    },
    itemId: {
      ref: "item",
      type: mongoose.Types.ObjectId,
  },
    isTyping:{
      type:Boolean,
      default:false
    },

    deletedBy:[{
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth"
  }],
    type: {
      type: Number,
      enum: [0, 1, 2,4], //0=>text,1=>file,2=>location,4=>json
      default: 0,
    },
    lastmsgId: {
        ref: "chat",
        type: mongoose.Types.ObjectId,
    },
    lastfile: {
      type: String,
    },
    lastlocation: pointSchema,
    status: {
      type: Number,
      enum: [0, 1], //0=>active,1=>inactive
      default: 0,
    },
    newDate:{
      type:Date,
      default:Date.now()
    }
   
},{timestamps:true});
module.exports.CHATS = mongoose.model("Chat", CHAT);
module.exports.CHATCONSTANTS = mongoose.model("Chatconstant", CHATCONSTANT);
