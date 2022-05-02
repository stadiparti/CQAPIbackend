/*
@copyright : ToXSL Technologies Pvt. Ltd. < www.toxsl.com >
@author     : Shiv Charan Panjeta < shiv@toxsl.com >
 
All Rights Reserved.
Proprietary and confidential :  All information contained herein is, and remains
the property of ToXSL Technologies Pvt. Ltd. and its partners.
Unauthorized copying of this file, via any medium is strictly prohibited.
*/

var express = require('express');
var router = express.Router();
const AUTHCONTROLLER = require("../app/auth/controller/auth.controller");
const CONTENTCONTROLLER = require("../app/content/controller/contentController");
const GROUP = require("../app/group/controller/group.controller");
const ITEM = require("../app/item/controller/item.controller");
const REQUEST = require("../app/request/controller/request.controller");
const INVITE = require("../app/invite/controller/invite.controller");
const CHAT = require("../app/chat/controller/chat.controller");
const MEMBER = require("../app/group/controller/member.controller");
const NOTIFICATION = require("../app/notification/controller/notification.controller");
const handleResponse = require("../middleware/handleRespone");
// const Auth = require("/middleware/Auth");
const Auth =require("../middleware/Auth");
const itemModel = require('../app/item/model/item.model');

require("express-group-routes");

router.get('/', function (req, res, next) {
  res.render('index', { title: 'Cliq-Right Server' });
});

router.group("/dashboard",(admin) => {
  admin.post('/addContent',Auth.authenticate,CONTENTCONTROLLER.addContent,handleResponse.RESPONSE);
  admin.get('/getContent',Auth.authenticate,CONTENTCONTROLLER.getContent,handleResponse.RESPONSE);
});

router.group("/auth",(auth)=>{
  auth.post("/signup",AUTHCONTROLLER.signup,handleResponse.RESPONSE);
  auth.put("/update",Auth.authenticate,AUTHCONTROLLER.update,handleResponse.RESPONSE);
  auth.put("/signin",AUTHCONTROLLER.signin,handleResponse.RESPONSE);
  auth.post("/allUser",Auth.authenticate,AUTHCONTROLLER.all,handleResponse.RESPONSE);
  auth.get("/single/:user_id",Auth.authenticate,AUTHCONTROLLER.single,handleResponse.RESPONSE);
  auth.post("/verify-otp",AUTHCONTROLLER.verifyOtp,handleResponse.RESPONSE);
  auth.post("/phone-verify",AUTHCONTROLLER.verification,handleResponse.RESPONSE);
  auth.post("/search",AUTHCONTROLLER.searchUser,handleResponse.RESPONSE);
  auth.delete("/delete",AUTHCONTROLLER.delete,handleResponse.RESPONSE);
  auth.put("/logout",Auth.authenticate,AUTHCONTROLLER.logout,handleResponse.RESPONSE);
  auth.post("/sendVerifyLink", Auth.authenticate,AUTHCONTROLLER.sendVerifyLink, handleResponse.RESPONSE);
  auth.get("/verifyLink",AUTHCONTROLLER.verifyLink, handleResponse.RESPONSE);
})

router.group("/group",groups=>{  
  groups.post("/add",Auth.authenticate,GROUP.add,handleResponse.RESPONSE);
  groups.put("/update/:group_id",Auth.authenticate,GROUP.update,handleResponse.RESPONSE);
  groups.post("/member",Auth.authenticate ,MEMBER.addMemberNew,handleResponse.RESPONSE);
  groups.put("/member/:member_id",Auth.authenticate ,MEMBER.update,handleResponse.RESPONSE);
  groups.delete("/member/:member_id",Auth.authenticate ,MEMBER.delete_member,handleResponse.RESPONSE);
  groups.get("/member/:group_id",Auth.authenticate,MEMBER.getMemberByGroup,handleResponse.RESPONSE)
  groups.get("/view/:group_id",Auth.authenticate,GROUP.view,handleResponse.RESPONSE);
  groups.get("/all",Auth.authenticate,GROUP.all,handleResponse.RESPONSE);
  groups.delete("/delete/:group_id",Auth.authenticate,GROUP.delete,handleResponse.RESPONSE);
  groups.post("/block",Auth.authenticate,GROUP.block,handleResponse.RESPONSE);
  groups.post("/addItem",Auth.authenticate,GROUP.addItemNew,handleResponse.RESPONSE);
  groups.put("/updateItem/:group_item_id",Auth.authenticate,GROUP.updateItem,handleResponse.RESPONSE);
  groups.post("/block-Item",GROUP.blockItem,handleResponse.RESPONSE);
  groups.get("/get-Item/:group_id",Auth.authenticate,GROUP.getItem,handleResponse.RESPONSE);
  groups.get("/getSharedItem/:item_id",Auth.authenticate,GROUP.getSharedItem,handleResponse.RESPONSE);
  groups.delete("/deleteItem",Auth.authenticate,GROUP.deleteItem,handleResponse.RESPONSE);
  groups.post("/add-members",Auth.authenticate,GROUP.addMemebers,handleResponse.RESPONSE);
  groups.put("/makeAdmin/:member_id",Auth.authenticate,MEMBER.makeGroupAdmin,handleResponse.RESPONSE)
  groups.delete("/left",Auth.authenticate,MEMBER.leaveGroup,handleResponse.RESPONSE)
  groups.get("/near-me",Auth.authenticate,GROUP.nearme,handleResponse.RESPONSE); 
  groups.post("/search",Auth.authenticate,GROUP.search,handleResponse.RESPONSE); 
  groups.get("/nearby",Auth.authenticate,GROUP.searchNearbyGroup,handleResponse.RESPONSE); 
  groups.get("/allSharedItem",Auth.authenticate,GROUP.getAllSharedItem,handleResponse.RESPONSE); 
  groups.get("/allUnharedItem",Auth.authenticate,GROUP.getAllUnsharedItem,handleResponse.RESPONSE); 
  groups.delete("/item-remove",Auth.authenticate,GROUP.removeItem,handleResponse.RESPONSE);
  groups.get("/pending-member/:group_id",Auth.authenticate,MEMBER.getPendingMember,handleResponse.RESPONSE);
});

