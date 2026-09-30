// firebase-config.js

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD20XhoNJ9yl-SvIiccmQV4RLM_BNTfg80",
  authDomain: "disha-rajat-wedding.firebaseapp.com",
  projectId: "disha-rajat-wedding",
  storageBucket: "disha-rajat-wedding.firebasestorage.app",
  messagingSenderId: "957221777354",
  appId: "1:957221777354:web:34730da3d9833fb83c2933",
  measurementId: "G-5GY3NTL951"
};

// Initialize Firebase if valid keys are present
let db = null;
if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
}
