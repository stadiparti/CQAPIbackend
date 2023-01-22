/*
@copyright : ToXSL Technologies Pvt. Ltd. < www.toxsl.com >
@author     : Shiv Charan Panjeta < shiv@toxsl.com >
 
All Rights Reserved.
Proprietary and confidential :  All information contained herein is, and remains
the property of ToXSL Technologies Pvt. Ltd. and its partners.
Unauthorized copying of this file, via any medium is strictly prohibited.
*/

const groupModel = require("../model/group.model");
const GroupMember = require("../model/membermodel");
const bcrypt = require("bcrypt"); // bcrypt for encryption of password
const jwt = require("jsonwebtoken");
const multer = require("multer"); // for file save on server
const { response } = require("express");
const responseMessage = require("../../../middleware/responseMessage");
const statusCode = require("../../../middleware/statusCode");
const GroupItem = require("../model/group.item");
const dir = "./upload/group";
const mongoose = require("mongoose");
const Constant = require("../../../helpers/constant");
// const Auth = require("../middleware/Auth");
const setResponseObject =
  require("../../../middleware/commonFunctions").setResponseObject;
const itemModel = require("../../item/model/item.model");
const userModel = require("../../auth/model/auth.model");
const notification = require("../../notification/model/notification.model");
const commonFunction = require("../../../helpers/nodeMailer");
const {
  ZERO_NUM,
  SUCCESS,
  ONE,
  COUNT_TEN,
  BAD_REQUEST,
  NOT_FOUND,
  OWNER,
  ADMIN,
  APPROVE,
  UNAVAILAVLE,
  ACTIVE,
  BLOCKED,
  MEMBER,
  JOIN_REQUEST,
  MAX_DIST,
  CALC_DISTANCE,
  UNAUTHORIZED
} = require("../../../helpers/constant");
const S3ImageUtil = require('../../item/controller/s3-image-util');
const s3ImageUtil = new S3ImageUtil();

var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, new Date().getTime().toString() + "-" + file.originalname);
  },
});

const upload = multer({
 

  // fileFilter: fileFilter,
}).single("image");

const _group = {};
const uniqueFileName = (originalName) => {
  const uniqueString = Date.now() + '-' + Math.random().toString(36).substring(2, 15);
  return uniqueString + '-' + originalName;
}
/**
 * CREATE GROUP
 * @param {token, group_name, description, image, latitude, longitude} req.body
 * @returns
 */
_group.add = async (req, res, next) => {
  try {
  
      let numOfGrpCreatedByMe = await groupModel
        .find({ owner_id: req.userId })
        .countDocuments();

      if (numOfGrpCreatedByMe < Constant.MAX_NO_GROUP_CREATE) {
        upload(req, res, async (err) => {
          if (err) {
            setResponseObject(req, false, err.message ? err.message : err, "");
            next();
          } else {
            let imageUrl;
            let data = req.body;
            if (req.file) {
              const file = req.file;
              const fileName =  uniqueFileName(file.originalname);
              imageUrl = await s3ImageUtil.upload(file.buffer, fileName,"upload/group");
              console.log(imageUrl);
              data.image = imageUrl.Location.toString();
            }
            
            
           
           
            data.admin_id = [req.userId];
            data.owner_id = req.userId;
           

            if (data.latitude && data.longitude) {
              data.location = {
                type: "Point",
                coordinates: [data.longitude, data.latitude],
              };
            }

            let groupdata = new groupModel(data);

            await groupdata.save(async (err, resp) => {
              if (err) {
                await setResponseObject(req, false, err.message, "");
                next();
              } else {
                let groupOwner = {
                  user_id: req.userId,
                  group_id: resp._id,
                  role: OWNER,
                  status: APPROVE,
                };
                let memberResult = await new GroupMember(groupOwner).save();
                await res.status(statusCode.SUCCESS).send({
                  success: true,
                  message: responseMessage.GROUP_CREATED(""),
                  data: resp,
                });
              }
            });
          }
        });
      } else {
        return res.status(BAD_REQUEST).send({
          success: false,
          message: responseMessage.GROUP_CREATE_LIMIT_EXCEED,
        });
      }
    
  } catch (err) {
    await setResponseObject(req, false, responseMessage.SOMETHING_WENT_WRONG, "");
    next();
  }
};

/**
 * UPDATE GROUP DETAILS
 * @param {group_id, data} req
 */
_group.update = async (req, res, next) => {
  try {
    if (0) {
      await setResponseObject(
        req,
        true,
        responseMessage.UPDATE_SUCCESS("Group")
      );
      next();
    } else {
      upload(req, res, async (err) => {
        if (err) {
          await setResponseObject(
            req,
            false,
            err.message ? err.message : err,
            ""
          );
          next();
        } else {
          let checkIsOwner = await groupModel.findOne({_id: req.params.group_id, owner_id: req.userId})
          if(checkIsOwner){
            let data = req.body;
            if (req.file) {
              data.image = req.file.path;
            }
            let updateGroupUser = await groupModel.findByIdAndUpdate(
              { _id: req.params.group_id },
              data,
              { new: true }
            );
            res.status(statusCode.SUCCESS).send({
              success: true,
              message: responseMessage.UPDATE_SUCCESS("Group"),
              data: updateGroupUser,
            });
            return;
          } else {
            res.status(UNAUTHORIZED).send({
              success: false,
              message: responseMessage.UNAUTHORIZED_ACCESS,
            });
          }
        }
      });
    }
  } catch (err) {
    await setResponseObject(req, false, responseMessage.SOMETHING_WENT_WRONG, "");
    next();
  }
};

