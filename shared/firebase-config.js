const firebaseConfig = {
  apiKey: "AIzaSyAxuB4gacmVIf3U4Ic5TsOxSHCaynR0vvhw",
  authDomain: "bpos-pos.firebaseapp.com",
  projectId: "bpos-pos",
  storageBucket: "bpos-pos.firebasestorage.app",
  messagingSenderId: "1024558399693",
  appId: "1:1024558399693:web:13412d95960d8be732a984",
  measurementId: "G-BY03FZEN6E"
};

// Initialize Firebase
import { initializeApp } from "firebase/app";
const app = initializeApp(firebaseConfig);

export default app;
