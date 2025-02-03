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
   
  module.exports = {organizationTypeSchema ,organizationTypeDeleteSchema, };