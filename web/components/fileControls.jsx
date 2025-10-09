import React from 'react';
import { ButtonGroup, Button, Dropdown } from 'react-bootstrap';
import { ArrowDown, ArrowUp } from 'react-bootstrap-icons';

const FileControls = ({ sortOrder, setSortOrder, filterExtension, setFilterExtension }) => {
    return (
        <div className="d-flex justify-content-between align-items-center mb-4">
            <ButtonGroup>
                <Button 
                    variant={sortOrder === 'desc' ? 'primary' : 'outline-secondary'} 
                    onClick={() => setSortOrder('desc')}
                >
                    <ArrowDown /> Descending
                </Button>
                <Button 
                    variant={sortOrder === 'asc' ? 'primary' : 'outline-secondary'} 
                    onClick={() => setSortOrder('asc')}
                >
                    <ArrowUp /> Ascending
                </Button>
            </ButtonGroup>

            <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-basic">
                    Filter: {filterExtension === 'all' ? 'All' : `.${filterExtension}`}
                </Dropdown.Toggle>

                <Dropdown.Menu>
                    <Dropdown.Item onClick={() => setFilterExtension('all')}>All</Dropdown.Item>
                    <Dropdown.Item onClick={() => setFilterExtension('xml')}>.xml</Dropdown.Item>
                    <Dropdown.Item onClick={() => setFilterExtension('png')}>.png</Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>
        </div>
    );
};

export default FileControls;