/*
@copyright : ToXSL Technologies Pvt. Ltd. < www.toxsl.com >
@author     : Shiv Charan Panjeta < shiv@toxsl.com >
 
All Rights Reserved.
Proprietary and confidential :  All information contained herein is, and remains
the property of ToXSL Technologies Pvt. Ltd. and its partners.
Unauthorized copying of this file, via any medium is strictly prohibited.
*/

// for authentication check uses json web token
const jwt = require("jsonwebtoken");
const responseMessage = require("../middleware/responseMessage")// constant message  used on some files
const setResponseObject = require("../middleware/commonFunctions")// for common functions used on some files

// as middleware set 
const dotenv = require("dotenv");
// // for user schema set
// const USER = require("../app/userServices/model/userModel");
// for constant values get
const constant = require("../helpers/constant");
const USER = require("../app/auth/model/auth.model");
dotenv.config();
const _tokenManager = {};
// for data encrypt decryption crypto is used
const CryptoJS = require("crypto-js");
// check token
_tokenManager.authenticate = async (req, res, next) => {
  if (req.headers['x-token']) {
    // console.log("token",req.headers)
    let token = getToken(req);
    //verify if authenticated user.    
    const secret = process.env.JWT_SECRET || "Development";
    jwt.verify(token, secret, async (err, decoded) => { // token verify

      if (decoded) {
        // if token verified then set req keys to middlewares
        req.userId = decoded.userId;
        req.email = decoded.email;
        req.first_name = decoded.first_name;

        let checkToken = await USER.findOne({_id:decoded.userId,token:token});
        if(!checkToken){
          res.status(403).json({ // return for invalid token
            success: false,
            dateCheck: constant.dateCheck,
            message: "Session Expire",
          });
          return;
        }
        next();
        next();
      } else {
        res.status(403).json({ // return for invalid token
          success: false,
          dateCheck: constant.dateCheck,
          message: "Invalid token",
        });
      }
    });
  } else {

    res.status(403).json({ // return for invalid token
      success: false,
      dateCheck: constant.dateCheck,
      message: "Token is not Provided ",
    });
    // next()
  }

};

// get token from headers
const getToken = function (req) {
  if (
    req.headers &&
    req.headers['x-token'] &&
    req.headers['x-token'].split(" ")[0] === "Bearer"
    ) {
    return req.headers['x-token'].split(" ")[1];
  }

  // If we return null, we couldn't find a token.
  // In this case, the JWT middleware will return a 401 (unauthorized)
  // to the client for this request
  return null;
};

module.exports = _tokenManager;
