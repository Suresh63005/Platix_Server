const admin = require("firebase-admin");

// const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(require("./serviceAccountKey.json"))
});
 module.exports=admin