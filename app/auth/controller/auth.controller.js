/*
@copyright : ToXSL Technologies Pvt. Ltd. < www.toxsl.com >
@author     : Shiv Charan Panjeta < shiv@toxsl.com >
 
All Rights Reserved.
Proprietary and confidential :  All information contained herein is, and remains
the property of ToXSL Technologies Pvt. Ltd. and its partners.
Unauthorized copying of this file, via any medium is strictly prohibited.
*/
const authModel = require("../model/auth.model");
const responseMessage = require("../../../middleware/responseMessage"); // for static response message
const bcrypt = require("bcrypt"); // bcrypt for encryption of password
const mongoose = require("mongoose"); // set rules for mongoose id
const jwt = require("jsonwebtoken");
const helper = require("../../../helpers/nodeMailer");
const statusCode = require("../../../middleware/statusCode");
const GroupMember = require("../../../app/group/model/membermodel");
const otpGenerator = require("otp-generator");
const multer = require("multer"); // for file save on server
const setResponseObject =
  require("../../../middleware/commonFunctions").setResponseObject;

const getOTP = require("../../../middleware/commonFunctions").getOTP;
const crypto = require("crypto");
const dir = "./upload/auth/";

const {
  ZERO,
  NOT_FOUND,
  BAD_REQUEST,
  SUCCESS,
  ZERO_NUM,
  MINUS_ONE,
  EMAIL_VERIFICATION,
  cryptkn,
} = require("../../../helpers/constant");

const commonFunction = require("../../../helpers/nodeMailer");

var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, new Date().getTime().toString() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  /* limits: {
    fileSize: 1 * 1024 * 1024,
  }, */
}).single("profile_image");

const _auth = {};

//auth signup
_auth.signup = async (req, res, next) => {
  try {
    let data = req.body;

    let query = {
      $and: [
        {
          $or: [{ email: req.body.email }, { phone_no: req.body.phone_no }],
        },
      ],
    };
    let isUserExist = await authModel.findOne(query);
    if (isUserExist) {
      if (isUserExist.phone_no == req.body.phone_no) {
        res
          .status(404)
          .send({ success: false, message: responseMessage.PHONE_EXIST });
      } else {
        res
          .status(404)
          .send({ success: false, message: responseMessage.EMAIL_EXIST });
      }
    } else {
      if (data.latitude && data.longitude) {
        data.location = {
          type: "Point",
          coordinates: [data.longitude, data.latitude],
        };
      }

      if (data.password) {
        let hash = await bcrypt.hash(
          // password bcrypt
          data.password,
          parseInt(process.env.SALT_ROUNDS)
        );
        data.password = hash;
      }

      var randomNumber = getOTP(4);
      data.verification_code = randomNumber;
      let saveSignupData = await new authModel(data).save();

      if (saveSignupData) {
        /** Send OTP on Phone */
        let contactNumber =
          saveSignupData.countryCode + saveSignupData.phone_no;
        let smsSend = await commonFunction.sendSMS(
          contactNumber,
          `Your OTP for verification is ${randomNumber}.Use this otp to verify its you.`
        );

        await setResponseObject(req, true, responseMessage.SIGNUP("signup"), {
          saveSignupData,
        });
        next();

        /** Send OTP on Email */
        let email = saveSignupData.email;
        let subject = "Account Verification";
        let html =
          "<p> Your OTP for verification is " +
          randomNumber +
          ". Use this otp to verify your account. </p>";
        let sendEmaolOTP = await helper.sendMail(email, subject, html);
      } else {
        await setResponseObject(
          req,
          true,
          responseMessage.SOMETHING_WRONG("Failed to signup")
        );
      }
    }
  } catch (err) {
    await setResponseObject(req, false, responseMessage.SOMETHING_WENT_WRONG, "");
    next();
  }
};

/**
 * PHONE NUMBER VERIFICATION
 * @param {phone_no,verification_code} req
 * @param {token} res
 */
