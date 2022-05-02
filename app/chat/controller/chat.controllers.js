const { CHATCONSTANTS, CHATS } = require("../model/chat.model");
const mongoose = require("mongoose");
const { exec } = require("child_process");
const commonFunction=require("../../../helpers/nodeMailer")
const User = require("../../auth/model/auth.model");
const ITEM = require("../../item/model/item.model");
const AUTH =require('../../auth/model/auth.model')

const _ = require("underscore");
var fs = require("fs");
// const {CHATCONSTANTS,CHATS} = require("../models/chatModel");
const USERS = [];
const SOCKETPEOPLE = {};
module.exports = (io) => {
  io.on("connection", (socket) => {

    /**
     * socket connect event.
     * check user is already in socket.
     * to connect user with socket manually.
     * emit to all user is connected user.
     */
     socket.on("connectUser", async (data) => {
      try{ 
           var userindex = USERS.indexOf(data.senderId);
           //check user index i.e. user id exist in users array or not
           if (userindex > -1) {
               for (var id in SOCKETPEOPLE) {
                   // user already exist in socket
                   if (SOCKETPEOPLE[id] == data.senderId) {
                       delete SOCKETPEOPLE[id];
                       USERS.splice(userindex, 1);
                       SOCKETPEOPLE[socket.id] = data.senderId;
                       USERS.push(data.senderId);
                      }
                  }
              } else {
                  // create new socket id with senderId
                  SOCKETPEOPLE[socket.id] = data.senderId;
              USERS.push(data.senderId);
              let updateUser = await User.findOneAndUpdate(
                  { _id: data.senderId },
                  { socketId: socket.id,isOnline:true },
                  { new: true }
                  ); 
          }
          // check SOCKETPEOPLE array has id is uinque
          _.uniq(_(SOCKETPEOPLE).toArray());
          // broadcast to all users i.e. user is now online
          socket.broadcast.emit("userOnlineStatus", {
              senderId: SOCKETPEOPLE[socket.id],
              status: 1,
          });
          // response send to own user is online or connected with socket
          socket.emit("userOnlineStatus", {
              senderId: SOCKETPEOPLE[socket.id],
              status: 1,
          }); 
          
      }catch(err){
          socket.emit("userOnlineStatus", err?err:'something went wrong');
      }
  });



    /**
       * check other user online status
       */
     socket.on("userOnlineStatus",(data)=>{
      if(USERS.includes(data.receiverId)){
          socket.emit('userOnlineStatus',{status:1})
      }else{
          socket.emit('userOnlineStatus',{status:0})
      }
      });

    /**
     * send message to other user
     * using join room
     */
    socket.on("sendMessage", async (data) => {   
      
      if (data.senderId != data.receiverId) {
        
        if (data.type === 1) {
          var readStream = fs.createReadStream(data.file.name);
          return;
        }
        // check with CHATCONSTANT or upsert
        CHATCONSTANTS.findOneAndUpdate(
          {
            // match with sender and receiver id with and, or case
            $and:[
              {$or: [

                {
                  $and: [
                    {
                      senderId: data.senderId,
                    }, 
                    {
                      receiverId: data.receiverId,
                    } 
                  
                  ]
                },
                {
                  $and: [
                    {
                      senderId: data.receiverId,
                    },
                    {
                      receiverId: data.senderId,
                    }
                  
                  ],
                },
              ],
            },
            {itemId:data.itemId,}
            ]
            
          },
          {
            // upsert sender and receiver if record not exist
            senderId: data.senderId,
            receiverId: data.receiverId,
            type: data.type,
            itemId:data.itemId,
            deletedBy: []
          },
          {
            // take upsert and new true for record new detail and
            upsert: true,
            new: true,
          },
          async (err, result) => {
            if (err) throw err;
            // join room with room id
            socket.join(result._id);
            // for location save
            if (data.type === 2) {
              data.location = {
                type: "Point",
                coordinates: [data.longitude, data.latitude],
              };
            }
            data.chatId = result._id;
            // create chat with chatConstant id
            var userChat = new CHATS(data);
            userChat.save(async (err, results) => {
              if (err) throw err;
              let chatId = result._id;
              CHATCONSTANTS.findByIdAndUpdate(
                result._id,
                {
                  $set: {
                    lastmsgId: results._id,
                    updatedAt: Date.now(),
                    newDate: Date.now(),
                    deletedBy: []
                  },
                },
                (err, result) => {
                  if (err) throw err;
                }
              );
              let otherUserDetails = await User.findOne({
                _id: data.receiverId,
              }).select("socketId");
              
              let chatDetails = await CHATS.aggregate([
                {
                  $match: {
                    chatId: mongoose.Types.ObjectId(result._id),
                  },
                },
                {
                  $match: {
                    deletedBy: {$ne: mongoose.Types.ObjectId(data.senderId)}
                  }
                },
                {
                  $lookup: {
                    from: "auths",
                    localField: "senderId",
                    foreignField: "_id",
                    as: "senderId",
                  },
                },
                {
                  $unwind: "$senderId",
                },
                {
                  $lookup: {
                    from: "auths",
                    localField: "receiverId",
                    foreignField: "_id",
                    as: "receiverId",
                  },
                },
                {
                  $unwind: "$receiverId",
                },

                {
                  $lookup: {
                    from: "items",
                    localField: "itemId",
                    foreignField: "_id",
                    as: "itemId",
                  },
                },
                {
                  $unwind: "$itemId",
                },

                {
                  $lookup: {
                    from: "itemrequests",
                    localField: "requestJson",
                    foreignField: "_id",
                    as: "requestJson",
                  },
                },
  
                {
                  $lookup: {
                    from: "itemreturns",
                    localField: "returnJson",
                    foreignField: "_id",
                    as: "returnJson",
                  },
                },

                {
                  $sort: { createdAt: -1 },
                },
                {
                  $project:{
                      _id:"$_id",
                      "type":"$type",
                      "itemId._id": "$itemId._id",
                      "itemId.item_name": "$itemId.item_name",
                      "itemId.cover_image": "$itemId.cover_image",
                      "itemId.destription": "$itemId.destription",
                      "itemId.price": "$itemId.price",
                      "itemId.status": "$itemId.status",
                      "itemId.createdBy": "$itemId.createdBy",
                      "itemId.frequency": "$itemId.frequency",

                      "message":1,
                      "requestJson":{item_id:1,request_status:1,_id:1},
                      "returnJson":{item_id:1,status:1,_id:1,item_request_id:1},
                      "updatedAt":"$updatedAt",
                      "createdAt":"$createdAt",
                      "isSeen":1,
                      "senderId._id":"$senderId._id",
                      "senderId.isOnline":"$senderId.isOnline",
                      "senderId.profile_image":"$senderId.profile_image",
                      "senderId.email":"$senderId.email",
                      "senderId.socketId":"$senderId.socketId",
                      "senderId.first_name":"$senderId.first_name",
                      "senderId.last_name":"$senderId.last_name",
                      "receiverId._id":"$receiverId._id",
                      "receiverId.isOnline":"$receiverId.isOnline",
                      "receiverId.profile_image":"$receiverId.profile_image",
                      "receiverId.email":"$receiverId.email",
                      "receiverId.socketId":"$receiverId.socketId",
                      "receiverId.first_name":"$receiverId.first_name",
                      "receiverId.last_name":"$receiverId.last_name",
                  }
              }
             
              ]);

              let pageNo = parseInt(data.pageNo) || 1;
              let pageSize = parseInt(data.pageSize) || 10;
              if (pageNo <= 0) {
                throw responseMessage.PAGE_INVALID;
              }
              const chatList = await CHATCONSTANTS.aggregate([
                {
                  $match: {
                    $or: [
                      {
                        senderId: mongoose.Types.ObjectId(data.receiverId),
                      },
                      {
                        receiverId: mongoose.Types.ObjectId(data.receiverId),
                      },
                    ],
                  },
                },
                {
                  $lookup: {
                    from: "chats",
                    let: { userId: "$_id" },
                    pipeline: [
                      {
                        $match: {
                          $expr: { $eq: ["$chatId", "$$userId"] },
                          receiverId: mongoose.Types.ObjectId(data.receiverId),isSeen:false
                        },
                      },
                    ],
                    as: "msgsCount",
                  },
                },
                {
                  $addFields: {
                    unseenCount: { $size: "$msgsCount" },
                  },
                },
                // {
                //   $lookup: {
                //     from: "chats",
                //     localField: "lastmsgId",
                //     foreignField: "_id",
                //     as: "lastmsgId",
                //   },
                // },
                {
                  $lookup: {
                    from: "chats",
                    let: { lastmsgId: "$lastmsgId" }, 
                    pipeline: [
                      {
                        $match: {
                          $expr: { $eq: ["$_id", "$$lastmsgId"] }
                        },
                      },
                      {
                        $sort: { createdAt: -1 },
                      }
                    ],
                    as: "lastmsgId",
                  },
                },
               
                {
                  $unwind: "$lastmsgId",
                },
                {
                  $addFields: {
                    receiverId: {
                      $cond: {
                        if: {
                          $eq: [
                            mongoose.Types.ObjectId(data.receiverId),
                            "$lastmsgId.receiverId",
                          ],
                        },
                        then: "$lastmsgId.senderId",
                        else: "$lastmsgId.receiverId",
                      },
                    },
                  },
                },
                {
                  $lookup: {
                    from: "auths",
                    localField: "receiverId",
                    foreignField: "_id",
                    as: "receiverId",
                  },
                },
                {
                  $unwind: "$receiverId",
                },
      
                {
                  $lookup: {
                    from: "items",
                    localField: "itemId",
                    foreignField: "_id",
                    as: "itemId",
                  },
                },
                {
                  $unwind: "$itemId",
                },
      
                {
                  $project: {
                    _id: "$_id",
                    "itemId._id": "$itemId._id",
                    "itemId.item_name": "$itemId.item_name",
                    "itemId.cover_image": "$itemId.cover_image",
                    
                    receiverId: "$receiverId",
                    senderId: "$senderId",
                    type: "$type",
                    unseenCount: 1,
                    newDate: 1,
                    updatedAt: "$updatedAt",
                    "lastmsgId.receiverId._id": "$receiverId._id",
                    "lastmsgId.receiverId.message": "$lastmsgId.message",
                    "lastmsgId.receiverId.isOnline": "$receiverId.isOnline",
                    "lastmsgId.receiverId.first_name": "$receiverId.first_name",
                    "lastmsgId.receiverId.last_name": "$receiverId.last_name",
                    "lastmsgId.receiverId.profile_image": "$receiverId.profile_image",
                    "lastmsgId.receiverId.email": "$receiverId.email",
                    "lastmsgId.receiverId.first_name": "$receiverId.first_name",
                    "lastmsgId.receiverId.last_name": "$receiverId.last_name"
                  },
                },
                {
                  $project: {
                    receiverId: 0,
                  },
                },
                {
                  $sort: { newDate: -1 },
                },
                /* { $skip: pageSize * (pageNo - 1) },
                          { $limit: pageSize }, */
              ]);

              // socket.broadcast
              //   .to(otherUserDetails.socketId)
              //   .emit("chatLists", chatList);

              // broadcast into room
              // socket.broadcast
              //   .to(otherUserDetails.socketId)
              //   .emit("msgReceived", chatDetails); 
              // receives to user own that msg is sent

              // socket.broadcast
              // .to(otherUserDetails.socketId)
              // .emit("chatHistory", chatDetails);

              // socket.broadcast.to(otherUserDetails.socketId).emit("msgReceived", chatDetails);


              
              socket.emit("msgReceived", chatDetails[0]);


              
              socket.emit("chatHistory", chatDetails);


              

              // socket.emit("chatHistory", chatDetails);

            });

            let receiverFcm = await User.findOne({_id:data.receiverId})
            let senderFcm = await User.findOne({_id:data.senderId})

            receiverFcm= JSON.parse(JSON.stringify(receiverFcm));


            let itemData=await ITEM.findOne({_id:data.itemId})

            let pushNot=await commonFunction.pushNotification(receiverFcm.fcmToken, "CliqRight",`Check new message sent by ${senderFcm.first_name} ${senderFcm.last_name}`,data.chatId,data.senderId,data.receiverId,itemData._id,itemData.cover_image,senderFcm.profile_image,`${senderFcm.first_name} ${senderFcm.last_name}`)


          }
        );
      } else {
        
        socket.emit("msgReceived", "you can not chat with yourself");
      }
    });

    /**
     * Get chat-history
     */
   
    socket.on("chatList", async (data) => {
      try {
        let pageNo = parseInt(data.pageNo) || 1;
        let pageSize = parseInt(data.pageSize) || 10;
        if (pageNo <= 0) {
          throw responseMessage.PAGE_INVALID;
        }


        let chatList = await CHATCONSTANTS.aggregate([
          {
            $match: {
              deletedBy: { $ne: mongoose.Types.ObjectId(data.senderId) } 
            },
          },
          {
            $match: {
              $or: [
                {
                  senderId: mongoose.Types.ObjectId(data.senderId),
                },
                {
                  receiverId: mongoose.Types.ObjectId(data.senderId),
                },
              ],
            },
          },
          {
            $lookup: {
              from: "chats",
              let: { userId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$chatId", "$$userId"] },
                    receiverId: mongoose.Types.ObjectId(data.senderId),isSeen:false,
                   

                  },
                },
              ],
              as: "msgsCount",
            }
          },


          {
            $addFields: {
              unseenCount: { $size: "$msgsCount" },
            },
          },
       
          {
            $lookup: {
              from: "chats",
              let: { lastmsgId: "$_id" }, 
              pipeline: [
                {
                  $match:{
                    deletedBy:{$ne: mongoose.Types.ObjectId(data.senderId) } 
                  },
                },
                {

                  $match: {
                    $expr: { $eq: ["$chatId", "$$lastmsgId"] }
                  
                  },
                 
                  
                 
                },
                {
                  $sort:{
                    createdAt:-1
                  },
                },
                
                {
                  $limit:1
                }
              ],
              as: "lastmsgId",
            },
          },
          {$unwind : { path: "$lastmsgId", preserveNullAndEmptyArrays: true }},

          // {
          //   $unwind: "$lastmsgId",
          // },
          {
            $addFields: {
              receiverId: {
                $cond: {
                  if: {
                    $eq: [
                      mongoose.Types.ObjectId(data.senderId),
                      "$lastmsgId.receiverId",
                    ],
                  },
                  then: "$lastmsgId.senderId",
                  else: "$lastmsgId.receiverId",
                },
              },
            },
          },
          {
            $lookup: {
              from: "auths",
              localField: "receiverId",
              foreignField: "_id",
              as: "receiverId",
            },
          },
          {
            $unwind: "$receiverId",
          },

          {
            $lookup: {
              from: "items",
              localField: "itemId",
              foreignField: "_id",
              as: "itemId",
            },
          },
          {
            $unwind: "$itemId",
          },

          {
            $project: {
              _id: "$_id",
              "itemId._id": "$itemId._id",
              "itemId.item_name": "$itemId.item_name",
              "itemId.cover_image": "$itemId.cover_image",
              
              receiverId: "$receiverId",
              senderId: "$senderId",
              type: "$type",
              unseenCount: 1,
              newDate: 1,
              updatedAt: "$updatedAt",
              "lastmsgId.receiverId._id": "$receiverId._id",
              "lastmsgId.receiverId.message": "$lastmsgId.message",
              "lastmsgId.receiverId.requestJson": "$lastmsgId.requestJson",
              "lastmsgId.receiverId.isOnline": "$receiverId.isOnline",
              "lastmsgId.receiverId.first_name": "$receiverId.first_name",
              "lastmsgId.receiverId.last_name": "$receiverId.last_name",
              "lastmsgId.receiverId.profile_image": "$receiverId.profile_image",
              "lastmsgId.receiverId.email": "$receiverId.email",
              "lastmsgId.receiverId.socketId": "$receiverId.socketId",
            },
          },
          {
            $project: {
              receiverId: 0,
            },
          },
          {
            $sort: { newDate: -1 },
          },
          /* { $skip: pageSize * (pageNo - 1) },
                    { $limit: pageSize }, */
        ]);


        socket.emit("chatLists", chatList);
        // socket.broadcast.to(chatList[0].lastmsgId.receiverId.socketId).emit("chatLists", chatList);
      } catch (err) {
        socket.emit("chatLists", err ? err : "something went wrong");
      }
    });

    /**
         * get single chat details of user
         */
     socket.on("chatDetails",async(data)=>{
      try{
        
          let pageNo = parseInt(data.pageNo)||1;
          let pageSize = parseInt(data.pageSize) || 10;
          if (pageNo <= 0) {
              throw responseMessage.PAGE_INVALID;
          }
          
          if(data.chatId!=''){
          
          let chatDetails = await CHATS.aggregate([
              {
                  $match:{
                      chatId:mongoose.Types.ObjectId(data.chatId),
                  }
              },
              {
                $match: {
                  deletedBy: {$ne: mongoose.Types.ObjectId(data.senderId)}
                }
              },
               {
                  $lookup:{
                      from:"auths",
                      localField:"senderId",
                      foreignField:'_id',
                      as:"senderId"
                  }
              },
              {
                  $unwind:"$senderId"
              },
              {
                  $lookup:{
                      from:"auths",
                      localField:"receiverId",
                      foreignField:'_id',
                      as:"receiverId"
                  }
              },
              {
                  $unwind:"$receiverId"
              },
              {
                $lookup: {
                  from: "items",
                  localField: "itemId",
                  foreignField: "_id",
                  as: "itemId",
                },
              },
              {
                $unwind: "$itemId",
              },

              {
                $lookup: {
                  from: "itemrequests",
                  localField: "requestJson",
                  foreignField: "_id",
                  as: "requestJson",
                },
              },

              {
                $lookup: {
                  from: "itemreturns",
                  localField: "returnJson",
                  foreignField: "_id",
                  as: "returnJson",
                },
              },

              {
                $sort: { createdAt: -1 },
            },

              {
                  $project:{
                      _id:"$_id",
                      "type":"$type",
                      "itemId._id": "$itemId._id",
                      "itemId.item_name": "$itemId.item_name",
                      "itemId.cover_image": "$itemId.cover_image",

                      "itemId.destription": "$itemId.destription",
                      "itemId.price": "$itemId.price",
                      "itemId.status": "$itemId.status",
                      "itemId.createdBy": "$itemId.createdBy",
                      "itemId.frequency": "$itemId.frequency",

                      "message":1,
                      "requestJson":{item_id:1,request_status:1,_id:1},
                      "returnJson":{item_id:1,status:1,_id:1,item_request_id:1},

                      "updatedAt":"$updatedAt",
                      "createdAt":"$createdAt",
                      "isSeen":1,
                      "senderId._id":"$senderId._id",
                      "senderId.isOnline":"$senderId.isOnline",
                      "senderId.profile_image":"$senderId.profile_image",
                      "senderId.email":"$senderId.email",
                      "senderId.socketId":"$senderId.socketId",
                      "senderId.first_name":"$senderId.first_name",
                      "senderId.last_name":"$senderId.last_name",
                      "receiverId._id":"$receiverId._id",
                      "receiverId.isOnline":"$receiverId.isOnline",
                      "receiverId.profile_image":"$receiverId.profile_image",
                      "receiverId.email":"$receiverId.email",
                      "receiverId.socketId":"$receiverId.socketId",
                      "receiverId.first_name":"$receiverId.first_name",
                      "receiverId.last_name":"$receiverId.last_name",
                  }
              }
          ]);
          
          // socket.broadcast.to(chatDetails[0].receiverId.socketId).emit("chatHistory", chatDetails);
          socket.emit("chatHistory",chatDetails);  
        }
      }catch(err){
          socket.emit("chatHistory",err ? err:'something went wrong')
      }
  });
 
  socket.on("deleteChat",async(data)=>{ 

    

    let deleteChatConstant = await CHATCONSTANTS.updateMany({_id:{$in:data.roomId}},{$addToSet:{deletedBy:data.userId}},{new:true,multi:true});
   

    socket.emit("deletedChat", deleteChatConstant);
  }) 

  socket.on("seen", async(data)=>{
    if(data.chatId!=''){
      
      // let otherUserDetails = await User.findOne({_id:data.receiverId}).select("socketId");
      let updateChat = await CHATS.updateMany({chatId:data.chatId,
        receiverId:mongoose.Types.ObjectId(data.senderId)},{
                $set: {

                    isSeen: true
                }
            }, 
        {
            multi: true,
            new:true
        }
      );
      let chatDetails = await CHATS.aggregate([
        {
            $match:{
                chatId:mongoose.Types.ObjectId(data.chatId),
            }
        },
         {
            $lookup:{
                from:"auths",
                localField:"senderId",
                foreignField:'_id',
                as:"senderId"
            }
        },
        {
            $unwind:"$senderId"
        },
        {
            $lookup:{
                from:"auths",
                localField:"receiverId",
                foreignField:'_id',
                as:"receiverId"
            }
        },
        {
            $unwind:"$receiverId"
        },
        {
            $project:{
                _id:"$_id",
                "type":"$type",
                "message":1,
                "updatedAt":"$updatedAt",
                "isSeen":1,
                "senderId._id":"$senderId._id",
                "senderId.isOnline":"$senderId.isOnline",
                "senderId.email":"$senderId.email",
                "senderId.socketId":"$senderId.socketId",
                "receiverId._id":"$receiverId._id",
                "receiverId.isOnline":"$receiverId.isOnline",
                "receiverId.email":"$receiverId.email",
                "receiverId.socketId":"$receiverId.socketId",
            }
        },
        {
            $sort: { createdAt: -1 },
        },
    ]);
    const chatList = await CHATCONSTANTS.aggregate([
      {
          $match:{
              $or:[
                  {
                      senderId:mongoose.Types.ObjectId(data.receiverId),
                  },
                  {
                      receiverId:mongoose.Types.ObjectId(data.receiverId),
                  },
              ],  
          }
      },
      {
        $lookup: {
            from: "chats",
            let: { userId: "$_id" },
            pipeline: [
                { $match: { $expr: { $eq: ["$chatId", "$$userId"] },isSeen:false,receiverId:mongoose.Types.ObjectId(data.receiverId) } },
            ],
            as: "msgsCount",
        }
      },
       {
        $addFields:{
          unseenCount:{$size:"$msgsCount"}
        }
      }, 
      {
          $lookup:{
              from:"chats",
              localField:"lastmsgId",
              foreignField:'_id',
              as:"lastmsgId"
          }
      },
      {
          $unwind:"$lastmsgId"
      },
      {
        $addFields:{
          receiverId:{
            $cond: {
              if: {
                $eq: [mongoose.Types.ObjectId(data.receiverId), "$lastmsgId.receiverId"]
            },
                then: "$lastmsgId.senderId",
                else: "$lastmsgId.receiverId"
            },
          }
        }
      },
      {
          $lookup:{
              from:"auths",
              localField:"receiverId",
              foreignField:'_id',
              as:"receiverId"
          }
      },
      {
          $unwind:"$receiverId"
      },  
       
       {
          $project:{
              _id:"$_id",
              "receiverId":"$receiverId",
              "senderId":"$senderId",
              "type":"$type",
              "isTyping":1,
              "unseenCount":1,
              newDate:1,
              "updatedAt":"$updatedAt",
              "lastmsgId.receiverId._id":"$receiverId._id",
              "lastmsgId.receiverId.message":"$lastmsgId.message",
              "lastmsgId.receiverId.isOnline":"$receiverId.isOnline",
              "lastmsgId.receiverId.email":"$receiverId.email",
              "lastmsgId.receiverId.socketId":"$receiverId.socketId",
          }
      }, 
      {
        $project:{
          "receiverId":0,
        }
      } ,   
      {
          $sort: { newDate: -1 },
      },
  ]);
  //socket.broadcast.to(otherUserDetails.socketId).emit("chatLists", chatList);
  //     socket.broadcast.to(otherUserDetails.socketId).emit("chatHistory", chatDetails);
      socket.emit("seenHistory", chatDetails);
    }
  });

  socket.on("unseen", async(data)=>{
    if(data.chatId!=''){
      
      let otherUserDetails = await User.findOne({_id:data.receiverId}).select("socketId");
      let updateChat = await CHATS.updateMany({chatId:data.chatId,
        receiverId:mongoose.Types.ObjectId(data.senderId)},{
                $set: { 

                    isSeen: true
                }
            }, 
        {
            multi: true,
            new:true
        }
      );
      let chatDetails = await CHATS.aggregate([
        {
            $match:{
                chatId:mongoose.Types.ObjectId(data.chatId),
            }         
        },
        {
          $match: {
            deletedBy: {$ne: mongoose.Types.ObjectId(data.senderId)}
          }
        },
         {
            $lookup:{
                from:"auths",
                localField:"senderId",
                foreignField:'_id',
                as:"senderId"
            }
        },
        {
            $unwind:"$senderId"
        },
        {
            $lookup:{
                from:"auths",
                localField:"receiverId",
                foreignField:'_id',
                as:"receiverId"
            }
        },
        {
            $unwind:"$receiverId"
        },
        {
            $project:{
                _id:"$_id",
                "type":"$type",
                "message":1,
                "updatedAt":"$updatedAt",
                "isSeen":1,
                "senderId._id":"$senderId._id",
                "senderId.isOnline":"$senderId.isOnline",
                "senderId.email":"$senderId.email",
                "senderId.socketId":"$senderId.socketId",
                "receiverId._id":"$receiverId._id",
                "receiverId.isOnline":"$receiverId.isOnline",
                "receiverId.email":"$receiverId.email",
                "receiverId.socketId":"$receiverId.socketId",
            }
        },
        {
            $sort: { createdAt: -1 },
        },
    ]);
    const chatList = await CHATCONSTANTS.aggregate([
      {
          $match:{
              $or:[
                  {
                      senderId:mongoose.Types.ObjectId(data.receiverId),
                  },
                  {
                      receiverId:mongoose.Types.ObjectId(data.receiverId),
                  },
              ],  
          }
      },
      {
        $lookup: {
            from: "chats",
            let: { userId: "$_id" },
            pipeline: [
                { $match: { $expr: { $eq: ["$chatId", "$$userId"] },isSeen:false,receiverId:mongoose.Types.ObjectId(data.receiverId) } },
            ],
            as: "unseenCount",
        }
      },
       {
        $addFields:{
          unseenCount:{$size:"$unseenCount"}
        }
      }, 
      {
          $lookup:{
              from:"chats",
              localField:"lastmsgId",
              foreignField:'_id',
              as:"lastmsgId"
          }
      },
      {
          $unwind:"$lastmsgId"
      },
      {
        $addFields:{
          receiverId:{
            $cond: {
              if: {
                $eq: [mongoose.Types.ObjectId(data.receiverId), "$lastmsgId.receiverId"]
            },
                then: "$lastmsgId.senderId",
                else: "$lastmsgId.receiverId"
            },
          }
        }
      },
      {
          $lookup:{
              from:"auths",
              localField:"receiverId",
              foreignField:'_id',
              as:"receiverId"
          }
      },
      {
          $unwind:"$receiverId"
      },  
       
       {
          $project:{
              _id:"$_id",
              "receiverId":"$receiverId",
              "senderId":"$senderId",
              "type":"$type",
              "isTyping":1,
              "unseenCount":1,
              newDate:1,
              "updatedAt":"$updatedAt",
              "lastmsgId.receiverId._id":"$receiverId._id",
              "lastmsgId.receiverId.message":"$lastmsgId.message",
              "lastmsgId.receiverId.isOnline":"$receiverId.isOnline",
              "lastmsgId.receiverId.email":"$receiverId.email",
              "lastmsgId.receiverId.socketId":"$receiverId.socketId",
          }
      }, 
      {
        $project:{
          "receiverId":0,
        }
      } ,   
      {
          $sort: { newDate: -1 },
      },
  ]);
  // socket.broadcast.to(otherUserDetails.socketId).emit("chatLists", chatList);
      // socket.broadcast.to(otherUserDetails.socketId).emit("chatHistory", chatDetails);
      // socket.emit("chatHistory", chatDetails);
    }
  });

  socket.on("disconnect", async () => {
    let socketId = SOCKETPEOPLE[socket.id];
    delete SOCKETPEOPLE[socket.id];
    let index = USERS.indexOf(socketId);
    USERS.splice(socketId, 1);
    let updateUser = await User.findOneAndUpdate(
      { _id: socketId },
      { socketId: "", isOnline: false },
      { new: true }
    );
    socket.broadcast.emit("userOnlineStatus", {
      senderId: socketId,
      status: 0,
    });
  });

  /**
   * socket disconnect 
   * disconnect manually
   */
  socket.on("disconnectUser", async (data) => {
    try {
      // maually check user is in SOCKETPEOPLE array
      for (var id in SOCKETPEOPLE) {
        // check if socket.id is exist or not
        SOCKETPEOPLE[socket.id] = data.senderId;
        if (SOCKETPEOPLE[socket.id] != undefined) {
          var userindex = USERS.indexOf(SOCKETPEOPLE[socket.id]);
          if (userindex > -1) {
            let updateUser = await User.findOneAndUpdate(
              { _id: data.senderId },
              { socketId: "", isOnline: false },
              { new: true }
            );
            if (updateUser) {
              USERS.splice(userindex, 1);
            }
            socket.broadcast.emit("userOnlineStatus", {
              senderId: SOCKETPEOPLE[socket.id],
              status: 0,
            });
            socket.emit("userOnlineStatus", {
              senderId: SOCKETPEOPLE[socket.id],
              status: 0,
            });
          }
        }
      }
    } catch (err) {
      socket.emit("userOnlineStatus", err ? err : "something went wrong");
    }
  });




/**
 * Get ChatId
 */
  socket.on("getRoomId",async(data)=>{

    let creteria = {
        $or: [

          {
            $and: [
              {
                senderId: data.senderId,
              }, 
              {
                receiverId: data.receiverId,
              }
            ] 
          },
          {
            $and: [
              {
                senderId: data.receiverId,
              },
              {
                receiverId: data.senderId,
              }
            ],
          },
        ],
        itemId: data.itemId,
      }

    let isAlreadyId = await CHATCONSTANTS.findOne(creteria).select('_id');

    socket.emit("chatRoomId", isAlreadyId._id);
  });
  
  
  /**
   * Chat - soft delete
  */

 socket.on("chat_delete", async (data) => {

    let chatId = data.chatId;   
    let senderId = data.senderId;
    var deletedByIds;

    chatId.map(async (obj, index) => {

      var getSingleChat = await CHATS.findOne(        
        { _id : mongoose.Types.ObjectId(obj)}
      );

      if(getSingleChat) {
          
          getSingleChat.deletedBy.push(mongoose.Types.ObjectId(senderId)); 
          
          deletedByIds = getSingleChat.deletedBy;
           
          isUpdated = await CHATS.findOneAndUpdate(        
          { _id : mongoose.Types.ObjectId(obj)},
          { deletedBy:  deletedByIds},
          {new : true } 
          );
      }

    });  

  // let deleteChat = await CHATS.updateMany(creteria,{$addToSet:{deletedBy:data.userId}},{new:true,multi:true}); 
  
    io.emit("chat_delete", data);
  
  });

    /**
    * Chat - soft delete Chat List
    */

  socket.on("chatList_delete", async (data) => {
    console.log("hit")
    try{
      let chatId = data.chatId;   
      let senderId = data.senderId;
      var deletedByIds;
  
      chatId.forEach(async element => {
        /**Find Chat RoomId */
        var getSingleChat = await CHATCONSTANTS.findOne({ 
          _id : element
        });
  
        if(getSingleChat) {
          /**Push SenderId In deletedBy Array */
          getSingleChat.deletedBy.push(mongoose.Types.ObjectId(senderId));      
          
          deletedByIds = getSingleChat.deletedBy;
          
          isUpdated = await CHATCONSTANTS.findOneAndUpdate(        
          { _id : element },
          { deletedBy:  deletedByIds},
          {new : true } 
          );
  
          // Delete Chat
          isUpdateOnChat = await CHATS.updateMany(
            { chatId: element },
            { $push : { deletedBy: deletedByIds }},
            { new: true, multi: true }
          );  
        }
      });
  
    // let deleteChat = await CHATS.updateMany(creteria,{$addToSet:{deletedBy:data.userId}},{new:true,multi:true}); 

    let updateChat = await CHATS.updateMany({chatId:chatId},{
      $set: {

          isSeen: true
      }
  }, 
{
  multi: true,
  new:true
}
);
      io.emit("chatList_delete", data);
    }

    catch(err){
      socket.emit("chatList_delete", err ? err : 'something went wrong');
    }
  
  });

    /**
   * Read All Chat
   */
     socket.on("readAllChat", async (data) => {
      try {
        let chatId = data.chatId;
        let senderId = data.senderId;
    
        chatId.forEach(async (element) => {
          /**Find Chat RoomId */
          var getSingleChat = await CHATCONSTANTS.findOne({
            _id: element,
          });
    
          if (getSingleChat) {
            // Delete Chat
            isUpdateOnChat = await CHATS.updateMany(
              { chatId: element },
              { isSeen: true },
              { new: true, multi: true }
            );
          }
        });
    
        io.emit("readAllChat", data);
      } catch (err) {
        socket.emit("readAllChat", err ? err : err.message);
      }
    });



  });
};