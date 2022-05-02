/*
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

const accountSid = "AC92799ccb3423cc1daacd2585e54700d0";
const authToken = "0ba37c9ba40de7e79a1922c756b95e72";

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

  /**
   * Node Mailer :
   */
  async sendMail(to, subject, html) {
    const transporter = nodemailer.createTransport({
      // create smtp protocol values
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASSWORD,
      },
    });

    let mailOptions = {
      // set data for mail options
      from: process.env.AUTH_EMAIL,
      to: to,
      subject: subject,
      html: html,
    };
    // console.log("mailOptions",mailOptions)
    return new Promise(function (resolve, reject) {
      // use send mail function to send mail to other user
      transporter.sendMail(mailOptions, (err, res) => {
        if (err) {
          reject(Error(err.Error));
        } else {
          // else send success into resolve
          resolve(0);
        }
      });
    });
  },

  // Only case of -
  async sendMailContactUs(to, subject, html) {
    const transporter = nodemailer.createTransport({
      // create smtp protocol values
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASSWORD,
      },
    });

    let mailOptions = {
      // set data for mail options
      from: process.env.AUTH_EMAIL,
      to: to,
      subject: subject,
      html: html,
    };
    return new Promise(function (resolve, reject) {
      // use send mail function to send mail to other user
      transporter.sendMail(mailOptions, (err, res) => {
        if (err) {
          reject(Error(err.Error));
        } else {
          // else send success into resolve
          resolve(0);
        }
      });
    });
  },

  pushNotification: (
    deviceTokens,
    title,
    body,
    chatId,
    senderId,
    receiverId,
    itemId,
    cover_image,
    receiverImage,
    receiverName
  ) => {
    var serverKey =
      "AAAAYvDjzPI:APA91bGdaNOQwicnCLLy4aXy4gPFDdSK0Txoe7tEVny70vfQybJJNVBTqldbf3VVCN4vkZNB8fsrEpFqws5KwSKMYoYiK_FWzIw-kANQPshnll5ur421vcnKEsjcxmzYn_SdQpREvLr7";
    var fcm = new FCM(serverKey);

    var message = {
      to: deviceTokens,
      content_available: true,
      collapse_key: "your_collapse_key",
      data: {
        your_custom_data_key: "socket",
        chatId: chatId,
        senderId: senderId,
        receiverId: receiverId,
        sound: "default",
        itemId: itemId,
        cover_image: cover_image,
        receiverImage: receiverImage,
        receiverName: receiverName,
      },
      notification: {
        title: title,
        body: body,
      },
    };

    fcm.send(message, function (err, response) {
      if (err) {
        console.log("Notification error", err);
      } else {
        console.log("Notification send successfully", response);
      }
    });
  },

  itemRequestNotification: (deviceTokens, title, body, isborrowed, itemid) => {
    var serverKey =
      "AAAAYvDjzPI:APA91bGdaNOQwicnCLLy4aXy4gPFDdSK0Txoe7tEVny70vfQybJJNVBTqldbf3VVCN4vkZNB8fsrEpFqws5KwSKMYoYiK_FWzIw-kANQPshnll5ur421vcnKEsjcxmzYn_SdQpREvLr7";
    var fcm = new FCM(serverKey);

    var message = {
      to: deviceTokens,
      content_available: true,
      collapse_key: "your_collapse_key",
      data: {
        your_custom_data_key: "item_request",
        isborrowed: isborrowed,
        itemid: itemid,
      },
      notification: {
        title: title,
        body: body,
      },
    };
    fcm.send(message, function (err, response) {
      if (err) {
        console.log("Notification error", err);
      } else {
        console.log("Notification send successfully", response);
      }
    });
  },
  acceptNotification: (deviceTokens, title, body, reqId, itemid, status) => {
    var serverKey =
      "AAAAYvDjzPI:APA91bGdaNOQwicnCLLy4aXy4gPFDdSK0Txoe7tEVny70vfQybJJNVBTqldbf3VVCN4vkZNB8fsrEpFqws5KwSKMYoYiK_FWzIw-kANQPshnll5ur421vcnKEsjcxmzYn_SdQpREvLr7";
    var fcm = new FCM(serverKey);

    var message = {
      to: deviceTokens,
      content_available: true,
      collapse_key: "your_collapse_key",
      data: {
        your_custom_data_key: "item_request_accept",
        reqId: reqId,
        itemid: itemid,
        status: status,
      },
      notification: {
        title: title,
        body: body,
      },
    };
    fcm.send(message, function (err, response) {
      if (err) {
        console.log("Notification error", err);
      } else {
        console.log("Notification send successfully", response);
      }
    });
  },

  rejectNotification: (deviceTokens, title, body, itemId) => {
    var serverKey =
      "AAAAYvDjzPI:APA91bGdaNOQwicnCLLy4aXy4gPFDdSK0Txoe7tEVny70vfQybJJNVBTqldbf3VVCN4vkZNB8fsrEpFqws5KwSKMYoYiK_FWzIw-kANQPshnll5ur421vcnKEsjcxmzYn_SdQpREvLr7";
    var fcm = new FCM(serverKey);

    var message = {
      to: deviceTokens,
      content_available: true,
      collapse_key: "your_collapse_key",
      data: {
        your_custom_data_key: "item_request_reject",
        itemId: itemId,
      },
      notification: {
        title: title,
        body: body,
      },
    };
    fcm.send(message, function (err, response) {
      if (err) {
        console.log("Notification error", err);
      } else {
        console.log("Notification send successfully", response);
      }
    });
  },
  memberNotification: (deviceTokens, title, body) => {
    var serverKey =
      "AAAAYvDjzPI:APA91bGdaNOQwicnCLLy4aXy4gPFDdSK0Txoe7tEVny70vfQybJJNVBTqldbf3VVCN4vkZNB8fsrEpFqws5KwSKMYoYiK_FWzIw-kANQPshnll5ur421vcnKEsjcxmzYn_SdQpREvLr7";
    var fcm = new FCM(serverKey);

    var message = {
      to: deviceTokens,
      content_available: true,
      collapse_key: "your_collapse_key",
      data: {
        your_custom_data_key: "group_invitation",
      },
      notification: {
        title: title,
        body: body,
      },
    };
    fcm.send(message, function (err, response) {
      if (err) {
        console.log("Notification error", err);
      } else {
        console.log("Notification send successfully", response);
      }
    });
  },
  memberLeaveNotification: (deviceTokens, title, body, group_id, image) => {
    var serverKey =
      "AAAAYvDjzPI:APA91bGdaNOQwicnCLLy4aXy4gPFDdSK0Txoe7tEVny70vfQybJJNVBTqldbf3VVCN4vkZNB8fsrEpFqws5KwSKMYoYiK_FWzIw-kANQPshnll5ur421vcnKEsjcxmzYn_SdQpREvLr7";
    var fcm = new FCM(serverKey);

    var message = {
      to: deviceTokens,
      content_available: true,
      collapse_key: "your_collapse_key",
      data: {
        your_custom_data_key: "group_leave",
        group_id: group_id,
        image: image,
      },
      notification: {
        title: title,
        body: body,
      },
    };
    fcm.send(message, function (err, response) {
      if (err) {
        console.log("Notification error", err);
      } else {
        console.log("Notification send successfully", response);
      }
    });
  },

  groupJoinNotification: (deviceTokens, title, body, group_id, image) => {
    var serverKey =
      "AAAAYvDjzPI:APA91bGdaNOQwicnCLLy4aXy4gPFDdSK0Txoe7tEVny70vfQybJJNVBTqldbf3VVCN4vkZNB8fsrEpFqws5KwSKMYoYiK_FWzIw-kANQPshnll5ur421vcnKEsjcxmzYn_SdQpREvLr7";
    var fcm = new FCM(serverKey);

    var message = {
      to: deviceTokens,
      content_available: true,
      collapse_key: "your_collapse_key",
      data: {
        your_custom_data_key: "group_join",
        group_id: group_id,
        image: image,
      },
      notification: {
        title: title,
        body: body,
      },
    };
    fcm.send(message, function (err, response) {
      if (err) {
        console.log("Notification error", err);
      } else {
        console.log("Notification send successfully", response);
      }
    });
  },

  group_reject: (deviceTokens, title, body, group_id, image) => {
    var serverKey =
      "AAAAYvDjzPI:APA91bGdaNOQwicnCLLy4aXy4gPFDdSK0Txoe7tEVny70vfQybJJNVBTqldbf3VVCN4vkZNB8fsrEpFqws5KwSKMYoYiK_FWzIw-kANQPshnll5ur421vcnKEsjcxmzYn_SdQpREvLr7";
    var fcm = new FCM(serverKey);

    var message = {
      to: deviceTokens,
      content_available: true,
      collapse_key: "your_collapse_key",
      data: {
        your_custom_data_key: "group_join_reject",
        group_id: group_id,
        image: image,
      },
      notification: {
        title: title,
        body: body,
      },
    };
    fcm.send(message, function (err, response) {
      if (err) {
        console.log("Notification error", err);
      } else {
        console.log("Notification send successfully", response);
      }
    });
  },
  groupAcceptNotification: (deviceTokens, title, body, group_id, image) => {
    var serverKey =
      "AAAAYvDjzPI:APA91bGdaNOQwicnCLLy4aXy4gPFDdSK0Txoe7tEVny70vfQybJJNVBTqldbf3VVCN4vkZNB8fsrEpFqws5KwSKMYoYiK_FWzIw-kANQPshnll5ur421vcnKEsjcxmzYn_SdQpREvLr7";
    var fcm = new FCM(serverKey);

    var message = {
      to: deviceTokens,
      content_available: true,
      collapse_key: "your_collapse_key",
      data: {
        your_custom_data_key: "group_invitation_accept",
        group_id: group_id,
        image: image,
      },
      notification: {
        title: title,
        body: body,
      },
    };
    fcm.send(message, function (err, response) {
      if (err) {
        console.log("Notification error", err);
      } else {
        console.log("Notification send successfully", response);
      }
    });
  },

  groupRejectNotification: (deviceTokens, title, body, group_id, image) => {
    var serverKey =
      "AAAAYvDjzPI:APA91bGdaNOQwicnCLLy4aXy4gPFDdSK0Txoe7tEVny70vfQybJJNVBTqldbf3VVCN4vkZNB8fsrEpFqws5KwSKMYoYiK_FWzIw-kANQPshnll5ur421vcnKEsjcxmzYn_SdQpREvLr7";
    var fcm = new FCM(serverKey);

    var message = {
      to: deviceTokens,
      content_available: true,
      collapse_key: "your_collapse_key",
      data: {
        your_custom_data_key: "group_invitation_reject",
        group_id: group_id,
        image: image,
      },
      notification: {
        title: title,
        body: body,
      },
    };
    fcm.send(message, function (err, response) {
      if (err) {
        console.log("Notification error", err);
      } else {
        console.log("Notification send successfully", response);
      }
    });
  },
  groupRequestNotification: (deviceTokens, title, body, group_id, image) => {
    var serverKey =
      "AAAAYvDjzPI:APA91bGdaNOQwicnCLLy4aXy4gPFDdSK0Txoe7tEVny70vfQybJJNVBTqldbf3VVCN4vkZNB8fsrEpFqws5KwSKMYoYiK_FWzIw-kANQPshnll5ur421vcnKEsjcxmzYn_SdQpREvLr7";
    var fcm = new FCM(serverKey);

    var message = {
      to: deviceTokens,
      content_available: true,
      collapse_key: "your_collapse_key",
      data: {
        your_custom_data_key: "group_request",
        group_id: group_id,
        image: image,
      },
      notification: {
        title: title,
        body: body,
      },
    };
    fcm.send(message, function (err, response) {
      if (err) {
        console.log("Notification error", err);
      } else {
        console.log("Notification send successfully", response);
      }
    });
  },

  groupRejectNotificationUser: (deviceTokens, title, body, group_id, image) => {
    var serverKey =
      "AAAAYvDjzPI:APA91bGdaNOQwicnCLLy4aXy4gPFDdSK0Txoe7tEVny70vfQybJJNVBTqldbf3VVCN4vkZNB8fsrEpFqws5KwSKMYoYiK_FWzIw-kANQPshnll5ur421vcnKEsjcxmzYn_SdQpREvLr7";
    var fcm = new FCM(serverKey);

    var message = {
      to: deviceTokens,
      content_available: true,
      collapse_key: "your_collapse_key",
      data: {
        your_custom_data_key: "group_reject",
        group_id: group_id,
        image: image,
      },
      notification: {
        title: title,
        body: body,
      },
    };
    fcm.send(message, function (err, response) {
      if (err) {
        console.log("Notification error", err);
      } else {
        console.log("Notification send successfully", response);
      }
    });
  },

  blockNotification: (deviceTokens, title, body) => {
    var serverKey =
      "AAAAYvDjzPI:APA91bGdaNOQwicnCLLy4aXy4gPFDdSK0Txoe7tEVny70vfQybJJNVBTqldbf3VVCN4vkZNB8fsrEpFqws5KwSKMYoYiK_FWzIw-kANQPshnll5ur421vcnKEsjcxmzYn_SdQpREvLr7";
    var fcm = new FCM(serverKey);

    var message = {
      to: deviceTokens,
      content_available: true,
      collapse_key: "your_collapse_key",
      data: {
        your_custom_data_key: "block_user",
      },
      notification: {
        title: title,
        body: body,
      },
    };
    fcm.send(message, function (err, response) {
      if (err) {
        console.log("Notification error", err);
      } else {
        console.log("Notification send successfully", response);
      }
    });
  },

  unblockNotification: (deviceTokens, title, body, group_id, image) => {
    var serverKey =
      "AAAAYvDjzPI:APA91bGdaNOQwicnCLLy4aXy4gPFDdSK0Txoe7tEVny70vfQybJJNVBTqldbf3VVCN4vkZNB8fsrEpFqws5KwSKMYoYiK_FWzIw-kANQPshnll5ur421vcnKEsjcxmzYn_SdQpREvLr7";
    var fcm = new FCM(serverKey);

    var message = {
      to: deviceTokens,
      content_available: true,
      collapse_key: "your_collapse_key",
      data: {
        your_custom_data_key: "unblock_user",
        group_id: group_id,
        image: image,
      },
      notification: {
        title: title,
        body: body,
      },
    };
    fcm.send(message, function (err, response) {
      if (err) {
        console.log("Notification error", err);
      } else {
        console.log("Notification send successfully", response);
      }
    });
  },
  removeMemberNotification: (deviceTokens, title, body) => {
    var serverKey =
      "AAAAYvDjzPI:APA91bGdaNOQwicnCLLy4aXy4gPFDdSK0Txoe7tEVny70vfQybJJNVBTqldbf3VVCN4vkZNB8fsrEpFqws5KwSKMYoYiK_FWzIw-kANQPshnll5ur421vcnKEsjcxmzYn_SdQpREvLr7";
    var fcm = new FCM(serverKey);

    var message = {
      to: deviceTokens,
      content_available: true,
      collapse_key: "your_collapse_key",
      data: {
        your_custom_data_key: "remove_user",
      },
      notification: {
        title: title,
        body: body,
      },
    };
    fcm.send(message, function (err, response) {
      if (err) {
        console.log("Notification error", err);
      } else {
        console.log("Notification send successfully", response);
      }
    });
  },

  itemReturn: (deviceTokens, title, body, itemid) => {
    var serverKey =
      "AAAAYvDjzPI:APA91bGdaNOQwicnCLLy4aXy4gPFDdSK0Txoe7tEVny70vfQybJJNVBTqldbf3VVCN4vkZNB8fsrEpFqws5KwSKMYoYiK_FWzIw-kANQPshnll5ur421vcnKEsjcxmzYn_SdQpREvLr7";
    var fcm = new FCM(serverKey);

    var message = {
      to: deviceTokens,
      content_available: true,
      collapse_key: "your_collapse_key",
      data: {
        your_custom_data_key: "item_return",
        itemid: itemid,
      },
      notification: {
        title: title,
        body: body,
      },
    };
    fcm.send(message, function (err, response) {
      if (err) {
        console.log("Notification error", err);
      } else {
        console.log("Notification send successfully", response);
      }
    });
  },

  reportItemDeleteNotification: (deviceTokens, title, body, itemid) => {
    var serverKey =
      "AAAAYvDjzPI:APA91bGdaNOQwicnCLLy4aXy4gPFDdSK0Txoe7tEVny70vfQybJJNVBTqldbf3VVCN4vkZNB8fsrEpFqws5KwSKMYoYiK_FWzIw-kANQPshnll5ur421vcnKEsjcxmzYn_SdQpREvLr7";
    var fcm = new FCM(serverKey);

    var message = {
      to: deviceTokens,
      content_available: true,
      collapse_key: "your_collapse_key",
      data: {
        your_custom_data_key: "itemDeleted",
        itemid: itemid,
      },
      notification: {
        title: title,
        body: body,
      },
    };
    fcm.send(message, function (err, response) {
      if (err) {
        console.log("Notification error", err);
      } else {
        console.log("Notification send successfully", response);
      }
    });
  },

  itemRequestNotificationAccept: (
    deviceTokens,
    title,
    body,
    isborrowed,
    itemid
  ) => {
    var serverKey =
      "AAAAYvDjzPI:APA91bGdaNOQwicnCLLy4aXy4gPFDdSK0Txoe7tEVny70vfQybJJNVBTqldbf3VVCN4vkZNB8fsrEpFqws5KwSKMYoYiK_FWzIw-kANQPshnll5ur421vcnKEsjcxmzYn_SdQpREvLr7";
    var fcm = new FCM(serverKey);

    var message = {
      to: deviceTokens,
      content_available: true,
      collapse_key: "your_collapse_key",
      data: {
        your_custom_data_key: "itemRequestReturnAccept",
        isborrowed: isborrowed,
        itemid: itemid,
      },
      notification: {
        title: title,
        body: body,
      },
    };
    fcm.send(message, function (err, response) {
      if (err) {
        console.log("Notification error", err);
      } else {
        console.log("Notification send successfully", response);
      }
    });
  },

  itemRequestNotificationReject: (
    deviceTokens,
    title,
    body,
    isborrowed,
    itemid
  ) => {
    var serverKey =
      "AAAAYvDjzPI:APA91bGdaNOQwicnCLLy4aXy4gPFDdSK0Txoe7tEVny70vfQybJJNVBTqldbf3VVCN4vkZNB8fsrEpFqws5KwSKMYoYiK_FWzIw-kANQPshnll5ur421vcnKEsjcxmzYn_SdQpREvLr7";
    var fcm = new FCM(serverKey);

    var message = {
      to: deviceTokens,
      content_available: true,
      collapse_key: "your_collapse_key",
      data: {
        your_custom_data_key: "itemRequestReturnReject",
        isborrowed: isborrowed,
        itemid: itemid,
      },
      notification: {
        title: title,
        body: body,
      },
    };
    fcm.send(message, function (err, response) {
      if (err) {
        console.log("Notification error", err);
      } else {
        console.log("Notification send successfully", response);
      }
    });
  },
  borrowNotification: (deviceTokens, title, body, isborrowed, itemid) => {
    var fcm = new FCM(serverKey);

    var message = {
      to: deviceTokens,
      content_available: true,
      collapse_key: "your_collapse_key",
      data: {
        your_custom_data_key: "itemRequestReturnReject",
        isborrowed: isborrowed,
        itemid: itemid,
      },
      notification: {
        title: title,
        body: body,
      },
    };
    fcm.send(message, function (err, response) {
      if (err) {
        console.log("Notification error", err);
      } else {
        console.log("Notification send successfully", response);
      }
    });
  },

  reportItemNotification: (deviceTokens, title, body, isborrowed, itemid) => {
    var serverKey =
      "AAAAYvDjzPI:APA91bGdaNOQwicnCLLy4aXy4gPFDdSK0Txoe7tEVny70vfQybJJNVBTqldbf3VVCN4vkZNB8fsrEpFqws5KwSKMYoYiK_FWzIw-kANQPshnll5ur421vcnKEsjcxmzYn_SdQpREvLr7";
    var fcm = new FCM(serverKey);

    var message = {
      to: deviceTokens,
      content_available: true,
      collapse_key: "your_collapse_key",
      data: {
        your_custom_data_key: "reportItemNotification",
        itemid: itemid,
      },
      notification: {
        title: title,
        body: body,
      },
    };
    fcm.send(message, function (err, response) {
      if (err) {
        console.log("Notification error", err);
      } else {
        console.log("Notification send successfully", response);
      }
    });
  },
};
