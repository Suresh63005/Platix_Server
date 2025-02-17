const Joi = require("joi");

// for organizationType
  const organizationTypeSchema = Joi.object({
    id:Joi.string().optional().messages({
      "any.required":"id is required",
    }),
    organizationType: Joi.string().min(3).required().messages({
      "string.base": `"organizationType" should be a type of 'text'`,
      "string.empty": `"organizationType" cannot be an empty field`,
      "string.min": `"organizationType" should have a minimum length of {#limit}`,
      "any.required": `"organizationType" is a required field`
    }),
    description: Joi.string().min(5).required().messages({
      "string.base": `"description" should be a type of 'text'`,
      "string.empty": `"description" cannot be an empty field`,
      "string.min": `"description" should have a minimum length of {#limit}`,
      "any.required": `"description" is a required field`
    }),
    fromDate: Joi.date().iso().required().messages({
      "date.base": `"fromDate" should be a valid date`,
      "any.required": `"fromDate" is a required field`
    }),
    toDate: Joi.date().iso().required().messages({
      "date.base": `"toDate" should be a valid date`,
      "any.required": `"toDate" is a required field`
    }),
  });

    const ServiceSchema = Joi.object({
      id:Joi.string().optional().messages({
          "any.required":"id is required",
      }),
      servicename: Joi.string().min(3).required().messages({
        "string.base": `"organizationType" should be a type of 'text'`,
        "string.empty": `"organizationType" cannot be an empty field`,
        "string.min": `"organizationType" should have a minimum length of {#limit}`,
        "any.required": `"organizationType" is a required field`
      }),
      servicedescription: Joi.string().min(5).required().messages({
        "string.base": `"description" should be a type of 'text'`,
        "string.empty": `"description" cannot be an empty field`,
        "string.min": `"description" should have a minimum length of {#limit}`,
        "any.required": `"description" is a required field`
      }),
      fromdate: Joi.date().iso().required().messages({
        "date.base": `"fromDate" should be a valid date`,
        "any.required": `"fromDate" is a required field`
      }),
      todate: Joi.date().iso().required().messages({
        "date.base": `"toDate" should be a valid date`,
        "any.required": `"toDate" is a required field`
      }),
    });
 
  const organizationTypeDeleteSchema = Joi.object({
    id: Joi.string().required().messages({
      "any.required": "Organization ID is required.",
      "string.base": "Organization ID must be a string.",
      "string.integer": "Organization ID must be an string.",
    }),
    forceDelete: Joi.string().valid("true", "false").optional().messages({
      "any.only": "forceDelete must be either 'true' or 'false'.",
    }),
  });

  const ServiceDeleteSchema = Joi.object({
    id: Joi.string().required().messages({
      "any.required": "Organization ID is required.",
      "string.base": "Organization ID must be a string.",
      "string.integer": "Organization ID must be an string.",
    }),
    forceDelete: Joi.string().valid("true", "false").optional().messages({
      "any.only": "forceDelete must be either 'true' or 'false'.",
    }),
  });
   

  const upsertOrganizationSchema = Joi.object({
    id: Joi.string().optional().messages({
      "any.required": "id is required",
    }),

    address: Joi.string().required().messages({
      "string.base": `"address" should be a type of 'text'`,
      "string.empty": `"address" cannot be an empty field`,
      "any.required": `"address" is a required field`
    }),

    businessName: Joi.string().optional().messages({
      "string.base": `"businessName" should be a type of 'text'`,
      "string.empty": `"businessName" cannot be an empty field`,
    }),

    description: Joi.string().required().messages({
      "string.base": `"description" should be a type of 'text'`,
      "string.empty": `"description" cannot be an empty field`,
      "any.required": `"description" is a required field`
    }),

    designation: Joi.string().optional().messages({
      "string.base": `"designation" should be a type of 'text'`,
      "string.empty": `"designation" cannot be an empty field`,
    }),

    email: Joi.string().email().required().messages({
      "string.base": `"email" should be a type of 'text'`,
      "string.empty": `"email" cannot be an empty field`,
      "any.required": `"email" is a required field`
    }),

    googleCoordinates: Joi.string().required().messages({
      "string.base": `"googleCoordinates" should be a type of 'text'`,
      "string.empty": `"googleCoordinates" cannot be an empty field`,
      "any.required": `"googleCoordinates" is a required field`
    }),

    gstNumber: Joi.string().optional().messages({
      "string.base": `"gstNumber" should be a type of 'text'`,
      "string.empty": `"gstNumber" cannot be an empty field`,
    }),

    mobile: Joi.string().required().messages({
      "string.base": `"mobile" should be a type of 'text'`,
      "string.empty": `"mobile" cannot be an empty field`,
      "any.required": `"mobile" is a required field`
    }),

    name: Joi.string().required().messages({
      "string.base": `"name" should be a type of 'text'`,
    }),

    registrationId: Joi.string().optional().messages({
      "string.base": `"registrationId" should be a type of 'text'`,
      "string.empty": `"registrationId" cannot be an empty field`,
    }),

    type: Joi.string().required().messages({
      "string.base": `"type" should be a type of 'text'`,
      "string.empty": `"type" cannot be an empty field`,
      "any.required": `"type" is a required field`
    }),

    whatsapp: Joi.string().required().messages({
      "string.base": `"whatsapp" should be a type of 'text'`,
      "string.empty": `"whatsapp" cannot be an empty field`,
      "any.required": `"whatsapp" is a required field`
    }),

    file1: Joi.object({
      fieldname: Joi.string().valid('image').required(),
      mimetype: Joi.string().valid('image/jpeg', 'image/png', 'image/gif','image/webp','image/jpg').required(),
      buffer: Joi.any().required(),
      size: Joi.number().max(5 * 1024 * 1024).required() 
    }).optional().messages({
      "any.required": `"file1" is required as an image file`,
      "string.base": `"file1" must be an image file`
    }),

    file2: Joi.array().items(
      Joi.object({
        fieldname: Joi.string().valid('image').required(),
        mimetype: Joi.string().valid('image/jpeg', 'image/png', 'image/gif','image/webp','image/jpg').required(),
        buffer: Joi.any().required(),
        size: Joi.number().max(10 * 1024 * 1024).required()  // Limit file size to 5MB for multiple images
      }).optional()
    ).max(10).optional().messages({
      "array.base": `"file2" must be an array of image files`,
      "array.max": `"file2" can have a maximum of 5 images`,
      "any.required": `"file2" is optional`
    })
  });

  const deleteOrganizationSchema = Joi.object({
    id: Joi.string().required().messages({
      "any.required": "Organization ID is required.",
      "string.base": "Organization ID must be a string.",
      "string.empty": "Organization ID cannot be an empty string.",
    }),
  
    forceDelete: Joi.string().valid("true", "false").optional().messages({
      "string.base": `"forceDelete" must be of type 'string' and can only be 'true' or 'false'.`,
      "any.only": `"forceDelete" must be either 'true' or 'false'.`
    })
  });

  const organizationGetByidSchema=Joi.object({
    id: Joi.string().required().messages({
      "any.required": "Organization ID is required.",
      "string.base": "Organization ID must be a string.",
      "string.empty": "Organization ID cannot be an empty string.",
    }),
  })
  const registerSchema = Joi.object({
    password: Joi.string()
      .min(8)
      .max(20)
      .regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      .required()
      .messages({
        "string.min": "Password must be at least 8 characters long",
        "string.max": "Password cannot exceed 20 characters",
        "string.pattern.base": "Password must contain at least 1 uppercase letter, 1 number, and 1 special character",
        "any.required": "Password is required",
      }),
  });
  module.exports = {organizationTypeSchema ,organizationTypeDeleteSchema,
    upsertOrganizationSchema,deleteOrganizationSchema,organizationGetByidSchema,ServiceDeleteSchema,ServiceSchema,registerSchema
   };
