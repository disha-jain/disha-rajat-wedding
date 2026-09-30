// firebase-config.js
// Fill in your Firebase project keys to enable Firestore + Google Admin sign-in.
// Admins: list Google account emails allowed to view the Host Admin dashboard,
// or create Firestore docs at admins/{email} (e.g. admins/disha@example.com).

const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Add admin Google account emails here, e.g. ["disha@example.com"]
const adminEmails = [];

let db = null;
if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
}