_auth.verification = async (req, res, next) => {
  try {
    let data = req.body;
    let findData = await authModel.findOne({
      phone_no: req.body.phone_no,
      verification_code: req.body.verification_code,
    });
    if (!findData) {
      await setResponseObject(
        req,
        false,
        responseMessage.SOMETHING_WRONG("OTP is incorrect")
      );
      next();
    } else {
      let otpData = await authModel.findOneAndUpdate(
        {
          phone_no: req.body.phone_no,
          verification_code: req.body.verification_code,
        },
        {
          otp_verified: true,
          verification_code: 0,
          fcmToken: req.body.fcmToken,
        },
        { new: true }
      );

      let token_Data = {
        userId: findData._id,
      };
      jwt.sign(
        token_Data,
        process.env.JWT_SECRET,
        async (err, TokenGenerated) => {
          if (!err) {
            let saveToken = await authModel.findOneAndUpdate(
              { _id: findData._id },
              { token: TokenGenerated },
              { new: true }
            );
            res.json({
              message: "OTP Verified",
              token: TokenGenerated,
            });
          }
        }
      );
    }
  } catch (err) {
    await setResponseObject(
      req,
      false,
      responseMessage.SOMETHING_WRONG("Error while verifying")
    );
    next();
  }
};

/**
 * LOGIN API
 * @param { phone_no } req.body
 * @param { OTP } res
 */
