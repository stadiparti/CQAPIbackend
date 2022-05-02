/*
@copyright : ToXSL Technologies Pvt. Ltd. < www.toxsl.com >
@author     : Shiv Charan Panjeta < shiv@toxsl.com >
 
All Rights Reserved.
Proprietary and confidential :  All information contained herein is, and remains
the property of ToXSL Technologies Pvt. Ltd. and its partners.
Unauthorized copying of this file, via any medium is strictly prohibited.
*/

const itemRequest = require("../model/request.model");
const ItemRequestReturn = require("../model/requestReturn.model");
const responseMessage = require("../../../middleware/responseMessage");
const setResponseObject =
  require("../../../middleware/commonFunctions").setResponseObject;
const itemModel = require("../../item/model/item.model");
const userModel = require("../../auth/model/auth.model");

const Constant = require("../../../helpers/constant");
const notification = require("../../notification/model/notification.model");
const commonFunction = require("../../../helpers/nodeMailer");
const helper = require("../../../helpers/nodeMailer");
const authModel = require("../../auth/model/auth.model");
const { CHATCONSTANTS, CHATS } = require("../../chat/model/chat.model");
const {
  AVAILABLE,
  NOT_FOUND,
  BAD_REQUEST,
  SUCCESS,
  ZERO_NUM,
  ONE,
  REQUESTED,
  ACCEPTED_BORROEWD,
  BORROWED,
  RETURN,
  UNAUTHORIZED,
} = require("../../../helpers/constant");

const _request = {};

/**
 * Send Request For Item Borrow
 * @param {item_id} req.body
 */
_request.borrow = async (req, res, next) => {
  try {
    let checkLimits = await itemRequest
      .find({ createdBy: req.userId, request_status: REQUESTED })
      .countDocuments();
    if (checkLimits <= Constant.REQUEST_BORROW_LIMITS) {
      let data = req.body;
      data.createdBy = req.userId;
      let senderUser = await userModel.findOne({ _id: req.userId });

      let query = {
        $and: [
          { item_id: req.body.item_id },
          { createdBy: req.userId },
          { request_status: Constant.REQUESTED },
        ],
      };
      let isUserExist = await itemRequest.findOne(query);

      let itemData = await itemModel.findOne({ _id: req.body.item_id });

      let receiverUser = await userModel.findOne({ _id: itemData.createdBy });

      if (isUserExist) {
        res.status(BAD_REQUEST).send({
          success: false,
          message: responseMessage.SOMETHING_WRONG("Request Already send"),
        });
      } else {
        let requestResult = await new itemRequest(data).save();

        let itemDataSave = await itemRequest
          .findOne({ _id: requestResult._id })
          .populate("item_id");

        let socketData = await CHATCONSTANTS.findOneAndUpdate(
          {
            $and: [
              {
                $or: [
                  {
                    $and: [
                      {
                        senderId: req.userId,
                      },
                      {
                        receiverId: receiverUser._id,
                      },
                    ],
                  },
                  {
                    $and: [
                      {
                        senderId: receiverUser._id,
                      },
                      {
                        receiverId: req.userId,
                      },
                    ],
                  },
                ],
              },
              {
                itemId: req.body.item_id,
              },
            ],
          },
          {
            senderId: req.userId,
            receiverId: receiverUser._id,
            type: 4,
            itemId: req.body.item_id,
            deletedBy: [],
          },
          {
            upsert: true,
            new: true,
          }
        );

        req.body.chatId = socketData._id;
        req.body.senderId = req.userId;
        req.body.receiverId = receiverUser._id;

        let userChat = await new CHATS({
          requestJson: requestResult._id,
          senderId: req.userId,
          receiverId: receiverUser._id,
          chatId: socketData._id,
          itemId: req.body.item_id,
          type: 4,
        }).save();

        userChat.save(async (err, results) => {
          if (err) throw err;
          let chatId = socketData._id;
          CHATCONSTANTS.findByIdAndUpdate(
            socketData._id,
            {
              $set: {
                lastmsgId: socketData._id,
                updatedAt: Date.now(),
                newDate: Date.now(),
                deletedBy: [],
              },
            },
            { new: true }
          );
        });

        let isborrowed = false;
        let pushNot = await commonFunction.itemRequestNotification(
          receiverUser.fcmToken,
          "CliqRight",
          `Dear ${receiverUser.first_name} ${receiverUser.last_name}! ${senderUser.first_name} ${senderUser.last_name} wants to borrow your item:${itemData.item_name}`,
          isborrowed,
          itemData._id
        );
        let obj = {
          sendBy: req.userId,
          sendTo: receiverUser._id,
          title: "CliqRight",
          body: `Dear ${receiverUser.first_name} ${receiverUser.last_name}! ${senderUser.first_name} ${senderUser.last_name} wants to borrow your item:${itemData.item_name}`,
          message: `Dear ${receiverUser.first_name} ${receiverUser.last_name}! ${senderUser.first_name} ${senderUser.last_name} wants to borrow your item:${itemData.item_name}`,
          notificationType: "item_request",
          item_req_id: requestResult._id,
          item_id: req.body.item_id,
        };

        let results = await new notification(obj).save();

        if (results) {
          res.status(SUCCESS).send({
            success: true,
            message: responseMessage.ADD_SUCCESS("Request"),
            data: requestResult,
          });
        }
      }
    } else {
      res.status(BAD_REQUEST).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG(
          "Maximum Number For Item Request Limit Is Exceed"
        ),
      });
    }
  } catch (err) {
    await setResponseObject(
      req,
      false,
      responseMessage.SOMETHING_WENT_WRONG,
      ""
    );
    next();
  }
};