router.group("/user",user => { 
  user.get("/myrequest",Auth.authenticate,MEMBER.myrequest,handleResponse.RESPONSE);
  user.put("/request-accept/:member_id",Auth.authenticate,MEMBER.requestAcceptByUser,handleResponse.RESPONSE);
  user.put("/request-reject/:member_id",Auth.authenticate,MEMBER.requestRejectByUser,handleResponse.RESPONSE);
  user.post("/search",Auth.authenticate,MEMBER.searchGroupRequest,handleResponse.RESPONSE);
  user.put("/blocked",Auth.authenticate,MEMBER.blockUser,handleResponse.RESPONSE); 
})

router.group("/group-request",groupRequest=>{
  groupRequest.post("/send",Auth.authenticate,GROUP.createGroupRequest,handleResponse.RESPONSE);
  groupRequest.get("/:group_id",Auth.authenticate,GROUP.getGroupRequest,handleResponse.RESPONSE);
  groupRequest.put("/update/:id",GROUP.updateGroupRequest,handleResponse.RESPONSE);
  groupRequest.put("/join/:group_request_id",Auth.authenticate,GROUP.join,handleResponse.RESPONSE);
  groupRequest.put("/reject/:group_request_id",Auth.authenticate,GROUP.reject,handleResponse.RESPONSE);
})

router.group("/item", items=>{
  items.post("/add",Auth.authenticate,ITEM.add,handleResponse.RESPONSE);
  items.put("/update/:item_id",Auth.authenticate,ITEM.update,handleResponse.RESPONSE);
  items.get("/all",Auth.authenticate,ITEM.all,handleResponse.RESPONSE);
  items.post("/myAllGroupItems",Auth.authenticate,ITEM.homePageItems,handleResponse.RESPONSE);
  items.get("/my-item",Auth.authenticate,ITEM.myItem,handleResponse.RESPONSE);
  items.get("/one/:item_id",Auth.authenticate,ITEM.one,handleResponse.RESPONSE);
  items.delete("/delete/:item_id",Auth.authenticate,ITEM.delete,handleResponse.RESPONSE);
  items.put("/avaliable/:item_id",Auth.authenticate,ITEM.markAvaliable,handleResponse.RESPONSE);
  items.delete("/stop-share",Auth.authenticate,ITEM.sharedLevelNone,handleResponse.RESPONSE);
  items.get("/avaliableItem",Auth.authenticate,ITEM.avaliableItem,handleResponse.RESPONSE);
  items.get("/unavaliableItem",Auth.authenticate,ITEM.unavaliableItem,handleResponse.RESPONSE);
  items.post("/search",Auth.authenticate,ITEM.search,handleResponse.RESPONSE);
  items.post("/searchMyItems",Auth.authenticate,ITEM.searchMyItems,handleResponse.RESPONSE);
  items.delete("/deleteImage",Auth.authenticate,ITEM.deleteImage,handleResponse.RESPONSE);
  items.post("/my-item/status",Auth.authenticate,ITEM.myItemFilter,handleResponse.RESPONSE);
  items.post("/my-item/shared",Auth.authenticate,ITEM.myItemFilterSharedLevel,handleResponse.RESPONSE);
  items.put("/sharePublic/:item_id",Auth.authenticate,ITEM.sharePublic,handleResponse.RESPONSE);
  items.get("/getPrivateItem",Auth.authenticate,ITEM.getPrivateItem,handleResponse.RESPONSE);
  items.put("/removeSharedItems/:item_id",Auth.authenticate,ITEM.removeSharedItems,handleResponse.RESPONSE);
});

