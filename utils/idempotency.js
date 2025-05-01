const crypto=require("crypto")
module.exports.generateIdempotencyKey = () => {
  return 'idemp_' + crypto.randomBytes(9).toString('hex');
};

console.log(module.exports.generateIdempotencyKey())