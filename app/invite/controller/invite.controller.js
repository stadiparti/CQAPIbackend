const inviteModel = require("../model/invite.model.js");
const responseMessage = require("../../../middleware/responseMessage");
const _invite = {};

const setResponseObject = require("../../../middleware/commonFunctions")
    .setResponseObject;

_invite.create = async(req, res, next)=>{
    try{
        if(0){
            await setResponseObject(
                req,
                true,
                "Invitation send successfully",
                {
                    "_id":"243524352345234tr243",
                    "sender_id":"43543543",
                    "receiver_id":"32424",
                    "group_id":7698790709
                }
            );
            next();
        }else{
            let data = req.body;
            data.sender_id = req.userId;
            if(!data.receiver_phone){
                res
                .status(400)
                .send({ message: responseMessage.REQUIRED_FIELD})
            }
            let inviteResult = await new inviteModel(data).save();
            if(!inviteResult){
                res
                .status(400)
                .send({
                    message: responseMessage.SOMETHING_WRONG("Not Invited")
                })
            }else{
                res
                .status(200)
                .send({
                    message: responseMessage.ADD_SUCCESS("Invite"),
                    data: inviteResult
                })
            }
        }
    }
    catch(err){
        await setResponseObject(req, false, "Something went wrong", "");
        next();
    }
}

_invite.update = async(req, res, next)=>{
    try{
        let data = req.body;
            data.updatedBy = req.userId;
            if(!data.invitation_id){
                res
                .status(400)
                .send({ message: responseMessage.REQUIRED_FIELD})
            }
            let inviteResult = await inviteModel.findOneAndUpdate(
                {
                    _id: req.body.invitation_id,
                },
                data,
                { new: true }
            );
            if(!inviteResult){
                res
                .status(400)
                .send({
                    message: responseMessage.SOMETHING_WRONG("Not Updated")
                })
            }else{
                res
                .status(200)
                .send({
                    message: responseMessage.UPDATE_SUCCESS("Invite"),
                    data: inviteResult
                })
            }
    }catch(err){
        await setResponseObject(req, false, "Something went wrong", "");
        next();
    }
}

_invite.one = async(req, res, next)=>{
    try{
            let isInvitation = await inviteModel.findById({_id:req.params.invitation_id})
            if(!isInvitation){
                res
                .status(404)
                .send({ 
                    message: responseMessage.SOMETHING_WRONG("Data Not Found")
                })
            }
            else{
                res
                .status(200)
                .send({ 
                    message: responseMessage.FOUND_SUCCESS("Item"), 
                    data: isInvitation 
                })
            }
    }catch(err){
        await setResponseObject(req, false, "Something went wrong", "");
        next();
    }
}

_invite.all = async(req, res, next)=>{
    try{
        if(0){
            await setResponseObject(
                req,
                true,
                "Data found successfully",
                [
                   {
                    "_id":"243524352345234tr243",
                    "sender_id":"43543543",
                    "receiver_id":"32424",
                    "group_id":7698790709
                   }, 
                   {
                    "_id":"243524352345234tr242",
                    "sender_id":"43543543",
                    "receiver_id":"32424",
                    "group_id":7698790709
                   }, 
                ]
            );
            next();
        }else{
            let isInvitation = await inviteModel.find();
            if(!isInvitation){
                res
                .status(404)
                .send({ 
                    message: responseMessage.SOMETHING_WRONG("Data Not Found")
                })
            }
            else{
                res
                .status(200)
                .send({ 
                    message: responseMessage.FOUND_SUCCESS("Invite"), 
                    data: isInvitation 
                })
            }
        }
    }catch(err){
        await setResponseObject(req, false, "Something went wrong", "");
        next();
    }
}