router.group("/report-item",reportItem=>{
  reportItem.post("/",Auth.authenticate,ITEM.create,handleResponse.RESPONSE);
  reportItem.get("/:item_id",Auth.authenticate,ITEM.detail,handleResponse.RESPONSE);
  reportItem.get("/",Auth.authenticate,ITEM.allItem,handleResponse.RESPONSE);
  reportItem.put("/rejected/:report_id",Auth.authenticate,ITEM.report_reject,handleResponse.RESPONSE);
  reportItem.put("/accepted/:report_id",Auth.authenticate,ITEM.report_accepted,handleResponse.RESPONSE);

})

router.group("/request", requests=>{
  requests.post("/borrow",Auth.authenticate,REQUEST.borrow,handleResponse.RESPONSE)
  requests.post("/return",Auth.authenticate,REQUEST.return,handleResponse.RESPONSE)
  requests.post("/accept",Auth.authenticate,REQUEST.accept,handleResponse.RESPONSE)
  requests.get("/all",Auth.authenticate,REQUEST.all,handleResponse.RESPONSE)
  requests.get("/getRequestList/:item_id",Auth.authenticate,REQUEST.getRequestList,handleResponse.RESPONSE)
  requests.get("/one/:item_request_id",Auth.authenticate,REQUEST.one,handleResponse.RESPONSE)
  requests.post("/cancel",Auth.authenticate,REQUEST.cancel,handleResponse.RESPONSE)
  requests.get("/borrow-list",Auth.authenticate,REQUEST.borrowLists,handleResponse.RESPONSE)
  requests.get("/my-request",Auth.authenticate,REQUEST.myRequest,handleResponse.RESPONSE)
  requests.post("/borrow-manual",Auth.authenticate,REQUEST.borrowItemManully,handleResponse.RESPONSE)
  requests.delete("/borrow-return",Auth.authenticate,REQUEST.manualBorrowReturn,handleResponse.RESPONSE)
});

router.group("/borrow-request",borrowreturn => {
  borrowreturn.post("/return",Auth.authenticate,REQUEST.itemReturnRequest,handleResponse.RESPONSE);
  borrowreturn.get("/getItemReturnRequest",Auth.authenticate,REQUEST.getItemReturnRequest,handleResponse.RESPONSE);
  borrowreturn.put("/rejectItemReturnRequest",Auth.authenticate,REQUEST.rejectItemReturnRequest,handleResponse.RESPONSE);
  borrowreturn.put("/acceptItemReturnRequest",Auth.authenticate,REQUEST.acceptItemReturnRequest,handleResponse.RESPONSE);
})

router.group("/invite", invites=>{
  invites.post("/create",Auth.authenticate,INVITE.create,handleResponse.RESPONSE);
  invites.put("/update",Auth.authenticate,INVITE.update,handleResponse.RESPONSE);
  invites.get("/one/:invitation_id",Auth.authenticate,INVITE.one,handleResponse.RESPONSE);
  invites.get("/all",Auth.authenticate,INVITE.all,handleResponse.RESPONSE);
  invites.put("/cancle",Auth.authenticate,INVITE.cancel,handleResponse.RESPONSE);
  invites.put("/accept",Auth.authenticate,INVITE.accept,handleResponse.RESPONSE);
}); 

router.group("/chat",chats=>{
  chats.get("/getRoomId",Auth.authenticate,CHAT.getRoomId,handleResponse.RESPONSE);
  chats.get("/getReceiverId",Auth.authenticate,CHAT.getReceiverId,handleResponse.RESPONSE);
  
  chats.post("/send-message",CHAT.sendMessage,handleResponse.RESPONSE);
  chats.get("/chat-list",CHAT.chatList,handleResponse.RESPONSE);
  chats.get("/history/:chat_id",CHAT.history,handleResponse.RESPONSE);
  chats.post("/new-message",CHAT.newMessage,handleResponse.RESPONSE);
  chats.delete("/delete",CHAT.delete,handleResponse.RESPONSE);
})

router.group("/notification",notification => {
  notification.post("/",Auth.authenticate,NOTIFICATION.post,handleResponse.RESPONSE);
  notification.get("/get",Auth.authenticate,NOTIFICATION.get,handleResponse.RESPONSE);
  notification.put("/markSeen/:notificationId",Auth.authenticate,NOTIFICATION.markSeen,handleResponse.RESPONSE);
  notification.get("/getByStatus",Auth.authenticate,NOTIFICATION.getByStatus,handleResponse.RESPONSE);
  notification.put("/setMultipleSeen",Auth.authenticate,NOTIFICATION.setMultipleSeen,handleResponse.RESPONSE);
  notification.put("/multipleDelete",Auth.authenticate,NOTIFICATION.multipleDelete,handleResponse.RESPONSE);
})

module.exports = router;
