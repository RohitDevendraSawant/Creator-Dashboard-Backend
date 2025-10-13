class ApiError extends Error{
    constructor(statusCode, message, errors, errorStack){
        super(message);
        this.statusCode = statusCode;
        this.success = false;
        this.message = message,
        this.data = null;
        this.errors = errors;
        if(errorStack?.length){
            this.errorStack = errorStack;
        }       
        else{
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

module.exports = ApiError;