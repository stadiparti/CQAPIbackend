/*
@copyright : ToXSL Technologies Pvt. Ltd. < www.toxsl.com >
@author     : Shiv Charan Panjeta < shiv@toxsl.com >
 
All Rights Reserved.
Proprietary and confidential :  All information contained herein is, and remains
the property of ToXSL Technologies Pvt. Ltd. and its partners.
Unauthorized copying of this file, via any medium is strictly prohibited.
*/

// set common contant response
module.exports = {
  RECORD_FOUND: (name) => {
    return name + " found.";
  },
  RECORD_NOTFOUND: (name) => {
    return name + " not found.";
  },
  SIGNUP: (name) => {
    return "Sign up successful, enter the OTP you received on your phone to continue.";
  },
  ALREADYEXIST: (name, field) => {
    return name + " An account already exists with this " + field;
  },
  VERIFICATION: (name) => {
    return name + "  successful.";
  },
  SOMETHING_WRONG: (error) => {
    return error;
  },
  ADD_SUCCESS: (name) => {
    return name + " added successfully.";
  },
  UPDATE_SUCCESS: (name) => {
    return name + " updated successfully.";
  },
  FOUND_SUCCESS: (name) => {
    return name + " found successfully.";
  },
  GROUP_CREATED: (name) => {
    return name + "Group created successfully";
  },
  GROUP_ALL: (name) => {
    return name + "group data found";
  },
  GROUP_DELETED: (name) => {
    return name + "Group deleted successfully";
  },
  MEMBERS_ADDED: (name) => {
    return name + "Members added successfully";
  },
  REQUIRED_FIELDS: (name) => {
    return name + "fields are required";
  },
  SUCCESS: (name) => {
    return name + " successfully.";
  },
  NOT_FOUND: (name) => {
    return name + " not found.";
  },
  REQUIRED_FIELD: "Fields are required",
  ITEM_DELETE: "Item Deleted successfully",
  REPORT_REJECTED: "Reported item rejected sucessfully",
  REPORT_ACCEPTED: "Reported item accepted action will taken",
  GROUP_ITEM_BLOCK: "Group Item Blocked Successfully",
  OTP_SEND: "Enter the OTP you received on your phone to login.",
  INVITE_REJECT: "Successfully rejected Invite.",
  INVITE_ACCEPT: "Successfully accepted Invite.",
  REQUEST_REJECT: "Successfully rejected request.",
  REQUEST_ACCEPT: "Successfully accepted request.",
  REQUEST_CANCEL: "Successfully canceled request.",
  USER_NOT_REGISTER: "This mobile number is not registered, please sign up.",
  EMAIL_EXIST: "An account already exists with this email address",
  PHONE_EXIST: "An account already exists with this mobile number",
  GROUP_MEMBER_REMOVE: "Successfully removed group member.",
  ADMIN: "Successfully assigned as Group Admin.",
  GROUP_LEFT: "Successfully left the Group.",
  USER_DELETE: "Successfully deleted User.",
  ITEM_RETURN: "Successfully returned the Item.",
  REQUEST_SEND: "Request send successfully.",
  NOTIFICATION_SEEN: "Successfully viewed notifications.",
  STOP_SHARE: "Successfully stopped item sharing.",
  STOP_SHARE_ERR: "Failed to stop shared items.",
  REPORT_EXIST: "Item has been reported already.",
  PAGE_INVALID: "Invalid page",
  ERROR_ON_SAVING: "Error while saving data",
  ERROR_WHILE_UPDATING: "Error while updating data",
  UNAUTHORIZED_ACCESS: "Unauthorized access",
  GROUP_JOIN_LIMI_EXCEED: "No more members allowed to join the group.",
  GROUP_CREATE_LIMIT_EXCEED: "Not allowed to create more groups",
  ITEM_SHARE_LIMIT_EXCEED: "No more items can be shared in this group",
  MINIMUM_ADMIN_GROUP_REQUIRED:
    "Please assign someone else as Group Admin before leaving.",
  ADMIN_LIMIT_EXCEED: "Not allowed to assign more users as Group Admins.",
  ADMIN_REMOVED: "Remove admin successfully",
  ADMIN_REMOVED_FAIL: "Fail to remove admin",
  GROUP_MEMBER_NOT_FOUND: "Failed to found group member",
  PENDING_GROUP_MEMBER_NOT_FOUND: "Failed to found pending members",
  BLOCKED_SUCCESS: "User blocked successfully",
  BLOCKED_ERR: "Failed to block user",
  UNBLOCKED_SUCCESS: "User unblocked successfully",
  UNBLOCKED_ERR: "Failed to unblock user",
  LINK_NOT_SEND: "Failed to send verification link.",
  LINK_VERIFY: "Link send successfully",
  SOMETHING_WENT_WRONG: "Something went wrong, please try again.",

  //     Signup_SUCCESSFULL: "SIGNUP successfully.",
};
