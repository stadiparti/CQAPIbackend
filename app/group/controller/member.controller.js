/*
@copyright : ToXSL Technologies Pvt. Ltd. < www.toxsl.com >
@author     : Shiv Charan Panjeta < shiv@toxsl.com >
 
All Rights Reserved.
Proprietary and confidential :  All information contained herein is, and remains
the property of ToXSL Technologies Pvt. Ltd. and its partners.
Unauthorized copying of this file, via any medium is strictly prohibited.
*/

const GroupMember = require("../model/membermodel");
const GroupItem = require("../model/group.item");
const mongoose = require("mongoose");
const Group = require("../model/group.model");
const responseMessage = require("../../../middleware/responseMessage");
const setResponseObject =
  require("../../../middleware/commonFunctions").setResponseObject;
const authModel = require("../../auth/model/auth.model");
const commonFunction = require("../../../helpers/nodeMailer");
const notification = require("../../notification/model/notification.model");
const groupModel = require("../model/group.model");
const Constant = require("../../../helpers/constant");
const {
  SUCCESS,
  BAD_REQUEST,
  NOT_FOUND,
  APPROVE,
  BLOCKED,
  JOIN_REQUEST,
  ZERO_NUM,
  MEMBER,
  ADMIN,
  PENDING,
  OWNER,
  ACTIVE,
  MINUS_ONE,
} = require("../../../helpers/constant");

const _member = {};

