e/*
@copyright : ToXSL Technologies Pvt. Ltd. < www.toxsl.com >
@author     : Shiv Charan Panjeta < shiv@toxsl.com >
 
All Rights Reserved.
Proprietary and confidential :  All information contained herein is, and remains
the property of ToXSL Technologies Pvt. Ltd. and its partners.
Unauthorized copying of this file, via any medium is strictly prohibited.
*/

const nodemailer = require("nodemailer");
var FCM = require("fcm-push");
const twilio = require("twilio");

const accountSid = "replaceTwilioToken";
const authToken = "replaceAuthToken";

const client = require("twilio")(accountSid, authToken);

module.exports = {
  sendSMS: (mobileNumber, body) => {
    console.log("mobileNumber   : ", mobileNumber, "  body   :  ", body);
    client.messages.create(
      {
        body: body,
        to: mobileNumber,
        from: "+13208531892",
      },
      (twilioErr, twilioResult) => {
        if (twilioErr) {
          console.log("Twillio error");
        } else {
          console.log("Twillio result", twilioResult);
        }
      }
    );
  },