/**
 * Accept request for item
 * @param { item_request_id, item_id } req.body
 */
_request.accept = async (req, res, next) => {
  try {
    if (0) {
      await setResponseObject(req, true, "Request cancelled successfully");
      next();
    } else {
      let checkOwner = await itemModel
        .findOne({ _id: req.body.item_id })
        .select("createdBy -_id");
      console.log("checkOwner", checkOwner.createdBy);
      if (checkOwner.createdBy == req.userId) {
        let isAccept = await itemRequest.findOneAndUpdate(
          {
            _id: req.body.item_request_id,
            item_id: req.body.item_id,
          },
          {
            request_status: ACCEPTED_BORROEWD, // "Accepted/Borrowed"
            updatedBy: req.userId,
          },
          {
            new: true,
          }
        );
        if (!isAccept) {
          res.status(BAD_REQUEST).send({
            success: false,
            message: responseMessage.SOMETHING_WRONG(
              "Failed to accept request"
            ),
          });
        } else {
          let changeStatus = await itemModel.findOneAndUpdate(
            {
              _id: req.body.item_id,
            },
            {
              status: BORROWED,
            },
            {
              new: true,
              useFindAndModify: false,
            }
          );

          let senderUser = await userModel.findOne({
            _id: changeStatus.createdBy,
          });

          let receiverUser = await userModel.findOne({
            _id: isAccept.createdBy,
          });

          let pushNot = await commonFunction.acceptNotification(
            receiverUser.fcmToken,
            "CliqRight",
            `${senderUser.first_name} ${senderUser.last_name} has approved your request for:${changeStatus.item_name} item`,
            req.body.item_request_id,
            req.body.item_id,
            isAccept.request_status
          );
          let obj = {
            sendBy: changeStatus.createdBy,
            sendTo: receiverUser._id,
            title: "CliqRight",
            body: `${senderUser.first_name} ${senderUser.last_name} has approved your request for:${changeStatus.item_name} item`,
            message: `${senderUser.first_name} ${senderUser.last_name} has approved your request for:${changeStatus.item_name} item`,
            notificationType: "itemRequestAccept",
          };

          let saveNotification = await new notification(obj).save();

          res.status(SUCCESS).send({
            success: true,
            message: responseMessage.REQUEST_ACCEPT,
            data: isAccept,
          });
        }
      } else {
        res.status(UNAUTHORIZED).send({
          success: false,
          message: responseMessage.UNAUTHORIZED_ACCESS,
        });
      }
    }
  } catch (err) {
    await setResponseObject(
      req,
      false,
      responseMessage.SOMETHING_WENT_WRONG,
      ""
    );
    next();
  }
};

/**
 * Mark borrow return
 * @param { item_request_id, item_id } req.body
 */
