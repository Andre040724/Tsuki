import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function run() {
  try {
    await signInWithEmailAndPassword(auth, "kimargao06@gmail.com", "password123");
    console.log("Signed in:", auth.currentUser?.uid);

    const uid = auth.currentUser!.uid;

    console.log("Trying to update doc...");
    await updateDoc(doc(db, 'users', uid), {
      username: "Hello",
      avatar: "🐰",
      updatedAt: serverTimestamp()
    });
    console.log("Update doc successful!");

  } catch (err) {
    console.error("Error:", err);
  }
}

run();
