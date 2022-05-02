const { CHATCONSTANTS, CHATS } = require("../model/chat.model");
const mongoose = require("mongoose");
const { exec } = require("child_process");

const User = require("../../auth/model/auth.model");

const _ = require("underscore");
var fs = require("fs");
// const {CHATCONSTANTS,CHATS} = require("../models/chatModel");
const USERS = [];
const SOCKETPEOPLE = {};
module.exports = (io) => {
  io.on("connection", (socket) => {
  
    socket.on("connectUser", async (data) => {
      try {
        var userindex = USERS.indexOf(data.senderId);
        if (userindex > -1) {
          for (var id in SOCKETPEOPLE) {
            if (SOCKETPEOPLE[id] == data.senderId) {
              delete SOCKETPEOPLE[id];
              USERS.splice(userindex, 1);
              SOCKETPEOPLE[socket.id] = data.senderId;
              USERS.push(data.senderId);
            }
          }
        } else {
          SOCKETPEOPLE[socket.id] = data.senderId;
          USERS.push(data.senderId);
          let updateUser = await User.findOneAndUpdate(
            { _id: data.senderId },
            { socketId: socket.id, isOnline: true },
            { new: true }
          );
        }
        _.uniq(_(SOCKETPEOPLE).toArray());
        socket.broadcast.emit("userOnlineStatus", {
          senderId: SOCKETPEOPLE[socket.id],
          status: 1,
        });
        socket.emit("userOnlineStatus", {
          senderId: SOCKETPEOPLE[socket.id],
          status: 1,
        });
      } catch (err) {
        socket.emit("userOnlineStatus", err ? err : "something went wrong");
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
        for (var id in SOCKETPEOPLE) {
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
        CHATCONSTANTS.findOneAndUpdate(
          {
            $or: [
              {
                $and: [
                  {
                    senderId: data.senderId,
                  },
                  {
                    receiverId: data.receiverId,
                  },
                ],
              },
              {
                $and: [
                  {
                    senderId: data.receiverId,
                  },
                  {
                    receiverId: data.senderId,
                  },
                ],
              },
            ],
          },
          {
            senderId: data.senderId,
            receiverId: data.receiverId,
            type: data.type,
            itemId:data.itemId
          },
          {
            upsert: true,
            new: true,
          },
          async (err, result) => {
            if (err) throw err;
            socket.join(result._id);
            if (data.type === 2) {
              data.location = {
                type: "Point",
                coordinates: [data.longitude, data.latitude],
              };
            }
            data.chatId = result._id;
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
                  $project: {
                    _id: "$_id",
                    type: "$type",
                    message: 1,
                    updatedAt: "$updatedAt",
                    "itemId._id": "$itemId._id",
                    "itemId.item_name": "$itemId.item_name",
                    "itemId.cover_image": "$itemId.cover_image",
                    "senderId._id": "$senderId._id",
                    "senderId.isOnline": "$senderId.isOnline",
                    "senderId.email": "$senderId.email",
                    "senderId.first_name": "$senderId.first_name",
                    "senderId.last_name": "$senderId.last_name",
                    "senderId.socketId": "$senderId.socketId",
                    "receiverId._id": "$receiverId._id",
                    "receiverId.isOnline": "$receiverId.isOnline",
                    "receiverId.email": "$receiverId.email",
                    "receiverId.socketId": "$receiverId.socketId",
                    "receiverId.first_name": "$receiverId.first_name",
                    "receiverId.last_name": "$receiverId.last_name",
                  },
                },
                {
                  $sort: { createdAt: -1 },
                },
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
                          isSeen: false,
                          receiverId: mongoose.Types.ObjectId(data.receiverId),
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
                {
                  $lookup: {
                    from: "chats",
                    localField: "lastmsgId",
                    foreignField: "_id",
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
                  $project: {
                    _id: "$_id",
                    receiverId: "$receiverId",
                    senderId: "$senderId",
                    type: "$type",
                    isTyping: 1,
                    unseenCount: 1,
                    newDate: 1,
                    updatedAt: "$updatedAt",
                    "lastmsgId.receiverId._id": "$receiverId._id",
                    "lastmsgId.receiverId.message": "$lastmsgId.message",
                    "lastmsgId.receiverId.isOnline": "$receiverId.isOnline",
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
              ]);
              socket.broadcast
                .to(otherUserDetails.socketId)
                .emit("chatLists", chatList);
              socket.broadcast
                .to(otherUserDetails.socketId)
                .emit("msgReceived", chatDetails); 
              socket.emit("msgReceived", chatDetails);
            });
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
        const chatList = await CHATCONSTANTS.aggregate([
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
                    receiverId: mongoose.Types.ObjectId(data.senderId),
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
          {
            $lookup: {
              from: "chats",
              localField: "lastmsgId",
              foreignField: "_id",
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
                  $project:{
                      _id:"$_id",
                      "type":"$type",
                      "itemId._id": "$itemId._id",
                      "itemId.item_name": "$itemId.item_name",
                      "itemId.cover_image": "$itemId.cover_image",
                      "message":1,
                      "updatedAt":"$updatedAt",
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
              },
              {
                  $sort: { createdAt: -1 },
              },
          ]);
          
          socket.emit("chatHistory",chatDetails);
          socket.broadcast.to(chatDetails[0].receiverId.socketId).emit("chatHistory", chatDetails);
        }
      }catch(err){
          socket.emit("chatHistory",err ? err:'something went wrong')
      }
  });

  socket.on("deleteChat",async(data)=>{
    let otherUserDetails = await User.findOne({_id:data.receiverId}).select("socketId");
    let deleteChat = await CHATS.findOneAndDelete({_id:data.id});
    socket.broadcast.to(otherUserDetails.socketId).emit("deletedChat", updateChat);
    socket.emit("deletedChat", updateChat);
  }) 

  socket.on("seen", async(data)=>{
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
  socket.broadcast.to(otherUserDetails.socketId).emit("chatLists", chatList);
      socket.broadcast.to(otherUserDetails.socketId).emit("chatHistory", chatDetails);
      socket.emit("chatHistory", chatDetails);
    }
  });

    /**
       * user typing msg`s to other user
       */
     socket.on("typing", async(data)=>{
        
      let otherUserDetails = await User.findOne({_id:data.receiverId}).select("socketId isOnline");
      let getChatConstant = await CHATCONSTANTS.findOne({
        $or: [
          {
              $and: [
              {
                  senderId: data.senderId,
              },
              {
                  receiverId: data.receiverId,
              },
              ],
          },
          {
              $and: [
              {
                  senderId: data.receiverId,
              },
              {
                  receiverId: data.senderId,
              },
              ],
          },
          ],
      })
      let updateChatConstant = await CHATCONSTANTS.findOneAndUpdate(
        {
          // match with sender and receiver id with and, or case
          $or: [
          {
              $and: [
              {
                  senderId: data.senderId,
              },
              {
                  receiverId: data.receiverId,
              },
              ],
          },
          {
              $and: [
              {
                  senderId: data.receiverId,
              },
              {
                  receiverId: data.senderId,
              },
              ],
          },
          ],
      },{
        $set:{isTyping:data.isTyping },
      },{new:true}
      )
      socket.broadcast.to(otherUserDetails.socketId).emit("typingStatus", {senderId:data.senderId, isTyping:data.isTyping});
      let pageNo = parseInt(data.pageNo)||1;
            let pageSize = parseInt(data.pageSize) || 10;
            if (pageNo <= 0) {
            throw responseMessage.PAGE_INVALID;
            }
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
                        from:"users",
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
                        "lastmsgId.receiverId.files":"$lastmsgId.files",
                        "lastmsgId.receiverId.thumbnail":"$lastmsgId.thumbnail",
                        "lastmsgId.receiverId.userName":"$receiverId.userName",
                        "lastmsgId.receiverId.profileImg":"$receiverId.profileImg",
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
            let status  =2;
            let chatId;
            if(!data.isTyping){
              status = 1;
            }
            if(data.isTyping){
              chatId=getChatConstant._id
            }
            if(!otherUserDetails.isOnline){
              status = 0
            }
            socket.broadcast.to(otherUserDetails.socketId).emit('userOnlineStatus',{status:status,chatId})
            socket.broadcast.to(otherUserDetails.socketId).emit("chatLists", chatList);
            
    });


    //b
    socket.on("seen", async(data)=>{
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
    socket.broadcast.to(otherUserDetails.socketId).emit("chatLists", chatList);
        socket.broadcast.to(otherUserDetails.socketId).emit("chatHistory", chatDetails);
        socket.emit("chatHistory", chatDetails);
      }
    });

    /**
   * Chat - soft delete
  */

   socket.on("chat_soft_delete", async (data) => {


    data.body.map(async (obj, index) => {

      isUpdated = await CHATS.findOneAndUpdate(
        { _id : data._id},
        { 
          deletedBy: data.userId 
        },
        {new : true } 
        );
    });  

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

    let deleteChat = await CHATS.updateMany(creteria,
      {
        $addToSet:{deletedBy:data.userId}
      },
      {
        new:true,
        multi:true
      });

    io.emit("chat_soft_delete", data);
    
  });



  });
};
