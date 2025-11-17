import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Dashboard from './dashboard';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  Link: ({ children }) => <a>{children}</a>,
}));

jest.mock('../contexts/authContext', () => ({
  useAuth: jest.fn(() => ({
    currentUser: { uid: 'test-uid', email: 'test@test.com' },
    logout: jest.fn(),
  })),
}));

const mockOnSnapshot = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn((field, op, val) => ({ field, op, val, type: 'where' }));
const mockOrderBy = jest.fn((field, dir) => ({ field, dir, type: 'orderBy' }));

jest.mock('../firebase', () => ({
  storage: {},
  database: { files: 'files-collection-ref' },
}));

jest.mock('firebase/firestore', () => ({
  query: (...args) => {
    mockQuery(...args);
    return 'mock-query-result';
  },
  where: (...args) => mockWhere(...args),
  orderBy: (...args) => mockOrderBy(...args),
  onSnapshot: (q, callback) => {
    callback({ 
        docs: [
            { id: '1', data: () => ({ name: 'file1.png', extension: 'png', uploadedAt: 100 }) }
        ] 
    });
    return mockOnSnapshot;
  },
  doc: jest.fn(),
  deleteDoc: jest.fn(),
  getDocs: jest.fn(),
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  deleteObject: jest.fn(),
}));

jest.mock('./addFileButton', () => () => <div data-testid="add-btn">AddBtn</div>);
jest.mock('../components/navbar', () => () => <div>Navbar</div>);
jest.mock('./syncManager', () => () => <div>SyncManager</div>);
jest.mock('./pngPreview', () => () => <div>PngPreview</div>);
jest.mock('./xmlPreview', () => () => <div>XmlPreview</div>);

jest.mock('./fileControls', () => ({ setSortOrder, setFilterExtension }) => (
  <div>
    <button onClick={() => setSortOrder('asc')}>Set Sort Asc</button>
    <button onClick={() => setFilterExtension('xml')}>Set Filter XML</button>
  </div>
));

jest.mock('./filesTable', () => ({ onFileSelect, files }) => (
  <div>
    <div data-testid="files-count">{files.length}</div>
    <button onClick={() => onFileSelect({ name: 'test.png', extension: 'png' })}>
      Select PNG
    </button>
  </div>
));


describe('Dashboard Component', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
        global.window.electronAPI = {
            onTriggerSortAsc: jest.fn(),
            onTriggerSortDesc: jest.fn(),
            onTriggerViewXml: jest.fn(),
        };
    });

    test('renders and fetches initial data from Firestore', async () => {
        render(<Dashboard />);

        expect(await screen.findByTestId('files-count')).toHaveTextContent('1');

        expect(mockQuery).toHaveBeenCalled();

        const queryArgs = mockQuery.mock.calls[0];
        expect(queryArgs[0]).toBe('files-collection-ref');
        expect(queryArgs[1]).toEqual(expect.objectContaining({ field: 'userId', val: 'test-uid' }));
        expect(queryArgs.find(arg => arg.type === 'orderBy')).toEqual(
            expect.objectContaining({ dir: 'desc' })
        );
    });

    test('[Individual Operation] updates Firestore query when sort order changes via UI', async () => {
        const user = userEvent.setup();
        render(<Dashboard />);

        await screen.findByTestId('files-count');
        mockQuery.mockClear();
        await user.click(screen.getByText('Set Sort Asc'));
        expect(mockQuery).toHaveBeenCalled();
        const newQueryArgs = mockQuery.mock.calls[0];
        const orderByArg = newQueryArgs.find(arg => arg.type === 'orderBy');
        
        expect(orderByArg).toEqual(expect.objectContaining({ dir: 'asc' }));
    });

    test('[Individual Operation] updates filter when receiving Electron menu signal', async () => {
        let triggerXmlCallback;
        
        global.window.electronAPI.onTriggerViewXml.mockImplementation((cb) => {
            triggerXmlCallback = cb;
            return jest.fn();
        });

        render(<Dashboard />);
        await screen.findByTestId('files-count');
        mockQuery.mockClear(); 

        act(() => {
            if (triggerXmlCallback) triggerXmlCallback();
        });

        expect(mockQuery).toHaveBeenCalled();

        const newQueryArgs = mockQuery.mock.calls[0];
        
        const whereArgs = newQueryArgs.filter(arg => arg.type === 'where');
        
        const extensionFilter = whereArgs.find(arg => arg.field === 'extension');
        
        expect(extensionFilter).toBeDefined();
        expect(extensionFilter).toEqual(expect.objectContaining({ val: 'xml' }));
    });

    test('shows PngPreview when a PNG file is selected in the table', async () => {
        const user = userEvent.setup();
        render(<Dashboard />);

        expect(screen.queryByText('PngPreview')).not.toBeInTheDocument();

        await user.click(screen.getByText('Select PNG'));

        expect(screen.getByText('PngPreview')).toBeInTheDocument();
    });

});