_request.return = async (req, res, next) => {
  try {
    if (0) {
      await setResponseObject(req, true, "Request cancelled successfully");
      next();
    } else {
      let checkOwner = await itemModel
        .findOne({ _id: req.body.item_id })
        .select("createdBy -_id");
      if (checkOwner.createdBy == req.userId) {
        let isReturn = await itemRequest.findOneAndUpdate(
          {
            _id: req.body.item_request_id,
            item_id: req.body.item_id,
          },
          {
            request_status: RETURN, // "Return"
            updatedBy: req.userId,
          },
          {
            new: true,
            useFindAndModify: false,
          }
        );
        if (!isReturn) {
          res.status(BAD_REQUEST).send({
            success: false,
            message: responseMessage.SOMETHING_WRONG("Failed to return"),
          });
        } else {
          let markAvaliable = await itemModel.findOneAndUpdate(
            { _id: req.body.item_id },
            {
              status: AVAILABLE,
            },
            { new: true }
          );
          res.status(SUCCESS).send({
            success: true,
            message: responseMessage.ITEM_RETURN,
            data: isReturn,
          });
        }
      } else {
        res.status(UNAUTHORIZED).send({
          success: false,
          message: responseMessage.UNAUTHORIZED_ACCESS,
        });
      }
    }
  } catch (err) {
    await setResponseObject(
      req,
      false,
      responseMessage.SOMETHING_WENT_WRONG,
      ""
    );
    next();
  }
};

/**
 * Get all request on item
 * @param { item_id } req
 * @param { pageNo, pageLimit } req query for pagination
 */
_request.getRequestList = async (req, res) => {
  try {
    let pageNo = parseInt(req.query.pageNo) || Constant.ONE;
    let pageLimit = parseInt(req.query.pageLimit) || Constant.COUNT_TEN;
    if (pageNo <= Constant.ZERO_NUM) {
      throw { message: responseMessage.PAGE_INVALID };
    }
    let isRequestList = await itemRequest
      .find({
        item_id: req.params.item_id,
        request_status: Constant.REQUESTED,
      })
      .populate({
        path: "createdBy",
        select:
          "email first_name last_name phone_no address zip_code profile_image location",
      })
      .skip(pageLimit * (pageNo - Constant.ONE))
      .limit(pageLimit);
    if (!isRequestList) {
      res.status(Constant.BAD_REQUEST).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG("Request Not Nound"),
      });
    } else {
      let totalCount = await itemRequest
        .find({
          item_id: req.params.item_id,
          request_status: Constant.REQUESTED,
        })
        .countDocuments();
      let currentPage = await parseInt(req.query.pageNo);
      var tempPage = Constant.ONE;
      while (tempPage) {
        if (totalCount <= pageLimit || totalCount <= pageLimit * tempPage) {
          tempPage;
          break;
        }
        tempPage++;
      }
      res.status(Constant.SUCCESS).send({
        success: true,
        message: responseMessage.FOUND_SUCCESS("Request"),
        data: isRequestList,
        totalCount: totalCount,
        totalPage: tempPage,
        currentPage,
      });
    }
  } catch (err) {
    await setResponseObject(
      req,
      false,
      responseMessage.SOMETHING_WENT_WRONG,
      ""
    );
    next();
  }
};

_request.all = async (req, res, next) => {
  try {
    if (0) {
      await setResponseObject(req, true, "Data found successfully", [
        {
          _id: "5f6d80f06883141ca0989276",
          item_id: "345",
          borrow: "abc",
          borrow_return: "abc",
          status: false,
          request: "",
        },
        {
          _id: "5f6d80f06883141ca0989274",
          item_id: "345",
          borrow: "abc",
          borrow_return: "abc",
          status: false,
          request: "",
        },
      ]);
      next();
    } else {
      await itemRequest.find({}, async (err, resp) => {
        if (err) {
          setResponseObject(req, false, err.message ? err.message : err, "");
          next();
        } else {
          res.status(SUCCESS).send({
            success: true,
            message: responseMessage.FOUND_SUCCESS("All request"),
            data: resp,
          });
        }
      });
    }
  } catch (err) {
    await setResponseObject(
      req,
      false,
      responseMessage.SOMETHING_WENT_WRONG,
      ""
    );
    next();
  }
};

/**
 * Reject request for item
 */