_invite.cancel = async(req, res, next)=>{
    try{
        if(0){
            await setResponseObject(
                req,
                true,
                "Request cancelled successfully"
            );
            next();
        }else{
            let isCancel = await inviteModel.findOneAndUpdate({
                _id: req.body.invitation_id
            },
            {status: 3},
            {new:true}
            );
            if (!isCancel) {
                res
                .status(400)
                .send({
                    success: false,
                    message: responseMessage.SOMETHING_WRONG("Failed to cancle")
                })
            } else {
                res
                .status(200)
                .send({
                    success: true,
                    message: responseMessage.INVITE_REJECT,
                    data: isCancel
                })
            }
        }

    }catch(err){
        await setResponseObject(req, false, "Something went wrong", "");
        next();
    }
}

_invite.accept = async(req,res) => {
    try{
        if(0){
            await setResponseObject(
                req,
                true,
                "Request cancelled successfully"
            );
            next();
        }else{
            let isCancel = await inviteModel.findOneAndUpdate({
                _id: req.body.invitation_id
            },
            {
                status: 2   // accept
            },
            {
                new:true
            }
            );
            if (!isCancel) {
                res
                .status(400)
                .send({
                    success: false,
                    message: responseMessage.SOMETHING_WRONG("Failed to cancle")
                })
            } else {
                res
                .status(200)
                .send({
                    success: true,
                    message: responseMessage.INVITE_REJECT,
                    data: isCancel
                })
            }
        }

    }catch(err){
        await setResponseObject(req, false, err.message, "");
        next();
    }
}

_invite.addMember = async (req, res) => {
    try {
      let groupArray = [];
      req.body.memberData.map((a) => {
        groupArray.push(a.group_id);
      });
  
      let findNoOfMember = await GroupMember.find({
        group_id: groupArray,
      }).countDocuments();
  
      if (findNoOfMember < Constant.MAX_NO_MEMBER_IN_GROUP) {
        let result = await GroupMember.create(req.body.memberData);
  
        let userArray = [];
  
        req.body.memberData.map((a) => {
          userArray.push(a.user_id);
        });
  
        let senderUser = await authModel.find({ _id: { $in: userArray } });
  
        let groupData = await Group.findOne({
          _id: req.body.memberData[0].group_id,
        });
  
        let groupOwner = await authModel.findOne({ _id: groupData.owner_id });
  
        senderUser.forEach(async (element) => {
          let obj = {
            sendBy: req.userId,
            sendTo: element._id,
            title: "CliqRight",
            body: `${groupOwner.first_name} ${groupOwner.last_name} has invited you to join ${groupData.group_name} group`,
            message: `${groupOwner.first_name} ${groupOwner.last_name} has invited you to join ${groupData.group_name} group`,
            notificationType: "group_invitation",
          };
  
          let saveNotification = await notification.create(obj);
  
          /**
           * Send SMS on Mobile
           */
          /*let contactNumber = element.countryCode + element.phone_no;
  
          let smsSend = await commonFunction.sendSMS(
            contactNumber,
            `${groupOwner.first_name} ${groupOwner.last_name} has invited you to join ${groupData.group_name} group.`
          );*/
  
          /** Send on Email */
          let email = element.email;
          let subject = `Group Invitation`;
          let html = `<p> ${groupOwner.first_name} ${groupOwner.last_name} has invited you to join ${groupData.group_name} group </p>`;
        //   let sendEmail = await commonFunction.sendMail(email, subject, html);
  
        });
  
        if (!result) {
          return res.status(BAD_REQUEST).send({
            success: false,
            message: responseMessage.SOMETHING_WRONG("Member Not Add"),
          });
        } else {
          return res.status(SUCCESS).send({
            success: true,
            message: responseMessage.ADD_SUCCESS("Member"),
            result,
          });
        }
      } else {
        res.status(BAD_REQUEST).send({
          success: false,
          message: responseMessage.GROUP_JOIN_LIMI_EXCEED,
        });
      }
    } catch (error) {
      return res.status(500).send({
        success: false,
        message: error.message,
      });
    }
  };

module.exports = _invite;