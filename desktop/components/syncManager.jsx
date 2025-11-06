import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../contexts/authContext';
import { database, storage } from '../firebase';
import { query, where, serverTimestamp, doc, setDoc, getDocs, updateDoc, onSnapshot, deleteDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";

export default function SyncManager() {
  const { currentUser } = useAuth();
  const [folderPath, setFolderPath] = useState(null);
  const [syncStatus, setSyncStatus] = useState('Not syncing.');
  const [isSyncActive, setIsSyncActive] = useState(false);
  const uploadingFiles = useRef(new Set());

  const uploadFileToFirebase = useCallback(async (file) => {
    if (file == null || !currentUser) return;
    if (uploadingFiles.current.has(file.name)) {
      console.log(`Upload for ${file.name} already in progress. Skipping.`);
      return;
    }

    try {
      uploadingFiles.current.add(file.name);

      setSyncStatus(`Syncing: ${file.name}...`);
      
      const fileName = file.name;
      const fileExtension = fileName.split('.').pop().toLowerCase();
      
      const q = query(database.files, where("name", "==", file.name), where("userId", "==", currentUser.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0].data();
        const localLastModified = file.lastModified;
        const cloudLastModified = docData.modifiedAt?.toDate().getTime();

        if (cloudLastModified) {
          const timeDifference = Math.abs(localLastModified - cloudLastModified);
          if (timeDifference < 2000) { 
            console.log(`Skipping upload for ${file.name}, timestamps match.`);
            return;
          }
        }
      }

      setSyncStatus(`Uploading: ${file.name}...`);
      const storageRef = ref(storage, `files/${currentUser.uid}/${fileName}`); 
      const uploadTask = uploadBytesResumable(storageRef, file);

      await uploadTask;
      const url = await getDownloadURL(uploadTask.snapshot.ref);
      
      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, { 
          url: url, 
          modifiedAt: serverTimestamp(),
          modifiedBy: currentUser.email 
        });
        setSyncStatus(`Synced (updated): ${file.name}`);
      } else {
        const newDocRef = doc(database.files);
        await setDoc(newDocRef, {
          url: url, name: file.name, extension: fileExtension,
          uploadedAt: serverTimestamp(), uploadedBy: currentUser.email,
          modifiedAt: serverTimestamp(), modifiedBy: currentUser.email,
          userId: currentUser.uid
        });
        setSyncStatus(`Synced (new): ${file.name}`);
      }
      
    } catch (error) {
      console.error("Upload failed:", error);
      setSyncStatus(`Error uploading ${file.name}: ${error.message}`);
    } finally {
      uploadingFiles.current.delete(file.name);
    }
  }, [currentUser, setSyncStatus]);

  const deleteFileFromFirebase = useCallback(async (fileName) => {
    if (!currentUser) return;
    setSyncStatus(`Deleting: ${fileName} from cloud...`);
    try {
      const q = query(database.files, where("name", "==", fileName), where("userId", "==", currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setSyncStatus(`Warning: ${fileName} not found in cloud db.`);
      } else {
        const docRef = querySnapshot.docs[0].ref;
        await deleteDoc(docRef);
      }
      
      const storageRef = ref(storage, `files/${currentUser.uid}/${fileName}`);
      await deleteObject(storageRef); 
      
      setSyncStatus(`Deleted: ${fileName} from cloud.`);
    } catch (error) {
      console.error("Delete failed:", error);
      if (error.code === 'storage/object-not-found') {
         setSyncStatus(`Warning: ${fileName} not in storage, DB entry removed.`);
      } else {
         setSyncStatus(`Error deleting ${fileName}: ${error.message}`);
      }
    }
  }, [currentUser]);


    useEffect(() => {
        window.electronAPI.getSavedPath().then(path => {
        if (path) {
            setFolderPath(path);
        }
        });
    }, []);

  const handleSelectFolder = async () => {
    const path = await window.electronAPI.selectFolder();
    if (path) {
      setFolderPath(path);
      setIsSyncActive(false);
    }
  };

  useEffect(() => {
    
    if (isSyncActive && folderPath && currentUser && window.electronAPI) {
      setSyncStatus('Sync starting... Watching for changes.');

      window.electronAPI.startWatching(folderPath);

      const q = query(database.files, where('userId', '==', currentUser.uid));
      const unsubscribeCloud = onSnapshot(q, (snapshot) => {
        setSyncStatus(`Cloud update. Checking ${snapshot.docChanges().length} changes...`);

        if (snapshot.metadata.hasPendingWrites) {
          console.log("Firestore: Ignoring local echo (pending writes).");
          return;
        }

        snapshot.docChanges().forEach((change) => {
          const fileData = change.doc.data();
          const localPath = `${folderPath}/${fileData.name}`;

          if (change.type === 'added' || change.type === 'modified') {
            console.log(`Cloud change detected: ${fileData.name}. Requesting download.`);
            const modifiedAt = fileData.modifiedAt?.toDate().toISOString();
            window.electronAPI.downloadFile({
                url: fileData.url,
                localPath: localPath,
                modifiedAt: modifiedAt
            });
          }
          else if (change.type === 'removed') {
                const fileName = fileData.name;
                console.log(`Cloud change detected (removed): ${fileName}. Requesting local delete.`);
                window.electronAPI.deleteFile(localPath);
            }
        });
    });

      const removeLocalListener = window.electronAPI.onLocalFileChange(
        ({ name, buffer, lastModified }) => {
          const file = new File([buffer], name, { 
            type: buffer.type, 
            lastModified: lastModified 
          });
          uploadFileToFirebase(file);
        }
      );

      const removeDeleteListener = window.electronAPI.onLocalFileDelete(
        ({ name }) => {
          deleteFileFromFirebase(name);
        }
      );
      
      const removeStatusListener = window.electronAPI.onSyncStatus(setSyncStatus);


      return () => {
        setSyncStatus('Sync stopped.');

        if (window.electronAPI) {
          window.electronAPI.stopWatching();
        }
        unsubscribeCloud();
        removeLocalListener();
        removeDeleteListener();
        removeStatusListener();
      };
    }
  
  }, [isSyncActive, folderPath, currentUser, uploadFileToFirebase, deleteFileFromFirebase]);

    const toggleSync = () => {
        if (!folderPath || !currentUser) {
        alert("Please select a folder and log in first.");
        return;
        }
        setIsSyncActive(prevIsActive => !prevIsActive);
    };

  return (
    <div className="p-3 my-3 border rounded bg-light">
      <h5>Sync Status</h5>
      <div className="d-flex gap-3">
        <Button onClick={handleSelectFolder} disabled={!currentUser}>
            {folderPath ? 'Change Sync Folder' : 'Select Sync Folder'}
        </Button>
        <Button onClick={toggleSync} disabled={!currentUser}>
            {isSyncActive ? 'Stop Sync' : 'Start Sync'}
        </Button>
      </div>
      {currentUser && (
        <Alert variant="info" className="mt-2 mb-0" style={{fontSize: '0.9em'}}>
          <p className="mb-1">
            <strong>Folder:</strong> {folderPath || 'None'}
          </p>
          <p className="mb-0">
            <strong>Status:</strong> {syncStatus}
          </p>
        </Alert>
      )}
    </div>
  );
}