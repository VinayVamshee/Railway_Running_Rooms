import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';


export default function Home() {
    const [building, setBuilding] = useState({ name: '', noOfRooms: 0 });
    const [fetchedBuildings, setFetchedBuildings] = useState([]);
    const [editMode, setEditMode] = useState(false);
    const [currentBuildingId, setCurrentBuildingId] = useState(null);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [arrivalDetails, setArrivalDetails] = useState({ day: '', time: '' });
    const [departureDetails, setDepartureDetails] = useState({ day: '', time: '' });
    const [roomNames, setRoomNames] = useState([]);

    const token = localStorage.getItem('token');

    const fetchBuildings = useCallback(async () => {
        try {
            const response = await axios.get('http://localhost:3001/buildings', {
                headers: { Authorization: token }
            });
            setFetchedBuildings(response.data);
        } catch (error) {
        }
    }, [token]);


    useEffect(() => {
        fetchBuildings();
    }, [fetchBuildings]);

    const handleBuildingNameChange = (e) => {
        setBuilding((prev) => ({ ...prev, name: e.target.value }));
    };

    const handleNumberOfRoomsChange = (e) => {
        const numberOfRooms = parseInt(e.target.value, 10);
        setBuilding((prev) => ({ ...prev, noOfRooms: numberOfRooms }));

        setRoomNames(new Array(numberOfRooms).fill(''));
    };

    const handleRoomNameChange = (e, index) => {
        const newRoomNames = [...roomNames];
        newRoomNames[index] = e.target.value;
        setRoomNames(newRoomNames);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!building.name || building.noOfRooms <= 0) {
            alert('Building name and room names are required.');
            return;
        }

        const roomsData = Array.from({ length: building.noOfRooms }, (_, index) => ({
            roomNumber: index + 1,
            roomName: roomNames[index] || '',
        }));

        try {
            if (editMode) {
                const userConfirmed = window.confirm(
                    "Please be advised that editing the building will result in the deletion of all associated data, including logs for the building and its rooms. We strongly recommend downloading the relevant Excel sheet prior to making any changes. Do you wish to proceed with the edits?"
                );

                if (userConfirmed) {
                    const response = await axios.put(`http://localhost:3001/buildings/${currentBuildingId}`, {
                        name: building.name,
                        rooms: roomsData,
                    }, {
                        headers: {
                            Authorization: token,
                        },
                    });
                    console.log("Building updated successfully:", response.data);
                }
            } else {
                // eslint-disable-next-line
                const response = await axios.post('http://localhost:3001/buildings', {
                    name: building.name,
                    rooms: roomsData,
                }, {
                    headers: {
                        Authorization: token,
                    },
                });
            }

            fetchBuildings();
            resetForm();
            window.location.reload();

        } catch (error) {
            alert('Error submitting building and rooms: ' + error.message);
        }
    };

    const handleEdit = (building) => {
        const roomNames = building.rooms.map(room => room.roomName || ''); 
    
        setBuilding({ name: building.name, noOfRooms: building.rooms.length });
        setRoomNames(roomNames);
        setEditMode(true);
        setCurrentBuildingId(building._id);
    
        const modal = new window.bootstrap.Modal(document.getElementById('BuildingRoomsModal'));
        modal.show();
    };
    
    const handleDelete = async (buildingId) => {
        if (window.confirm('Are you sure you want to delete this building?')) {
            try {
                await axios.delete(`http://localhost:3001/buildings/${buildingId}`, {
                    headers: { Authorization: token }
                });
                alert('Building deleted successfully!');
                fetchBuildings();
            } catch (error) {
            }
        }
    };

    const handleRoomClick = (room, buildingId) => {
        setSelectedRoom(room._id);
        setCurrentBuildingId(buildingId);

        const arrivalLogs = room.logs.filter(log => log.inTime);
        const departureLogs = room.logs.filter(log => log.outTime);

        if (arrivalLogs.length === departureLogs.length) {
            setArrivalDetails({ day: '', time: '' });
            const arrivalModal = new window.bootstrap.Modal(document.getElementById('arrivalModal'));
            arrivalModal.show();
        } else if (arrivalLogs.length > departureLogs.length) {
            setDepartureDetails({ day: '', time: '' });
            const departureModal = new window.bootstrap.Modal(document.getElementById('departureModal'));
            departureModal.show();
        } else {
            alert('Error: Inconsistent logs detected.');
        }
    };

    const handleArrivalChange = (e) => {
        setArrivalDetails((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleDepartureChange = (e) => {
        setDepartureDetails((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleArrivalSubmit = async (e) => {
        e.preventDefault();
        if (selectedRoom === null || !currentBuildingId) {
            alert('Please select a building and a room.');
            return;
        }

        try {
            await axios.post(`http://localhost:3001/buildings/${currentBuildingId}/rooms/${selectedRoom}/checkin`, {
                day: arrivalDetails.day,
                inTime: arrivalDetails.time,
            }, { headers: { Authorization: token } });

            alert('Arrival time logged successfully!');
            setArrivalDetails({ day: '', time: '' });
            const arrivalModal = window.bootstrap.Modal.getInstance(document.getElementById('arrivalModal'));
            arrivalModal.hide();
            window.location.reload();
        } catch (error) {
            alert('Error logging arrival: ' + (error.response ? error.response.data.message : error.message));
        }
    };

    const handleDepartureSubmit = async (e) => {
        e.preventDefault();
        if (selectedRoom === null || !currentBuildingId) {
            alert('Please select a building and a room.');
            return;
        }

        try {
            await axios.post(
                `http://localhost:3001/buildings/${currentBuildingId}/rooms/${selectedRoom}/checkout`,
                {
                    day: departureDetails.day,
                    outTime: departureDetails.time,
                },
                { headers: { Authorization: token } }
            );

            alert('Departure time logged successfully!');

            setDepartureDetails({ day: '', time: '' });
            const departureModal = window.bootstrap.Modal.getInstance(document.getElementById('departureModal'));
            departureModal.hide();

            window.location.reload();
        } catch (error) {
            alert('Error logging departure: ' + (error.response ? error.response.data.message : error.message));
        }
    };

    const resetForm = () => {
        setBuilding({ name: '', noOfRooms: 0 });
        setEditMode(false);
        setCurrentBuildingId(null);
    };

    const calculateAvailableRooms = (rooms) => {
        return rooms.filter(room => room.logs.filter(log => log.inTime).length === room.logs.filter(log => log.outTime).length).length;
    };

    const [loginData, setLoginData] = useState({ username: '', password: '' });
    const [registerData, setRegisterData] = useState({ username: '', password: '' });

    const handleLoginChange = (e) => {
        const { name, value } = e.target;
        setLoginData((prevData) => ({ ...prevData, [name]: value }));
    };

    const handleRegisterChange = (e) => {
        const { name, value } = e.target;
        setRegisterData((prevData) => ({ ...prevData, [name]: value }));
    };

    const handleLogin = async () => {
        try {
            const response = await axios.post('http://localhost:3001/login', loginData);
            alert('Login successful!');
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('username', response.data.user.username);
            window.location.reload();
        } catch (error) {
            alert(error.response?.data.message || 'Login failed');
        }
    };

    const handleRegister = async () => {
        try {
            // eslint-disable-next-line
            const response = await axios.post('http://localhost:3001/register', registerData);
            alert('Registration successful!');
            window.location.reload();
        } catch (error) {
            alert(error.response?.data.message || 'Registration failed');
        }
    };

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            setIsLoggedIn(true);
        }
        const Admintoken = localStorage.getItem('AdminToken');
        if (Admintoken) {
            setIsAdminLoggedIn(!!Admintoken);
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        window.location.reload();
    };

    const downloadUserData = async () => {
        try {
            const buildings = fetchedBuildings;

            if (!buildings || buildings.length === 0) {
                alert('No data available to download');
                return;
            }
            const data = buildings.flatMap((building) =>
                building.rooms.flatMap((room) => {
                    if (room.logs.length > 0) {
                        return room.logs.map(log => ({
                            BuildingName: building.name,
                            RoomNumber: room.roomNumber,
                            Day: log.day,
                            InTime: log.inTime,
                            OutTime: log.outTime || 'No OutTime',
                            OutDay: log.outDay || 'No OutDay',
                        }));
                    } else {
                        return [{
                            BuildingName: building.name,
                            RoomNumber: room.roomNumber,
                            Day: 'No Logs',
                            InTime: 'No Logs',
                            OutTime: 'No Logs',
                            OutDay: 'No Logs',
                        }];
                    }
                })
            );

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'User Data');

            const username = localStorage.getItem('username');
            const date = new Date().toLocaleDateString().replace(/\//g, '-');
            const fileName = `${username}_Data_${date}.xlsx`;

            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const file = new Blob([excelBuffer], { type: 'application/octet-stream' });
            saveAs(file, fileName);
        } catch (error) {
            console.error('Error downloading user data:', error);
            alert('Error downloading user data: ' + error.message);
        }
    };

    const username = localStorage.getItem('username');

    const [selectedDate, setSelectedDate] = useState('');
    const [peakHours, setPeakHours] = useState([]);

    const handleDateChange = (event) => {
        setSelectedDate(event.target.value);
    };

    const calculatePeakHours = () => {
        const hourCounts = Array(24).fill(0);

        fetchedBuildings.forEach(building => {
            building.rooms.forEach(room => {
                room.logs.forEach(log => {
                    const logDay = new Date(log.day);
                    const selected = new Date(selectedDate);
                    const logOutDay = log.outDay ? new Date(log.outDay) : null;

                    if (selected >= logDay && (!logOutDay || selected <= logOutDay)) {
                        const inHour = selected.toDateString() === logDay.toDateString()
                            ? parseInt(log.inTime.split(':')[0], 10)
                            : 0;

                        const outHour = logOutDay && selected.toDateString() === logOutDay.toDateString()
                            ? parseInt(log.outTime.split(':')[0], 10)
                            : 23;

                        for (let hour = inHour; hour <= outHour; hour++) {
                            hourCounts[hour]++;
                        }
                    }
                });
            });
        });

        const formatTime = (hour) => {
            const period = hour >= 12 ? 'PM' : 'AM';
            const formattedHour = hour % 12 || 12;
            return `${formattedHour}:00 ${period}`;
        };
        const peakHoursResult = hourCounts
            .map((count, hour) => `Time: ${formatTime(hour)} - Occupied Rooms: ${count}`)
            .filter(entry => entry.includes('Occupied Rooms:'));

        setPeakHours(peakHoursResult);
    };

    const [arrivalDepartureData, setArrivalDepartureData] = useState([]);

    const fetchArrivalDepartureData = () => {
        const data = [];
        const today = new Date();
        const past30Days = new Date();
        past30Days.setDate(today.getDate() - 30);

        const todayString = today.toISOString().split('T')[0];
        const past30DaysString = past30Days.toISOString().split('T')[0];

        fetchedBuildings.forEach(building => {
            console.log(`Checking building: ${building.name}`);
            building.rooms.forEach(room => {
                console.log(`  Checking room: ${room.roomNumber}`);
                room.logs.forEach(log => {
                    console.log(`    Checking log for day: ${log.day}`);
                    if (log.day >= past30DaysString && log.day <= todayString) {
                        data.push({
                            buildingName: building.name,
                            roomNumber: room.roomNumber,
                            inTime: log.inTime,
                            outTime: log.outTime || "No OutTime",
                            day: log.day,
                            outDay: log.outDay || "No OutDay"
                        });
                    }
                });
            });
        });

        setArrivalDepartureData(data);
        console.log("Collected Arrival and Departure Data: ", data);
    };

    const handleShowModal = () => {
        setArrivalDepartureData([]);
        fetchArrivalDepartureData();
    };

    const [admin, setAdmin] = useState({ username: '', password: '' });
    const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setAdmin((prevAdmin) => ({ ...prevAdmin, [name]: value }));
    };

    const handleAdminRegister = async (e) => {
        e.preventDefault();
        try {// eslint-disable-next-line
            const response = await axios.post('http://localhost:3001/admin/register', admin);
            setAdmin({ username: '', password: '' });
        } catch (error) {
        }
    };

    const handleAdminLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:3001/admin/login', admin);
            if (response.data.adminToken) {
                localStorage.setItem('AdminToken', response.data.adminToken);
                setIsAdminLoggedIn(true);
                window.location.reload();
            }
            setAdmin({ username: '', password: '' });
        } catch (error) {
        }
    };

    const handleAdminLogout = () => {
        localStorage.removeItem('AdminToken');
        setIsAdminLoggedIn(false);
        window.location.reload();
    };

    const [users, setUsers] = useState([]);

    useEffect(() => {
        const fetchUsers = async () => {
            const adminToken = localStorage.getItem('AdminToken');

            try {
                const response = await axios.get('http://localhost:3001/getallusers', {
                    headers: { 'admintoken': adminToken }
                });
                setUsers(response.data);
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };

        fetchUsers();
    }, []);

    return (
        <div className='Home'>
            {isLoggedIn ? (
                <>
                    <div className='navbar'>
                        <h3>{username}</h3>
                        <button type="button" className="btn btn-primary" data-bs-toggle="modal" data-bs-target="#BuildingRoomsModal" onClick={resetForm}>
                            Add Building and Rooms
                        </button>

                        <button type="button" className="btn btn-warning" data-bs-toggle="modal" data-bs-target="#PeakTimeModal">
                            Peak Time
                        </button>

                        {/* Modal */}
                        <div className="modal fade" id="PeakTimeModal" tabIndex="-1" aria-labelledby="PeakTimeModalLabel" aria-hidden="true">
                            <div className="modal-dialog">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h1 className="modal-title fs-5" id="PeakTimeModalLabel">Peak Time</h1>
                                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                    </div>
                                    <div className="modal-body">
                                        <input
                                            type="date"
                                            className="form-control mb-3"
                                            value={selectedDate}
                                            onChange={handleDateChange}
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={calculatePeakHours}
                                        >
                                            Calculate Peak Hours
                                        </button>
                                        <ul className="peaktime">
                                            {peakHours.length > 0 && (
                                                <table className="table peaktime">
                                                    <thead>
                                                        <tr>
                                                            <th>Time</th>
                                                            <th>No. of Occupied Rooms</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {peakHours.map((hourData, index) => {
                                                            const [time, count] = hourData.replace('Time: ', '').replace(' - Occupied Rooms: ', ',').split(',');
                                                            return (
                                                                <tr key={index}>
                                                                    <td>{time}</td>
                                                                    <td>{count}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            )}

                                        </ul>
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button type="button" className="btn btn-warning" data-bs-toggle="modal" data-bs-target="#Date&TimeModal" onClick={handleShowModal}>
                            Show Arrival & Departure
                        </button>

                        {/* Modal for Arrival & Departure */}
                        <div className="modal fade" id="Date&TimeModal" tabindex="-1" aria-labelledby="Date&TimeModalLabel" aria-hidden="true">
                            <div className="modal-dialog modal-xl">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h1 className="modal-title fs-5" id="Date&TimeModalLabel">Arrival & Departure Times</h1>
                                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                    </div>
                                    <div className="modal-body">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Building Name</th>
                                                    <th>Room Number</th>
                                                    <th>Day</th>
                                                    <th>Arrival Time</th>
                                                    <th>Out Day</th>
                                                    <th>Departure Time</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {arrivalDepartureData.map((entry, index) => (
                                                    <tr key={index}>
                                                        <td>{entry.buildingName}</td>
                                                        <td>{entry.roomNumber}</td>
                                                        <td>{entry.day}</td>
                                                        <td>{entry.inTime}</td>
                                                        <td>{entry.outDay}</td>
                                                        <td>{entry.outTime}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {
                            isAdminLoggedIn ?
                                <button type="button" className="btn btn-primary" data-bs-toggle="modal" data-bs-target="#RegisterModal">
                                    Register Station
                                </button> :
                                null
                        }
                        <button type="button" className="btn btn-danger" onClick={handleLogout}>
                            Logout
                        </button>

                        {/* Register Modal */}
                        <div className="modal fade" id="RegisterModal" tabIndex="-1" aria-labelledby="RegisterModalLabel" aria-hidden="true">
                            <div className="modal-dialog">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h5 className="modal-title" id="RegisterModalLabel">Register</h5>
                                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                    </div>
                                    <div className="modal-body">
                                        <form>
                                            <div className="mb-3">
                                                <label htmlFor="registerUsername" className="form-label">Username</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    id="registerUsername"
                                                    name="username"
                                                    value={registerData.username}
                                                    onChange={handleRegisterChange}
                                                    required
                                                />
                                            </div>
                                            <div className="mb-3">
                                                <label htmlFor="registerPassword" className="form-label">Password</label>
                                                <input
                                                    type="password"
                                                    className="form-control"
                                                    id="registerPassword"
                                                    name="password"
                                                    value={registerData.password}
                                                    onChange={handleRegisterChange}
                                                    required
                                                />
                                            </div>
                                            <button type="button" className="btn btn-primary" onClick={handleRegister}>
                                                Register
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button className="btn btn-primary" data-bs-toggle="modal" data-bs-target="#AdminLoginModal">
                            Admin Login
                        </button>

                        {/* Admin Login Modal */}
                        <div className="modal fade" id="AdminLoginModal" tabIndex="-1" aria-labelledby="AdminLoginLabel" aria-hidden="true">
                            <div className="modal-dialog">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h5 className="modal-title" id="AdminLoginLabel">Admin Login</h5>
                                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                    </div>
                                    <div className="modal-body">
                                        {
                                            isAdminLoggedIn ?
                                                <>
                                                    <h2>User List</h2>
                                                    <table className="table">
                                                        <thead>
                                                            <tr>
                                                                <th>Username</th>
                                                                <th>Password</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {users.map((user, index) => (
                                                                <tr key={index}>
                                                                    <td>{user.username}</td>
                                                                    <td>{user.password}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </>
                                                :
                                                <>
                                                    <form onSubmit={handleAdminLogin}>
                                                        <div className="mb-3">
                                                            <label htmlFor="loginUsername" className="form-label">Username</label>
                                                            <input
                                                                type="text"
                                                                className="form-control"
                                                                id="loginUsername"
                                                                name="username"
                                                                value={admin.username}
                                                                onChange={handleChange}
                                                                required
                                                            />
                                                        </div>
                                                        <div className="mb-3">
                                                            <label htmlFor="loginPassword" className="form-label">Password</label>
                                                            <input
                                                                type="password"
                                                                className="form-control"
                                                                id="loginPassword"
                                                                name="password"
                                                                value={admin.password}
                                                                onChange={handleChange}
                                                                required
                                                            />
                                                        </div>
                                                        <button type="submit" className="btn btn-primary">Login</button>
                                                    </form>
                                                </>
                                        }
                                    </div>
                                    {
                                        isAdminLoggedIn ?
                                            <div className="modal-footer">
                                                <button className="btn btn-link" data-bs-toggle="modal" data-bs-target="#AdminRegisterModal" data-bs-dismiss="modal">
                                                    Register as Admin
                                                </button>
                                            </div>
                                            :
                                            null
                                    }

                                </div>
                            </div>
                        </div>

                        {/* Admin Register Modal */}
                        <div className="modal fade" id="AdminRegisterModal" tabIndex="-1" aria-labelledby="AdminRegisterLabel" aria-hidden="true">
                            <div className="modal-dialog">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h5 className="modal-title" id="AdminRegisterLabel">Admin Register</h5>
                                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                    </div>
                                    <div className="modal-body">
                                        <form onSubmit={handleAdminRegister}>
                                            <div className="mb-3">
                                                <label htmlFor="registerUsername" className="form-label">Username</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    id="registerUsername"
                                                    name="username"
                                                    value={admin.username}
                                                    onChange={handleChange}
                                                    required
                                                />
                                            </div>
                                            <div className="mb-3">
                                                <label htmlFor="registerPassword" className="form-label">Password</label>
                                                <input
                                                    type="password"
                                                    className="form-control"
                                                    id="registerPassword"
                                                    name="password"
                                                    value={admin.password}
                                                    onChange={handleChange}
                                                    required
                                                />
                                            </div>
                                            <button type="submit" className="btn btn-primary">Register</button>
                                        </form>
                                    </div>
                                    <div className="modal-footer">
                                        <button className="btn btn-link" data-bs-toggle="modal" data-bs-target="#AdminLoginModal" data-bs-dismiss="modal">
                                            Back to Login
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {isAdminLoggedIn && (
                            <button type="button" className="btn btn-outline-danger" onClick={handleAdminLogout}>
                                Admin Logout
                            </button>
                        )}

                    </div>

                    {/* Modal for adding or editing buildings */}
                    <div className="modal fade" id="BuildingRoomsModal" tabIndex="-1" aria-labelledby="BuildingRoomsModalLabel" aria-hidden="true">
                        <div className="modal-dialog">
                            <div className="modal-content">
                                <form onSubmit={handleSubmit}>
                                    <div className="modal-header">
                                        <h1 className="modal-title fs-5" id="BuildingRoomsModalLabel">{editMode ? 'Edit Building and Rooms' : 'Add Building and Rooms'}</h1>
                                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" onClick={resetForm}></button>
                                    </div>
                                    <div className="modal-body">
                                        <label>Building Name:</label>
                                        <input type="text" value={building.name} onChange={handleBuildingNameChange} required />
                                        <label>Input total number of rooms:</label>
                                        <input type="number" value={building.noOfRooms} onChange={handleNumberOfRoomsChange} min="0" required />

                                        {/* Dynamically create room name inputs */}
                                        {Array.from({ length: building.noOfRooms }, (_, index) => (
                                            <div className='roomname' key={index}>
                                                <label>Room {index + 1} Name:</label>
                                                <input
                                                    type="text"
                                                    value={roomNames[index] || ''}
                                                    onChange={(e) => handleRoomNameChange(e, index)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" onClick={resetForm}>Close</button>
                                        <button type="submit" className='btn btn-primary'>{editMode ? 'Update Building' : 'Submit Building and Rooms'}</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>


                    <div className='Buildings'>
                        {fetchedBuildings && (
                            <>
                                {fetchedBuildings.map((building, index) => {
                                    const availableRooms = calculateAvailableRooms(building.rooms);
                                    return (
                                        <div className='building-info' key={index}>
                                            <h4>{building.name}</h4>
                                            <p>Total Rooms: {building.rooms.length}
                                                <br />Available Rooms: <strong>{availableRooms}</strong></p>
                                            <div className='EditOption'>
                                                <button className='btn btn-outline-primary' onClick={() => handleEdit(building)}>Edit</button>
                                                <button className='btn btn-outline-danger' onClick={() => handleDelete(building._id)}>Delete</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>

                    {/* Modal for arrival details */}
                    <div className="modal fade" id="arrivalModal" tabIndex="-1" aria-labelledby="arrivalModalLabel" aria-hidden="true">
                        <div className="modal-dialog">
                            <div className="modal-content">
                                <form onSubmit={handleArrivalSubmit}>
                                    <div className="modal-header">
                                        <h1 className="modal-title fs-5" id="arrivalModalLabel">Arrival Details</h1>
                                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                    </div>
                                    <div className="modal-body">
                                        <label>Day of Arrival:</label>
                                        <input type="date" name="day" onChange={handleArrivalChange} required />
                                        <label>Time of Arrival:</label>
                                        <input type="time" name="time" onChange={handleArrivalChange} required />
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                        <button type="submit" className='btn btn-primary'>Submit Arrival</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Modal for departure details */}
                    <div className="modal fade" id="departureModal" tabIndex="-1" aria-labelledby="departureModalLabel" aria-hidden="true">
                        <div className="modal-dialog">
                            <div className="modal-content">
                                <form onSubmit={handleDepartureSubmit}>
                                    <div className="modal-header">
                                        <h1 className="modal-title fs-5" id="departureModalLabel">Departure Details</h1>
                                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                    </div>
                                    <div className="modal-body">
                                        <label>Day of Departure:</label>
                                        <input type="date" name="day" onChange={handleDepartureChange} required />
                                        <label>Time of Departure:</label>
                                        <input type="time" name="time" onChange={handleDepartureChange} required />
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                        <button type="submit" className='btn btn-primary'>Submit Departure</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    <h2>Buildings:</h2>
                    <div className="building-boxes">
                        {fetchedBuildings && fetchedBuildings.map((building, index) => (
                            <div key={index} className="building-box">
                                <h3>{building.name} Wing</h3>
                                <div className="room-boxes">
                                    {building.rooms.map((room) => {
                                        const arrivalLogs = room.logs.filter(log => log.inTime);
                                        const departureLogs = room.logs.filter(log => log.outTime);
                                        const roomClass = arrivalLogs.length > departureLogs.length ? 'room-box occupied' : 'room-box free';

                                        return (
                                            <button
                                                key={room._id}
                                                className={`${roomClass} btn`}
                                                onClick={() => handleRoomClick(room, building._id)}>
                                                {room.roomName || `Room ${room.roomNumber}`}
                                            </button>
                                        );
                                    })}

                                </div>
                            </div>
                        ))}
                    </div>
                    <button className='btn btn-success mt-2' onClick={downloadUserData}>Download Excel Sheet</button>
                </>
            ) : (
                <>
                    <button type="button" className="btn btn-primary" data-bs-toggle="modal" data-bs-target="#LoginModal">
                        Login
                    </button>
                    <button className="btn btn-primary ms-2" data-bs-toggle="modal" data-bs-target="#AdminLoginModal">
                        Admin Login
                    </button>
                    {
                        isAdminLoggedIn ?
                            <button type="button" className="btn btn-outline-danger ms-2" onClick={handleAdminLogout}>
                                Admin Logout
                            </button>
                            :
                            null
                    }
                    <div className="modal fade" id="LoginModal" tabIndex="-1" aria-labelledby="LoginModalLabel" aria-hidden="true">
                        <div className="modal-dialog">
                            <div className="modal-content">
                                <form>
                                    <div className="modal-header">
                                        <h5 className="modal-title" id="LoginModalLabel">Login</h5>
                                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                    </div>
                                    <div className="modal-body">

                                        <div className="mb-3">
                                            <label htmlFor="loginUsername" className="form-label">Username</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                id="loginUsername"
                                                name="username"
                                                value={loginData.username}
                                                onChange={handleLoginChange}
                                                required
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label htmlFor="loginPassword" className="form-label">Password</label>
                                            <input
                                                type="password"
                                                className="form-control"
                                                id="loginPassword"
                                                name="password"
                                                value={loginData.password}
                                                onChange={handleLoginChange}
                                                required
                                            />
                                        </div>
                                        <div className='modal-footer'>
                                            <button type="button" className="btn btn-primary" onClick={handleLogin}>
                                                Login
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    <div className="modal fade" id="AdminLoginModal" tabIndex="-1" aria-labelledby="AdminLoginLabel" aria-hidden="true">
                        <div className="modal-dialog">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title" id="AdminLoginLabel">Admin Login</h5>
                                    <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div className="modal-body">
                                    {
                                        isAdminLoggedIn ?
                                            <>
                                                <h2>User List</h2>
                                                <table className="table">
                                                    <thead>
                                                        <tr>
                                                            <th>Username</th>
                                                            <th>Password</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {users.map((user, index) => (
                                                            <tr key={index}>
                                                                <td>{user.username}</td>
                                                                <td>{user.password}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </>
                                            :
                                            <>
                                                <form onSubmit={handleAdminLogin}>
                                                    <div className="mb-3">
                                                        <label htmlFor="loginUsername" className="form-label">Username</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            id="loginUsername"
                                                            name="username"
                                                            value={admin.username}
                                                            onChange={handleChange}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="mb-3">
                                                        <label htmlFor="loginPassword" className="form-label">Password</label>
                                                        <input
                                                            type="password"
                                                            className="form-control"
                                                            id="loginPassword"
                                                            name="password"
                                                            value={admin.password}
                                                            onChange={handleChange}
                                                            required
                                                        />
                                                    </div>
                                                    <button type="submit" className="btn btn-primary">Login</button>
                                                </form>
                                            </>
                                    }
                                </div>
                                {
                                    isAdminLoggedIn ?
                                        <div className="modal-footer">
                                            <button className="btn btn-link" data-bs-toggle="modal" data-bs-target="#AdminRegisterModal" data-bs-dismiss="modal">
                                                Register New Admin
                                            </button>
                                        </div>
                                        :
                                        null
                                }

                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>

    );
}
