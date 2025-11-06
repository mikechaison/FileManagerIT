import React, { useState, useCallback } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../contexts/authContext';
import { storage, database } from '../firebase';
import { query, where, serverTimestamp, doc, setDoc, getDocs, updateDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

export default function AddFileButton() {
    const { currentUser } = useAuth();
    const [show, setShow] = useState(false);

    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    const uploadFile = async (file) => {
        if (file == null || !currentUser) return;

        const fileName = file.name.replace(/ /g, "_");
        const fileExtension = fileName.split('.').pop().toLowerCase();
        const storageRef = ref(storage, `files/${currentUser.uid}/${fileName}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            "state_changed",
            snapshot => {},
            (error) => {},
            async () => {
                try {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);

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
                } catch (error) {
                    console.error("Error updating Firestore:", error);
                }
            }
        );
    }

    const onDrop = useCallback((acceptedFiles) => {
        if (!acceptedFiles || acceptedFiles.length === 0) return;

        acceptedFiles.forEach(file => {
            uploadFile(file);
        });

        handleClose();
    }, [currentUser]);

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        noClick: true, 
        noKeyboard: true
    });

    const dropzoneStyle = {
        border: '2px dashed #adb5bd',
        borderRadius: '5px',
        padding: '25px',
        textAlign: 'center',
        cursor: 'pointer',
        backgroundColor: isDragActive ? '#e9ecef' : '#fff',
        transition: 'background-color 0.2s ease-in-out'
    };

    return (
        <>
            <Button variant="outline-primary" size="sm" className="m-0 mr-2" onClick={handleShow}>
                Upload files ⬆️
            </Button>

            <Modal show={show} onHide={handleClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Upload Files</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div {...getRootProps({ style: dropzoneStyle })}>
                        <input {...getInputProps()} />
                        
                        {
                            isDragActive ?
                            <p>Drop files here ...</p> :
                            <p>Drop files here or press the button below</p>
                        }
                        
                        <Button variant="primary" onClick={open}>
                            Choose from PC
                        </Button>
                    </div>
                </Modal.Body>
            </Modal>
        </>
    )
}