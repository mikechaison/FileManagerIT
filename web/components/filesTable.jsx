import React from 'react';
import { Table, Spinner, Button } from 'react-bootstrap';
import File from './file'

const supportedExtensions = ["xml", "png"]

const formatTimestamp = (timestamp) => {
    if (!timestamp || !timestamp.toDate) {
        return 'N/A';
    }
    return timestamp.toDate().toLocaleString();
};

const FilesTable = ({ files, loading, handleDownload, handleDelete }) => {
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
        <Table striped bordered hover responsive>
            <thead>
                <tr className="text-center align-middle">
                    <th>Name</th>
                    <th>Uploaded At</th>
                    <th>Uploaded By</th>
                    <th>Modified At</th>
                    <th>Modified By</th>
                    <th>Download</th>
                    <th>Delete</th>
                </tr>
            </thead>
            <tbody>
                {files.map(file => (
                    <tr key={file.id}>
                        <td>
                            {supportedExtensions.includes(file.extension)
                            ? <File file={file} />
                            : file.name }
                        </td>
                        <td>{formatTimestamp(file.uploadedAt)}</td>
                        <td>{file.uploadedBy}</td>
                        <td>{formatTimestamp(file.modifiedAt)}</td>
                        <td>{file.modifiedBy}</td>
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
    );
};

export default FilesTable;