_request.cancel = async (req, res, next) => {
  try {
    if (0) {
      await setResponseObject(req, true, "Request cancelled successfully");
      next();
    } else {
      // let checkOwner = await itemRequest.findOne({_id: req.body.item_request_id}).select('createdBy -_id');
      // if(checkOwner.createdBy == req.userId){
      let isCancle = await itemRequest.findOneAndUpdate(
        {
          _id: req.body.item_request_id,
        },
        {
          request_status: "Reject", // Request Cancle
        },
        {
          new: true,
          useFindAndModify: false,
        }
      );
      if (!isCancle) {
        res.status(BAD_REQUEST).send({
          success: false,
          message: responseMessage.SOMETHING_WRONG("Failed to cancle request"),
        });
      } else {
        let senderUser = await userModel.findOne({ _id: req.userId });

        let itemData = await itemModel.findOne({ _id: isCancle.item_id });

        let receiverUser = await userModel.findOne({ _id: isCancle.createdBy });

        let pushNot = await commonFunction.rejectNotification(
          receiverUser.fcmToken,
          "CliqRight",
          `${senderUser.first_name} ${senderUser.last_name} has cancelled your request for:${itemData.item_name} item`,
          itemData._id
        );
        let obj = {
          sendBy: req.userId,
          sendTo: isCancle.createdBy,
          title: "CliqRight",
          body: `${senderUser.first_name} ${senderUser.last_name} has cancelled your request for:${itemData.item_name} item`,
          message: `${senderUser.first_name} ${senderUser.last_name} has cancelled your request for:${itemData.item_name} item`,
          notificationType: "itemRequestReject",
        };

        let saveNotification = await new notification(obj).save();

        res.status(Constant.SUCCESS).send({
          success: true,
          message: responseMessage.REQUEST_CANCEL,
          data: isCancle,
        });
      }
      // } else {
      //   res.status(UNAUTHORIZED).send({
      //     success: false,
      //     message: responseMessage.UNAUTHORIZED_ACCESS,
      //   });
      // }
    }
  } catch (err) {
    await setResponseObject(
      req,
      false,
      responseMessage.SOMETHING_WENT_WRONG,
      ""
    );
    next();
  }
};

/**
 * Get Single Item Request Details
 * @param {item_request_id} req.params
 */
_request.one = async (req, res, next) => {
  try {
    let result = await itemRequest
      .findById({
        _id: req.params.item_request_id,
      })
      .populate({
        path: "createdBy",
        select:
          "email first_name last_name phone_no address zip_code profile_image location",
      });
    if (!result) {
      res.status(Constant.BAD_REQUEST).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG("Failed to find data"),
      });
    } else {
      res.status(Constant.SUCCESS).send({
        success: true,
        message: responseMessage.FOUND_SUCCESS("Request"),
        data: result,
      });
    }
  } catch (err) {
    await setResponseObject(
      req,
      false,
      responseMessage.SOMETHING_WENT_WRONG,
      ""
    );
    next();
  }
};

/**
 * Get Item Borrow list By Item Owner
 * @param { pageNo, pageLimit } req query for pagination
 */
_request.borrowLists = async (req, res, next) => {
  try {
    if (0) {
      await setResponseObject(req, true, "Data found successfully", [
        {
          _id: "5f6d80f06883141ca0989274",
          item_id: "345",
          borrow: "abc",
          status: false,
        },
      ]);
      next();
    } else {
      let pageNo = parseInt(req.query.pageNo) || Constant.ONE;
      let pageLimit = parseInt(req.query.pageLimit) || Constant.COUNT_TEN;
      if (pageNo <= Constant.ZERO_NUM) {
        throw { message: responseMessage.PAGE_INVALID };
      }
      let totalCount = await itemRequest
        .find({
          updatedBy: req.userId,
          request_status: Constant.ACCEPTED_BORROEWD,
        })
        .countDocuments();
      let borrowList = await itemRequest
        .find({
          updatedBy: req.userId,
          request_status: Constant.ACCEPTED_BORROEWD,
        })
        .skip(pageLimit * (pageNo - Constant.ONE))
        .limit(pageLimit);
      if (!borrowList) {
        res.status(Constant.BAD_REQUEST).send({
          success: false,
          message: responseMessage.SOMETHING_WRONG("Failed to find data"),
        });
      } else {
        let currentPage = await parseInt(req.query.pageNo);
        var tempPage = Constant.ONE;
        while (tempPage) {
          if (totalCount <= pageLimit || totalCount <= pageLimit * tempPage) {
            tempPage;
            break;
          }
          tempPage++;
        }
        res.status(Constant.SUCCESS).send({
          success: true,
          message: responseMessage.FOUND_SUCCESS("Borrow-list"),
          data: borrowList,
          totalCount: totalCount,
          totalPage: tempPage,
          currentPage,
        });
      }
    }
  } catch (err) {
    await setResponseObject(
      req,
      false,
      responseMessage.SOMETHING_WENT_WRONG,
      ""
    );
    next();
  }
};