_group.view = async (req, res, next) => {
  try {
    let getSingleGroupDetails = await groupModel.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(req.params.group_id)
        },
      },
      {
        $lookup: {
          from: "groupmembers",
          let: { id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$group_id", "$$id"] },
              },
            },
            { $match: {
              $or: [
                { status: Constant.JOIN_REQUEST },
                { status: Constant.PENDING },
              ],
            }, },
            {
              $match: {
                user_id: mongoose.Types.ObjectId(req.userId),
              },
            },
          ],
          as: "groupMember",
        },
      },
      {
        $addFields: {
          isRequested: {
            $cond: { if: { $size: "$groupMember" }, then: true, else: false },
          },
        },
      },
      {
        $project:{
          groupMember: 0
        }
      }
    ]);

    if(getSingleGroupDetails.length){
      res.status(statusCode.SUCCESS).send({
        success: true,
        message: responseMessage.FOUND_SUCCESS("Group"),
        data: getSingleGroupDetails[0],
      });
    } else {
      res.status(statusCode.SUCCESS).send({
        success: true,
        message: responseMessage.NOT_FOUND("Group"),
        data: getSingleGroupDetails[0], // convert into object
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 * GET GROUP LIST
 * @param {item_id,token} req
 */
_group.all = async (req, res, next) => {
  try {
    var regex = new RegExp(req.body.search, "i");
    if (req.query.item_id == Constant.ZERO) {
      let query = await GroupMember.find({
        user_id: req.userId,
        status: Constant.APPROVE,
      });
      var array = [];
      query.map((a) => {
        array.push(a.group_id);
      });
      /* Pagination */
      let pageNo = parseInt(req.query.pageNo) || ONE;
      let pageLimit = parseInt(req.query.pageLimit) || COUNT_TEN;
      if (pageNo <= ZERO_NUM) {
        throw { message: responseMessage.PAGE_INVALID };
      }

      let searchGroupName = {};
      if (req.query.search) {
        searchGroupName = {
          group_name: {
            $regex: req.query.search ? req.query.search : "",
            $options: "i",
          },
        };
      }

      let data = req.query;
      if (data.shareItemId == "") {
        delete data.shareItemId;
      }

      let resultData = await groupModel.aggregate([
        {
          $match: {
            _id: { $in: array },
          },
        },
        {
          $match: searchGroupName,
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $lookup: {
            from: "groupitems",
            let: { id: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$$id", "$group_id"] },
                },
              },
            ],
            as: "groupitems",
          },
        },
        {
          $addFields: {
            isItemShared: {
              $in: [
                mongoose.Types.ObjectId(data.shareItemId),
                "$groupitems.item_id",
              ],
            },
          },
        },
        {
          $project: {
            _id: 1,
            location: 1,
            zip_code: 1,
            image: 1,
            group_name: 1,
            description: 1,
            owner_id: 1,
            createdAt: 1,
            updatedAt: 1,
            __v: 1,
            isItemShared: 1,
          },
        },
        {
          $facet: {
            data: [
              { $skip: pageLimit * (pageNo - ONE) },
              { $limit: pageLimit },
            ],
            count: [
              {
                $count: "count",
              },
            ],
          },
        },
      ]);
      if (resultData && resultData[0].data.length) {
        let totalCount = resultData[0].count[0].count;
        let currentPage = await parseInt(req.query.pageNo);
        var tempPage = ONE;
        while (tempPage) {
          if (totalCount <= pageLimit || totalCount <= pageLimit * tempPage) {
            tempPage;
            break;
          }
          tempPage++;
        }
        res.status(statusCode.SUCCESS).send({
          success: true,
          message: responseMessage.GROUP_ALL(""),
          data: resultData[0].data,
          totalCount: totalCount,
          totalPage: tempPage,
          currentPage,
        });
      } else {
        res.status(statusCode.SUCCESS).send({
          success: false,
          message: responseMessage.GROUP_ALL(""),
          data: [],
          totalCount: 0,
          totalPage: 0,
          currentPage: 1
        });
      }
    } else {
      let condition = await GroupItem.find({ item_id: req.query.item_id });
      var arrCond = [];
      if (condition) {
        condition.map((a) => {
          arrCond.push(a.group_id);
        });
      }
      let query = await GroupMember.find({
        user_id: req.userId,
        status: Constant.APPROVE,
      });
      var array = [];
      query.map((a) => {
        array.push(a.group_id);
      });
      let result = await groupModel
        .find({
          $and: [
            {
              _id: { $in: array },
            },
            {
              _id: { $nin: arrCond },
            },
          ],
          group_name: regex,
        })
        .sort({ createdAt: -1 })
        .exec((err, resp) => {
          if (err) {
            setResponseObject(req, false, err.message ? err.message : err, "");
            next();
          } else {
            res.status(statusCode.SUCCESS).send({
              success: true,
              message: responseMessage.GROUP_ALL(""),
              data: resp,
            });
          }
        });
    }
  } catch (err) {
    await setResponseObject(req, false, responseMessage.SOMETHING_WENT_WRONG, "");
    next();
  }
};

/**
 * DELETE GROUP
 * @param {group_id} req
 */
_group.delete = async (req, res, next) => {
  try {
    let checkIsOwner = await groupModel.findOne({_id: req.params.group_id, owner_id: req.userId});
    if(checkIsOwner){
      await groupModel.findOneAndRemove(
        {
          _id: req.params.group_id,
        },
        async (err, resp) => {
          if (err) {
            setResponseObject(req, false, err.message ? err.message : err, "");
            next();
          } else {
            await GroupMember.deleteMany({
              group_id: req.params.group_id,
            });
            await GroupItem.deleteMany({
              group_id: req.params.group_id,
            });
            res.status(statusCode.SUCCESS).send({
              success: true,
              message: responseMessage.GROUP_DELETED(""),
              data: resp,
            });
          }
        }
      );
    } else {
      res.status(UNAUTHORIZED).send({
        success: false,
        message: responseMessage.UNAUTHORIZED_ACCESS,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, responseMessage.SOMETHING_WENT_WRONG, "");
    next();
  }
};

_group.addItem = async (req, res, next) => {
  try {
    let data = req.body;
    let query = {
      $and: [
        {
          group_id: req.body.group_id,
        },
        {
          item_id: req.body.item_id,
        },
      ],
    };
    let isItemExist = await GroupItem.findOne(query);

    // check for item owner
    let query2 = {
      $and: [
        {
          _id: req.body.item_id,
        },
        {
          createdBy: req.userId,
        },
      ],
    };
    let isOwner = await itemModel.findOne(query2);

    // for taking createdby from item model
    let query3 = await itemModel.find({ _id: req.body.item_id });
    let itemArray = [];
    query3.map((a) => {
      itemArray.push(a.createdBy);
    });
    data.createdBy = itemArray;

    let groupArray = [];
    req.body.addItem.map((a) => {
      groupArray.push(a.group_id);
    });
    let findNoOfItems = await GroupItem.find({
      createdBy: req.userId,
      group_id: { $in: groupArray },
    }).countDocuments();

    if (findNoOfItems <= Constant.MAX_NO_ITEM_SHARE_IN_GROUP_BY_ME) {
      // let result = await GroupItem.create(req.body.addItem);

      let obj = req.body.addItem;

      obj.map(async (Elements) => {
        let saveData = {};
        /** Add Location */
        if (data.latitude && data.longitude) {
          saveData.location = {
            type: "Point",
            coordinates: [req.body.longitude, req.body.latitude],
          };
        }

        (saveData.item_id = Elements.item_id),
          (saveData.group_id = Elements.group_id),
          (saveData.createdBy = Elements.createdBy);

        let result = await GroupItem(saveData).save();

        let changeStatus = await itemModel.findOneAndUpdate(
          {
            _id: Elements.item_id,
          },
          {
            shared_level: UNAVAILAVLE,
          },
          {
            new: true,
            useFindAndModify: false,
          }
        );
      });

      res
        .status(statusCode.SUCCESS)
        .send({ message: responseMessage.ADD_SUCCESS("Group item") });
    } else {
      res.status(BAD_REQUEST).send({
        success: false,
        message: responseMessage.ITEM_SHARE_LIMIT_EXCEED,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, responseMessage.SOMETHING_WENT_WRONG, "");
    next();
  }
};

_group.addItemNew = async (req, res, next) => {
  try {
    let data = req.body;
    let itemOwner = await userModel.findOne({_id: req.body.addItem[0].createdBy}).select('_id');
    if(itemOwner._id == req.userId){
      // Remove
      let removeItem = {};
      req.body.addItem.forEach((element) => {
        (removeItem.item_id = element.item_id),
          (removeItem.createdBy = element.createdBy);
      });

      // for taking createdby from item model
      let query3 = await itemModel.find({ _id: req.body.item_id });
      let itemArray = [];
      query3.map((a) => {
        itemArray.push(a.createdBy);
      });
      data.createdBy = itemArray;

      let groupArray = [];
      req.body.addItem.map((a) => {
        groupArray.push(a.group_id);
      });
      let findNoOfItems = await GroupItem.find({
        createdBy: req.userId,
        group_id: { $in: groupArray },
      }).countDocuments();

      if (findNoOfItems == Constant.MAX_NO_ITEM_SHARE_IN_GROUP_BY_ME || findNoOfItems <= Constant.MAX_NO_ITEM_SHARE_IN_GROUP_BY_ME) {
        let removeItemResult = await GroupItem.deleteMany(removeItem);

        let obj = req.body.addItem;
        obj.map(async (Elements) => {
          let saveData = {};
          /** Add Location */
          if (data.latitude && data.longitude) {
            saveData.location = {
              type: "Point",
              coordinates: [req.body.longitude, req.body.latitude],
            };
          }
          (saveData.item_id = Elements.item_id),
            (saveData.group_id = Elements.group_id),
            (saveData.createdBy = Elements.createdBy);

          let isExist = await GroupItem.findOne(saveData);
          if (!isExist) {
            let result = await GroupItem(saveData).save();

            let changeStatus = await itemModel.findOneAndUpdate(
              {
                _id: Elements.item_id,
              },
              {
                shared_level: UNAVAILAVLE,
                itemType: 'isPrivate'
              },
              {
                new: true,
                useFindAndModify: false,
              }
            );
          } else {
            res
              .status(statusCode.SUCCESS)
              .send({ message: responseMessage.ADD_SUCCESS("Group item") });
          }
        });
        res
        .status(statusCode.SUCCESS)
        .send({ message: responseMessage.ADD_SUCCESS("Group item") });
      } else {
        res.status(BAD_REQUEST).send({
          success: false,
          message: responseMessage.ITEM_SHARE_LIMIT_EXCEED,
        });
      }
    } else {
      res.status(UNAUTHORIZED).send({
        success: false,
        message: responseMessage.UNAUTHORIZED_ACCESS,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, responseMessage.SOMETHING_WENT_WRONG, "");
    next();
  }
};

_group.updateItem = async (req, res) => {
  try {
    let data = req.body;
    data.updatedBy = req.userId;
    if (!data.group_id || !data.item_id) {
      return res.status(statusCode.BAD_REQUEST).send({
        message: responseMessage.SOMETHING_WRONG("Required Filed Empty"),
      });
    }
    let result = await GroupItem.findOneAndUpdate(
      {
        _id: req.params.group_item_id,
      },
      data,
      {
        new: true,
        useFindAndModify: false,
      }
    );
    if (!result) {
      res
        .status(statusCode.BAD_REQUEST)
        .send({ message: responseMessage.SOMETHING_WRONG("Not Updated") });
    } else {
      res.status(statusCode.SUCCESS).send({
        message: responseMessage.ADD_SUCCESS("Group item updated"),
        result,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, responseMessage.SOMETHING_WENT_WRONG, "");
    next();
  }
};

_group.getItem = async (req, res, next) => {
  try {
    let result = await GroupItem.find({
      group_id: req.params.group_id,
      status: ACTIVE,
    }).populate("item_id");
    if (!result) {
      res
        .status(statusCode.BAD_REQUEST)
        .send({ message: responseMessage.SOMETHING_WRONG("Item Not Found") });
    } else {
      res.status(statusCode.SUCCESS).send({
        success: true,
        message: responseMessage.FOUND_SUCCESS("Item"),
        result,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 * My item shared in group single
 */
_group.getSharedItem = async (req, res) => {
  try {
    let result = await GroupItem.find({
      item_id: {
        $eq: req.params.item_id,
      },
    }).populate("group_id");
    if (!result) {
      res.status(statusCode.BAD_REQUEST).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG(
          "Failed to found shared item in groups"
        ),
      });
    } else {
      res.status(statusCode.SUCCESS).send({
        success: true,
        message: responseMessage.FOUND_SUCCESS("Shared item"),
        data: result,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

_group.deleteItem = async (req, res) => {
  try {
    await GroupItem.findOneAndRemove(
      {
        _id: req.body.group_item_id,
        group_id: req.body.group_id,
      },
      (err, resp) => {
        if (err) {
          setResponseObject(req, false, err.message ? err.message : err, "");
          next();
        } else {
          res.status(statusCode.SUCCESS).send({
            success: true,
            message: responseMessage.ITEM_DELETE,
            data: resp,
          });
        }
      }
    );
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

_group.block = async (req, res, next) => {
  try {
    if (0) {
      await setResponseObject(req, true, "User blocked successfully");
      next();
    } else {
      let data = req.body.userId;

      let result = await groupModel.findOneAndUpdate(
        {
          admin_id: {
            $in: req.userId,
          },
          _id: req.body._id,
        },
        {
          $addToSet: {
            block_members: data,
          },
        },
        (err, resp) => {
          if (err) {
            setResponseObject(req, false, err.message ? err.message : err, "");
            next();
          } else {
            res.status(200).send({
              success: true,
              message: responseMessage.GROUP_DELETED(""),
              data: resp,
            });
          }
        }
      );
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "hello");
    next();
  }
};

_group.blockItem = async (req, res, next) => {
  try {
    let group_item_id = req.body.group_item_id;
    if (!group_item_id) {
      res.status(statusCode.BAD_REQUEST).send({
        success: false,
        message: responseMessage.REQUIRED_FIELD,
      });
    }
    let result = await GroupItem.findOneAndUpdate(
      {
        _id: req.body.group_item_id,
      },
      {
        $set: { status: BLOCKED },
      },
      {
        new: true,
        useFindAndModify: false,
      }
    );
    if (!result) {
      res.status(statusCode.BAD_REQUEST).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG("Failed to block item"),
      });
    } else {
      res.status(statusCode.SUCCESS).send({
        success: true,
        message: responseMessage.GROUP_ITEM_BLOCK,
        result,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

_group.addMemebers = async (req, res, next) => {
  try {
    if (0) {
      await setResponseObject(req, true, "Members added successfully", {
        _id: "5f6d80f06883141ca0989276",
        group_name: "toxsl",
        group_desc: "JBUGBIUHOINHOIN(*Y(*U(N(J)(",
        admin_id_no: 76987907098,
        group_members: [{}],
        Image: "",
      });

      next();
    } else {
      let data = req.body.memberId;
      groupModel.findOneAndUpdate(
        {
          admin_id: {
            $in: req.userId,
          },
        },
        {
          $addToSet: {
            group_members: data,
          },
        },
        {
          new: true,
          useFindAndModify: false,
        },
        (err, resp) => {
          if (err) {
            setResponseObject(req, false, err.message ? err.message : err, "");
            next();
          } else {
            res.status(statusCode.SUCCESS).send({
              success: true,
              message: responseMessage.MEMBERS_ADDED(""),
              data: resp,
            });
          }
        }
      );
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 * SEND GROUP REQUEST BY USER TO GROUP ADMIN & OWNER
 * @param {token, group_id} req
 */
_group.createGroupRequest = async (req, res) => {
  try {
    let data = req.body;
    data.user_id = req.userId;
    data.status = Constant.JOIN_REQUEST;
    data.member_status = "";
    data.role = "";

    let senderUser = await userModel.findOne({ _id: req.userId });
    let groupData = await groupModel.findOne({ _id: req.body.group_id });

    let isGroupFull = await GroupMember.find({
      group_id: req.body.group_id,
    }).countDocuments();
    if (isGroupFull < Constant.MAX_NO_MEMBER_IN_GROUP) {
      let query = {
        $and: [
          {
            group_id: req.body.group_id,
            user_id: req.userId
          },
          {
            $or: [
              { status: Constant.JOIN_REQUEST },
              { status: Constant.PENDING },
            ],
          },
        ],
      };
      let isReqExist = await GroupMember.findOne(query);
      if (isReqExist) {
        res
          .status(statusCode.BAD_REQUEST)
          .send({ success: false, message: "Already requested", isReqExist });
      } else {
        let result = await new GroupMember(data).save();
        if (!result) {
          res.status(statusCode.BAD_REQUEST).send({
            success: false,
            message: responseMessage.SOMETHING_WRONG("Filed to send request"),
          });
        } else {
          let memberData = await GroupMember.find({
            group_id: req.body.group_id,
            $or: [
              {
                role: { $eq: OWNER },
              },
              {
                role: { $eq: ADMIN },
              },
            ],
          });

          let array = [];
          memberData.map((a) => {
            array.push(a.user_id);
          });

          let userData = await userModel.find({ _id: { $in: array } });

          if (userData.length) {
            /** Send Push Notification */
            userData.forEach(async (element) => {
              let pushNot = await commonFunction.groupRequestNotification(
                element.fcmToken,
                "CliqRight",
                `${senderUser.first_name} ${senderUser.last_name} wants to join your ${groupData.group_name} group`,
                groupData._id,
                groupData.image
              );
              let obj = {
                sendBy: req.userId,
                sendTo: element._id,
                title: "CliqRight",
                body: `${senderUser.first_name} ${senderUser.last_name} wants to join your ${groupData.group_name} group`,
                message: `${senderUser.first_name} ${senderUser.last_name} wants to join your ${groupData.group_name} group`,
                group_id: groupData._id,
                image: groupData.image,
                notificationType: "group_request",
                req_id: result._id,
              };

              let saveNotification = await notification.create(obj);
            });

            // next()

            /** Send Email Notification */
            userData.forEach(async (element) => {
              let contactNumber = element.countryCode + element.phone_no;
              let email = element.email;
              let subject = "Group Request Notification";
              let html =
                "<p>  " +
                senderUser.first_name +
                " " +
                senderUser.last_name +
                " wants to join your " +
                groupData.group_name +
                " group .</p>";
            });
          }

          if (result) {
            res.status(statusCode.SUCCESS).send({
              success: true,
              message: responseMessage.ADD_SUCCESS("Request"),
              data: result,
            });
          }
        }
      }
    } else {
      res.status(statusCode.BAD_REQUEST).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG("Group Limit Exceeds"),
      });
    }
  } catch (err) {
    res.status(statusCode.BAD_REQUEST).send({
      success: false,
      message: responseMessage.SOMETHING_WENT_WRONG,
    });
  }
};

/**
 * Find request for join group
 */
_group.getGroupRequest = async (req, res) => {
  try {
    let groupRequest = await GroupMember.find({
      group_id: req.params.group_id,
      status: Constant.JOIN_REQUEST,
    }).populate("user_id");
    if (!groupRequest) {
      res.status(statusCode.BAD_REQUEST).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG("Filed to send request"),
      });
    } else {
      res.status(statusCode.SUCCESS).send({
        success: true,
        message: responseMessage.ADD_SUCCESS("Request"),
        data: groupRequest,
      });
    }
  } catch (err) {
    res.status(statusCode.BAD_REQUEST).send({
      success: false,
      message: err.message,
    });
  }
};

_group.updateGroupRequest = async (req, res) => {
  try {
    let data = req.body;
    data.updatedBy = req.userId;
    let result = await GroupMember.findByIdAndUpdate(req.params.id, data, {
      new: true,
      useFindAndModify: false,
    });
    if (!result) {
      res.status(statusCode.BAD_REQUEST).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG("Filed to update request"),
      });
    } else {
      res.status(statusCode.SUCCESS).send({
        success: true,
        message: responseMessage.UPDATE_SUCCESS("Request"),
        data: result,
      });
    }
  } catch (err) {
    res.status(statusCode.BAD_REQUEST).send({
      success: false,
      message: err.message,
    });
  }
};

/**
 * GROUP REQUEST APPROVE
 * @param {TOKEN, group_request_id} req
 */
_group.join = async (req, res, next) => {
  try {
    if (0) {
      await setResponseObject(req, true, "Group joined successfully");
      next();
    } else {
      let grpName = await GroupMember.findOne({
        _id: req.params.group_request_id,
      });
      let checkLimits = await GroupMember.find({
        group_id: grpName.group_id,
      }).countDocuments();
      if (checkLimits <= Constant.MAX_NO_MEMBER_IN_GROUP) {
        let data = req.body;
        data.status = APPROVE;
        data.role = MEMBER;
        data.member_status = "Group Member";
        data.updatedBy = req.userId;
        let isApprove = await GroupMember.findOneAndUpdate(
          {
            _id: req.params.group_request_id,
          },
          data,
          {
            new: true,
            useFindAndModify: true,
          }
        );
        console.log(isApprove.group_id,"isApprove")
        if (!isApprove) {
          res.status(statusCode.BAD_REQUEST).send({
            success: false,
            message: responseMessage.SOMETHING_WRONG(
              "Failed To Accept Request"
            ),
          });
        } else {
          let senderUser = await userModel.findOne({ _id: req.userId });
          let receiverUser = await userModel.findOne({
            _id: isApprove.user_id,
          });

          let groupData = await groupModel.findOne({ _id: isApprove.group_id });

          let pushNot = await commonFunction.groupJoinNotification(
            receiverUser.fcmToken,
            "CliqRight",
            `Your request has been approved by ${senderUser.first_name} ${senderUser.last_name} for ${groupData.group_name} group`,
            groupData._id,
            groupData.image
          );
          let obj = {
            sendBy: req.userId,
            sendTo: isApprove.user_id,
            title: "CliqRight",
            body: `Your request has been approved by ${senderUser.first_name} ${senderUser.last_name} for ${groupData.group_name} group`,
            message: `Your request has been approved by ${senderUser.first_name} ${senderUser.last_name} for ${groupData.group_name} group`,
            notificationType: "group_join",
            group_id: groupData._id,
            image: groupData.image,
          };

          let saveNotification = await notification.create(obj);

          res.status(statusCode.SUCCESS).send({
            success: true,
            message: responseMessage.REQUEST_ACCEPT,
            data: isApprove,
          });
        }
      } else {
        res.status(BAD_REQUEST).send({
          success: false,
          message: responseMessage.GROUP_JOIN_LIMI_EXCEED,
        });
      }
    }
  } catch (err) {
    await setResponseObject(req, false, responseMessage.SOMETHING_WENT_WRONG, "");
    next();
  }
};

/**
 * GROUP REQUEST REJECT
 * @param {token, group_request_id} req
 */
_group.reject = async (req, res, next) => {
  try {
    if (0) {
      await setResponseObject(req, true, "Group left successfully");
      next();
    } else {
      let data = req.body;
      data.status = "Reject";
      data.updatedBy = req.userId;
      let isReject = await GroupMember.findOneAndUpdate(
        {
          _id: req.params.group_request_id,
        },
        data,
        {
          new: true,
          useFindAndModify: false,
        }
      );
      if (!isReject) {
        res.status(statusCode.BAD_REQUEST).send({
          success: false,
          message: responseMessage.SOMETHING_WRONG("Failed To Cancle Request"),
        });
      } else {
        let senderUser = await userModel.findOne({ _id: req.userId });
        let receiverUser = await userModel.findOne({ _id: isReject.user_id });

        let groupData = await groupModel.findOne({ _id: isReject.group_id });

        /** Send Push Notification */
        let pushNot = await commonFunction.group_reject(
          receiverUser.fcmToken,
          "CliqRight",
          `Your request has been rejected by ${senderUser.first_name} ${senderUser.last_name} for ${groupData.group_name} group`,
          groupData._id,
          groupData.image
        );
        let obj = {
          sendBy: req.userId,
          sendTo: isReject.user_id,
          title: "CliqRight",
          body: `Your request has been rejected by ${senderUser.first_name} ${senderUser.last_name} for ${groupData.group_name} group`,
          message: `Your request has been rejected by ${senderUser.first_name} ${senderUser.last_name} for ${groupData.group_name} group`,
          notificationType: "group_join_reject",
          group_id: groupData._id,
          image: groupData.image,
        };

        let saveNotification = await notification.create(obj);

        res.status(statusCode.SUCCESS).send({
          success: true,
          message: responseMessage.REQUEST_REJECT,
          data: isReject,
        });
      }
    }
  } catch (err) {
    await setResponseObject(req, false, responseMessage.SOMETHING_WENT_WRONG, "");
    next();
  }
};

/**
 * FIND GROUP NEAR WITHIN 8KM FROM USER
 * @param { pageNo, pageLimit, longitude, latitude } req.query
 */
_group.nearme = async (req, res, next) => {
  try {
    if (0) {
      await setResponseObject(req, true, "Data found successfully", {
        _id: "5f6d80f06883141ca0989276",
        group_name: "toxsl",
        group_desc: "JBUGBIUHOINHOIN(*Y(*U(N(J)(",
        admin_id_no: 76987907098,
        group_members: [{}],
        Image: "",
      });
      next();
    } else {
      let query = await GroupMember.find({
        user_id: req.userId,
        $or: [
          { status: Constant.APPROVE },
          { status: Constant.PENDING },
          { status: Constant.BLOCKED },
        ],
      });

      if (!query) {
        return res.status(SUCCESS).send({
          success: true,
          message: responseMessage.SOMETHING_WRONG("Data Not Found"),
          data: [],
        });
      }

      var array = [];
      query.map((a) => {
        array.push(a.group_id);
      });

      let searchGroupName = {};
      if (req.query.search) {
        searchGroupName = {
          group_name: {
            $regex: req.query.search ? req.query.search : "",
            $options: "i",
          },
        };
      }

      let pageNo = parseInt(req.query.pageNo) || ONE;
      let pageLimit = parseInt(req.query.pageLimit) || COUNT_TEN;
      if (pageNo <= ZERO_NUM) {
        throw { message: responseMessage.PAGE_INVALID };
      }

      let islocationFind = await groupModel.aggregate([
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
        { $match: searchGroupName },
        {
          $match: {
            _id: { $nin: array },
          },
        },
        {
          $match: {
            owner_id: {
              $ne: mongoose.Types.ObjectId(req.userId),
            },
          },
        },
        {
          $lookup: {
            from: "groupmembers",
            let: { id: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$group_id", "$$id"] },
                },
              },
              { $match: { status: JOIN_REQUEST } },
              {
                $match: {
                  user_id: mongoose.Types.ObjectId(req.userId),
                },
              },
            ],
            as: "groupMember",
          },
        },
        {
          $addFields: {
            isRequest: {
              $cond: { if: { $size: "$groupMember" }, then: true, else: false },
            },
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
        {
          $facet: {
            data: [
              { $skip: pageLimit * (pageNo - ONE) },
              { $limit: pageLimit },
            ],
            count: [
              {
                $count: "count",
              },
            ],
          },
        },
      ]);

      if (islocationFind && islocationFind[ZERO_NUM].data.length) {
        let totalData = await islocationFind[ZERO_NUM].count[ZERO_NUM].count;
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
          success: true,
          message: responseMessage.FOUND_SUCCESS("Item"),
          data: islocationFind[ZERO_NUM].data,
          totalCount: islocationFind[ZERO_NUM].count[ZERO_NUM].count,
          totalPages: tempPage,
          currentPage,
        });
      } else {
        res.status(SUCCESS).send({
          success: true,
          message: responseMessage.SOMETHING_WRONG("Data Not Found"),
          data: [],
        });      
      }
    }
  } catch (err) {
    await setResponseObject(req, false, responseMessage.SOMETHING_WENT_WRONG, "");
    next();
  }
};

/**
 * Search nearby by group name
 */
_group.searchNearbyGroup = async (req, res, next) => {
  try {
    var regex = new RegExp(req.query.group_name, "i");
    let query = await GroupMember.find({
      user_id: req.userId,
      $or: [
        { status: Constant.APPROVE },
        { status: Constant.PENDING },
        { status: Constant.BLOCKED },
      ],
    });
    var array = [];
    query.map((a) => {
      array.push(a.group_id);
    });

    let pageNo = parseInt(req.query.pageNo) || ONE;
    let pageLimit = parseInt(req.query.pageLimit) || COUNT_TEN;
    if (pageNo <= ZERO_NUM) {
      throw { message: responseMessage.PAGE_INVALID };
    }

    let islocationFind = await groupModel.aggregate([
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
          group_name: regex,
        },
      },
      {
        $match: {
          _id: { $nin: array },
        },
      },
      {
        $facet: {
          data: [{ $skip: pageLimit * (pageNo - ONE) }, { $limit: pageLimit }],
          count: [
            {
              $count: "count",
            },
          ],
        },
      },
    ]);

    if (!islocationFind[ZERO_NUM].data) {
      res.status(SUCCESS).send({
        success: true,
        message: responseMessage.SOMETHING_WRONG("Data Not Found"),
        data: [],
      });
    } else {
      if (!islocationFind[ZERO_NUM]) {
        res.status(SUCCESS).send({
          success: true,
          message: responseMessage.SOMETHING_WRONG("Data Not Found"),
          data: [],
        });
        return;
      }

      if (islocationFind[ZERO_NUM].count.length == ZERO_NUM) {
        res.status(SUCCESS).send({
          success: true,
          message: responseMessage.SOMETHING_WRONG("Data Not Found"),
          data: [],
        });
        return;
      }

      let totalData = await islocationFind[ZERO_NUM].count[ZERO_NUM].count;
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
        success: true,
        message: responseMessage.FOUND_SUCCESS("Item"),
        data: islocationFind[ZERO_NUM].data,
        totalCount: islocationFind[ZERO_NUM].count[ZERO_NUM].count,
        totalPages: tempPage,
        currentPage,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, responseMessage.SOMETHING_WENT_WRONG, "");
    next();
  }
};

/**
 * Search my group by its name
 */
_group.search = async (req, res, next) => {
  try {
    var regex = new RegExp(req.body.group_name, "i");
    let query = await GroupMember.find({
      user_id: req.userId,
      status: "Approve",
    });

    if (!query.length) {
      return res.status(statusCode.SUCCESS).send({
        success: true,
        message: responseMessage.SOMETHING_WRONG("Not Found"),
        data: [],
      });
    }

    var grpArray = [];
    query.map((a) => {
      grpArray.push(a.group_id);
    });

    if (!req.query.longitude || !req.query.latitude) {
      return res.status(200).send({
        success: true,
        message: responseMessage.SOMETHING_WRONG("Not Found"),
        data: [],
      });
    }

    let islocationFind = await groupModel.aggregate([
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
          group_name: regex,
        },
      },
      {
        $match: {
          _id: { $nin: grpArray },
        },
      },
    ]);
    if (!islocationFind) {
      return res.status(statusCode.SUCCESS).send({
        success: true,
        message: responseMessage.SOMETHING_WRONG("Not Found"),
        data: [],
      });
    } else {
      res.status(statusCode.SUCCESS).send({
        success: true,
        message: responseMessage.FOUND_SUCCESS("Group"),
        data: islocationFind,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 * Get item shared in group
 */
_group.getAllSharedItem = async (req, res, next) => {
  try {
    let query = await GroupItem.find();
    let grpItemArray = [];
    query.map((a) => {
      grpItemArray.push(a.item_id);
    });
    let isShared = await itemModel.find({
      _id: {
        $in: grpItemArray,
      },
    });
    if (isShared) {
      res.status(statusCode.SUCCESS).send({
        success: true,
        message: responseMessage.FOUND_SUCCESS("Shared item"),
        data: isShared,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 * Get item unshared in group
 */
_group.getAllUnsharedItem = async (req, res, next) => {
  try {
    let query = await GroupItem.find();
    let grpItemArray = [];
    query.map((a) => {
      grpItemArray.push(a.item_id);
    });
    let isShared = await itemModel.find({
      _id: {
        $nin: grpItemArray,
      },
    });
    if (!isShared) {
      res.status(statusCode.BAD_REQUEST).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG("SOMETHING_WRONG"),
      });
    } else {
      res.status(statusCode.SUCCESS).send({
        success: true,
        message: responseMessage.FOUND_SUCCESS("Shared item"),
        data: isShared,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 * Search from all group by name
 */
_group.searchall = async (req, res, next) => {
  try {
    var regex = new RegExp(req.body.group_name, "i");
    let isGroup = await groupModel.find({
      group_name: regex,
    });
    if (!isGroup) {
      res.status(statusCode.BAD_REQUEST).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG("No group found"),
      });
    } else {
      res.status(statusCode.SUCCESS).send({
        success: true,
        message: responseMessage.FOUND_SUCCESS("Group"),
        data: isGroup,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 * Item remove from group
 */
_group.removeItem = async (req, res, next) => {
  try {
    let query = await GroupItem.find({
      _id: req.body.item_id,
    });
    var array = [];
    query.map((a) => {
      array.push(a.group_id);
    });
    let query2 = await GroupMember.findOne({
      $and: [
        {
          group_id: req.body.group_id,
        },
        {
          group_id: {
            $eq: array,
          },
        },
      ],
      role: OWNER,
    });
    if (!query2) {
      let result = await GroupItem.findOneAndRemove({
        _id: req.body.item_id,
        createdBy: {
          $eq: req.userId,
        },
      });
      if (!result) {
        res.status(statusCode.BAD_REQUEST).send({
          success: false,
          message: responseMessage.SOMETHING_WRONG("Failed to remove"),
        });
      } else {
        let isItemSharedInAny = await GroupItem.findOne({
          item_id: req.body.postItemId,
        });
        if (!isItemSharedInAny) {
          let changeStatus = await itemModel.findOneAndUpdate(
            { _id: req.body.postItemId },
            { shared_level: Constant.AVALIABLE },
            { new: true }
          );
          res.status(statusCode.SUCCESS).send({
            success: true,
            message: responseMessage.ITEM_DELETE,
            data: result,
          });
        } else {
          res.status(statusCode.SUCCESS).send({
            success: true,
            message: responseMessage.ITEM_DELETE,
            data: result,
          });
        }
      }
    } else {
      let result = await GroupItem.findOneAndRemove({
        _id: req.body.item_id,
      });
      if (result) {
        let isItemSharedInAny = await GroupItem.findOne({
          item_id: req.body.postItemId,
        });
        if (!isItemSharedInAny) {
          let changeStatus = await itemModel.findOneAndUpdate(
            { _id: req.body.postItemId },
            { shared_level: Constant.AVALIABLE },
            { new: true }
          );
          res.status(statusCode.SUCCESS).send({
            success: true,
            message: responseMessage.ITEM_DELETE,
            data: result,
          });
        } else {
          res.status(statusCode.SUCCESS).send({
            success: true,
            message: responseMessage.ITEM_DELETE,
            data: result,
          });
        }
      }
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

module.exports = _group;
