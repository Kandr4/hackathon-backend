module.exports = {
    successResponse: (res, data, message = 'Success') => {
        return res.status(200).json({
            status: 'success',
            message,
            data,
        });
    },

    createdResponse: (res, data, message = 'Resource created successfully') => {
        return res.status(201).json({
            status: 'success',
            message,
            data,
        });
    },

    notFoundResponse: (res, message = 'Resource not found') => {
        return res.status(404).json({
            status: 'error',
            message,
        });
    },

    errorResponse: (res, message = 'An error occurred', statusCode = 500) => {
        return res.status(statusCode).json({
            status: 'error',
            message,
        });
    },

    validationErrorResponse: (res, errors) => {
        return res.status(400).json({
            status: 'error',
            message: 'Validation error',
            errors,
        });
    },
};