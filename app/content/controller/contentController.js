/*
@copyright : ToXSL Technologies Pvt. Ltd. < www.toxsl.com >
@author     : Shiv Charan Panjeta < shiv@toxsl.com >
 
All Rights Reserved.
Proprietary and confidential :  All information contained herein is, and remains
the property of ToXSL Technologies Pvt. Ltd. and its partners.
Unauthorized copying of this file, via any medium is strictly prohibited.
*/

const content = require("../model/contentModel");
const setResponseObject =
  require("../../../middleware/commonFunctions").setResponseObject;
const responseMessage = require("../../../middleware/responseMessage"); //for static response messages
const constant = require("../../../helpers/constant");
const helper = require("../../../helpers/nodeMailer");
const authModel = require("../../auth/model/auth.model");

const _content = {};

/*
ADD CONTENT ADMIN PANEL
*/

_content.addContent = async (req, res, next) => {
  try {
    let data = req.body;
    data.added_by = req.userId;

    let addContent = await new content(data).save();

    if (!addContent) {
      res.send({
        success: false,
        statusCode: constant.failureStatus,
        message: responseMessage.ERROR_ON_SAVING,
      });
    } else {
      res.send({
        success: true,
        statusCode: constant.SUCCESS,
        message:
          "Thanks for contacting us! We will be in touch with you shortly.",
        data: addContent,
      });
      next();
      let User = await authModel.findOne({ _id: req.userId }).select("email");

      /** Send Email */
      let email = process.env.CONTACTUS_EMAIL;
      let subject = data.subject;
      // let html = data.description;
      let html = `<p>User Email: ${User.email}</p> <br/><p> Description: ${data.description}</p>`;
      let sendEmail = await helper.sendMailContactUs(email, subject, html);
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

/*
GET CONTENT ON ADMIN PANEL
*/

_content.getContent = async (req, res, next) => {
  try {
    let getData = await content.find();
    if (!getData) {
      res.send({
        success: false,
        statusCode: constant.failureStatus,
        message: responseMessage.RECORD_NOTFOUND("Content"),
      });
    } else {
      res.send({
        success: true,
        statusCode: constant.SUCCESS,
        message: responseMessage.RECORD_FOUND("Content"),
        data: getData,
      });
    }
  } catch (err) {
    await setResponseObject(req, false, err.message, "");
    next();
  }
};

module.exports = _content;
