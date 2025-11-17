import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from '../contexts/authContext'
import { Container, Alert, Row, Col, Button, Spinner } from 'react-bootstrap'
import { storage, database } from '../firebase'
import { query, where, onSnapshot, orderBy, doc, deleteDoc, getDocs } from "firebase/firestore"
import { ref, deleteObject } from "firebase/storage"
import AddFileButton from './addFileButton'
import FilesTable from './filesTable'
import FileManagerNavbar from '../components/navbar'
import FileControls from './fileControls'
import PngPreview from './pngPreview'
import XmlPreview from './xmlPreview'
import SyncManager from './syncManager'


export default function Dashboard() {
    const [error, setError] = useState('')
    const {currentUser, logout} = useAuth()
    const [files, setFiles] = useState([])
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    const [sortOrder, setSortOrder] = useState('desc');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
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

    const handleDownloadAll = async () => {
        if (!currentUser) return;

        try {
            const q = query(database.files, where("userId", "==", currentUser.uid));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                alert("No files to download!");
                return;
            }

            const filesToDownload = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                filesToDownload.push({
                    url: data.url,
                    name: data.name
                });
            });

            if (window.electronAPI && window.electronAPI.downloadMultipleFiles) {
                window.electronAPI.downloadMultipleFiles(filesToDownload);
            }

        } catch (error) {
            alert(error.message);
        }
    };

    const handleDeleteAll = async () => {
        if (!currentUser) return;
        
        const confirmDelete = window.confirm("Are you sure to delete ALL files?");
        if (!confirmDelete) return;

        try {
            const q = query(database.files, where("userId", "==", currentUser.uid));
            const querySnapshot = await getDocs(q);

            const deletePromises = querySnapshot.docs.map(async (document) => {
                const fileData = document.data();
                const fileRef = ref(storage, `files/${currentUser.uid}/${fileData.name.replace(/ /g, "_")}`);
                
                try {
                    await deleteObject(fileRef);
                } catch (err) {}
                await deleteDoc(document.ref);
            });

            await Promise.all(deletePromises);

        } catch (error) {
        }
    };

    useEffect(() => {
        let unsubDownloadAll, unsubDeleteAll, unsubSortAsc, unsubSortDesc;
        let unsubViewAll, unsubViewXml, unsubViewPng;

        if (window.electronAPI) {
            if (window.electronAPI.onTriggerDownloadAll) {
                unsubDownloadAll = window.electronAPI.onTriggerDownloadAll(() => {
                    handleDownloadAll();
                });
            }

            if (window.electronAPI.onTriggerDeleteAll) {
                unsubDeleteAll = window.electronAPI.onTriggerDeleteAll(() => {
                    handleDeleteAll();
                });
            }

            if (window.electronAPI.onTriggerSortAsc) {
                unsubSortAsc = window.electronAPI.onTriggerSortAsc(() => {
                    setSortOrder('asc');
                });
            }

            if (window.electronAPI.onTriggerSortDesc) {
                unsubSortDesc = window.electronAPI.onTriggerSortDesc(() => {
                    setSortOrder('desc');
                });
            }

            if (window.electronAPI.onTriggerViewAll) {
                unsubSortAsc = window.electronAPI.onTriggerViewAll(() => {
                    setFilterExtension('all');
                });
            }

            if (window.electronAPI.onTriggerViewXml) {
                unsubSortAsc = window.electronAPI.onTriggerViewXml(() => {
                    setFilterExtension('xml');
                });
            }

            if (window.electronAPI.onTriggerViewPng) {
                unsubSortAsc = window.electronAPI.onTriggerViewPng(() => {
                    setFilterExtension('png');
                });
            }
        }

        return () => {
            if (unsubDownloadAll) unsubDownloadAll();
            if (unsubDeleteAll) unsubDeleteAll();
            if (unsubSortAsc) unsubSortAsc();
            if (unsubSortDesc) unsubSortDesc();
            if (unsubViewAll) unsubViewAll();
            if (unsubViewXml) unsubViewXml();
            if (unsubViewPng) unsubViewPng();
        };
    }, [currentUser]);

    const handleFileSelect = (file) => {
        setSelectedFile(file);
        
        if (file) {
        setIsPreviewLoading(true);
        } else {
        setIsPreviewLoading(false);
        }
    };

    const handleClosePreview = () => {
        setSelectedFile(null);
        setIsPreviewLoading(false);
    };

    const handlePreviewLoaded = () => {
        setIsPreviewLoading(false);
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
        <Row>
            <Col md={8}>
            <SyncManager />
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
                onFileSelect={handleFileSelect}
            />
            </Col>

            <Col md={4}>
                <h3 className="text-center mb-4">File preview</h3>
                {isPreviewLoading && (
                    <div className="text-center my-3">
                    <Spinner animation="border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </Spinner>
                    </div>
                )}
                <div style={{ display: isPreviewLoading ? 'none' : 'block' }}>
                {selectedFile?.extension=="png" &&
                    (
                    <div>
                        <PngPreview 
                            file={selectedFile}
                            onPreviewLoaded={handlePreviewLoaded}
                            onPreviewError={handlePreviewLoaded} 
                        />
                        <div class="text-center mt-3">
                        <Button 
                            variant="outline-secondary" 
                            size="sm"
                            onClick={handleClosePreview}
                        >
                            Close
                        </Button>
                        </div>
                    </div>
                    )
                }
                {selectedFile?.extension=="xml" &&
                    (
                    <div>
                        <XmlPreview 
                            file={selectedFile}
                            onPreviewLoaded={handlePreviewLoaded}
                            onPreviewError={handlePreviewLoaded} 
                        />
                        <div class="text-center mt-3">
                        <Button 
                            variant="outline-secondary" 
                            size="sm"
                            onClick={handleClosePreview}
                        >
                            Close
                        </Button>
                        </div>
                    </div>
                    )
                }
                </div>
                
            </Col>
        </Row>
        </Container>
      </>
  )
}
