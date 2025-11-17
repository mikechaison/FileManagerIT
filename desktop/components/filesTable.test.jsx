import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import FilesTable from './filesTable';

jest.mock('./file', () => ({
  __esModule: true,
  default: ({ file, onSelect }) => (
    <a href="#" onClick={() => onSelect(file)}>
      {file.name}
    </a>
  ),
}));


const mockTimestamp = (date) => ({
  toDate: () => new Date(date),
});

const mockFiles = [
  {
    id: '1',
    name: 'document.xml',
    extension: 'xml',
    url: 'http://example.com/doc.xml',
    uploadedAt: mockTimestamp('2023-01-01T10:00:00Z'),
    uploadedBy: 'user@example.com',
    modifiedAt: mockTimestamp('2023-01-02T11:00:00Z'),
    modifiedBy: 'admin@example.com',
  },
  {
    id: '2',
    name: 'image.png',
    extension: 'png',
    url: 'http://example.com/img.png',
    uploadedAt: mockTimestamp('2023-01-03T12:00:00Z'),
    uploadedBy: 'user2@example.com',
    modifiedAt: mockTimestamp('2023-01-04T13:00:00Z'),
    modifiedBy: 'user2@example.com',
  }
];

describe('FilesTable Component', () => {

    const mockHandleDownload = jest.fn();
    const mockHandleDelete = jest.fn();
    const mockOnFileSelect = jest.fn();

    beforeEach(() => {
        mockHandleDownload.mockClear();
        mockHandleDelete.mockClear();
        mockOnFileSelect.mockClear();
    });

    test('renders loading spinner when loading is true', () => {
        render(
            <FilesTable 
                files={[]} 
                loading={true} 
                handleDownload={mockHandleDownload} 
                handleDelete={mockHandleDelete} 
                onFileSelect={mockOnFileSelect} 
            />
        );

        expect(screen.getByText(/Loading files.../i)).toBeInTheDocument();
        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    test('renders empty message when no files are present and not loading', () => {
        render(
            <FilesTable 
                files={[]} 
                loading={false} 
                handleDownload={mockHandleDownload} 
                handleDelete={mockHandleDelete} 
                onFileSelect={mockOnFileSelect} 
            />
        );

        expect(screen.getByText(/You haven't uploaded any files yet/i)).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    test('[Individual Operation] calls handleDelete prop with correct file on delete button click', async () => {
        const user = userEvent.setup();
        render(
            <FilesTable 
                files={mockFiles} 
                loading={false} 
                handleDownload={mockHandleDownload} 
                handleDelete={mockHandleDelete} 
                onFileSelect={mockOnFileSelect} 
            />
        );

        const deleteButtons = screen.getAllByRole('button', { name: /❌/i });
        expect(deleteButtons).toHaveLength(2);
        await user.click(deleteButtons[0]);
        expect(mockHandleDelete).toHaveBeenCalledTimes(1);
        expect(mockHandleDelete).toHaveBeenCalledWith(mockFiles[0]);
    });

    test('[Individual Operation] hides "Uploaded At" column when checkbox is unchecked', async () => {
        const user = userEvent.setup();
        render(
            <FilesTable 
                files={mockFiles} 
                loading={false} 
                handleDownload={mockHandleDownload} 
                handleDelete={mockHandleDelete} 
                onFileSelect={mockOnFileSelect} 
            />
        );

        expect(screen.getByRole('columnheader', { name: /Uploaded At/i })).toBeInTheDocument();
        const checkbox = screen.getByLabelText(/UploadedAt/i);
        expect(checkbox).toBeChecked();
        await user.click(checkbox);
        expect(checkbox).not.toBeChecked();
        expect(screen.queryByRole('columnheader', { name: /Uploaded At/i })).not.toBeInTheDocument();
    });
});