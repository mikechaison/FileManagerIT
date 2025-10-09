import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from '../contexts/authContext'
import { Container, Alert } from 'react-bootstrap'
import { storage, database } from '../firebase'
import { query, where, onSnapshot, orderBy, doc, deleteDoc } from "firebase/firestore"
import { ref, deleteObject } from "firebase/storage"
import AddFileButton from './addFileButton'
import FilesTable from './filesTable'
import FileManagerNavbar from './navbar'
import FileControls from './fileControls'


export default function Dashboard() {
    const [error, setError] = useState('')
    const {currentUser, logout} = useAuth()
    const [files, setFiles] = useState([])
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    const [sortOrder, setSortOrder] = useState('desc'); 
    const [filterExtension, setFilterExtension] = useState('all'); 

    const handleDelete = async (file) => {
        const isConfirmed = window.confirm(`Are you sure to delete ${file.name}?`);
        if (!isConfirmed) return;

        const storageRef = ref(storage, `files/${file.userId}/${file.name}`);
        const docRef = doc(database.files, file.id);

        try {
            await deleteObject(storageRef);
        }
        catch (err) {}
        
        try {
            await deleteDoc(docRef);
        }
        catch (err) {}

        setFiles(currentFiles => currentFiles.filter(f => f.id !== file.id));
    };

    const handleDownload = async (fileUrl, fileName) => {
        const response = await fetch(fileUrl);

        if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const blob = await response.blob();

        const blobUrl = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.URL.revokeObjectURL(blobUrl);
    };

    async function handleLogout()
    {
        setError('')

        try {
            await logout()
            navigate('/login')
        } catch {
            setError('Failed to log out')
        }
    }

    useEffect(() => {
    setLoading(true);

    const queryConstraints = [
        where("userId", "==", currentUser.uid)
    ];

    if (filterExtension !== 'all') {
        queryConstraints.push(where("extension", "==", filterExtension));
    }

    queryConstraints.push(orderBy("uploadedAt", sortOrder));

    const q = query(database.files, ...queryConstraints);

    const unsubscribe = onSnapshot(q, (snapshot) => {
        setFiles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
    }, (err) => {
        console.error(err);
        setError("Failed to fetch files. Check console for details.");
        setLoading(false);
    });

    return () => unsubscribe();
}, [currentUser.uid, sortOrder, filterExtension]);

  return (
      <>
          <FileManagerNavbar
              userEmail={currentUser.email}
              handleLogout={handleLogout}
          />
          <Container className="mt-5">
              <h2 className="text-center mb-4">Virtual disk</h2>
              {error && <Alert variant="danger">{error}</Alert>}
          </Container>
          <Container fluid className="px-5">
                <div className="d-flex align-items-center mb-4">
                    <AddFileButton />
                </div>
                <FileControls 
                    sortOrder={sortOrder}
                    setSortOrder={setSortOrder}
                    filterExtension={filterExtension}
                    setFilterExtension={setFilterExtension}
                />
                <FilesTable 
                    files={files} 
                    loading={loading}
                    handleDownload={handleDownload}
                    handleDelete={handleDelete}  
                />
            </Container>
      </>
  )
}
