/*
@copyright : ToXSL Technologies Pvt. Ltd. < www.toxsl.com >
@author     : Shiv Charan Panjeta < shiv@toxsl.com >
 
All Rights Reserved.
Proprietary and confidential :  All information contained herein is, and remains
the property of ToXSL Technologies Pvt. Ltd. and its partners.
Unauthorized copying of this file, via any medium is strictly prohibited.
*/

const Notification = require("../model/notification.model");
const responseMessage = require("../../../middleware/responseMessage");
const statusCode = require("../../../middleware/statusCode");
const { SEEN, ZERO_NUM, ONE, COUNT_TEN } = require("../../../helpers/constant");
const setResponseObject =
  require("../../../middleware/commonFunctions").setResponseObject;

const _notification = {};

_notification.post = async (req, res, next) => {
  try {
    let data = req.body;
    data.sendBy = req.userId;
    let isNotification = await new Notification(data).save();
    if (!isNotification) {
      res.status(statusCode.BAD_REQUEST).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG("Notification not send"),
      });
    } else {
      res.status(statusCode.SUCCESS).send({
        success: true,
        message: responseMessage.ADD_SUCCESS("Notification"),
        data: isNotification,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};


// Get all notification of current user
_notification.get = async (req, res, next) => {
  try {
    var date = new Date();
    date.setDate(date.getDate() - 7);

    // Find all unseen notifications
    let isUnseenNotification = await Notification.find({
      sendTo:req.userId,
      status: "unseen"
    });

    var unseenNotificationArr = [];
    var unseenNotiCountArr = [];

    // push unseen notifications
    isUnseenNotification.map((a) => {
      unseenNotificationArr.push(a._id);
      unseenNotiCountArr.push(a._id);
    });

    // All seen & unseen notifications of last 7 day's
    let isNotificationThisWeeks = await Notification.find({
      sendTo:req.userId,
      createdAt: {$gte: date},
    })

    // Push unseen noti count
    let isUnseenNotificationThisWeeks = await Notification.find({
      sendTo:req.userId,
      status: "unseen",
      createdAt: {$gte: date},
    })
    isUnseenNotificationThisWeeks.map((a) => {
      unseenNotiCountArr.push(a._id);
    });

    // push notifications of last 7 day's
    isNotificationThisWeeks.map((a) => {
      unseenNotificationArr.push(a._id);
    });

    let countNoti = await Notification.find({_id: {$in: unseenNotificationArr}}).countDocuments();
    let countUnseenNoti = await Notification.find({_id: {$in: unseenNotiCountArr}}).countDocuments();
    // pagination
    let pageNo = parseInt(req.query.pageNo) || ONE;
    let pageLimit = parseInt(req.query.pageLimit) || COUNT_TEN;
    if (pageNo <= ZERO_NUM) {
    throw { message: responseMessage.PAGE_INVALID };
    }
    // Get both notifications with array
    let isNotification = await Notification.find({_id: {$in: unseenNotificationArr}})
    .populate("item_id group_id req_id item_return_req_id item_req_id")
    .sort({ createdAt: -1 })
    .skip(pageLimit * (pageNo - ONE))
    .limit(pageLimit);
    if (isNotification.length == 0) {
      res.status(statusCode.SUCCESS).send({
        success: true,
        message: responseMessage.SOMETHING_WRONG("Notification not found"),
        data: []
      });
    } else {
      let currentPage= await parseInt(req.query.pageNo);
      var tempPage = ONE;
      while(tempPage){
        if(countNoti <= pageLimit || countNoti <= pageLimit  * tempPage ){
            tempPage;
            break;
        }
        tempPage++
      }
      res.status(statusCode.SUCCESS).send({
        success: true,
        message: responseMessage.FOUND_SUCCESS("Notification"),
        data: isNotification,
        totalCount: countNoti,
        countUnseenNoti,
        totalPage: tempPage,
        currentPage
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 * Mark Notification as seen
 */
_notification.markSeen = async (req, res, next) => {
  try {
    let isNotification = await Notification.findOneAndUpdate(
      {_id: req.params.notificationId},
      {status: "seen"},
      {new: true}
    );
    if (!isNotification) {
      res.status(statusCode.BAD_REQUEST).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG("Notification not seen"),
      });
    } else {
      res.status(statusCode.SUCCESS).send({
        success: true,
        message: responseMessage.NOTIFICATION_SEEN,
        data: isNotification,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 * Get unseen notification
 */
_notification.getByStatus = async(req,res,next) => {
  try {
    let unseenNotificationCount = await Notification.find({sendTo:req.userId, status:"unseen"}).countDocuments();
    let isNotification = await Notification.find({sendTo:req.userId, status:"unseen"})
    .populate("item_id group_id req_id item_return_req_id item_req_id")
    .sort({ createdAt: -1 });
    if (isNotification.length==0) {
      res.status(statusCode.BAD_REQUEST).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG("Notification not found"),
      });
    } else {
      res.status(statusCode.SUCCESS).send({
        success: true,
        message: responseMessage.FOUND_SUCCESS("Notification"),
        unseenNotificationCount,
        data: isNotification,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
}

/**
 * Get seen notification
 */
 _notification.getSeenStatus = async(req,res,next) => {
  try {
    let unseenNotificationCount = await Notification.find({
      sendTo:req.userId, status:SEEN
    }).countDocuments();
    let isNotification = await Notification.find({sendTo:req.userId, status:SEEN})
    .populate("item_id group_id req_id item_return_req_id item_req_id")
    .sort({ createdAt: -1 });
    if (isNotification.length == ZERO_NUM) {
      res.status(statusCode.BAD_REQUEST).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG("Notification not found"),
      });
    } else {
      res.status(statusCode.SUCCESS).send({
        success: true,
        message: responseMessage.FOUND_SUCCESS("Notification"),
        unseenNotificationCount,
        data: isNotification,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
}

/**
 * Mark multiple read notification
 * @param { notificationIds } req in array
 */
 _notification.setMultipleSeen = async(req, res, next) => {

  try{
    if(req.body.readAll == true){
      let updateAll = await Notification.updateMany(
        {sendTo: req.userId}, { status: "seen" }, {multi: true}
      );
      if(!updateAll){
        res.status(statusCode.BAD_REQUEST).send({
          success: false,
          message: responseMessage.SOMETHING_WRONG("Failed to seen notification"),
        });
      } else {
        res.send({
          success : true,
          message : responseMessage.UPDATE_SUCCESS("Notification seen"),
          data : updateAll
        })
      }
      return;
    } else {
      var body = req.body.notificationIds;
      
      var ids = [];
      let isUpdated;
      body.map(async (data, index) => {

        let check = await Notification.findOne({_id : data});
        if(check){
          isUpdated = await Notification.updateOne(
            { _id : data},
            { status: SEEN },
            {new : true } 
            );
            res.send({
              success : true,
              message : responseMessage.UPDATE_SUCCESS("Notification seen"),
              data : isUpdated
            })
        }
        else {
          res.status(statusCode.BAD_REQUEST).send({
            successs : false,
            message : responseMessage.SOMETHING_WRONG("Invalid Notification Id")
          })
        }
      }); 
    }
    }catch(err){
      await setResponseObject(req, false, err.message,"")
      next();
  }
}

/**
 * Mark multiple delete notification
 * @param { notificationIds } req in array
 */
 _notification.multipleDelete = async(req, res, next) => {

  try{
    if(req.body.deleteAll == true){
      let isDeleteAll = await Notification.deleteMany(
        {sendTo: req.userId}
      );
      if(isDeleteAll.deletedCount == 0){
        res.status(statusCode.BAD_REQUEST).send({
          success: false,
          message: responseMessage.SOMETHING_WRONG("Notification not found"),
        });
      } else {
        res.send({
          success : true,
          message : responseMessage.SOMETHING_WRONG("Notification deleted"),
          data : isDeleteAll
        })
      }
    } else {
      var body = req.body.notificationIds;
      
      var ids = [];
      let isDeleted;
      body.map(async (data, index) => {

        let check = await Notification.findOne({_id : data});
        if(check){
          // delete notification
          isDeleted = await Notification.findOneAndRemove({ _id : data});

          res.send({
            success : true,
            message : responseMessage.SOMETHING_WRONG("Notification deleted"),
          })
        } else {
          res.send({
            successs : false,
            message : responseMessage.SOMETHING_WRONG("Invalid Notification Id")
          })
          return;
        }
      }); 
    }
    }catch(err){
      await setResponseObject(req, false, err.message,"")
      next();
  }
}

module.exports = _notification;
