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
    const [arrivalDetails, setArrivalDetails] = useState({ name: '', day: '', time: '' });
    const [departureDetails, setDepartureDetails] = useState({ day: '', time: '' });
    const [roomNames, setRoomNames] = useState([]);

    const token = localStorage.getItem('token');

    const fetchBuildings = useCallback(async () => {
        try {
            const response = await axios.get('https://railway-running-rooms-server.vercel.app/buildings', {
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

        // Ensure only selected number of rooms are sent
        const roomsData = roomNames.slice(0, building.noOfRooms).map((roomName, index) => ({
            roomNumber: index + 1,
            roomName: roomName || '',
        }));

        try {
            if (editMode) {
                const userConfirmed = window.confirm(
                    "Editing the building will update only the changed fields. Do you want to proceed?"
                );

                if (userConfirmed) {
                    await axios.put(`https://railway-running-rooms-server.vercel.app/buildings/${currentBuildingId}`, {
                        name: building.name,
                        rooms: roomsData,
                    }, {
                        headers: {
                            Authorization: token,
                        },
                    });
                }
            } else {
                await axios.post('https://railway-running-rooms-server.vercel.app/buildings', {
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
                await axios.delete(`https://railway-running-rooms-server.vercel.app/buildings/${buildingId}`, {
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
            setArrivalDetails({ name: '', day: '', time: '' });
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

    const [disableSubmit, setDisableSubmit] = useState(false);
    const handleArrivalSubmit = async (e) => {
        e.preventDefault();
        if (selectedRoom === null || !currentBuildingId) {
            alert('Please select a building and a room.');
            return;
        }

        try {
            setDisableSubmit(true);
            await axios.post(`https://railway-running-rooms-server.vercel.app/buildings/${currentBuildingId}/rooms/${selectedRoom}/checkin`, {
                name: arrivalDetails.name,
                day: arrivalDetails.day,
                inTime: arrivalDetails.time,
            }, { headers: { Authorization: token } });

            alert('Arrival time logged successfully!');
            setArrivalDetails({ name: '', day: '', time: '' });
            const arrivalModal = window.bootstrap.Modal.getInstance(document.getElementById('arrivalModal'));
            arrivalModal.hide();
            window.location.reload();
        } catch (error) {
            alert('Error logging arrival: ' + (error.response ? error.response.data.message : error.message));
        } finally {
            setTimeout(() => {
                setDisableSubmit(false); // Re-enable the submit button after 3 seconds
            }, 3000);
        }
    };

    const handleDepartureSubmit = async (e) => {
        e.preventDefault();
        if (selectedRoom === null || !currentBuildingId) {
            alert('Please select a building and a room.');
            return;
        }

        try {
            setDisableSubmit(true);
            await axios.post(
                `https://railway-running-rooms-server.vercel.app/buildings/${currentBuildingId}/rooms/${selectedRoom}/checkout`,
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
        } finally {
            setTimeout(() => {
                setDisableSubmit(false); // Re-enable the submit button after 3 seconds
            }, 3000);
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
            const response = await axios.post('https://railway-running-rooms-server.vercel.app/login', loginData);
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
            const response = await axios.post('https://railway-running-rooms-server.vercel.app/register', registerData);
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
        localStorage.removeItem('username');
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
                            Name: log.name,
                            Day: log.day,
                            InTime: log.inTime,
                            OutTime: log.outTime || 'No OutTime',
                            OutDay: log.outDay || 'No OutDay',
                        }));
                    } else {
                        return [{
                            BuildingName: building.name,
                            RoomNumber: room.roomNumber,
                            Name: 'No Name',
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

    const formatDate = (dateString) => {
        if (typeof dateString !== 'string' || !dateString.includes("-")) return dateString;
        const [year, month, day] = dateString.split("-");
        return `${day}-${month}-${year.slice(2)}`;
    };

    const [arrivalDepartureData, setArrivalDepartureData] = useState([]);

    const fetchArrivalDepartureData = () => {
        const data = [];

        fetchedBuildings.forEach(building => {
            building.rooms.forEach(room => {
                room.logs.forEach(log => {
                    data.push({
                        buildingName: building.name,
                        roomNumber: room.roomNumber,
                        roomName: room.roomName || "NA",
                        inTime: log.inTime,
                        name: log.name || "No Name",
                        outTime: log.outTime || "No OutTime",
                        day: log.day,
                        outDay: log.outDay || "No OutDay"
                    });
                });
            });
        });

                data.sort((a, b) => {
            const dateA = new Date(`${a.day} ${a.inTime}`);
            const dateB = new Date(`${b.day} ${b.inTime}`);
    
            return dateB - dateA; 
        });
        setArrivalDepartureData(data);
    };


    const handleShowModal = () => {
        setArrivalDepartureData([]);
        fetchArrivalDepartureData();
    };


    const [searchTerm, setSearchTerm] = useState('');
    const [arrivalDate, setArrivalDate] = useState('');


    const filteredArrivalDepartureData = (searchTerm || arrivalDate)
        ? arrivalDepartureData.filter(entry => {
            const matchesName = entry.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDate = arrivalDate ? entry.day === arrivalDate : true;
            return matchesName && matchesDate;
        })
        : arrivalDepartureData;



    const [admin, setAdmin] = useState({ username: '', password: '' });
    const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setAdmin((prevAdmin) => ({ ...prevAdmin, [name]: value }));
    };

    const handleAdminRegister = async (e) => {
        e.preventDefault();
        try {// eslint-disable-next-line
            const response = await axios.post('https://railway-running-rooms-server.vercel.app/admin/register', admin);
            setAdmin({ username: '', password: '' });
        } catch (error) {
        }
    };

    const handleAdminLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('https://railway-running-rooms-server.vercel.app/admin/login', admin);
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
                const response = await axios.get('https://railway-running-rooms-server.vercel.app/getallusers', {
                    headers: { 'admintoken': adminToken }
                });
                setUsers(response.data);
            } catch (error) {
            }
        };
        fetchUsers();
    }, []);

    const totalRooms = fetchedBuildings.reduce((acc, building) => acc + building.rooms.length, 0);
    const totalVacancies = fetchedBuildings.reduce((acc, building) => acc + calculateAvailableRooms(building.rooms), 0);

    const [dailyArrivals, setDailyArrivals] = useState([]);
    const [monthlyAverageArrivals, setMonthlyAverageArrivals] = useState(0);
    const [selectedDay, setSelectedDay] = useState('');

    const fetchDailyAndMonthlyArrivals = (day) => {
        const selectedDate = new Date(day);
        let dailyCount = 0;
        let monthlyCount = 0;
        let daysInMonth = 0;

        fetchedBuildings.forEach(building => {
            building.rooms.forEach(room => {
                room.logs.forEach(log => {
                    const logDate = new Date(log.day);

                    if (logDate.toDateString() === selectedDate.toDateString()) {
                        dailyCount += 1;
                    }

                    if (
                        logDate.getFullYear() === selectedDate.getFullYear() &&
                        logDate.getMonth() === selectedDate.getMonth()
                    ) {
                        monthlyCount += 1;
                    }
                });
            });
        });

        daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
        setDailyArrivals(dailyCount);
        setMonthlyAverageArrivals((monthlyCount / daysInMonth).toFixed(2));
    };


    const itemsPerPage = 10;

    // Function to get paginated data
    const getPaginatedData = (data, currentPage) => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return data.slice(startIndex, startIndex + itemsPerPage);
    };

    // Function to calculate total pages
    const getTotalPages = (data) => {
        return Math.ceil(data.length / itemsPerPage);
    };

    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = getTotalPages(filteredArrivalDepartureData);
    const currentData = getPaginatedData(filteredArrivalDepartureData, currentPage);

    // Pagination control functions
    const nextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));



    return (
        <div className='Home'>
            <h3>CREW & TRAIN MANAGER COMBINED RUNNING ROOM <strong>{username}</strong> SECR</h3>
            <div className='navbar'>

                <div className="totals">
                    Total Vacancies: <strong>{totalVacancies}</strong> / {totalRooms}
                </div>
                <div className='navigation-buttons'>
                    {
                        isAdminLoggedIn ?
                            <>
                                <button type="button" className="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#BuildingRoomsModal" onClick={resetForm}>Add Building and Rooms</button>
                                <button type="button" className="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#RegisterModal">Register Station</button>
                            </>

                            :
                            null
                    }
                    {
                        isLoggedIn ?
                            <>
                                <button type='button' className='btn btn-sm btn-warning' data-bs-toggle='modal' data-bs-target='#arrivalStatsModal'>Average Arrival</button>
                                <button type="button" className="btn btn-sm btn-warning" data-bs-toggle="modal" data-bs-target="#PeakTimeModal">Peak Time</button>
                                {/* <button type="button" className="btn btn-sm btn-warning" data-bs-toggle="modal" data-bs-target="#Date&TimeModal" onClick={handleShowModal}> Arrival & Departure</button> */}
                                <button className="btn btn-warning btn-sm" type="button" data-bs-toggle="collapse" data-bs-target="#CollapseArrivalDepatureData" aria-expanded="false" aria-controls="CollapseArrivalDepatureData" onClick={handleShowModal}>Arrival & Depature</button>
                            </>
                            :
                            null
                    }
                    {
                        isAdminLoggedIn ?
                            <button className="btn btn-sm btn-info" data-bs-toggle="modal" data-bs-target="#AdminLoginModal">Show User Details</button>
                            :
                            <button className="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#AdminLoginModal">Admin Login</button>
                    }
                    {
                        isLoggedIn ?
                            <button type="button" className="btn btn-sm btn-danger" onClick={handleLogout}>Logout</button>
                            :
                            <button type="button" className="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#LoginModal">Login</button>
                    }
                    {isAdminLoggedIn && (
                        <button type="button" className="btn btn-sm btn-danger" onClick={handleAdminLogout}>
                            Admin Logout
                        </button>
                    )}
                </div>

                {/* Login Modal */}
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
                                        <label className="form-label">Username</label>
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
                                        <label className="form-label">Password</label>
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
                                        <button type="button" className="btn btn-sm btn-primary" onClick={handleLogin}>
                                            Login
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>


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
                                        <label className="form-label">Password</label>
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
                                    <button type="button" className="btn btn-sm btn-primary" onClick={handleRegister}>
                                        Register
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal for Arrival & Departure */}
                <div className="modal fade" id="Date&TimeModal" tabIndex="-1" aria-labelledby="Date&TimeModalLabel" aria-hidden="true">
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
                                            <th>Name</th>
                                            <th>Bed No</th>
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
                                                <td>{entry.name}</td>
                                                <td>{entry.roomName}</td>
                                                <td>{formatDate(entry.day)}</td>
                                                <td>{entry.inTime}</td>
                                                <td>{formatDate(entry.outDay)}</td>
                                                <td>{entry.outTime}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-sm btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Arrived Modal */}
                <div className='modal fade' id='arrivalStatsModal' tabIndex='-1' aria-labelledby='arrivalStatsModalLabel' aria-hidden='true'>
                    <div className='modal-dialog'>
                        <div className='modal-content'>
                            <div className='modal-header'>
                                <h5 className='modal-title' id='arrivalStatsModalLabel'>Select Date to View Arrivals</h5>
                                <button type='button' className='btn-close' data-bs-dismiss='modal' aria-label='Close' />
                            </div>
                            <div className='modal-body'>
                                <input type='date' value={selectedDay} onChange={(e) => {
                                    const date = e.target.value;
                                    setSelectedDay(date);
                                    fetchDailyAndMonthlyArrivals(date);
                                }} />
                                <p>Number of arrivals: {dailyArrivals}</p>
                            </div>
                            <div className='modal-footer'>
                                <p>Average monthly arrivals: {monthlyAverageArrivals}</p>
                                <button type='button' className='btn btn-sm btn-secondary' data-bs-dismiss='modal'>Close</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Peak Time Modal */}
                <div className="modal fade" id="PeakTimeModal" tabIndex="-1" aria-labelledby="PeakTimeModalLabel" aria-hidden="true">
                    <div className="modal-dialog modal-lg">
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
                                    className="btn btn-sm btn-primary"
                                    onClick={calculatePeakHours}
                                >
                                    Calculate Peak Hours
                                </button>
                                <ul className="peaktime">
                                    {peakHours.length > 0 && (
                                        <table className="table peaktime border-collapse w-full text-left border border-gray-300">
                                            <thead>
                                                <tr className="bg-gray-200">
                                                    <th className="border border-gray-300 px-4 py-2 bg-dark text-light">Time</th>
                                                    <th className="border border-gray-300 px-4 py-2 bg-dark text-light">No. of Occupied Rooms</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {peakHours.map((hourData, index) => {
                                                    const [time, count] = hourData.replace("Time: ", "").replace(" - Occupied Rooms: ", ",").split(",");
                                                    return (
                                                        <tr key={index} className="hover:bg-gray-100">
                                                            <td className="border border-gray-300 px-4 py-2">{time}</td>
                                                            <td className="border border-gray-300 px-4 py-2 text-center">{count}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}

                                </ul>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-sm btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>

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
                                                    <label className="form-label">Username</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        id="loginAdminUsername"
                                                        name="username"
                                                        value={admin.username}
                                                        onChange={handleChange}
                                                        required
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label">Password</label>
                                                    <input
                                                        type="password"
                                                        className="form-control"
                                                        id="loginAdminPassword"
                                                        name="password"
                                                        value={admin.password}
                                                        onChange={handleChange}
                                                        required
                                                    />
                                                </div>
                                                <button type="submit" className="btn btn-sm btn-primary">Login</button>
                                            </form>
                                        </>
                                }
                            </div>
                            {
                                isAdminLoggedIn ?
                                    <div className="modal-footer">
                                        <button className="btn btn-sm btn-link" data-bs-toggle="modal" data-bs-target="#AdminRegisterModal" data-bs-dismiss="modal">
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
                                            id="registerAdminUsername"
                                            name="username"
                                            value={admin.username}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Password</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            id="registerAdminPassword"
                                            name="password"
                                            value={admin.password}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <button type="submit" className="btn btn-sm btn-primary">Register</button>
                                </form>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-sm btn-link" data-bs-toggle="modal" data-bs-target="#AdminLoginModal" data-bs-dismiss="modal">
                                    Back to Login
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

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
                                <label>Input total number of beds:</label>
                                <input type="number" value={building.noOfRooms} onChange={handleNumberOfRoomsChange} min="0" required />

                                {/* Dynamically create room name inputs */}
                                {Array.from({ length: building.noOfRooms }, (_, index) => (
                                    <div className='roomname' key={index}>
                                        <label>Beds {index + 1} Name:</label>
                                        <input
                                            type="text"
                                            value={roomNames[index] || ''}
                                            onChange={(e) => handleRoomNameChange(e, index)}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-sm btn-secondary" data-bs-dismiss="modal" onClick={resetForm}>Close</button>
                                <button type="submit" className='btn btn-sm btn-primary'>{editMode ? 'Update Building' : 'Submit Building and Rooms'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <div className="collapse my-2" id="CollapseArrivalDepatureData">
                <div className="card card-body">
                    <div className='Search_Arrival'>
                        <input placeholder='Search Name' type='text' value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        <input type='date' placeholder='Arrival Date' value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} />
                    </div>

                    <table className="table w-100">
                        <thead>
                            <tr>
                                <th>S.No</th>
                                <th>Building Name</th>
                                <th>Name</th>
                                <th>Bed No</th>
                                <th>Day</th>
                                <th>Arrival Time</th>
                                <th>Out Day</th>
                                <th>Departure Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentData.map((entry, index) => (
                                <tr key={index}>
                                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td> {/* Serial Number */}
                                    <td>{entry.buildingName}</td>
                                    <td>{entry.name}</td>
                                    <td>{entry.roomName}</td>
                                    <td>{formatDate(entry.day)}</td>
                                    <td>{entry.inTime}</td>
                                    <td>{formatDate(entry.outDay)}</td>
                                    <td>{entry.outTime}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="d-flex justify-content-between align-items-center mt-3">
                        <button className="btn btn-secondary" onClick={prevPage} disabled={currentPage === 1}>
                            Previous
                        </button>
                        <span>Page {currentPage} of {totalPages}</span>
                        <button className="btn btn-secondary" onClick={nextPage} disabled={currentPage === totalPages}>
                            Next
                        </button>
                    </div>
                    <button className='btn btn-sm btn-success mt-3' onClick={downloadUserData}>Download Arrival & Depature Report</button>
                </div>
            </div>


            <div className='Buildings'>
                {fetchedBuildings && (
                    <>
                        {fetchedBuildings.map((building, index) => {
                            const availableRooms = calculateAvailableRooms(building.rooms);
                            return (
                                <div className='building-info' key={index}>
                                    <h4>{building.name} - WING</h4>
                                    <p>Total Beds: {building.rooms.length}
                                        <br />Available Beds: <strong>{availableRooms}</strong></p>
                                    {
                                        isAdminLoggedIn ?
                                            <>
                                                <div className='EditOption'>
                                                    <button className='btn btn-sm btn-outline-primary' onClick={() => handleEdit(building)}>Edit</button>
                                                    <button className='btn btn-sm btn-outline-danger' onClick={() => handleDelete(building._id)}>Delete</button>
                                                </div>
                                            </>
                                            :
                                            null
                                    }
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
                                <label>Name:</label>
                                <input type="text" name="name" onChange={handleArrivalChange} required />
                                <label>Day of Arrival:</label>
                                <input type="date" name="day" onChange={handleArrivalChange} required />
                                <label>Time of Arrival:</label>
                                <input type="time" name="time" onChange={handleArrivalChange} required />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-sm btn-secondary" data-bs-dismiss="modal">Close</button>
                                <button type="submit" disabled={disableSubmit} className='btn btn-sm btn-primary'>Submit Arrival</button>
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
                                <button type="button" className="btn btn-sm btn-secondary" data-bs-dismiss="modal">Close</button>
                                <button type="submit" disabled={disableSubmit} className='btn btn-sm btn-primary'>Submit Departure</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {
                isLoggedIn ?
                    <>
                        <div className="building-boxes mt-2">
                            {fetchedBuildings && fetchedBuildings.map((building, index) => (
                                <div key={index} className="building-box">
                                    <h4>{building.name} - WING</h4>
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
                                                    {room.roomName || `Bed ${room.roomNumber}`}
                                                </button>
                                            );
                                        })}

                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                    :
                    null
            }
        </div>

    );
}
