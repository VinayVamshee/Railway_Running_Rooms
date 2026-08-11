import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Layout
import Sidebar from './layout/Sidebar';
import Header from './layout/Header';

// Dashboard
import Dashboard from './dashboard/Dashboard';

// Buildings & Beds
import BuildingsList from './buildings/BuildingsList';
import BuildingModal from './buildings/BuildingModal';
import BedGrid from './beds/BedGrid';
import CheckInDrawer from './beds/CheckInDrawer';
import CheckOutDrawer from './beds/CheckOutDrawer';
import { isOccupied } from './beds/BedCard';

// Pages
import ArrivalsPage from './arrivals/ArrivalsPage';
import AnalyticsPage from './analytics/AnalyticsPage';
import ReportsPage from './reports/ReportsPage';

// Admin
import AdminPanel from './admin/AdminPanel';
import AdminLoginModal from './admin/AdminLoginModal';

// Assistant
import AssistantDrawer from './assistant/AssistantDrawer';

// Common
import { useToast } from './common/Toast';
import ConfirmDialog from './common/ConfirmDialog';

// ─── API Base URL ───────────────────────────────────────────────────────────
const API = 'https://railway-running-rooms-server.vercel.app'; 

export default function Home() {
  const toast = useToast();

  // ── Auth state ──────────────────────────────────────────────────────────
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({ username: '', password: '' });
  const [admin, setAdmin] = useState({ username: '', password: '' });
  const [users, setUsers] = useState([]);
  const [showLogin, setShowLogin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');

  // ── Building state ──────────────────────────────────────────────────────
  const [fetchedBuildings, setFetchedBuildings] = useState([]);
  const [loadingBuildings, setLoadingBuildings] = useState(true);
  const [building, setBuilding] = useState({ name: '', noOfRooms: 0 });
  const [editMode, setEditMode] = useState(false);
  const [currentBuildingId, setCurrentBuildingId] = useState(null);
  const [roomNames, setRoomNames] = useState([]);
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [buildingModalLoading, setBuildingModalLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // ── Bed / Room state ────────────────────────────────────────────────────
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedRoomObj, setSelectedRoomObj] = useState(null);
  const [arrivalDetails, setArrivalDetails] = useState({ name: '', day: '', time: '' });
  const [departureDetails, setDepartureDetails] = useState({ day: '', time: '' });
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);
  const [disableSubmit, setDisableSubmit] = useState(false);

  // ── Navigation ──────────────────────────────────────────────────────────
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(null); // For bed grid view

  // ── Assistant ───────────────────────────────────────────────────────────
  const [recording, setRecording] = useState(false);
  const [gptAnswer, setGptAnswer] = useState('');
  const [userQuestion, setUserQuestion] = useState('');
  const [showAssistant, setShowAssistant] = useState(false);

  // ── Theme ────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => localStorage.getItem('rrr-theme') || 'light');

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('rrr-theme', next);
      return next;
    });
  };

  // Apply theme class to <html>
  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'light') html.classList.add('light');
    else html.classList.remove('light');
  }, [theme]);

  // ─────────────────────────────────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = localStorage.getItem('token');
    const at = localStorage.getItem('AdminToken');
    if (t) setIsLoggedIn(true);
    if (at) setIsAdminLoggedIn(true);
    // Apply persisted theme on mount
    const savedTheme = localStorage.getItem('rrr-theme') || 'light';
    if (savedTheme === 'light') document.documentElement.classList.add('light');
    else document.documentElement.classList.remove('light');
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH BUILDINGS
  // ─────────────────────────────────────────────────────────────────────────
  const fetchBuildings = useCallback(async () => {
    if (!token) { setLoadingBuildings(false); return; }
    try {
      setLoadingBuildings(true);
      const res = await axios.get(`${API}/buildings`, { headers: { Authorization: token } });
      setFetchedBuildings(res.data);
    } catch (err) {
      if (err.response?.status !== 401) toast('Failed to fetch buildings', 'error');
    } finally {
      setLoadingBuildings(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { fetchBuildings(); }, [fetchBuildings]);

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH USERS (admin)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const adminToken = localStorage.getItem('AdminToken');
    if (!adminToken) return;
    axios.get(`${API}/getallusers`, { headers: { admintoken: adminToken } })
      .then(res => setUsers(res.data))
      .catch(() => {});
  }, [isAdminLoggedIn]);

  // ─────────────────────────────────────────────────────────────────────────
  // AUTH
  // ─────────────────────────────────────────────────────────────────────────
  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    try {
      setAuthLoading(true);
      const res = await axios.post(`${API}/login`, loginData);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', res.data.user.username);
      setIsLoggedIn(true);
      setShowLogin(false);
      setLoginData({ username: '', password: '' });
      toast('Login successful!', 'success');
      setTimeout(() => fetchBuildings(), 100);
    } catch (err) {
      toast(err.response?.data?.message || 'Login failed', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    setFetchedBuildings([]);
    setActivePage('dashboard');
    toast('Signed out successfully', 'info');
  };

  const handleAdminChange = (e) => {
    const { name, value } = e.target;
    setAdmin(prev => ({ ...prev, [name]: value }));
  };

  const handleAdminLogin = async (e) => {
    e?.preventDefault();
    try {
      setAuthLoading(true);
      const res = await axios.post(`${API}/admin/login`, admin);
      if (res.data.adminToken) {
        localStorage.setItem('AdminToken', res.data.adminToken);
        setIsAdminLoggedIn(true);
        setShowAdminLogin(false);
        setAdmin({ username: '', password: '' });
        toast('Admin login successful', 'success');
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Admin login failed', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('AdminToken');
    setIsAdminLoggedIn(false);
    toast('Admin signed out', 'info');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // BUILDINGS CRUD
  // ─────────────────────────────────────────────────────────────────────────
  const handleBuildingNameChange = (e) => setBuilding(prev => ({ ...prev, name: e.target.value }));

  const handleNumberOfRoomsChange = (e) => {
    const n = parseInt(e.target.value, 10) || 0;
    setBuilding(prev => ({ ...prev, noOfRooms: n }));
    setRoomNames(new Array(n).fill(''));
  };

  const handleRoomNameChange = (e, index) => {
    const updated = [...roomNames];
    updated[index] = e.target.value;
    setRoomNames(updated);
  };

  const resetBuildingForm = () => {
    setBuilding({ name: '', noOfRooms: 0 });
    setEditMode(false);
    setCurrentBuildingId(null);
    setRoomNames([]);
  };

  const handleOpenAddBuilding = () => {
    resetBuildingForm();
    setShowBuildingModal(true);
  };

  const handleEdit = (b) => {
    setBuilding({ name: b.name, noOfRooms: b.rooms.length });
    setRoomNames(b.rooms.map(r => r.roomName || ''));
    setEditMode(true);
    setCurrentBuildingId(b._id);
    setShowBuildingModal(true);
  };

  const handleDelete = (buildingId) => {
    setConfirmDialog({
      title: 'Delete Building',
      message: 'This will permanently delete the building and all its bed data. This action cannot be undone.',
      type: 'danger',
      confirmLabel: 'Delete Building',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await axios.delete(`${API}/buildings/${buildingId}`, { headers: { Authorization: token } });
          toast('Building deleted successfully', 'success');
          fetchBuildings();
          if (selectedBuilding?._id === buildingId) {
            setSelectedBuilding(null);
            setActivePage('buildings');
          }
        } catch (err) {
          toast('Failed to delete building', 'error');
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const handleBuildingSubmit = async (e) => {
    e.preventDefault();
    if (!building.name || building.noOfRooms <= 0) {
      toast('Building name and number of beds are required.', 'error');
      return;
    }
    const roomsData = roomNames.slice(0, building.noOfRooms).map((rn, i) => ({
      roomNumber: i + 1,
      roomName: rn || '',
    }));

    try {
      setBuildingModalLoading(true);
      if (editMode) {
        await axios.put(`${API}/buildings/${currentBuildingId}`, { name: building.name, rooms: roomsData }, { headers: { Authorization: token } });
        toast('Building updated successfully', 'success');
      } else {
        await axios.post(`${API}/buildings`, { name: building.name, rooms: roomsData }, { headers: { Authorization: token } });
        toast('Building created successfully', 'success');
      }
      setShowBuildingModal(false);
      resetBuildingForm();
      fetchBuildings();
    } catch (err) {
      toast('Failed to save building: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setBuildingModalLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // BED CLICK
  // ─────────────────────────────────────────────────────────────────────────
  const handleRoomClick = (room, buildingId) => {
    setSelectedRoom(room._id);
    setSelectedRoomObj(room);
    setCurrentBuildingId(buildingId);

    if (isOccupied(room)) {
      setDepartureDetails({ day: '', time: '' });
      setShowCheckOut(true);
    } else {
      setArrivalDetails({ name: '', day: '', time: '' });
      setShowCheckIn(true);
    }
  };

  const handleArrivalChange = (e) => setArrivalDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleDepartureChange = (e) => setDepartureDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleArrivalSubmit = async () => {
    if (!selectedRoom || !currentBuildingId) { toast('No bed selected', 'error'); return; }
    try {
      setDisableSubmit(true);
      await axios.post(
        `${API}/buildings/${currentBuildingId}/rooms/${selectedRoom}/checkin`,
        { name: arrivalDetails.name, day: arrivalDetails.day, inTime: arrivalDetails.time },
        { headers: { Authorization: token } }
      );
      toast('Check-in recorded successfully!', 'success');
      setShowCheckIn(false);
      setArrivalDetails({ name: '', day: '', time: '' });
      fetchBuildings();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to log check-in', 'error');
    } finally {
      setTimeout(() => setDisableSubmit(false), 3000);
    }
  };

  const handleDepartureSubmit = async () => {
    if (!selectedRoom || !currentBuildingId) { toast('No bed selected', 'error'); return; }
    try {
      setDisableSubmit(true);
      await axios.post(
        `${API}/buildings/${currentBuildingId}/rooms/${selectedRoom}/checkout`,
        { day: departureDetails.day, outTime: departureDetails.time },
        { headers: { Authorization: token } }
      );
      toast('Check-out recorded successfully!', 'success');
      setShowCheckOut(false);
      setDepartureDetails({ day: '', time: '' });
      fetchBuildings();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to log check-out', 'error');
    } finally {
      setTimeout(() => setDisableSubmit(false), 3000);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // EXCEL EXPORT
  // ─────────────────────────────────────────────────────────────────────────
  const downloadUserData = async () => {
    if (!fetchedBuildings || fetchedBuildings.length === 0) {
      toast('No data available to download', 'error');
      return;
    }
    const data = fetchedBuildings.flatMap(b =>
      b.rooms.flatMap(r => {
        if (r.logs.length > 0) {
          return r.logs.map(log => ({
            BuildingName: b.name,
            RoomNumber: r.roomNumber,
            BedName: r.roomName || `Bed ${r.roomNumber}`,
            Name: log.name,
            Day: log.day,
            InTime: log.inTime,
            OutTime: log.outTime || 'Not checked out',
            OutDay: log.outDay || 'Not checked out',
          }));
        }
        return [{ BuildingName: b.name, RoomNumber: r.roomNumber, BedName: r.roomName || `Bed ${r.roomNumber}`, Name: 'No Records', Day: '—', InTime: '—', OutTime: '—', OutDay: '—' }];
      })
    );
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Running Room Data');
    const date = new Date().toLocaleDateString('en-IN').replace(/\//g, '-');
    const fileName = `${username || 'RunningRoom'}_Report_${date}.xlsx`;
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const file = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(file, fileName);
    toast('Report downloaded', 'success');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // VOICE ASSISTANT
  // ─────────────────────────────────────────────────────────────────────────
  const askGPT = async (question) => {
    setUserQuestion(question);
    try {
      const res = await axios.post(`${API}/ask`, { question }, { headers: { Authorization: token } });
      const answer = res.data.answer;
      setGptAnswer(answer);
      const utterance = new SpeechSynthesisUtterance(answer);
      utterance.lang = 'en-IN';
      utterance.rate = 1;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    } catch (err) {
      setGptAnswer('Sorry, unable to get a response from the assistant.');
      console.error('Error asking assistant:', err);
    }
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SpeechRecognition) { toast('Speech recognition not supported in this browser.', 'error'); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const speechText = event.results[0][0].transcript;
      askGPT(speechText);
    };
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setRecording(false);
    };
    recognition.onend = () => setRecording(false);
    recognition.start();
  };

  const toggleRecording = () => {
    const next = !recording;
    setRecording(next);
    if (next) startSpeechRecognition();
  };

  const handleQueryClick = (q) => {
    askGPT(q);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // NAVIGATE
  // ─────────────────────────────────────────────────────────────────────────
  const handleNavigate = (page) => {
    setActivePage(page);
    setSelectedBuilding(null);
  };

  const handleViewBeds = (b) => {
    setSelectedBuilding(b);
    setActivePage('bed-grid');
  };

  const handleBackFromBeds = () => {
    setSelectedBuilding(null);
    setActivePage('buildings');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // STATION REGISTER (admin)
  // ─────────────────────────────────────────────────────────────────────────
  const handleRegisterStation = async () => {
    if (!registerData.username || !registerData.password) {
      toast('Username and password required', 'error');
      return;
    }
    try {
      await axios.post(`${API}/register`, registerData);
      toast('Station registered successfully!', 'success');
      setRegisterData({ username: '', password: '' });
    } catch (err) {
      toast(err.response?.data?.message || 'Registration failed', 'error');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <Dashboard
            fetchedBuildings={fetchedBuildings}
            loading={loadingBuildings}
            isLoggedIn={isLoggedIn}
            onNavigate={handleNavigate}
          />
        );

      case 'buildings':
        return (
          <BuildingsList
            fetchedBuildings={fetchedBuildings}
            loading={loadingBuildings}
            isAdminLoggedIn={isAdminLoggedIn}
            isLoggedIn={isLoggedIn}
            onViewBeds={handleViewBeds}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddBuilding={handleOpenAddBuilding}
          />
        );

      case 'bed-grid':
        if (!selectedBuilding) { handleNavigate('buildings'); return null; }
        return (
          <BedGrid
            building={fetchedBuildings.find(b => b._id === selectedBuilding._id) || selectedBuilding}
            onBedClick={handleRoomClick}
            onBack={handleBackFromBeds}
          />
        );

      case 'arrivals':
        return (
          <ArrivalsPage
            fetchedBuildings={fetchedBuildings}
            onDownload={downloadUserData}
          />
        );

      case 'analytics':
        return <AnalyticsPage fetchedBuildings={fetchedBuildings} />;

      case 'reports':
        return <ReportsPage fetchedBuildings={fetchedBuildings} onDownload={downloadUserData} />;

      case 'admin-buildings':
        return (
          <div className="page-enter">
            <div className="page-header">
              <div className="page-header-row">
                <div>
                  <h2>Manage Buildings</h2>
                  <p>Add, edit, or remove buildings and their bed configurations.</p>
                </div>
                <button className="btn btn-primary" onClick={handleOpenAddBuilding}>+ Add Building</button>
              </div>
            </div>
            <BuildingsList
              fetchedBuildings={fetchedBuildings}
              loading={loadingBuildings}
              isAdminLoggedIn={isAdminLoggedIn}
              isLoggedIn={isLoggedIn}
              onViewBeds={handleViewBeds}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAddBuilding={handleOpenAddBuilding}
            />
          </div>
        );

      case 'admin-users':
        return (
          <>
            <AdminPanel users={users} isAdminLoggedIn={isAdminLoggedIn} />
            <div style={{ marginTop: 20 }}>
              <div className="page-header">
                <h2>Register New Station</h2>
                <p>Create a new user account for a station operator.</p>
              </div>
              <div className="analytics-card" style={{ maxWidth: 400 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Username</label>
                    <input
                      className="form-input"
                      type="text"
                      name="username"
                      placeholder="Station username"
                      value={registerData.username}
                      onChange={e => setRegisterData(prev => ({ ...prev, username: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input
                      className="form-input"
                      type="password"
                      name="password"
                      placeholder="Initial password"
                      value={registerData.password}
                      onChange={e => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                  <button className="btn btn-primary" onClick={handleRegisterStation}>Register Station</button>
                </div>
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  // ── Login screen (unauthenticated) ──────────────────────────────────────
  if (!isLoggedIn && !showLogin) {
    return (
      <div className="auth-overlay">
        <div className="auth-card">
          <div className="auth-logo">🚂</div>
          <div className="auth-title">Railway Running Room</div>
          <div className="auth-sub">SECR Operations Dashboard</div>
          <div className="auth-form">
            <div className="form-group">
              <label className="form-label" htmlFor="main-username">Username</label>
              <input
                id="main-username"
                className="form-input"
                type="text"
                name="username"
                placeholder="Enter your username"
                value={loginData.username}
                onChange={handleLoginChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="main-password">Password</label>
              <input
                id="main-password"
                className="form-input"
                type="password"
                name="password"
                placeholder="Enter your password"
                value={loginData.password}
                onChange={handleLoginChange}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', padding: '11px' }} onClick={handleLogin} disabled={authLoading}>
              {authLoading ? 'Signing in...' : 'Sign In'}
            </button>
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              South East Central Railway · Running Room System
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        isAdminLoggedIn={isAdminLoggedIn}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Header */}
      <Header
        isLoggedIn={isLoggedIn}
        isAdminLoggedIn={isAdminLoggedIn}
        username={username}
        onLogout={handleLogout}
        onAdminLogout={handleAdminLogout}
        onLoginClick={() => setShowLogin(true)}
        onAdminLoginClick={() => setShowAdminLogin(true)}
        onToggleSidebar={() => setSidebarOpen(v => !v)}
        theme={theme}
        onToggleTheme={toggleTheme}

      />

      {/* Main Content */}
      <main className="app-content">
        {renderContent()}
      </main>

      {/* ── Drawers & Modals ────────────────────────────────────────── */}

      {/* Building Add/Edit */}
      <BuildingModal
        isOpen={showBuildingModal}
        onClose={() => { setShowBuildingModal(false); resetBuildingForm(); }}
        onSubmit={handleBuildingSubmit}
        editMode={editMode}
        building={building}
        roomNames={roomNames}
        onBuildingNameChange={handleBuildingNameChange}
        onNumberOfRoomsChange={handleNumberOfRoomsChange}
        onRoomNameChange={handleRoomNameChange}
        loading={buildingModalLoading}
      />

      {/* Check-In Drawer */}
      <CheckInDrawer
        isOpen={showCheckIn}
        onClose={() => { setShowCheckIn(false); setArrivalDetails({ name: '', day: '', time: '' }); }}
        bedName={selectedRoomObj ? (selectedRoomObj.roomName || `Bed ${selectedRoomObj.roomNumber}`) : 'Bed'}
        arrivalDetails={arrivalDetails}
        onArrivalChange={handleArrivalChange}
        onSubmit={handleArrivalSubmit}
        loading={disableSubmit}
      />

      {/* Check-Out Drawer */}
      <CheckOutDrawer
        isOpen={showCheckOut}
        onClose={() => { setShowCheckOut(false); setDepartureDetails({ day: '', time: '' }); }}
        bedName={selectedRoomObj ? (selectedRoomObj.roomName || `Bed ${selectedRoomObj.roomNumber}`) : 'Bed'}
        room={selectedRoomObj}
        departureDetails={departureDetails}
        onDepartureChange={handleDepartureChange}
        onSubmit={handleDepartureSubmit}
        loading={disableSubmit}
      />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={showAdminLogin}
        onClose={() => { setShowAdminLogin(false); setAdmin({ username: '', password: '' }); }}
        onLogin={handleAdminLogin}
        loginData={admin}
        onChange={handleAdminChange}
        loading={authLoading}
      />

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          type={confirmDialog.type}
          confirmLabel={confirmDialog.confirmLabel}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}

      {/* Voice Assistant */}
      <AssistantDrawer
        isOpen={showAssistant}
        onClose={() => setShowAssistant(false)}
        recording={recording}
        onToggleRecording={toggleRecording}
        gptAnswer={gptAnswer}
        userQuestion={userQuestion}
        onQueryClick={handleQueryClick}
      />

      {/* Assistant FAB */}
      <button
        className={`assistant-fab ${recording ? 'recording' : ''}`}
        onClick={() => setShowAssistant(true)}
        aria-label="Open AI Assistant"
      >
        ✨ Ask Assistant
      </button>

    </div>
  );
}