_member.addMemberNew = async (req, res, next) => {
  try {
    let groupArray = [];
    req.body.memberData.map((a) => {
      groupArray.push(a.group_id);
    });

    let findNoOfMember = await GroupMember.find({
      group_id: groupArray,
    }).countDocuments();
    if (findNoOfMember < Constant.MAX_NO_MEMBER_IN_GROUP) {
      await req.body.memberData.forEach(async (element) => {
        let groupData = await Group.findOne({ _id: element.group_id });
        let groupOwner = await authModel.findOne({ _id: groupData.owner_id });

        let checkExist = await GroupMember.findOne({
          group_id: element.group_id,
          user_id: element.user_id,
        });

        if (!checkExist) {
          let addMemberData = {
            group_id: element.group_id,
            user_id: element.user_id,
          };

          let addMember = await new GroupMember(addMemberData).save();

          let receiverUser = await authModel.findOne({ _id: element.user_id });
          if (addMember) {
            let pushNot = await commonFunction.memberNotification(
              receiverUser.fcmToken,
              "CliqRight",
              `${groupOwner.first_name} ${groupOwner.last_name} has invited you to join ${groupData.group_name} group`
            );
            let obj = {
              sendBy: req.userId,
              sendTo: element.user_id,
              title: "CliqRight",
              body: `${groupOwner.first_name} ${groupOwner.last_name} has invited you to join ${groupData.group_name} group`,
              message: `${groupOwner.first_name} ${groupOwner.last_name} has invited you to join ${groupData.group_name} group`,
              notificationType: "group_invitation",
            };

            let saveNotification = await notification.create(obj);

            res.status(SUCCESS).send({
              success: true,
              message: responseMessage.ADD_SUCCESS("Member"),
              addMember,
            });
            next();

            /**
             * Send SMS on Mobile
             */
            let contactNumber =
              receiverUser.countryCode || "+1" + receiverUser.phone_no;

            let smsSend = await commonFunction.sendSMS(
              contactNumber,
              `${groupOwner.first_name} ${groupOwner.last_name} has invited you to join ${groupData.group_name} group.`
            );

            /** Send on Email */
            let email = receiverUser.email;
            let subject = `Group Invitation`;
            let html = `<p> ${groupOwner.first_name} ${groupOwner.last_name} has invited you to join ${groupData.group_name} group </p>`;
            let sendEmail = await commonFunction.sendMail(email, subject, html);
          } else {
            res.status(BAD_REQUEST).send({
              success: false,
              message: responseMessage.SOMETHING_WRONG("Member Not Add"),
            });
          }
        } else {
          res.status(SUCCESS).send({
            success: true,
            message: responseMessage.ADD_SUCCESS("Member"),
          });
        }
      });

      /**
       * =========  Send Non-cliqright member invitation ==========
       */
      let link = process.env.PLAYSTORE_LINK;
      /** On Phone */
      if (req.body.nonMemberPhoneUser.length) {
        req.body.nonMemberPhoneUser.forEach(async (element) => {
          let contactNumber = element;
          let smsSends = await commonFunction.sendSMS(
            contactNumber,
            `You are invited to join + ${link} `
          );
        });
      }

      /** On Email */
      if (req.body.nonMemberEmailUser.length) {
        req.body.nonMemberEmailUser.forEach(async (element) => {
          let email = element;
          let subject = `Group Invitation`;
          let html = `<p> You are invited to join + ${link} </p>`;
          let sendEmail = await commonFunction.sendMail(email, subject, html);
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

_member.update = async (req, res) => {
  try {
    let data = req.body;
    let result = await GroupMember.findOneAndUpdate(
      { _id: req.params.member_id },
      data,
      { new: true }
    );
    if (!result) {
      return res.status(BAD_REQUEST).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG("Member Not Add"),
      });
    } else {
      return res.status(SUCCESS).send({
        success: true,
        message: responseMessage.UPDATE_SUCCESS("Member"),
        result,
      });
    }
  } catch (error) {
    return res.status(BAD_REQUEST).send({
      success: false,
      message: responseMessage.err.message,
    });
  }
};

_member.delete_member = async (req, res) => {
  try {
    await GroupMember.findOneAndRemove(
      {
        _id: req.params.member_id,
      },
      async (err, resp) => {
        if (err) {
          setResponseObject(req, false, err.message ? err.message : err, "");
          next();
        } else {
          let deleteBy = await authModel.findOne({ _id: req.userId });

          let deleteTo = await authModel.findOne({ _id: resp.user_id });

          let group = await Group.findOne({ _id: resp.group_id });

          let pushNot = await commonFunction.removeMemberNotification(
            deleteTo.fcmToken,
            "CliqRight",
            `${deleteBy.first_name} ${deleteBy.last_name} has removed you from:${group.group_name} group`
          );
          let obj = {
            sendBy: req.userId,
            sendTo: resp.user_id,
            title: "CliqRight",
            body: `${deleteBy.first_name} ${deleteBy.last_name} has removed you from:${group.group_name} group`,
            message: `${deleteBy.first_name} ${deleteBy.last_name} has removed you from:${group.group_name} group`,
            notificationType: "remove_user",
          };

          let saveNotification = await new notification(obj).save();
          res.status(SUCCESS).send({
            success: true,
            message: responseMessage.GROUP_MEMBER_REMOVE,
            data: resp,
          });
        }
      }
    );
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

_member.getMemberByGroup = async (req, res, next) => {
  try {
    let group_members = await GroupMember.find({
      group_id: { $eq: req.params.group_id },
      $or: [
        {
          status: APPROVE,
        },
        {
          status: BLOCKED,
        },
      ],
    }).populate({
      path: "user_id",
      select: "-token -fcmToken",
    });
    if (!group_members) {
      res.status(Constant.BAD_REQUEST).send({
        success: false,
        message: responseMessage.GROUP_MEMBER_NOT_FOUND,
      });
    } else {
      res.status(Constant.SUCCESS).send({
        success: true,
        message: responseMessage.FOUND_SUCCESS("Group member"),
        data: group_members,
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
 * Get Group Pending Request
 */
_member.getPendingMember = async (req, res, next) => {
  try {
    let group_members = await GroupMember.find({
      group_id: req.params.group_id,
      status: PENDING,
    }).populate({
      path: "user_id",
      select: "-token -fcmToken",
    });
    // .populate("user_id");
    if (!group_members) {
      res.status(Constant.BAD_REQUEST).send({
        success: false,
        message: responseMessage.PENDING_GROUP_MEMBER_NOT_FOUND,
      });
    } else {
      res.status(Constant.SUCCESS).send({
        success: true,
        message: responseMessage.FOUND_SUCCESS("Pending members"),
        data: group_members,
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
 * Make group admin
 */
_member.makeGroupAdmin = async (req, res, next) => {
  try {
    const maximumNumberOfAdmin = 10;
    if (req.body.role == ADMIN) {
      let data = req.body;
      data.role = ADMIN;
      data.updatedBy = req.userId;
      //condition check
      let findGroupId = await GroupMember.find({
        _id: req.params.member_id,
      });
      var array = [];
      findGroupId.map((a) => {
        array.push(a.group_id);
      });
      let adminCount = await GroupMember.find({
        group_id: array,
        role: ADMIN,
      }).countDocuments();
      if (adminCount <= maximumNumberOfAdmin) {
        let isAdmin = await GroupMember.findOneAndUpdate(
          {
            _id: req.params.member_id,
          },
          data,
          {
            new: true,
          }
        );
        if (!isAdmin) {
          res.status(BAD_REQUEST).send({
            success: false,
            message: responseMessage.MINIMUM_ADMIN_GROUP_REQUIRED,
          });
        } else {
          res.status(SUCCESS).send({
            success: true,
            message: responseMessage.ADMIN,
            data: isAdmin,
          });
        }
      } else {
        res.status(BAD_REQUEST).send({
          success: false,
          message: responseMessage.ADMIN_LIMIT_EXCEED,
        });
      }
    } else {
      // Remove Admin
      let removeAdmin = await GroupMember.findOneAndUpdate(
        {
          _id: req.params.member_id,
        },
        {
          role: MEMBER, //req.body.role
        },
        {
          new: true,
        }
      );
      if (!removeAdmin) {
        res.status(BAD_REQUEST).send({
          success: false,
          message: responseMessage.ADMIN_REMOVED_FAIL,
        });
      } else {
        res.status(SUCCESS).send({
          success: true,
          message: responseMessage.ADMIN_REMOVED,
          data: removeAdmin,
        });
      }
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 *  Member Leave Group
 */
_member.leaveGroup = async (req, res, next) => {
  try {
    const minimumNumberOfAdmin = 1;
    let query = await GroupMember.findOne({
      user_id: req.userId,
      group_id: req.body.group_id,
    });
    if (query.role == ADMIN) {
      let adminCount = await GroupMember.find({
        group_id: req.body.group_id,
        role: ADMIN,
      }).countDocuments();
      if (adminCount > minimumNumberOfAdmin) {
        let isLeft = await GroupMember.findOneAndRemove({
          user_id: req.userId,
          group_id: req.body.group_id,
        });
        if (isLeft) {
          let memberData = await GroupMember.find({
            group_id: req.body.group_id,
          });

          let userArray = [];
          memberData.map((a) => {
            userArray.push(a.user_id);
          });

          let receiverUser = await authModel.find({ _id: { $in: userArray } });

          let senderUser = await authModel.findOne({ _id: req.userId });

          let groupData = await groupModel.findOne({ _id: req.body.group_id });

          receiverUser.forEach(async (element) => {
            let pushNot = await commonFunction.memberLeaveNotification(
              element.fcmToken,
              "CliqRight",
              `${senderUser.first_name} ${senderUser.last_name} has left ${groupData.group_name} group`,
              groupData._id,
              groupData.image
            );
            let obj = {
              sendBy: req.userId,
              sendTo: element._id,
              title: "CliqRight",
              body: `${senderUser.first_name} ${senderUser.last_name} has left ${groupData.group_name} group`,
              message: `${senderUser.first_name} ${senderUser.last_name} has left ${groupData.group_name} group`,
              notificationType: "group_leave",
              group_id: groupData._id,
              image: groupData.image,
            };

            let saveNotification = await notification.create(obj);
          });

          await GroupItem.deleteMany({
            createdBy: req.userId,
            group_id: req.body.group_id,
          });
          res.status(SUCCESS).send({
            success: true,
            message: responseMessage.GROUP_LEFT,
            data: isLeft,
          });
        }
      } else {
        res.status(BAD_REQUEST).send({
          success: false,
          message: responseMessage.MINIMUM_ADMIN_GROUP_REQUIRED,
        });
      }
    } else if (query.role == OWNER) {
      let adminCount = await GroupMember.find({
        group_id: req.body.group_id,
        role: ADMIN,
      }).countDocuments();
      if (adminCount >= minimumNumberOfAdmin) {
        let isLeft = await GroupMember.findOneAndRemove({
          user_id: req.userId,
          group_id: req.body.group_id,
        });
        if (isLeft) {
          let memberData = await GroupMember.find({
            group_id: req.body.group_id,
          });

          let userArray = [];
          memberData.map((a) => {
            userArray.push(a.user_id);
          });

          let receiverUser = await authModel.find({ _id: { $in: userArray } });

          let senderUser = await authModel.findOne({ _id: req.userId });

          let groupData = await groupModel.findOne({ _id: req.body.group_id });

          receiverUser.forEach(async (element) => {
            let pushNot = await commonFunction.memberLeaveNotification(
              element.fcmToken,
              "CliqRight",
              `${senderUser.first_name} ${senderUser.last_name} has left ${groupData.group_name} group`,
              groupData._id,
              groupData.image
            );
            let obj = {
              sendBy: req.userId,
              sendTo: element._id,
              title: "CliqRight",
              body: `${senderUser.first_name} ${senderUser.last_name} has left ${groupData.group_name} group`,
              message: `${senderUser.first_name} ${senderUser.last_name} has left ${groupData.group_name} group`,
              notificationType: "group_leave",
              group_id: groupData._id,
              image: groupData.image,
            };

            let saveNotification = await notification.create(obj);
          });

          await GroupItem.deleteMany({
            createdBy: req.userId,
            group_id: req.body.group_id,
          });
          res.status(SUCCESS).send({
            success: true,
            message: responseMessage.GROUP_LEFT,
            data: isLeft,
          });
        }
      } else {
        res.status(BAD_REQUEST).send({
          success: false,
          message: responseMessage.MINIMUM_ADMIN_GROUP_REQUIRED,
        });
      }
    } else {
      let isLeft = await GroupMember.findOneAndRemove(
        {
          user_id: req.userId,
          group_id: req.body.group_id,
        },
        {
          useFindAndModify: false,
        }
      );
      if (!isLeft) {
        res.status(BAD_REQUEST).send({
          success: false,
          message: responseMessage.SOMETHING_WRONG("Failed to left group"),
        });
      } else {
        let memberData = await GroupMember.find({
          group_id: req.body.group_id,
        });

        let userArray = [];
        memberData.map((a) => {
          userArray.push(a.user_id);
        });

        let receiverUser = await authModel.find({ _id: { $in: userArray } });

        let senderUser = await authModel.findOne({ _id: req.userId });

        let groupData = await groupModel.findOne({ _id: req.body.group_id });

        receiverUser.forEach(async (element) => {
          let pushNot = await commonFunction.memberLeaveNotification(
            element.fcmToken,
            "CliqRight",
            `${senderUser.first_name} ${senderUser.last_name} has left ${groupData.group_name} group`,
            groupData._id,
            groupData.image
          );
          let obj = {
            sendBy: req.userId,
            sendTo: element._id,
            title: "CliqRight",
            body: `${senderUser.first_name} ${senderUser.last_name} has left ${groupData.group_name} group`,
            message: `${senderUser.first_name} ${senderUser.last_name} has left ${groupData.group_name} group`,
            notificationType: "group_leave",
            group_id: groupData._id,
            image: groupData.image,
          };

          let saveNotification = await notification.create(obj);
        });

        let deleteData = await GroupItem.deleteMany({
          createdBy: req.userId,
          group_id: req.body.group_id,
        });
        res.status(SUCCESS).send({
          success: true,
          message: responseMessage.GROUP_LEFT,
          data: isLeft,
        });
      }
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 * Group request accepted by user
 */
_member.requestAcceptByUser = async (req, res, next) => {
  try {
    let isAccept = await GroupMember.findOneAndUpdate(
      {
        _id: req.params.member_id,
      },
      {
        status: APPROVE,
      },
      {
        new: true,
      }
    );
    if (!isAccept) {
      res.status(NOT_FOUND).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG("Failed to accept request"),
      });
    } else {
      let groupData = await GroupMember.findOne({
        group_id: isAccept.group_id,
        role: { $in: ["Owner", "Admin"] },
      });

      let groupModel = await Group.findOne({ _id: groupData.group_id });

      let groupOwner = await authModel.findOne({ _id: groupData.user_id });

      let senderUser = await authModel.findOne({ _id: req.userId });

      let pushNot = await commonFunction.groupAcceptNotification(
        groupOwner.fcmToken,
        "CliqRight",
        `${senderUser.first_name} ${senderUser.last_name} has accepted your request`,
        groupModel._id,
        groupModel.image
      );
      let obj = {
        sendBy: req.userId,
        sendTo: groupData.user_id,
        title: "CliqRight",
        body: `${senderUser.first_name} ${senderUser.last_name} has accepted your request`,
        message: `${senderUser.first_name} ${senderUser.last_name} has accepted your request`,
        notificationType: "group_invitation_accept",
        group_id: groupModel._id,
        image: groupModel.image,
      };
      let isresults = await new notification(obj).save();
      if (isresults) {
        res.status(SUCCESS).send({
          success: true,
          message: responseMessage.REQUEST_ACCEPT,
          data: isAccept,
        });
      }
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 * Group request reject by user
 */
_member.requestRejectByUser = async (req, res, next) => {
  try {
    let isAccept = await GroupMember.findOneAndRemove({
      _id: req.params.member_id,
    });
    if (!isAccept) {
      res.status(NOT_FOUND).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG("Failed to reject request"),
      });
    } else {
      let groupData = await GroupMember.findOne({
        group_id: isAccept.group_id,
        role: { $in: ["Owner", "Admin"] },
      });

      let groupModel = await Group.findOne({ _id: groupData.group_id });

      let groupOwner = await authModel.findOne({ _id: groupData.user_id });

      let senderUser = await authModel.findOne({ _id: req.userId });

      let pushNot = await commonFunction.groupRejectNotification(
        groupOwner.fcmToken,
        "CliqRight",
        `${senderUser.first_name} ${senderUser.last_name} has rejected your request`,
        groupModel._id,
        groupModel.image
      );

      let obj = {
        sendBy: req.userId,
        sendTo: groupData.user_id,
        title: "CliqRight",
        body: `${senderUser.first_name} ${senderUser.last_name} has rejected your request`,
        message: `${senderUser.first_name} ${senderUser.last_name} has rejected your request`,
        notificationType: "group_invitation_reject",
        group_id: groupModel._id,
        image: groupModel.image,
      };
      let isresults = await new notification(obj).save();

      res.status(SUCCESS).send({
        success: true,
        message: responseMessage.REQUEST_REJECT,
        data: isAccept,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 * Find group request by user
 */
_member.myrequest = async (req, res, next) => {
  try {
    // search
    let searchGroupName = {};
    if (req.query.search) {
      searchGroupName = {
        "group_id.group_name": {
          $regex: req.query.search ? req.query.search : "",
          $options: "i",
        },
      };
    }

    // Pagination
    let pageNo = parseInt(req.query.pageNo) || Constant.ONE;
    let pageLimit = parseInt(req.query.pageLimit) || Constant.COUNT_TEN;
    if (pageNo <= Constant.ZERO_NUM) {
      throw { message: responseMessage.PAGE_INVALID };
    }

    let isAnyRequest = await GroupMember.aggregate([
      {
        $match: {
          $and: [
            { user_id: mongoose.Types.ObjectId(req.userId) },
            { status: Constant.PENDING },
          ],
        },
      },
      {
        $lookup: {
          from: "groups",
          let: { id: "$group_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$id"] },
              },
            },
          ],
          as: "group_id",
        },
      },
      { $unwind: "$group_id" },
      { $match: searchGroupName },
      {
        $facet: {
          data: [{ $skip: pageLimit * (pageNo - 1) }, { $limit: pageLimit }],
          count: [
            {
              $count: "count",
            },
          ],
        },
      },
    ]);

    if (isAnyRequest && isAnyRequest[0].data.length) {
      let totalCount = isAnyRequest[0].count[0].count;
      let currentPage = await parseInt(req.query.pageNo);
      var tempPage = 1;
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
        data: isAnyRequest[0].data,
        totalCount,
        totalPage: tempPage,
        currentPage,
      });
    } else {
      res.status(200).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG("Request not found."),
        data: [],
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 * Search Group Request
 */
_member.searchGroupRequest = async (req, res, next) => {
  try {
    var regex = new RegExp(req.body.group_name, "i");
    let isGroup = await Group.find({
      group_name: regex,
    });
    var grpArray = [];
    isGroup.map((a) => {
      grpArray.push(a._id);
    });
    let result = await GroupMember.find({
      user_id: req.userId,
      status: PENDING,
      group_id: {
        $in: grpArray,
      },
    })
      .populate("group_id")
      .sort({
        createdAt: MINUS_ONE,
      });
    if (!result) {
      res.status(NOT_FOUND).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG("Failed to find request"),
      });
    } else {
      res.status(SUCCESS).send({
        success: true,
        message: responseMessage.FOUND_SUCCESS("Group"),
        data: result,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 * Blocked Groupmember
 */
_member.blockUser = async (req, res, next) => {
  try {
    if (req.body.status == BLOCKED) {
      let data = req.body;
      let isUserBlocked = await GroupMember.findOneAndUpdate(
        {
          group_id: req.body.group_id,
          user_id: req.body.user_id,
        },
        { status: BLOCKED }, //"Blocked"  "Approve"
        { new: true }
      );
      if (!isUserBlocked) {
        res.status(BAD_REQUEST).send({
          success: false,
          message: responseMessage.BLOCKED_ERR,
        });
      } else {
        let changeStatus = await GroupItem.findOneAndUpdate(
          {
            group_id: req.body.group_id,
            createdBy: req.body.user_id,
          },
          { status: BLOCKED },
          { new: true }
        );

        res.status(SUCCESS).send({
          success: true,
          message: responseMessage.BLOCKED_SUCCESS,
          data: isUserBlocked,
        });
      }
    } else {
      // Unblock
      let data = req.body;
      let isUserUnblocked = await GroupMember.findOneAndUpdate(
        {
          group_id: req.body.group_id,
          user_id: req.body.user_id,
        },
        { status: APPROVE }, //  "Approve"
        { new: true }
      );
      if (!isUserUnblocked) {
        res.status(BAD_REQUEST).send({
          success: false,
          message: responseMessage.UNBLOCKED_ERR,
        });
      } else {
        let changeStatus = await GroupItem.findOneAndUpdate(
          {
            group_id: req.body.group_id,
            createdBy: req.body.user_id,
          },
          { status: ACTIVE },
          { new: true }
        );

        res.status(SUCCESS).send({
          success: true,
          message: responseMessage.UNBLOCKED_SUCCESS,
          data: isUserUnblocked,
        });
      }
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

//d
_member.removeItem = async (req, res, next) => {
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

module.exports = _member;
