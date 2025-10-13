const { model } = require("mongoose");

class ApiResponse {
    constructor(statusCode, message = "success", data){
        this.statusCode = statusCode;
        this.succes = statusCode < 400;
        this.message = message;
        this.data = data;
    }
}

module.exports = ApiResponse;