_auth.signin = async (req, res, next) => {
  try {
    let phone_no = req.body.phone_no;
    let isUserExist = await authModel.findOne({
      phone_no,
      countryCode : req.body.countryCode
    });
    if (!isUserExist) {
      res.status(NOT_FOUND).send({
        success: false,
        message: responseMessage.USER_NOT_REGISTER,
      });
    } else {
      let data = req.body;
      var randomNumber = getOTP(4);
      data.verification_code = randomNumber;
      let signInData = await authModel.findOneAndUpdate(
        { phone_no: req.body.phone_no },
        data,
        { new: true }
      );
      if (!signInData) {
        res.status(statusCode.BAD_REQUEST).send({
          message: responseMessage.SOMETHING_WRONG("OTP not send"),
        });
      } else {
        /**
         * Send OTP on Mobile
         */
        let contactNumber = signInData.countryCode + signInData.phone_no;

        let smsSend = await commonFunction.sendSMS(
          contactNumber,
          `Your OTP for account login is ${randomNumber}. Use this OTP to verify.`
        );

        res.status(SUCCESS).send({
          success: true,
          message: responseMessage.OTP_SEND,
          signInData,
        });

        /** Send OTP on Email */
        let email = signInData.email;
        let subject = `Account Login`;
        let html =
          "<p> Your OTP for account login is " +
          randomNumber +
          ". Use this OTP to verify your account. </p>";
        // let sendEmailOTP = await helper.sendMail(email, subject, html);
      }
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

/**
 * GET ALL USER's
 * @param {group_id} req.body
 */
_auth.all = async (req, res, next) => {
  try {
    if (req.body.group_id == ZERO) {
      let result = await authModel
        .find({
          _id: { $ne: req.userId },
        })
        .sort({
          createdAt: MINUS_ONE,
        })
        .select("-token -fcmToken");
      if (!result) {
        res.status(NOT_FOUND).send({
          success: false,
          message: responseMessage.SOMETHING_WRONG("Data Not Found"),
        });
      } else {
        res.status(SUCCESS).send({
          success: true,
          message: responseMessage.FOUND_SUCCESS("Data"),
          result,
        });
      }
    } else {
      let query = await GroupMember.find({
        group_id: req.body.group_id,
      });
      var array = [];
      query.map((a) => {
        array.push(a.user_id);
      });

      let result = await authModel.aggregate([
        {
          $match: {
            _id: {
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
                  $expr: { $eq: ["$user_id", "$$id"] },
                },
              },
              {
                $match: {
                  group_id: mongoose.Types.ObjectId(req.body.group_id),
                },
              },
              {
                $match: {
                  status: { $ne: "Reject" },
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
        { $sort: { createdAt: MINUS_ONE } },
        {
          $project: {
            groupMember: ZERO_NUM,
            token: ZERO_NUM,
            fcmToken: ZERO_NUM,
          },
        },
        {
          $sort: {
            createdAt: MINUS_ONE,
          },
        },
      ]);
      if (!result) {
        res.status(NOT_FOUND).send({
          success: false,
          message: responseMessage.SOMETHING_WRONG("Data Not Found"),
        });
      } else {
        res.status(SUCCESS).send({
          success: true,
          message: responseMessage.FOUND_SUCCESS("Data"),
          result,
        });
      }
    }
  } catch (err) {
    await setResponseObject(req, false, responseMessage.SOMETHING_WENT_WRONG, "");
    next();
  }
};

/**
 * GET SINGLE USER DETAIL's
 * @param {user_id} req.params
 */
_auth.single = async (req, res) => {
  try {
    let result = await authModel
      .findById({
        _id: req.params.user_id,
      })
      .select("-token -fcmToken");
    if (!result) {
      res.status(404).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG("Data Not Found"),
      });
    } else {
      res.status(200).send({
        success: true,
        message: responseMessage.FOUND_SUCCESS("User"),
        data: result,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, "Something went wrong", "");
    next();
  }
};

//auth account verifyOtp
_auth.verifyOtp = async (req, res, next) => {
  try {
    if (0) {
      await setResponseObject(req, true, "OTP send successfully");
      next();
    } else {
      let otp = req.body.otp;
      delete req.body.otp;
      req.body.verification_code = otp;
      let verification_otp = await authModel.findOneAndUpdate(
        req.body,
        {
          verification_code: 0,
          status: true,
        },
        {
          new: true,
          useFindAndModify: false,
        }
      );

      if (!verification_otp) {
        await setResponseObject(
          req,
          true,
          responseMessage.SOMETHING_WRONG("INVALID OTP")
        );
        next();
      } else {
        let token_Data = {
          userId: verification_otp._id,
          email: verification_otp.email,
          first_name: verification_otp.first_name,
        };
        let token = jwt.sign(
          token_Data,
          process.env.JWT_SECRET,
          async (err, TokenGenerated) => {
            if (!err) {
              await setResponseObject(
                req,
                true,
                responseMessage.VERIFICATION("OTP verification"),
                TokenGenerated
              );
              next();
            }
          }
        );
      }
    }
  } catch (err) {
    await setResponseObject(req, false, "Something went wrong", "");
    next();
  }
};

//auth account update
_auth.update = async (req, res, next) => {
  try {
    if (0) {
      await setResponseObject(req, true, "Profile updated successfully", {
        _id: "5f6d80f06883141ca0989276",
        first_name: "abc",
        last_name: "john",
        email: "abc@gmail.com",
        phone_no: "76987907098",
        token: "as98duyf0jwef09asdv-0fakf-sd-fkas-d0kf-asdk",
      });
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
          let data = req.body;
          if (req.file) {
            data.profile_image = req.file.path;
          }

          if (data.latitude && data.longitude) {
            data.location = {
              type: "Point",
              coordinates: [data.longitude, data.latitude],
            };
          }

          let updateAuthUser = await authModel.findOneAndUpdate(
            { _id: req.userId },
            data,
            { new: true }
          );
          res.status(200).send({
            success: true,
            message: responseMessage.ADD_SUCCESS("updated"),
            data: updateAuthUser,
          });
          return;
        }
      });
    }
  } catch (err) {
    await setResponseObject(req, false, "Something went wrong", "");
    next();
  }
};

/**
 * Search user by first_name or  last_name
 */
_auth.searchUser = async (req, res, next) => {
  let query = {
    $or: [
      {
        first_name: req.body.first_name,
      },
      {
        last_name: req.body.last_name,
      },
    ],
  };
  try {
    if (req.body.first_name) {
      var regex = new RegExp(req.body.first_name, "i");
      let isUser = await authModel
        .find({
          first_name: regex,
        })
        .select("-token -fcmToken");
      if (!isUser) {
        res.status(NOT_FOUND).send({
          success: false,
          message: responseMessage.SOMETHING_WRONG("Data Not Found"),
        });
      } else {
        res.status(SUCCESS).send({
          success: true,
          message: responseMessage.FOUND_SUCCESS("User"),
          data: isUser,
        });
      }
    }
    if (req.body.last_name) {
      var regex = new RegExp(req.body.last_name, "i");
      let isUserLastName = await authModel.find({
        last_name: regex,
      });
      if (isUserLastName) {
        res.status(SUCCESS).send({
          success: true,
          message: responseMessage.FOUND_SUCCESS("User"),
          data: isUserLastName,
        });
      }
    }
  } catch (err) {
    await setResponseObject(req, false, "Something went wrong", "");
    next();
  }
};

/**
 * Delete user
 */
_auth.delete = async (req, res, next) => {
  try {
    await authModel.findOneAndRemove(
      {
        _id: req.body.user_id,
      },
      async (err, resp) => {
        if (err) {
          setResponseObject(req, false, err.message ? err.message : err, "");
          next();
        } else {
          let daleteData = await GroupMember.deleteMany({
            user_id: req.body.user_id,
          });
          res.status(SUCCESS).send({
            success: true,
            message: responseMessage.USER_DELETE,
            data: resp,
          });
        }
      }
    );
  } catch (err) {
    await setResponseObject(req, false, responseMessage.SOMETHING_WENT_WRONG, "");
    next();
  }
};

/**
 * Api to logout
 */
_auth.logout = async (req, res, next) => {
  try {
    let isUserLogout = await authModel.findOneAndUpdate(
      { _id: req.userId },
      { token: "", fcmToken: "" },
      { new: true }
    );
    if (isUserLogout) {
      res.status(statusCode.BAD_REQUEST).send({
        success: true,
        message: responseMessage.SUCCESS("Logout"),
        data: isUserLogout,
      });
    } else {
      res.status(statusCode.SUCCESS).send({
        success: true,
        message: responseMessage.SOMETHING_WRONG("Fail to logout"),
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message);
    next();
  }
};

/**
 * EMAIL VERIFICATION
 * @param {token, email_otp } req
 * @param {token} res
 */
_auth.emailVerify = async (req, res, next) => {
  try {
    let payloadData = req.body;
    /** Check User Exist With Token */
    let checkUser = await authModel.findOne({ _id: req.userId });
    /** CASE : User Not Exist */
    if (!checkUser) {
      res.status(statusCode.BAD_REQUEST).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG("User not found"),
      });
      return;
    }
    /** CASE : Email Not Exist */
    if (!checkUser.email) {
      res.status(statusCode.BAD_REQUEST).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG("Email not found"),
      });
      return;
    }
    /** CASE : If Exist
     *  Mark Email Verified `true`
     */
    if (checkUser.email_otp == payloadData.email_otp) {
      let isVerify = await authModel.findOneAndUpdate(
        {
          email: checkUser.email,
          email_otp: payloadData.email_otp,
        },
        {
          email_verified: true,
        },
        {
          new: true,
        }
      );
      res.status(SUCCESS).send({
        success: true,
        message: responseMessage.SUCCESS("Email verified"),
      });
    } else {
      /** CASE : Enter Incorrect OTP */
      res.status(BAD_REQUEST).send({
        success: false,
        message: responseMessage.SOMETHING_WRONG("Incorrect OTP"),
      });
    }
  } catch (err) {
    await setResponseObject(req, false, responseMessage.SOMETHING_WENT_WRONG);
    next();
  }
};

/**Send Verification Link On Email */
_auth.sendVerifyLink = async (req, res, next) => {
  try {
    let criteria = {
      _id: req.userId,
    };
    let token = crypto.randomBytes(cryptkn).toString("hex");
    const dataToSet = {
      $set: {
        emailToken: token,
      },
    };
    let option = { new: true };
    let userToUpdate = await authModel.findOneAndUpdate(
      criteria,
      dataToSet,
      option
    );
    if (!userToUpdate) {
      res.status(SUCCESS).send({
        success: false,
        message: responseMessage.LINK_NOT_SEND,
      });
      // next();
    } else {
      let email = userToUpdate.email;
      let subject = EMAIL_VERIFICATION;
      let link = process.env.SERVER_URL + "auth/verifyLink?token=" + token;
      let html = `<div><h3>Click following link for verify your email</h3>  <a href="${link}" target="_blank"> click here </a>`;

      let verifyEmail = await helper.sendMail(email, subject, html);

      res.status(SUCCESS).send({
        success: false,
        message: responseMessage.SUCCESS("Link send"),
        data: link,
      });
      // next();
    }
  } catch (err) {
    await setResponseObject(req, false, responseMessage.SOMETHING_WENT_WRONG);
    next();
  }
};

_auth.verifyLink = async (req, res, next) => {
  try {
    let criteria = {
      emailToken: req.query.token,
    };
    let user = await authModel.findOne(criteria);

    if(user){

    const dataToSet = {
      $set: {
        email_verified: true,
        // emailToken: null,
      },
    };
    const option = { new: true };

    let userToUpdate = await authModel.findOneAndUpdate(
      criteria,
      dataToSet,
      option
    );

      // res.sendfile("./public/verification.html");
    res.redirect(`https://www.cliqright.com/verification.html?status=success&name=`+user.first_name);

    } else {
      res.redirect(`https://www.cliqright.com/verification.html?status=fail&name=`);
    }

  } catch (err) {
    await setResponseObject(req, false, responseMessage.SOMETHING_WENT_WRONG);
    next();
  }
};

module.exports = _auth;
