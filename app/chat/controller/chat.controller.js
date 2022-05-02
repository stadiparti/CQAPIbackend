const {CHATCONSTANTS} = require("../model/chat.model");
const responseMessage = require("../../../middleware/responseMessage");
const { SUCCESS } = require("../../../helpers/constant");
const setResponseObject = require("../../../middleware/commonFunctions")
    .setResponseObject;


const _request = {};

_request.getRoomId = async(req,res,next) => {
    try {
        let creteria = {
            $or: [
              {
                $and: [
                  {
                    senderId: req.userId,
                  }, 
                  {
                    receiverId: req.query.receiverId,
                  }
                ] 
              },
              {
                $and: [
                  {
                    senderId: req.query.receiverId,
                  },
                  {
                    receiverId: req.userId,
                  }
                ],
              },
            ],
            itemId: req.query.itemId,
          }
        let result = await CHATCONSTANTS.findOne(creteria);
        if(result){
            res
            .status(SUCCESS)
            .send({ 
                success: true,
              message: responseMessage.FOUND_SUCCESS("ChatId"), 
              chatId: result._id,
          })
        } else {
          res
            .status(SUCCESS)
            .send({ 
                success: true,
              message: responseMessage.FOUND_SUCCESS("ChatId"), 
              chatId: result
          })
        }
    } catch (err) {
        await setResponseObject(req, false, err.message, "");
        next();
    }
}

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
_request.getReceiverId = async(req,res,next) => {
    try {
        let creteria = {
            _id: req.query.chatId
          }
        let result = await CHATCONSTANTS.findOne(creteria);
        if(result){
            res
            .status(SUCCESS)
            .send({ 
                success: true,
              message: responseMessage.FOUND_SUCCESS("ReceiverId"), 
              receiverId: result.receiverId,
          })
        } else {
          res
            .status(SUCCESS)
            .send({ 
                success: true,
              message: responseMessage.FOUND_SUCCESS("ReceiverId"), 
              ReceiverId: result
          })
        }
    } catch (err) {
        await setResponseObject(req, false, err.message, "");
        next();
    }
}

_request.sendMessage = async(req, res, next)=>{
    try{
        if(1){
            await setResponseObject(
                req,
                true,
                "Message send successfully",
                {
                    "_id":"5f6d80f06883141ca0989276",
                    "sender_id":"3452435wregw54t243",
                    "receiver_id":"3204868305680358sajdfgosfj",
                    "message":"24352435243fasdfasdfasd"
                }
            );
            next();
        }else{
            res.send({
                message:"Do it later!"
            });
        }
    }catch(err){
        await setResponseObject(req, false, err.message, "");
        next();
    }
}

_request.chatList = async(req, res, next)=>{
    try{
        if(1){
            await setResponseObject(
                req,
                true,
                "Data found successfully",
                [
                    {
                        "_id":"5f6d80f06883141ca0989276",
                        "sender_id":"3452435wregw54t243",
                        "receiver_id":"3204868305680358sajdfgosfj",
                        "message":"24352435243fasdfasdfasd"
                    },
                    {
                        "_id":"5f6d80f06883141ca0989276",
                        "sender_id":"3452435wregw54t243",
                        "receiver_id":"3204868305680358sajdfgosfj",
                        "message":"24352435243fasdfasdfasd"
                    }
                ]
            );
            next();
        }else{
            res.send({
                message:"Do it later!"
            });
        }
    }catch(err){
        await setResponseObject(req, false, "Something went wrong", "");
        next();
    }
}

_request.history = async(req, res, next)=>{
    try{
        if(1){
            await setResponseObject(
                req,
                true,
                "Data found successfully",
                [
                    {
                        "_id":"5f6d80f06883141ca0989276",
                        "sender_id":"3452435wregw54t243",
                        "receiver_id":"3204868305680358sajdfgosfj",
                        "message":"24352435243fasdfasdfasd"
                    },
                    {
                        "_id":"5f6d80f06883141ca0989276",
                        "sender_id":"3452435wregw54t243",
                        "receiver_id":"3204868305680358sajdfgosfj",
                        "message":"24352435243fasdfasdfasd"
                    }
                ]
            );
            next();
        }else{
            res.send({
                message:"Do it later!"
            });
        }
    }catch(err){
        await setResponseObject(req, false, "Something went wrong", "");
        next();
    }
}


_request.delete = async(req, res, next)=>{
    try{
        if(1){
            await setResponseObject(
                req,
                true,
                "Chat delete successfully"
            );
            next();
        }else{
            res.send({
                message:"Do it later!"
            });
        }
    }catch(err){
        await setResponseObject(req, false, "Something went wrong", "");
        next();
    }
}

_request.newMessage = async(req, res, next)=>{
    try{
        if(1){
            await setResponseObject(
                req,
                true,
                "New messages found",
                [
                    {
                        "_id":"5f6d80f06883141ca0989276",
                        "sender_id":"3452435wregw54t243",
                        "receiver_id":"3204868305680358sajdfgosfj",
                        "message":"24352435243fasdfasdfasd"
                    },
                    {
                        "_id":"5f6d80f06883141ca0989276",
                        "sender_id":"3452435wregw54t243",
                        "receiver_id":"3204868305680358sajdfgosfj",
                        "message":"24352435243fasdfasdfasd"
                    }
                ]
            );
            next();
        }else{
            res.send({
                message:"Do it later!"
            });
        }
    }catch(err){
        await setResponseObject(req, false, "Something went wrong", "");
        next();
    }
}


module.exports = _request;