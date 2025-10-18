import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ThesisHubHome from './pages/Home'
import SearchResult from './pages/SearchResult'
import Login from './pages/AdminLogin';
import AdminPage from './pages/AdminHomePage';
import AddThesisPage from './pages/AddThesisPage';
import BorrowedThesis from './pages/BorrowedThesis';
import ThesisViewing from './pages/ThesisViewing';
import UserDashboard from './pages/UserDashboard';
import UserAccountSettings from './pages/UserAccountSettings';
import UserLogin from './pages/UserLogin';
import UserSignup from './pages/UserSignup';
import UserHistory from './pages/UserHistory';
import BorrowRequest from './components/BorrowRequest';
import SmartIoTBookshelf from './pages/SmartIoTBookshelf';
import AdminAccountSettings from './pages/AdminAccountSettings';

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ThesisHubHome />} />
        <Route path="/results" element={<SearchResult />} />


        <Route path="/admin-login" element={<Login />} />
        <Route path="/admin-homepage" element={<AdminPage />} />
        <Route path="/add-thesis-page" element={<AddThesisPage />} />

        <Route path="/borrowed-thesis" element={<BorrowedThesis />} />
        <Route path="/borrow-request" element={<BorrowRequest />} />

        <Route path="/thesis-viewing" element={<ThesisViewing />} />
        <Route path="/smart-iot-bookshelf" element={<SmartIoTBookshelf />} />
        <Route path="/admin-account-settings" element={<AdminAccountSettings />} />


        <Route path="/user-login" element={<UserLogin />} />
        <Route path="/user-signup" element={<UserSignup />} />
        <Route path="/user-dashboard" element={<UserDashboard />} />
        <Route path="/user-history" element={<UserHistory />} />
        <Route path="/user-settings" element={<UserAccountSettings />} />

        
        

      </Routes>
    </BrowserRouter>
  )
}

export default App
