import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId;
const db = getFirestore(app, firestoreDatabaseId);
const auth = getAuth(app);

async function run() {
  try {
    await signInWithEmailAndPassword(auth, "kimargao06@gmail.com", "password123");
    console.log("Signed in:", auth.currentUser?.uid);

    const uid = auth.currentUser!.uid;

    const payload = {
        userId: uid,
        email: "kimargao06@gmail.com",
        mode: "girlfriend",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    console.log("Trying to set doc...", payload);
    await setDoc(doc(db, 'users', uid), payload);
    console.log("Set doc successful!");

  } catch (err) {
    console.error("Error:", err);
  }
}

run();
