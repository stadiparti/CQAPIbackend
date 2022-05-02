let respObject = {
    success: false
};
module.exports.RESPONSE = (req, res) => {
    try {
        if (req.newRespData) {
            if (req.newRespData.success) {
                res.status(200).json(req.newRespData);
            } else {
                res.status(400).json(req.newRespData);
            }
        }
    } catch (error) {
        respObject["message"] = responseMessages["SOMETHING_WRONG"];
        res.status(400).json(respObject);
    }
};