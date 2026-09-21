const firebaseConfig = {
  apiKey: "AIzaSyAxuB4gacmWIf3U4Ic5TsOxSHCaynR0vhw",
  authDomain: "bpos-pos.firebaseapp.com",
  projectId: "bpos-pos",
  storageBucket: "bpos-pos.firebasestorage.app",
  messagingSenderId: "1024558399693",
  appId: "1:1024558399693:web:13412d95960d8be732a984",
  measurementId: "G-BY03FZEN6E"
};

// Using compat version to match all HTML files
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