_request.myRequest = async (req, res, next) => {
  try {
    if (0) {
      await setResponseObject(req, true, "Data found successfully", [
        {
          _id: "5f6d80f06883141ca0989274",
          item_id: "345",
          borrow: "abc",
          status: false,
        },
      ]);
      next();
    } else {
      let myItem = await itemRequest
        .find({
          createdBy: { $eq: req.userId },
          $or: [
            {
              request_status: Constant.REQUESTED,
            },
            {
              request_status: Constant.ACCEPTED_BORROEWD,
            },
          ],
        })
        .populate("createdBy")
        .populate({
          path: "item_id",
          populate: {
            path: "createdBy",
            model: "auth",
          },
        })
        .sort({ request_status: 1 });
      if (!myItem) {
        res.status(BAD_REQUEST).send({
          message: responseMessage.SOMETHING_WRONG("Failed to find item"),
        });
      } else {
        res.status(SUCCESS).send({
          success: true,
          message: responseMessage.FOUND_SUCCESS("My request item"),
          data: myItem,
        });
      }
    }
  } catch (err) {
    await setResponseObject(
      req,
      false,
      responseMessage.SOMETHING_WENT_WRONG,
      ""
    );
    next();
  }
};

/**
 * Borrow Item Manullay Save Details
 */
_request.borrowItemManully = async (req, res, next) => {
  try {
    let data = req.body;
    data.request_status = ACCEPTED_BORROEWD;
    data.createdBy = req.userId;

    let itemOwner = await itemModel
      .findOne({ _id: req.body.item_id })
      .select("createdBy -_id");
    if (itemOwner.createdBy == req.userId) {
      let result = await new itemRequest(data).save();
      if (!result) {
        res.status(400).send({
          success: false,
          message: responseMessage.SOMETHING_WRONG("Failed to save"),
        });
      } else {
        let isBorrowed = await itemModel.findOneAndUpdate(
          {
            _id: req.body.item_id,
          },
          {
            status: BORROWED,
          },
          {
            new: true,
          }
        );
        res.status(200).send({
          success: true,
          message: responseMessage.ADD_SUCCESS("Request"),
          data: result,
        });
      }
    } else {
      res.status(UNAUTHORIZED).send({
        success: false,
        message: responseMessage.UNAUTHORIZED_ACCESS,
      });
    }
  } catch (err) {
    await setResponseObject(
      req,
      false,
      responseMessage.SOMETHING_WENT_WRONG,
      ""
    );
    next();
  }
};

/**
 * Manual borrow return
 */
