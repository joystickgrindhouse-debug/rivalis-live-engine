const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "rivalis-fitness-reimagined"
});

const db = admin.firestore();

module.exports = db;
