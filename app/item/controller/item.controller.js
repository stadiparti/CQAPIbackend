/*
@copyright : ToXSL Technologies Pvt. Ltd. < www.toxsl.com >
@author     : Shiv Charan Panjeta < shiv@toxsl.com >
 
All Rights Reserved.
Proprietary and confidential :  All information contained herein is, and remains
the property of ToXSL Technologies Pvt. Ltd. and its partners.
Unauthorized copying of this file, via any medium is strictly prohibited.
*/

const Item = require("../model/item.model");
const multer = require("multer");
const mongoose = require("mongoose");
const responseMessage = require("../../../middleware/responseMessage");
const Constant = require("../../../helpers/constant");
const ReportItem = require("../model/item-report.model");
const GroupMember = require("../../group/model/membermodel");
const GroupItem = require("../../group/model/group.item");
const itemRequest = require("../../request/model/request.model");
const commonFunction = require("../../../helpers/nodeMailer");
const nodeMailer = require("../../../helpers/nodeMailer");
const notification = require("../../notification/model/notification.model");
const GROUP = require("../../group/model/group.model");
const fs = require("fs");

const dir = "./upload/item";
const _item = {};

const setResponseObject =
  require("../../../middleware/commonFunctions").setResponseObject;
// const { findOneAndRemove } = require("../model/item.model");
const itemModel = require("../model/item.model");
const authModel = require("../../auth/model/auth.model");
const groupItem = require("../../group/model/group.item");
const {
  SUCCESS,
  BAD_REQUEST,
  ISPUBLIC,
  MAX_DIST,
  CALC_DISTANCE,
  NOT_FOUND,
  AVAILABLE,
  APPROVE,
  BORROWED,
  DELETED,
  ZERO_NUM,
  COUNT_TEN,
  ONE,
  ACTIVE,
  ADMIN,
  UNAUTHORIZED,
} = require("../../../helpers/constant");
// const maxSize = 5 * 1000 * 1024;
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, new Date().getTime().toString() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage }).fields([
  { name: "cover_image" },
  { name: "image" },
]);