_request.manualBorrowReturn = async (req, res, next) => {
  try {
    let result = await itemRequest.findByIdAndRemove({
      _id: req.body.request_id,
    });
    if (!result) {
      res.status(400).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG(
          "Failed to item return update"
        ),
      });
    } else {
      res.status(200).send({
        success: true,
        message: responseMessage.ITEM_RETURN,
        data: result,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 * Borrowed item return
 */
_request.itemReturnRequest = async (req, res, next) => {
  try {
    let data = req.body;
    data.requestedBy = req.userId;

    let itemDetails = await itemModel.findOne({ _id: req.body.item_id });
    let receiverUser = await authModel.findOne({ _id: itemDetails.createdBy });
    let senderUser = await authModel.findOne({ _id: req.userId });
    let requestorId = await itemRequest
      .findOne({ _id: data.item_request_id })
      .select("createdBy -_id");
    if (requestorId.createdBy == req.userId) {
      if (itemDetails.status == Constant.AVAILABLE) {
        res.status(Constant.failureStatus).send({
          success: false,
          message: responseMessage.SOMETHING_WRONG("Failed to send request"),
        });
      } else if (itemDetails.createdBy == req.userId) {
        res.status(Constant.failureStatus).send({
          success: false,
          message: responseMessage.SOMETHING_WRONG("Failed to send request"),
        });
      } else {
        let isReturnRequest = await new ItemRequestReturn(data).save();
        if (!isReturnRequest) {
          res.status(Constant.failureStatus).send({
            success: false,
            message: responseMessage.SOMETHING_WRONG("Failed to send request"),
          });
        } else {
          let socketData = await CHATCONSTANTS.findOneAndUpdate(
            {
              $or: [
                {
                  $and: [
                    {
                      senderId: req.userId,
                    },
                    {
                      receiverId: receiverUser._id,
                    },
                  ],
                },
                {
                  $and: [
                    {
                      senderId: receiverUser._id,
                    },
                    {
                      receiverId: req.userId,
                    },
                  ],
                },
              ],
              itemId: req.body.item_id,
            },
            {
              senderId: req.userId,
              receiverId: receiverUser._id,
              type: 4,
              itemId: req.body.item_id,
              deletedBy: [],
            },
            {
              upsert: true,
              new: true,
            },
            async (err, result) => {
              if (err) throw err;

              req.body.chatId = result._id;
              req.body.senderId = req.userId;
              req.body.receiverId = receiverUser._id;

              let userChat = await new CHATS({
                returnJson: isReturnRequest._id,
                senderId: req.userId,
                receiverId: receiverUser._id,
                chatId: result._id,
                itemId: req.body.item_id,
                type: 4,
              }).save();

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
                      deletedBy: [],
                    },
                  },
                  (err, result) => {
                    if (err) throw err;
                  }
                );
              });
            }
          );

          let updateItemData = await itemModel.findOneAndUpdate(
            { _id: req.body.item_id },
            { isReturnRequested: true },
            { new: true }
          );
          /** Send Push Notification */
          let pushNot = await commonFunction.itemReturn(
            receiverUser.fcmToken,
            "CliqRight",
            `Dear ${receiverUser.first_name}! ${senderUser.first_name} wants to return your item:${updateItemData.item_name}`,
            req.body.item_id
          );
          let obj = {
            sendBy: req.userId,
            sendTo: receiverUser._id,
            title: "CliqRight",
            body: `Dear ${receiverUser.first_name}! ${senderUser.first_name} wants to return your item:${updateItemData.item_name}`,
            message: `Dear ${receiverUser.first_name}! ${senderUser.first_name} wants to return your item:${updateItemData.item_name}`,
            notificationType: "item_return",
            item_id: req.body.item_id,
            item_return_req_id: isReturnRequest._id,
          };

          let results = await new notification(obj).save();

          res.status(Constant.SUCCESS).send({
            success: true,
            message: responseMessage.REQUEST_SEND,
            data: isReturnRequest,
          });
        }
      }
    } else {
      res.status(UNAUTHORIZED).send({
        success: false,
        message: responseMessage.UNAUTHORIZED_ACCESS,
      });
    }
  } catch (err) {
    await setResponseObject(
      req,
      false,
      responseMessage.SOMETHING_WENT_WRONG,
      ""
    );
    next();
  }
};

/**
 * Get itemReturnRequest
 */
