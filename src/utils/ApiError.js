//EXTENDED AN ERROR CLASS FROM NODE INBUILD PACKAGE TO DEFINE OUR ALL API REQ ERROR SUCCESS MESSAGE AND LATER ON CHANGE WITH THE ORIGINAL DATA WITH THE HELP OF SUPER WORD
class ApiError extends Error {
    constructor (
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    )
    {
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.errors = errors
        this.message = message
        this.success = false

        if(stack){
            this.stack = stack
        } else{
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export {ApiError}
