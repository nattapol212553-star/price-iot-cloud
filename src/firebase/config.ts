import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyACUZS-I00EJkeFp4ZJoblAehJCeBKytZM",
  authDomain: "smat-iot-by-pai.firebaseapp.com",
  databaseURL: "https://smat-iot-by-pai-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smat-iot-by-pai",
  storageBucket: "smat-iot-by-pai.firebasestorage.app",
  messagingSenderId: "906140294692",
  appId: "1:906140294692:web:616b1240c03048b65682b1"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const auth = getAuth(app);
