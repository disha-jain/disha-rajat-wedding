// firebase-config.js
// Firebase web app config (Firebase console → Project settings → General → Your apps).
// These values are meant to be public; data is protected by Firestore rules
// and the admin allowlist below, not by hiding this.

const firebaseConfig = {
  apiKey: "AIzaSyD20XhoNJ9yl-SvIiccmQV4RLM_BNTfg80",
  authDomain: "disha-rajat-wedding.firebaseapp.com",
  projectId: "disha-rajat-wedding",
  storageBucket: "disha-rajat-wedding.firebasestorage.app",
  messagingSenderId: "957221777354",
  appId: "1:957221777354:web:34730da3d9833fb83c2933",
  measurementId: "G-5GY3NTL951"
};

// Google account emails allowed to view the Host Admin dashboard.
// (Alternatively, create Firestore docs at admins/{email}.)
const adminEmails = ["dishajain2016@gmail.com", "khanna.rjt@gmail.com"];

let db = null;
if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
}