// Item Add
_item.add = async (req, res, next) => {
  try {
    upload(req, res, async (err) => {
      if (err) {
        if (err.code == "LIMIT_FILE_SIZE") {
          err.message =
            "File Size is too large. Allowed file size is under 5MB";
          err.success = false;
        }
        return res.json(err);
        await (req, false, err.message, "");
        next();
      } else {
        let findNoOfItemsPosted = await Item.find({
          createdBy: req.userId,
        }).countDocuments();
        if (findNoOfItemsPosted < Constant.MAX_NO_ITEM_POSTED) {
          let data = req.body;
          data.createdBy = req.userId;
          if (req.files.cover_image) {
            let cover_image = req.files.cover_image[0].path;
            data.cover_image = cover_image;
          }

          let image = [];
          if (req.files.image) {
            req.files.image.map((e) => {
              image.push({ image: e.path });
            });
          }
          data.itemPic = image;

          if (data.latitude && data.longitude) {
            data.location = {
              type: "Point",
              coordinates: [data.longitude, data.latitude],
            };
          }

          let result = await Item(data).save();
          if (!result) {
            return res.status(400).send({
              message: responseMessage.SOMETHING_WRONG("Item Not Added"),
            });
          } else {
            return res
              .status(200)
              .send({ message: responseMessage.ADD_SUCCESS("Item"), result });
          }
        } else {
          return res.status(400).send({
            success: false,
            message: responseMessage.SOMETHING_WRONG(
              "Maximum Number For Item Post Limit Is Exceed"
            ),
          });
        }
      }
    });
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

// Item Update
_item.update = async (req, res, next) => {
  try {
    upload(req, res, async (err) => {
      if (err) {
        await (req, false, err.message, "");
        next();
      } else {
        let data = req.body;
        let checkItemOwner = await Item.findOne({
          _id: req.params.item_id,
        }).select("createdBy");
        if (checkItemOwner.createdBy == req.userId) {
          if (req.files.cover_image) {
            let cover_image = req.files.cover_image[0].path;
            data.cover_image = cover_image;
          }
          let image = [];
          if (req.files.image) {
            req.files.image.map((e) => {
              image.push({ image: e.path });
            });
          }
          data.itemPic = image;
          let result = await Item.findOneAndUpdate(
            {
              _id: req.params.item_id,
            },
            data,
            { new: true }
          );
          if (!result) {
            res.status(400).send({
              message: responseMessage.SOMETHING_WRONG("Item Not Updated"),
            });
          } else {
            res.status(200).send({
              message: responseMessage.UPDATE_SUCCESS("Item"),
              result,
            });
          }
        } else {
          res.status(UNAUTHORIZED).send({
            success: false,
            message: responseMessage.UNAUTHORIZED_ACCESS,
          });
        }
      }
    });
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

_item.one = async (req, res, next) => {
  try {
    let result = await Item.findById({
      _id: req.params.item_id,
    }).populate({
      path: "createdBy",
      select: "-fcmToken -token",
    });
    if (!result) {
      res
        .status(404)
        .send({ message: responseMessage.SOMETHING_WRONG("Data Not Found") });
    } else {
      let borrowedUser = await itemRequest
        .findOne({
          item_id: req.params.item_id,
          request_status: Constant.ACCEPTED_BORROEWD,
        })
        .populate("createdBy");
      let requestor = await itemRequest.findOne({
        item_id: req.params.item_id,
        $or: [
          { request_status: Constant.ACCEPTED_BORROEWD },
          { request_status: Constant.REQUESTED },
        ],
        createdBy: req.userId,
      });
      if (!requestor) {
        let isItemBorrowed = await itemRequest.findOne({
          item_id: req.params.item_id,
          request_status: Constant.ACCEPTED_BORROEWD,
        });
        if (isItemBorrowed) {
          res.status(200).send({
            borrowedBy: false,
            message: responseMessage.FOUND_SUCCESS("Item"),
            result,
            borrowedUser,
            isBorrowed: true,
          });
        } else {
          res.status(200).send({
            borrowedBy: false,
            message: responseMessage.FOUND_SUCCESS("Item"),
            result,
            borrowedUser,
            isBorrowed: false,
          });
        }
      } else {
        let isItemBorrowed = await itemRequest.findOne({
          item_id: req.params.item_id,
          request_status: Constant.ACCEPTED_BORROEWD,
        });
        if (isItemBorrowed) {
          res.status(200).send({
            borrowedBy: true,
            message: responseMessage.FOUND_SUCCESS("Item"),
            result,
            borrowedUser,
            isBorrowed: true,
          });
        } else {
          res.status(200).send({
            borrowedBy: true,
            message: responseMessage.FOUND_SUCCESS("Item"),
            result,
            borrowedUser,
            isBorrowed: false,
          });
        }
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

_item.all = async (req, res, next) => {
  try {
    let result = await Item.find().populate("createdBy");
    if (!result) {
      res.status(404).send({
        message: responseMessage.SOMETHING_WRONG("Data Not Found"),
      });
    } else {
      res.status(200).send({
        message: responseMessage.FOUND_SUCCESS("Data"),
        result,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, "Something went wrong", "");
    next();
  }
};

_item.myItem = async (req, res, next) => {
  try {
    var filterQuery;
    switch (req.query.type) {
      case "1":
        filterQuery = {
          shared_level: "Unavaliable",
        }; //shared
        break;
      case "2":
        filterQuery = {
          shared_level: "Avaliable",
        }; //unshared
        break;
      case "3":
        filterQuery = {
          status: "Available",
        }; //available
        break;
      case "4":
        filterQuery = {
          status: "Borrowed",
        }; //unavailbale
        break;
      default:
        filterQuery = { createdBy: mongoose.Types.ObjectId(req.userId) };
    }

    let pageNo = parseInt(req.query.pageNo) || ONE;
    let pageLimit = parseInt(req.query.pageLimit) || COUNT_TEN;
    if (pageNo <= ZERO_NUM) {
      throw { message: responseMessage.PAGE_INVALID };
    }

    let result = await Item.aggregate([
      { $match: { createdBy: mongoose.Types.ObjectId(req.userId) } },
      { $match: filterQuery },

      {
        $lookup: {
          from: "itemrequests",
          let: { id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$item_id", "$$id"] },
              },
            },
            {
              $match: {
                request_status: Constant.ACCEPTED_BORROEWD,
              },
            },

            {
              $lookup: {
                from: "auths",
                let: { createdBy: "$createdBy" },
                pipeline: [
                  { $match: { $expr: { $eq: ["$_id", "$$createdBy"] } } },
                ],
                as: "borrowedUser",
              },
            },
          ],
          as: "borrowedItem",
        },
      },
      {
        $lookup: {
          from: "auths",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
        },
      },
      {
        $addFields: {
          isBorrowed: {
            $cond: { if: { $size: "$borrowedItem" }, then: true, else: false },
          },
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      // {
      //   $project:{
      //     createdBy:{token:ZERO_NUM, fcmToken: ZERO_NUM}
      //   }
      // },
      {
        $facet: {
          data: [
            { $skip: pageLimit * (pageNo - ONE) },
            { $limit: pageLimit },
            {
              $project: {
                createdBy: { token: ZERO_NUM, fcmToken: ZERO_NUM },
              },
            },
          ],
          count: [
            {
              $count: "count",
            },
          ],
        },
      },
    ]);

    if (!result[ZERO_NUM].data) {
      res.status(SUCCESS).send({
        success: true,
        message: responseMessage.SOMETHING_WRONG("Data Not Found"),
        result: [],
      });
    } else {
      if (!result[ZERO_NUM]) {
        res.status(SUCCESS).send({
          success: true,
          message: responseMessage.SOMETHING_WRONG("Data Not Found"),
          result: [],
        });
        return;
      }

      if (!result[ZERO_NUM].count[ZERO_NUM]) {
        res.status(SUCCESS).send({
          success: true,
          message: responseMessage.SOMETHING_WRONG("Data Count Not Found"),
          result: [],
        });
        return;
      }

      let totalData = await result[ZERO_NUM].count[ZERO_NUM].count;
      let currentPage = await parseInt(req.query.pageNo);

      var tempPage = ONE;
      while (tempPage) {
        if (totalData <= pageLimit || totalData <= pageLimit * tempPage) {
          tempPage;
          break;
        }
        tempPage++;
      }

      let adsCount = await authModel
        .findOne({ _id: req.userId })
        .select("adsCount -_id");
      res.status(SUCCESS).send({
        success: true,
        adsCount,
        message: responseMessage.FOUND_SUCCESS("Item"),
        result: result[ZERO_NUM].data,
        totalCount: result[ZERO_NUM].count[ZERO_NUM].count,
        totalPages: tempPage,
        currentPage,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, "Something went wrong", "");
    next();
  }
};

/**
 * Delete Item
 */
_item.delete = async (req, res, next) => {
  try {
    let isItemShare = await GroupItem.findOne({
      item_id: req.params.item_id,
    });
    if (isItemShare) {
      res.status(BAD_REQUEST).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG(
          "!Item shared in group, failed to delete"
        ),
      });
    } else {
      let checkOwner = await Item.findOne({ _id: req.params.item_id });
      if (checkOwner.createdBy == req.userId) {
        await Item.findOneAndRemove(
          {
            _id: req.params.item_id,
          },
          async (err, resp) => {
            if (err) {
              setResponseObject(
                req,
                false,
                err.message ? err.message : err,
                ""
              );
              next();
            } else {
              await GroupItem.deleteMany({
                item_id: req.params.item_id,
              });
              await itemRequest.deleteMany({
                item_id: req.params.item_id,
              });
              await ReportItem.deleteMany({
                item_id: req.params.item_id,
              });
              res.status(SUCCESS).send({
                success: true,
                message: responseMessage.ITEM_DELETE,
                data: resp,
              });
            }
          }
        );
      } else {
        res.status(BAD_REQUEST).send({
          success: false,
          message: responseMessage.SOMETHING_WRONG(
            "!Failed to delete, It's not your item"
          ),
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

// Report item
_item.create = async (req, res, next) => {
  try {
    let data = req.body;
    let itemDetails = await itemModel.findOne({ _id: req.body.item_id });
    let receiverUser = await authModel.findOne({ _id: itemDetails.createdBy });
    let senderUser = await authModel.findOne({ _id: req.userId });

    // data.reported_by = req.userId;
    data.reported_by = req.userId;
    if (!data.item_id || !data.report_type) {
      res.status(BAD_REQUEST).send({
        message: responseMessage.REQUIRED_FIELD,
      });
    }

    /**
     * CASE - I : PUBLIC ITEM
     */
    if (itemDetails.itemType == "isPublic") {
      let isExist = await ReportItem.findOne({
        item_id: req.body.item_id,
        reported_by: req.userId,
      });
      if (isExist) {
        res.status(BAD_REQUEST).send({
          success: false,
          message: responseMessage.REPORT_EXIST,
        });
        return;
      }

      let saveRecord = await ReportItem(data).save();
      let findNums = await ReportItem.find({
        item_id: req.body.item_id,
      }).countDocuments();
      if (findNums >= 5) {
        let deleteItemRecords = await itemModel.deleteMany({
          _id: req.body.item_id,
        });
        let deleteSharedItem = await groupItem.deleteMany({
          item_id: req.body.item_id,
        });
        let deleteRequestItem = await itemRequest.deleteMany({
          item_id: req.body.item_id,
        });
        let deleteReportItem = await ReportItem.deleteMany({
          item_id: req.body.item_id,
        });
        next();
      }
      res.status(SUCCESS).send({
        success: true,
        message: responseMessage.ADD_SUCCESS("Public Report item"),
      });
      return;
    }

    /**
     * CASE - II : GROUP ITEM
     */

    let findGroupItemShare = await GroupItem.find({
      item_id: req.body.item_id,
    });
    var grpIds = [];
    findGroupItemShare.map((e) => {
      grpIds.push(e.group_id);
    });

    if (grpIds.length) {
      grpIds.forEach(async (element) => {
        let isExist = await ReportItem.findOne({
          item_id: req.body.item_id,
          reported_by: req.userId,
          group_id: element,
        });

        if (isExist) {
          res.status(BAD_REQUEST).send({
            message: responseMessage.REPORT_EXIST,
          });
          return;
        } else {
          data.group_id = element;
          let result = await ReportItem(data).save();
          if (!result) {
            return res.status(BAD_REQUEST).send({
              success: false,
              message: responseMessage.SOMETHING_WENT_WRONG,
            });
          } else {
            let reportedCount = await ReportItem.find({
              item_id: req.body.item_id,
              group_id: element,
            }).countDocuments();
            if (reportedCount >= Constant.COUNT_FIVE) {
              let deleteSharedItem = await groupItem.deleteMany({
                item_id: req.body.item_id,
                group_id: element,
              });
              let deleteReportItem = await ReportItem.deleteMany({
                item_id: req.body.item_id,
                group_id: element,
              });

              /** Send Push Notification */
              let pushNot = await commonFunction.reportItemDeleteNotification(
                receiverUser.fcmToken,
                "CliqRight",
                `Dear ${receiverUser.first_name} ${receiverUser.last_name}! your item:${itemDetails.item_name} is deleted due to too many reports`
              );
              let obj = {
                sendBy: receiverUser._id,
                sendTo: receiverUser._id,
                title: "CliqRight",
                body: `Dear ${receiverUser.first_name} ${receiverUser.last_name}! your item: ${itemDetails.item_name} is deleted due to too many reports`,
                message: `Dear ${receiverUser.first_name} ${receiverUser.last_name}! your item: ${itemDetails.item_name} is deleted due to too many reports`,
                notificationType: "itemDeleted",
              };
              let saveNotification = await new notification(obj).save();
            }

            res.status(SUCCESS).send({
              success: true,
              message: responseMessage.ADD_SUCCESS("Group Report item"),
            });

            // find groups in which the reported item is part of
            let findGroups = await GroupItem.find({
              item_id: req.body.item_id,
            });
            let groupIds = [];
            if (findGroups) {
              findGroups.map((element) => {
                groupIds.push(element.group_id);
              });
            }

            for (let i = 0; i < groupIds.length; i++) {
              //check if user who reported the item exists in that group
              let checkIfMemberExistsInGroup = await GroupMember.findOne({
                group_id: groupIds[i],
                user_id: req.userId,
              });
              if (checkIfMemberExistsInGroup) {
                // if user exists in that group, then find group admin of that group
                let findGroupAdmin = await GroupMember.find({
                  group_id: groupIds[i],
                  $or: [{ role: "Admin" }, { role: "Owner" }],
                });

                if (findGroupAdmin) {
                  for (let j = 0; j < findGroupAdmin.length; j++) {
                    let receiverUser = await authModel.findOne({
                      _id: findGroupAdmin[i].user_id,
                    });
                    let senderUser = await authModel.findOne({
                      _id: req.userId,
                    });

                    /** Send Push Notification to each admin of that group regarding reported item */
                    let pushNot = await commonFunction.reportItemNotification(
                      receiverUser.fcmToken,
                      "CliqRight",
                      `Dear ${receiverUser.first_name} ${receiverUser.last_name}! An item:${itemDetails.item_name} in your group has been reported by ${senderUser.first_name} ${senderUser.last_name}. `,
                      req.body.item_id
                    );

                    let obj = {
                      sendBy: senderUser._id,
                      sendTo: receiverUser._id,
                      title: "CliqRight",
                      body: `Dear ${receiverUser.first_name} ${receiverUser.last_name}! An item ${itemDetails.item_name} in your group has been reported by ${senderUser.first_name} ${senderUser.last_name}. `,
                      message: `Dear ${receiverUser.first_name} ${receiverUser.last_name}! An item ${itemDetails.item_name} in your group has been reported by ${senderUser.first_name} ${senderUser.last_name}. `,
                      notificationType: "reportItem",
                    };
                    let saveNotification = await new notification(obj).save();
                  }
                }
              }
            }
          }
        }
      });
    } else {
      return res.status(SUCCESS).send({
        success: true,
        message: responseMessage.ADD_SUCCESS("Report item"),
      });
    }
  } catch (err) {
    console.log("err", err);
    await setResponseObject(
      req,
      false,
      responseMessage.SOMETHING_WENT_WRONG,
      ""
    );
    next();
  }
};

_item.detail = async (req, res, next) => {
  try {
    let result = await ReportItem.find({
      item_id: req.params.item_id,
    }).populate("reported_by");
    if (!result) {
      res.status(404).send({
        success: false,
        message: responseMessage.RECORD_NOTFOUND("Report"),
      });
    } else {
      res.status(200).send({
        success: true,
        message: responseMessage.FOUND_SUCCESS("Reported item"),
        data: result,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, "Something went wrong", "");
    next();
  }
};

_item.allItem = async (req, res, next) => {
  try {
    ReportItem.find({}, (err, resp) => {
      if (err) {
        setResponseObject(req, false, err.message ? err.message : err, "");
        next();
      } else {
        res.status(200).send({
          success: true,
          message: responseMessage.RECORD_FOUND(""),
          data: resp,
        });
      }
    });
  } catch (err) {
    await setResponseObject(req, false, "Something went wrong", "");
    next();
  }
};

_item.report_reject = async (req, res) => {
  try {
    let result = await ReportItem.findOneAndUpdate(
      {
        _id: req.body.report_id,
        report_status: "Reported",
      },
      {
        $set: { report_status: "Rejected" },
      },
      {
        new: true,
        useFindAndModify: false,
      }
    );
    if (!result) {
      res.status(400).send({
        message: responseMessage.SOMETHING_WRONG("Report Not Updated"),
      });
    } else {
      res
        .status(200)
        .send({ message: responseMessage.REPORT_REJECTED, result });
    }
  } catch (err) {
    await setResponseObject(req, false, "Something went wrong", "");
    next();
  }
};

_item.report_accepted = async (req, res, next) => {
  try {
    let result = await ReportItem.findOneAndUpdate(
      {
        _id: req.body.report_id,
        report_status: "Reported",
      },
      {
        $set: {
          report_status: "Accepted",
        },
      },
      {
        new: true,
      }
    );
    if (!result) {
      res.status(400).send({
        message: responseMessage.SOMETHING_WRONG("Report Not Updated"),
      });
    } else {
      res.status(200).send({
        success: true,
        message: responseMessage.REPORT_ACCEPTED,
        result,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, "Something went wrong", "");
    next();
  }
};

_item.markAvaliable = async (req, res, next) => {
  try {
    let query = await itemModel.findOne({
      _id: req.params.item_id,
    });

    if ((req.query.status = "Available")) {
      let isShareable = await itemModel.findOneAndUpdate(
        {
          _id: req.params.item_id,
        },
        {
          status: req.query.status, // Mark Avaliable
          isReturnRequested: false,
        },
        {
          new: true,
        }
      );
      if (!isShareable) {
        res.status(400).send({
          success: false,
          message: responseMessage.SOMETHING_WRONG("Failed to change"),
        });
      } else {
        let deleteData = await itemRequest.findOneAndUpdate(
          {
            item_id: req.params.item_id,
            request_status: Constant.ACCEPTED_BORROEWD,
          },
          {
            request_status: Constant.RETURN,
          },
          { new: true }
        );
        res.status(200).send({
          success: true,
          message: responseMessage.UPDATE_SUCCESS("Status"),
          data: isShareable,
        });
      }
    }
  } catch (err) {
    await setResponseObject(req, false, "Something went wrong", "");
    next();
  }
};

/**
 * Stop sharing multiple items
 */
_item.sharedLevelNone = async (req, res) => {
  try {
    let isSharable = await GroupItem.deleteMany({
      // item_id: req.params.item_id
      item_id: {
        $in: req.body.item_id,
      },
    });
    if (!isSharable) {
      res.status(BAD_REQUEST).send({
        success: false,
        message: responseMessage.STOP_SHARE_ERR,
      });
    } else {
      let changeStatus = await Item.updateMany(
        { _id: { $in: req.body.item_id } },
        { itemType: Constant.ISPRIVATE },
        { new: true }
      );
      res.status(SUCCESS).send({
        success: true,
        message: responseMessage.STOP_SHARE,
        data: isSharable,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 * Find avaliable Item
 */
_item.avaliableItem = async (req, res, next) => {
  try {
    let query = await GroupMember.find({
      user_id: req.userId,
      status: APPROVE,
    }).select("group_id -_id");
    var array = [];
    query.map((a) => {
      array.push(a.group_id);
    });
    let group = await GroupItem.find({
      group_id: {
        $in: array,
      },
    }).select("item_id -_id");
    let groupArray = [];
    group.map((a) => {
      groupArray.push(a.item_id);
    });

    let pageNo = parseInt(req.query.pageNo) || ONE;
    let pageLimit = parseInt(req.query.pageLimit) || COUNT_TEN;
    if (pageNo <= ZERO_NUM) {
      throw { message: responseMessage.PAGE_INVALID };
    }

    let isAvaliable = await itemModel.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [
              parseFloat(req.query.longitude),
              parseFloat(req.query.latitude),
            ],
          },
          spherical: true,
          distanceField: CALC_DISTANCE,
          maxDistance: MAX_DIST,
        },
      },
      {
        $match: {
          _id: { $in: groupArray },
          createdBy: { $ne: mongoose.Types.ObjectId(req.userId) },
          status: AVAILABLE,
        },
      },

      {
        $lookup: {
          from: "auths",
          let: { id: "$createdBy" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$$id", "$_id"] },
              },
            },
          ],
          as: "createdBy",
        },
      },
      { $unwind: "$createdBy" },
      {
        $facet: {
          data: [
            { $skip: pageLimit * (pageNo - ONE) },
            { $limit: pageLimit },
            {
              $project: {
                createdBy: { token: ZERO_NUM, fcmToken: ZERO_NUM },
              },
            },
          ],
          count: [
            {
              $count: "count",
            },
          ],
        },
      },
    ]);

    if (!isAvaliable[ZERO_NUM].data) {
      res.status(SUCCESS).send({
        success: true,
        message: responseMessage.SOMETHING_WRONG("Data Not Found"),
        result: [],
      });
    } else {
      if (!isAvaliable[ZERO_NUM]) {
        res.status(SUCCESS).send({
          success: true,
          message: responseMessage.SOMETHING_WRONG("Data Not Found"),
          result: [],
        });
        return;
      }

      if (!isAvaliable[ZERO_NUM].count[ZERO_NUM]) {
        res.status(SUCCESS).send({
          success: true,
          message: responseMessage.SOMETHING_WRONG("Data Count Not Found"),
          result: [],
        });
        return;
      }

      let totalData = await isAvaliable[ZERO_NUM].count[ZERO_NUM].count;
      let currentPage = await parseInt(req.query.pageNo);

      var tempPage = ONE;
      while (tempPage) {
        if (totalData <= pageLimit || totalData <= pageLimit * tempPage) {
          tempPage;
          break;
        }
        tempPage++;
      }

      // if (!isAvaliable) {
      //   res.status(NOT_FOUND).send({
      //     message: responseMessage.NOT_FOUND("Data"),
      //   });
      // } else {
      res.status(SUCCESS).send({
        message: responseMessage.FOUND_SUCCESS("Avaliable item"),
        result: isAvaliable[ZERO_NUM].data,
        totalCount: isAvaliable[ZERO_NUM].count[ZERO_NUM].count,
        totalPages: tempPage,
        currentPage,
      });
      // }
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 * Find unavaliable Item
 */
_item.unavaliableItem = async (req, res, next) => {
  try {
    let query = await GroupMember.find({
      user_id: req.userId,
      status: APPROVE,
    }).select("group_id -_id");

    if (!query.length) {
      res.status(SUCCESS).send({
        message: responseMessage.RECORD_NOTFOUND("Unavaliable item"),
        result: [],
        totalCount: 0,
        totalPages: 0,
      });
    }

    var array = [];
    query.map((a) => {
      array.push(a.group_id);
    });
    let group = await GroupItem.find({
      group_id: {
        $in: array,
      },
    }).select("item_id -_id");
    let itemArray = [];
    group.map((a) => {
      itemArray.push(a.item_id);
    });

    let pageNo = parseInt(req.query.pageNo) || ONE;
    let pageLimit = parseInt(req.query.pageLimit) || COUNT_TEN;
    if (pageNo <= ZERO_NUM) {
      throw { message: responseMessage.PAGE_INVALID };
    }

    if (!req.query.longitude || !req.query.latitude) {
      return res.status(200).send({
        success: true,
        message: responseMessage.SOMETHING_WRONG("Not Found"),
        result: [],
      });
    }
    let isUnavaliable = await itemModel.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [
              parseFloat(req.query.longitude),
              parseFloat(req.query.latitude),
            ],
          },
          spherical: true,
          distanceField: CALC_DISTANCE,
          maxDistance: MAX_DIST,
        },
      },
      {
        $match: {
          _id: { $in: itemArray },
          createdBy: { $ne: mongoose.Types.ObjectId(req.userId) },
          $or: [
            {
              status: BORROWED,
            },
            {
              status: DELETED,
            },
          ],
        },
      },

      {
        $lookup: {
          from: "auths",
          let: { id: "$createdBy" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$$id", "$_id"] },
              },
            },
          ],
          as: "createdBy",
        },
      },
      { $unwind: "$createdBy" },
      {
        $facet: {
          data: [
            { $skip: pageLimit * (pageNo - ONE) },
            { $limit: pageLimit },
            {
              $project: {
                createdBy: { token: ZERO_NUM, fcmToken: ZERO_NUM },
              },
            },
          ],
          count: [
            {
              $count: "count",
            },
          ],
        },
      },
    ]);

    if (!isUnavaliable[ZERO_NUM].data) {
      res.status(SUCCESS).send({
        success: true,
        message: responseMessage.SOMETHING_WRONG("Data Not Found"),
        result: [],
      });
    } else {
      if (!isUnavaliable[ZERO_NUM]) {
        res.status(SUCCESS).send({
          success: true,
          message: responseMessage.SOMETHING_WRONG("Data Not Found"),
          result: [],
        });
        return;
      }

      if (!isUnavaliable[ZERO_NUM].count[ZERO_NUM]) {
        res.status(SUCCESS).send({
          success: true,
          message: responseMessage.SOMETHING_WRONG("Data Count Not Found"),
          result: [],
        });
        return;
      }

      let totalData = await isUnavaliable[ZERO_NUM].count[ZERO_NUM].count;
      let currentPage = await parseInt(req.query.pageNo);

      var tempPage = ONE;
      while (tempPage) {
        if (totalData <= pageLimit || totalData <= pageLimit * tempPage) {
          tempPage;
          break;
        }
        tempPage++;
      }

      res.status(SUCCESS).send({
        message: responseMessage.FOUND_SUCCESS("Unavaliable item"),
        result: isUnavaliable[ZERO_NUM].data,
        totalCount: isUnavaliable[ZERO_NUM].count[ZERO_NUM].count,
        totalPages: tempPage,
        currentPage,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 * Search by Item name from group-item
 */
_item.search = async (req, res, next) => {
  try {
    let query = await GroupMember.find({ user_id: req.userId }).select(
      "group_id -_id"
    );
    var array = [];
    query.map((a) => {
      array.push(a.group_id);
    });

    if (!query.length) {
      return res.status(200).send({
        success: true,
        message: responseMessage.SOMETHING_WRONG("Not Found"),
        result: [],
      });
    }

    let group = await GroupItem.find({ group_id: { $in: array } }).select(
      "item_id -_id"
    );

    if (!group) {
      return res.status(200).send({
        success: true,
        message: responseMessage.SOMETHING_WRONG("Not Found"),
        result: [],
      });
    }

    let groupArray = [];
    group.map((a) => {
      groupArray.push(a.item_id);
    });
    var regex = new RegExp(req.body.item_name, "i");

    if (!req.query.longitude || !req.query.latitude) {
      return res.status(200).send({
        success: true,
        message: responseMessage.SOMETHING_WRONG("Not Found"),
        result: [],
      });
    }

    let islocationFind = await GroupItem.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [
              parseFloat(req.query.longitude),
              parseFloat(req.query.latitude),
            ],
          },
          spherical: true,
          distanceField: "calcDistance",
          maxDistance: Constant.MAX_DIST,
          // includeLocs: "dist.location",
        },
      },
    ]);

    let result = await itemModel
      .find({
        $or: [
          {
            destription: regex,
          },
          {
            item_name: regex,
          },
        ],
        // item_name: regex,
        _id: {
          $in: groupArray,
        },
        createdBy: {
          $ne: req.userId,
        },
      })
      .populate({
        path: "createdBy",
        select: "-token -fcmToken",
      });
    if (!result) {
      res.status(200).send({
        success: true,
        message: responseMessage.SOMETHING_WRONG("Data Not Found"),
        result: [],
      });
    } else {
      res.status(200).send({
        success: true,
        message: responseMessage.FOUND_SUCCESS("Item"),
        result,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, "Something went wrong", "");
    next();
  }
};

/**
 * Search my item (posted by self)
 */
_item.searchMyItems = async (req, res, next) => {
  try {
    var regex = new RegExp(req.body.item_name, "i");
    let searchItems = await Item.find({
      createdBy: userId,
      item_name: regex,
    });
    if (!searchItems) {
      res.status(404).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG("Item Not Found"),
        result: [],
      });
    } else {
      res.status(200).send({
        success: true,
        message: responseMessage.FOUND_SUCCESS("Item"),
        data: searchItems,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, "Something went wrong", "");
    next();
  }
};

/**
 * Filter Api Avaliable/Borrowed Item
 */
_item.myItemFilter = async (req, res, next) => {
  try {
    let result = await Item.aggregate([
      { $match: { createdBy: mongoose.Types.ObjectId(req.userId) } },
      { $match: { status: req.body.status } },
      {
        $lookup: {
          from: "itemrequests",
          let: { id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$item_id", "$$id"] },
              },
            },
            { $match: { request_status: Constant.ACCEPTED_BORROEWD } },

            {
              $lookup: {
                from: "auths",
                let: { createdBy: "$createdBy" },
                pipeline: [
                  { $match: { $expr: { $eq: ["$_id", "$$createdBy"] } } },
                ],
                as: "borrowedUser",
              },
            },
          ],
          as: "borrowedItem",
        },
      },
      {
        $lookup: {
          from: "auths",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
        },
      },
      {
        $addFields: {
          isBorrowed: {
            $cond: { if: { $size: "$borrowedItem" }, then: true, else: false },
          },
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $project: {
          createdBy: { token: ZERO_NUM, fcmToken: ZERO_NUM },
        },
      },
    ]);
    res.status(SUCCESS).send({
      success: true,
      message: responseMessage.FOUND_SUCCESS("Item"),
      data: result,
    });
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 * Filter Api Avaliable/Unavaliable Item
 */
_item.myItemFilterSharedLevel = async (req, res, next) => {
  try {
    let result = await Item.aggregate([
      { $match: { createdBy: mongoose.Types.ObjectId(req.userId) } },
      { $match: { shared_level: req.body.shared_level } },
      {
        $lookup: {
          from: "itemrequests",
          let: { id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$item_id", "$$id"] },
              },
            },
            { $match: { request_status: Constant.ACCEPTED_BORROEWD } },

            {
              $lookup: {
                from: "auths",
                let: { createdBy: "$createdBy" },
                pipeline: [
                  { $match: { $expr: { $eq: ["$_id", "$$createdBy"] } } },
                ],
                as: "borrowedUser",
              },
            },
          ],
          as: "borrowedItem",
        },
      },
      {
        $lookup: {
          from: "auths",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
        },
      },
      {
        $addFields: {
          isBorrowed: {
            $cond: { if: { $size: "$borrowedItem" }, then: true, else: false },
          },
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $project: {
          createdBy: { token: ZERO_NUM, fcmToken: ZERO_NUM },
        },
      },
    ]);
    res.status(SUCCESS).send({
      success: true,
      message: responseMessage.FOUND_SUCCESS("Item"),
      data: result,
    });
  } catch (err) {
    await setResponseObject(req, false, "Something went wrong", "");
    next();
  }
};

/**
 * Delete Single Image
 */
_item.deleteImage = async (req, res, next) => {
  try {
    let data = req.body;
    let query = await itemModel.updateOne(
      {
        _id: req.body.item_id,
      },
      {
        $pull: { itemPic: { _id: req.body.image_id } },
      },
      {
        new: true,
        useFindAndModify: false,
      }
    );
    if (!query) {
      res.status(404).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG("Item Not Found"),
      });
    } else {
      res.status(200).send({
        success: true,
        message: responseMessage.SOMETHING_WRONG("Image deleted"),
        data: query,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, "Something went wrong", "");
    next();
  }
};

_item.addAbdUpdateReportItems = async (req, res) => {
  try {
    let data = req.body;
    data.updatedBy = req.userId;
    if (!data.report_itemId) {
      res.status(400).status({
        message: responseMessage.REQUIRED_FIELD,
      });
    }
    let result = await ReportItem.findOneAndUpdate(
      {
        _id: req.params.report_itemId,
      },
      data,
      {
        new: true,
        useFindAndModify: false,
      }
    );
    if (!result) {
      res.status(400).send({
        message: responseMessage.SOMETHING_WRONG("Report Not Updated"),
      });
    } else {
      res.status(200).send({
        message: responseMessage.ADD_SUCCESS("Updated"),
        result,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 * Share as pulbic
 */
_item.sharePublic = async (req, res) => {
  try {
    let data = req.body;
    data.updatedBy = req.userId;
    let result = await Item.findOneAndUpdate(
      {
        _id: req.params.item_id,
      },
      { itemType: ISPUBLIC },
      {
        new: true,
        useFindAndModify: false,
      }
    );
    if (!result) {
      res.status(BAD_REQUEST).send({
        message: responseMessage.SOMETHING_WRONG("Failed to share"),
      });
    } else {
      let removeFromGroup = await GroupItem.deleteMany({
        item_id: req.params.item_id,
      });
      res.status(SUCCESS).send({
        message: responseMessage.SUCCESS("Item shared"),
        data: result,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 * Get Private Item
 */
_item.getPrivateItem = async (req, res, next) => {
  try {
    var filterQuery;
    switch (req.query.type) {
      case "1":
        filterQuery = {
          status: "Available",
        }; //available
        break;
      case "2":
        filterQuery = {
          status: "Borrowed",
        }; //unavailbale
        break;
      default:
        filterQuery = {
          createdBy: { $ne: mongoose.Types.ObjectId(req.userId) },
        };
    }

    let pageNo = parseInt(req.query.pageNo) || ONE;
    let pageLimit = parseInt(req.query.pageLimit) || COUNT_TEN;
    if (pageNo <= ZERO_NUM) {
      throw { message: responseMessage.PAGE_INVALID };
    }

    if (!req.query.longitude || !req.query.latitude) {
      return res.status(200).send({
        success: true,
        message: responseMessage.SOMETHING_WRONG("Not Found"),
        result: [],
      });
    }

    let isResult = await Item.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [
              parseFloat(req.query.longitude),
              parseFloat(req.query.latitude),
            ],
          },

          spherical: true,
          distanceField: CALC_DISTANCE,
          maxDistance: MAX_DIST,
        },
      },
      {
        $match: {
          itemType: ISPUBLIC,
        },
      },
      {
        $match: {
          createdBy: { $ne: mongoose.Types.ObjectId(req.userId) },
        },
      },
      { $match: filterQuery },
      {
        $lookup: {
          from: "auths",
          let: { id: "$createdBy" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$$id", "$_id"] },
              },
            },
          ],
          as: "createdBy",
        },
      },
      {
        $facet: {
          data: [
            { $skip: pageLimit * (pageNo - ONE) },
            { $limit: pageLimit },
            {
              $project: {
                createdBy: { token: ZERO_NUM, fcmToken: ZERO_NUM },
              },
            },
          ],
          count: [
            {
              $count: "count",
            },
          ],
        },
      },
    ]);

    if (!isResult[ZERO_NUM].count[ZERO_NUM]) {
      return res.status(SUCCESS).send({
        success: true,
        message: responseMessage.SOMETHING_WRONG("Item Not Found"),
        result: [],
      });
    }

    let totalData = await isResult[ZERO_NUM].count[ZERO_NUM].count;
    let currentPage = await parseInt(req.query.pageNo);

    var tempPage = ONE;
    while (tempPage) {
      if (totalData <= pageLimit || totalData <= pageLimit * tempPage) {
        tempPage;
        break;
      }
      tempPage++;
    }

    if (!isResult) {
      res.status(BAD_REQUEST).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG("Item Not Found"),
      });
    } else {
      res.status(SUCCESS).send({
        success: true,
        message: responseMessage.FOUND_SUCCESS("Public Item"),
        result: isResult[ZERO_NUM].data,
        totalCount: isResult[ZERO_NUM].count[ZERO_NUM].count,
        totalPages: tempPage,
        currentPage,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 * Remove share public items
 */
_item.removeSharedItems = async (req, res, next) => {
  try {
    let result = await Item.findOneAndUpdate(
      { _id: req.params.item_id },
      { itemType: "isPrivate" },
      { new: true }
    );
    if (result) {
      res.status(SUCCESS).send({
        success: true,
        message: responseMessage.SUCCESS("Item removed"),
        data: result,
      });
    } else {
      res.status(BAD_REQUEST).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG("failed to remove item"),
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 * Get Private Item
 */
_item.PublicItem = async (req, res, next) => {
  try {
    let isResult = await Item.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [
              parseFloat(req.query.longitude),
              parseFloat(req.query.latitude),
            ],
          },

          spherical: true,
          distanceField: CALC_DISTANCE,
          maxDistance: MAX_DIST,
        },
      },
      {
        $match: {
          itemType: ISPUBLIC,
        },
      },
      {
        $match: {
          createdBy: { $ne: mongoose.Types.ObjectId(req.userId) },
        },
      },
      {
        $lookup: {
          from: "auths",
          let: { id: "$createdBy" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$$id", "$_id"] },
              },
            },
          ],
          as: "createdBy",
        },
      },
    ]);
    if (!isResult) {
      res.status(BAD_REQUEST).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG("Item Not Found"),
      });
    } else {
      res.status(SUCCESS).send({
        success: true,
        message: responseMessage.FOUND_SUCCESS("Public Item"),
        result: isResult,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 * HOME PAGE ITEM
 * @param { longitude, latitude, pageNo, pageLimit, type, search } req.query
 * @param { allData, group_id } req.body
 * @returns
 */
_item.homePageItems = async (req, res, next) => {
  try {
    let allData = req.body.allData;
    let filterData = {};

    var filterQuery;
    switch (req.query.type) {
      case "1":
        filterQuery = {
          status: AVAILABLE,
        }; //Available
        break;
      case "2":
        filterQuery = {
          status: BORROWED,
        }; //Unavailbale
        break;
      default:
        filterQuery = {
          createdBy: { $ne: mongoose.Types.ObjectId(req.userId) },
        };
    }

    /** SEARCH BY ITEM NAME & DESCRIPTION */
    if (req.query.search) {
      filterData = {
        $or: [
          {
            item_name: {
              $regex: req.query.search ? req.query.search : "",
              $options: "i",
            },
          },
          {
            destription: {
              $regex: req.query.search ? req.query.search : "",
              $options: "i",
            },
          },
        ],
      };
    }

    /* IN CASE OF ALL ITEM's */
    if (allData != false) {
      let findGroupIds = await GroupMember.find({
        user_id: req.userId,
        status: Constant.APPROVE,
      }).select("group_id -_id");
      var myGroupIds = [];
      findGroupIds.map((a) => {
        myGroupIds.push(a.group_id);
      });

      /** Pagination */
      let pageNo = parseInt(req.query.pageNo) || ONE;
      let pageLimit = parseInt(req.query.pageLimit) || COUNT_TEN; // default limit = 10
      if (pageNo <= ZERO_NUM) {
        throw { message: responseMessage.PAGE_INVALID };
      }

      /** FIND GROUP ITEM WITH GEO-NEAR FILTER */
      let findMyGroupItemIds = await GroupItem.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [
                parseFloat(req.query.longitude),
                parseFloat(req.query.latitude),
              ],
            },
            spherical: true,
            distanceField: CALC_DISTANCE,
            maxDistance: MAX_DIST,
          },
        },
        {
          $match: {
            group_id: { $in: myGroupIds },
            status: ACTIVE,
          },
        },
        { $skip: pageLimit * (pageNo - ONE) },
        { $limit: pageLimit },
      ]);

      /** Empty Array => itemIds */
      let itemIds = [];
      /** Push Group Item Ids */
      findMyGroupItemIds.map((a) => {
        itemIds.push(a.item_id);
      });

      /** Public Items */
      let findPublicItems = await Item.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [
                parseFloat(req.query.longitude),
                parseFloat(req.query.latitude),
              ],
            },
            spherical: true,
            distanceField: CALC_DISTANCE,
            maxDistance: MAX_DIST,
          },
        },
        { $match: { itemType: ISPUBLIC } },
        { $match: filterQuery },
        { $match: filterData },
        { $skip: pageLimit * (pageNo - ONE) },
        { $limit: pageLimit },
        { $project: { _id: ONE } },
      ]);

      /** Push Public Item Ids */
      findPublicItems.map((a) => {
        itemIds.push(a._id);
      });

      /** Find Item With Item Ids */
      let result = await Item.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [
                parseFloat(req.query.longitude),
                parseFloat(req.query.latitude),
              ],
            },
            spherical: true,
            distanceField: CALC_DISTANCE,
            maxDistance: MAX_DIST,
          },
        },
        {
          $match: {
            _id: { $in: itemIds },
            createdBy: { $ne: mongoose.Types.ObjectId(req.userId) },
          },
        },
        { $match: filterQuery },
        {
          $lookup: {
            from: "auths",
            let: { id: "$createdBy" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$$id", "$_id"] },
                },
              },
            ],
            as: "createdBy",
          },
        },
        { $unwind: "$createdBy" },
        {
          $match: filterData,
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $facet: {
            totalItem: [
              {
                $project: {
                  createdBy: { token: ZERO_NUM, fcmToken: ZERO_NUM },
                },
              },
            ],
            count: [{ $count: "count" }],
          },
        },
      ]);

      if (result[ZERO_NUM].totalItem.length) {
        //

        /** find total page with total data & page limits */
        let totalData = result[ZERO_NUM].totalItem.length;
        let currentPage = await parseInt(req.query.pageNo);
        var tempPage = ONE;

        while (tempPage) {
          if (totalData <= pageLimit || totalData <= pageLimit * tempPage) {
            tempPage;
            break;
          }
          tempPage++;
        }

        let adsCount = await authModel
          .findOne({ _id: req.userId })
          .select("adsCount -_id");
        res.status(SUCCESS).send({
          success: true,
          adsCount: adsCount.adsCount,
          message: responseMessage.FOUND_SUCCESS("Item"),
          result: result[ZERO_NUM].totalItem,
          totalCount: totalData,
          totalPages: tempPage,
          currentPage,
        });
      } else {
        res.status(SUCCESS).send({
          success: true,
          message: responseMessage.SOMETHING_WRONG("Data Not Found"),
          result: [],
        });
      }
    } else {
      /* IN CASE WITH GROUP ID's */
      let findGroupIds = await GroupMember.find({
        user_id: req.userId,
        status: Constant.APPROVE,
        group_id: { $in: req.body.group_id },
      }).select("group_id -_id");
      var myGroupIds = [];
      findGroupIds.map((a) => {
        myGroupIds.push(a.group_id);
      });

      /** Pagination */
      let pageNo = parseInt(req.query.pageNo) || ONE;
      let pageLimit = parseInt(req.query.pageLimit) || COUNT_TEN;
      if (pageNo <= ZERO_NUM) {
        throw { message: responseMessage.PAGE_INVALID };
      }

      /**FIND GROUP ITEM WITH GEO-NEAR FILTER */
      let findMyGroupItemIds = await GroupItem.aggregate([
        {
          $match: {
            group_id: { $in: myGroupIds },
            status: ACTIVE,
          },
        },
        { $skip: pageLimit * (pageNo - ONE) },
        { $limit: pageLimit },
      ]);

      /** Empty Array => itemIds */
      let itemIds = [];
      /** Push Group Item Ids */
      findMyGroupItemIds.map((a) => {
        itemIds.push(a.item_id);
      });

      /** Public Items */
      let findPublicItems = await Item.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [
                parseFloat(req.query.longitude),
                parseFloat(req.query.latitude),
              ],
            },
            spherical: true,
            distanceField: CALC_DISTANCE,
            maxDistance: MAX_DIST,
          },
        },
        { $match: { itemType: ISPUBLIC } },
        { $match: filterQuery },
        {
          $match: filterData,
        },
        { $skip: pageLimit * (pageNo - ONE) },
        { $limit: pageLimit },
      ]);

      findPublicItems.map((a) => {
        itemIds.push(a._id);
      });

      /** Find Item With Item Ids */
      let result = await Item.aggregate([
        {
          $match: {
            _id: { $in: itemIds },
            createdBy: { $ne: mongoose.Types.ObjectId(req.userId) },
          },
        },
        {
          $match: filterData,
        },
        { $match: filterQuery },
        {
          $lookup: {
            from: "auths",
            let: { id: "$createdBy" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$$id", "$_id"] },
                },
              },
            ],
            as: "createdBy",
          },
        },
        { $unwind: "$createdBy" },
        {
          $sort: { createdAt: -1 },
        },
        {
          $facet: {
            totalItem: [
              {
                $project: {
                  createdBy: { token: ZERO_NUM, fcmToken: ZERO_NUM },
                },
              },
            ],
            count: [{ $count: "count" }],
          },
        },
      ]);

      if (result[ZERO_NUM].totalItem.length) {
        /** Count Both Records Group & Public */
        let totalData = result[ZERO_NUM].totalItem.length;
        let currentPage = await parseInt(req.query.pageNo);

        /** find total page with total data & page limits */
        var tempPage = ONE;
        while (tempPage) {
          if (totalData <= pageLimit || totalData <= pageLimit * tempPage) {
            tempPage;
            break;
          }
          tempPage++;
        }

        let adsCount = await authModel
          .findOne({ _id: req.userId })
          .select("adsCount -_id");
        res.status(SUCCESS).send({
          success: true,
          adsCount: adsCount.adsCount,
          message: responseMessage.FOUND_SUCCESS("Item"),
          result: result[ZERO_NUM].totalItem,
          totalCount: totalData,
          totalPages: tempPage,
          currentPage,
        });
      } else {
        res.status(SUCCESS).send({
          success: true,
          message: responseMessage.SOMETHING_WRONG("Data Not Found"),
          result: [],
        });
      }
    }
  } catch (err) {
    return res.status(SUCCESS).send({
      success: false,
      message: err.message,
    });
  }
};

module.exports = _item;
