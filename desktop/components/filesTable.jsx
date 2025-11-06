import React, { useState } from 'react';
import { Table, Spinner, Button, Form } from 'react-bootstrap';
import File from './file'

const supportedExtensions = ["xml", "png"]

const formatTimestamp = (timestamp) => {
    if (!timestamp || !timestamp.toDate) {
        return 'N/A';
    }
    return timestamp.toDate().toLocaleString();
};

const FilesTable = ({ files, loading, handleDownload, handleDelete, onFileSelect }) => {

    const [showUploadedAt, setShowUploadedAt] = useState(true);
    const [showUploadedBy, setShowUploadedBy] = useState(true);
    const [showModifiedAt, setShowModifiedAt] = useState(true);
    const [showModifiedBy, setShowModifiedBy] = useState(true);

    if (loading) {
        return (
            <div className="text-center">
                <Spinner animation="border" />
                <p>Loading files...</p>
            </div>
        );
    }

    if (files.length === 0) {
        return <p className="text-center mt-5">You haven't uploaded any files yet.</p>;
    }

    return (
        <>
        <Form className="d-flex gap-3 mb-2">
            <Form.Check 
                type="checkbox"
                label="UploadedAt"
                checked={showUploadedAt}
                onChange={(e) => setShowUploadedAt(e.target.checked)}
            />
            <Form.Check 
                type="checkbox"
                label="UploadedBy"
                checked={showUploadedBy}
                onChange={(e) => setShowUploadedBy(e.target.checked)}
            />
            <Form.Check 
                type="checkbox"
                label="ModifiedAt"
                checked={showModifiedAt}
                onChange={(e) => setShowModifiedAt(e.target.checked)}
            />
            <Form.Check 
                type="checkbox"
                label="ModifiedBy"
                checked={showModifiedBy}
                onChange={(e) => setShowModifiedBy(e.target.checked)}
            />
        </Form>

        <Table striped bordered hover responsive>
            <thead>
                <tr className="text-center align-middle">
                    <th>Name</th>
                    {showUploadedAt && (<th>Uploaded At</th>)}
                    {showUploadedBy && (<th>Uploaded By</th>)}
                    {showModifiedAt && (<th>Modified At</th>)}
                    {showModifiedBy && (<th>Modified By</th>)}
                    <th>Download</th>
                    <th>Delete</th>
                </tr>
            </thead>
            <tbody>
                {files.map(file => (
                    <tr key={file.id}>
                        <td>
                            {supportedExtensions.includes(file.extension)
                            ? <File file={file} onSelect={onFileSelect}/>
                            : file.name }
                        </td>
                        {showUploadedAt && (<td>{formatTimestamp(file.uploadedAt)}</td>)}
                        {showUploadedBy && (<td>{file.uploadedBy}</td>)}
                        {showModifiedAt && (<td>{formatTimestamp(file.modifiedAt)}</td>)}
                        {showModifiedBy && (<td>{file.modifiedBy}</td>)}
                        <td className="text-center align-middle">
                            <Button 
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleDownload(file.url, file.name)}
                            >
                                ⬇️
                            </Button>
                        </td>
                        <td className="text-center align-middle">
                            <Button 
                                variant="outline-danger" 
                                size="sm"
                                onClick={() => handleDelete(file)}>
                                ❌
                            </Button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
        </>
    );
};

export default FilesTable;