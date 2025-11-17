import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FileControls from './fileControls';

jest.mock('react-bootstrap-icons', () => ({
    ArrowDown: () => <span>(ArrowDown)</span>,
    ArrowUp: () => <span>(ArrowUp)</span>,
}));

describe('FileControls Component', () => {
    test('renders correctly and shows default active sort order', () => {
        const setSortOrder = jest.fn();
        const setFilterExtension = jest.fn();

        render(
            <FileControls 
                sortOrder="desc" 
                setSortOrder={setSortOrder} 
                filterExtension="all" 
                setFilterExtension={setFilterExtension} 
            />
        );

        expect(screen.getByText(/Descending/i)).toBeInTheDocument();
        expect(screen.getByText(/Ascending/i)).toBeInTheDocument();
        expect(screen.getByText(/Descending/i).closest('button')).toHaveClass('btn-primary');
        expect(screen.getByText(/Ascending/i).closest('button')).toHaveClass('btn-outline-secondary');
        expect(screen.getByText(/Filter: All/i)).toBeInTheDocument();
    });

    test('[Individual Operation] calls setSortOrder with "asc" on Ascending button click', async () => {
        const user = userEvent.setup();
        const mockSetSortOrder = jest.fn();

        render(
            <FileControls 
                sortOrder="desc" 
                setSortOrder={mockSetSortOrder} 
                filterExtension="all" 
                setFilterExtension={() => {}} 
            />
        );

        const ascendingButton = screen.getByText(/Ascending/i);
        await user.click(ascendingButton);

        expect(mockSetSortOrder).toHaveBeenCalledTimes(1);
        expect(mockSetSortOrder).toHaveBeenCalledWith('asc');
    });

    test('[Individual Operation] calls setFilterExtension with "xml" on dropdown select', async () => {
        const user = userEvent.setup();
        const mockSetFilter = jest.fn();

        render(
            <FileControls 
                sortOrder="desc" 
                setSortOrder={() => {}} 
                filterExtension="all" 
                setFilterExtension={mockSetFilter} 
            />
        );

        const dropdownToggle = screen.getByText(/Filter: All/i);
        await user.click(dropdownToggle);

        const xmlOption = screen.getByText('.xml');
        await user.click(xmlOption);

        expect(mockSetFilter).toHaveBeenCalledTimes(1);
        expect(mockSetFilter).toHaveBeenCalledWith('xml');
    });

    test('shows "Ascending" as active when sortOrder prop is "asc"', () => {
        render(
            <FileControls 
                sortOrder="asc" 
                setSortOrder={() => {}} 
                filterExtension="all" 
                setFilterExtension={() => {}} 
            />
        );

        expect(screen.getByText(/Ascending/i).closest('button')).toHaveClass('btn-primary');
        expect(screen.getByText(/Descending/i).closest('button')).toHaveClass('btn-outline-secondary');
    });

});