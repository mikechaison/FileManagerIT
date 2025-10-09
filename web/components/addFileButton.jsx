import React from 'react'
import { useAuth } from '../contexts/authContext'
import { storage, database } from '../firebase'
import { query, where, serverTimestamp, doc, setDoc, getDocs, updateDoc } from "firebase/firestore"
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"

export default function AddFileButton() {
    const {currentUser} = useAuth()

    async function handleUpload(e) {
        const file = e.target.files[0]
        if (file == null) return

        const fileName = file.name.replace(/ /g, "_");
        const fileExtension = fileName.split('.').pop().toLowerCase();
        const storageRef = ref(storage, `files/${currentUser.uid}/${fileName}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            "state_changed",
            snapshot => {},
            () => {},
            async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref)

                const q = query(
                    database.files,
                    where("name", "==", file.name),
                    where("userId", "==", currentUser.uid)
                );

                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const existingDocRef = querySnapshot.docs[0].ref;
                    
                    await updateDoc(existingDocRef, {
                        url: url,
                        modifiedAt: serverTimestamp(),
                        modifiedBy: currentUser.email,
                    });

                } else {
                    const newFileRef = doc(database.files);
                    await setDoc(newFileRef, {
                        url: url,
                        name: file.name,
                        extension: fileExtension,
                        uploadedAt: serverTimestamp(),
                        uploadedBy: currentUser.email,
                        modifiedAt: serverTimestamp(),
                        modifiedBy: currentUser.email,
                        userId: currentUser.uid
                    });
                }
            }
        );
    }

    return (
        <label className="btn btn-outline-primary btn-sm m-0 mr-2">
            Upload file ⬆️
            <input
                type="file" 
                onChange={handleUpload} 
                style={{opacity: 0, position: 'absolute', left: '-9999px'}}
            />
        </label>
    )
}