_request.getItemReturnRequest = async (req, res, next) => {
  try {
    let result = await ItemRequestReturn.find({
      item_id: req.params.item_id,
      status: 0,
    });
    if (result) {
      res.status(Constant.SUCCESS).send({
        success: true,
        message: responseMessage.FOUND_SUCCESS("Request return"),
        data: result,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 * Item Return Request Reject
 */
_request.rejectItemReturnRequest = async (req, res, next) => {
  try {
    let senderUser = await authModel.findOne({ _id: req.userId });
    let itemData = await itemRequest.findOne({ _id: req.body.item_request_id });
    let receiverUser = await authModel.findOne({ _id: itemData.createdBy });
    let itemName = await itemModel.findOne({ _id: req.body.item_id });
    if (itemName.createdBy == req.userId) {
      let result = await ItemRequestReturn.findOneAndUpdate(
        {
          _id: req.body.requestJsonId,
          item_request_id: req.body.item_request_id,
          item_id: req.body.item_id,
        },
        {
          status: 1,
        },
        { new: true }
      );
      if (result) {
        let markAvaliable = await itemModel.findOneAndUpdate(
          { _id: req.body.item_id },
          {
            isReturnRequested: false,
          },
          { new: true }
        );
        /** Send Push Notification */
        let pushNot = await commonFunction.itemRequestNotificationReject(
          receiverUser.fcmToken,
          "CliqRight",
          `Dear ${receiverUser.first_name}! ${senderUser.first_name} rejected to return your ${itemName.item_name} item`
        );
        let obj = {
          sendBy: req.userId,
          sendTo: receiverUser._id,
          item_id: itemName._id,
          title: "CliqRight",
          body: `Dear ${receiverUser.first_name}! ${senderUser.first_name} rejected to return ${itemName.item_name} item`,
          message: `Dear ${receiverUser.first_name}! ${senderUser.first_name} rejected to return ${itemName.item_name} item`,
          notificationType: "itemRequestReturnReject",
        };
        let results = await new notification(obj).save();

        res.status(Constant.SUCCESS).send({
          success: true,
          message: responseMessage.REQUEST_REJECT,
          data: result,
        });
      }
    } else {
      res.status(UNAUTHORIZED).send({
        success: false,
        message: responseMessage.UNAUTHORIZED_ACCESS,
      });
    }
  } catch (err) {
    await setResponseObject(
      req,
      false,
      responseMessage.SOMETHING_WENT_WRONG,
      ""
    );
    next();
  }
};

/**
 * Item Return Request Accept
 * @param { item_request_id, item_id }
 */
_request.acceptItemReturnRequest = async (req, res, next) => {
  try {
    let senderUser = await authModel.findOne({ _id: req.userId });
    let itemData = await itemRequest.findOne({ _id: req.body.item_request_id });
    let receiverUser = await authModel.findOne({ _id: itemData.createdBy });
    let itemName = await itemModel.findOne({ _id: req.body.item_id });
    if (itemName.createdBy == req.userId) {
      let result = await ItemRequestReturn.findOneAndUpdate(
        {
          _id: req.body.requestJsonId,
          item_request_id: req.body.item_request_id,
          item_id: req.body.item_id,
        },
        {
          status: 2,
        },
        { new: true }
      );
      if (result) {
        let isReturn = await itemRequest.findOneAndUpdate(
          { _id: req.body.item_request_id, item_id: req.body.item_id },
          {
            request_status: RETURN, // Borrow Return
            updatedBy: req.userId,
          },
          { new: true }
        );
        let markAvaliable = await itemModel.findOneAndUpdate(
          { _id: req.body.item_id },
          {
            status: AVAILABLE, // "Available"
            isReturnRequested: false,
          },
          { new: true }
        );

        /** Send Push Notification */
        let pushNot = await commonFunction.itemRequestNotificationAccept(
          receiverUser.fcmToken,
          "CliqRight",
          `Dear ${receiverUser.first_name}! ${senderUser.first_name} acceptd to return ${itemName.item_name} item`
        );
        let obj = {
          sendBy: req.userId,
          sendTo: receiverUser._id,
          item_id: itemName._id,
          title: "CliqRight",
          body: `Dear ${receiverUser.first_name}! ${senderUser.first_name} acceptd to return ${itemName.item_name} item`,
          message: `Dear ${receiverUser.first_name}! ${senderUser.first_name} acceptd to return ${itemName.item_name} item`,
          notificationType: "itemRequestReturnAccept",
        };

        let results = await new notification(obj).save();

        res.status(Constant.SUCCESS).send({
          success: true,
          message: responseMessage.REQUEST_ACCEPT,
          data: result,
        });
      }
    } else {
      res.status(UNAUTHORIZED).send({
        success: false,
        message: responseMessage.UNAUTHORIZED_ACCESS,
      });
    }
  } catch (err) {
    await setResponseObject(
      req,
      false,
      responseMessage.SOMETHING_WENT_WRONG,
      ""
    );
    next();
  }
};

module.exports = _request;
