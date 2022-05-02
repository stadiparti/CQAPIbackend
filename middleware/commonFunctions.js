/*  @copyright : ToXSL Technologies Pvt. Ltd. < www.toxsl.com >
@author     : Shiv Charan Panjeta < shiv@toxsl.com >
 
All Rights Reserved.
Proprietary and confidential :  All information contained herein is, and remains
the property of ToXSL Technologies Pvt. Ltd. and its partners.
Unauthorized copying of this file, via any medium is strictly prohibited.
 */



module.exports = {
    setResponseObject: async (req, success, message, data) => {
        let resp = {
            success: success,
        };
        if (message) {
            resp["message"] = message;
        }
        if (data) {
            resp["data"] = data;
        }
        req.newRespData = await resp;
        return;
    },

    getDateFromObj: async (date) => {
        var date = new Date(date);
        var day = date.getDate(); //Date of the month: 2 in our example
        var month = date.getMonth(); //Month of the Year: 0-based index, so 1 in our example
        var year = date.getFullYear()
        return day + "/" + month + "/" + year
    },

    getOTP() {
        var otp = Math.floor(1000 + Math.random() * 9000);
        return otp;
      },
};
