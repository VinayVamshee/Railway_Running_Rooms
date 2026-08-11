require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const moment = require('moment');
const connectDB = require('./DB/ConnectDB');
const Building = require('./Models/Building');
const User = require('./Models/User');
const Admin = require('./Models/Admin');

const app = express();

const allowedOrigins = ['https://rrr-secr.vercel.app', 'http://localhost:3000'];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost:')) {
            return callback(null, true);
        } else {
            return callback(null, true);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'admintoken'],
    credentials: true
}));

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:'))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, admintoken');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json());

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_user_secret';
const SECRET_KEY = process.env.SECRET_KEY || 'fallback_admin_secret';

// ─── Helpers ────────────────────────────────────────────────────────────────
function combineDateTime(day, time) {
    if (!day || !time) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) && !/^\d{2}-\d{2}-\d{2}$/.test(day)) return null;
    if (!/^\d{2}:\d{2}$/.test(time)) return null;

    let year, month, date;
    if (day.includes('-')) {
        const parts = day.split('-').map(Number);
        if (parts[0] > 99) {
            [year, month, date] = parts;
        } else {
            [year, month, date] = parts;
            year += 2000; // Handle YY-MM-DD
        }
    } else {
        return null;
    }

    const [hour, min] = time.split(':').map(Number);
    if (hour < 0 || hour > 23 || min < 0 || min > 59) return null;

    const dt = new Date(year, month - 1, date, hour, min, 0, 0);
    return isNaN(dt.getTime()) ? null : dt;
}

function getActiveLog(room) {
    if (!room.logs) return null;
    return room.logs.find(log => log.inTime && !log.outTime);
}

// ─── Auth Middleware ────────────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ message: 'Access Denied' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid Token' });
        req.user = user;
        next();
    });
};

// ─── Admin Auth Routes ──────────────────────────────────────────────────────
app.post('/admin/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        const existingAdmin = await Admin.findOne({ username });
        if (existingAdmin) return res.status(400).json({ message: 'Username already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = new Admin({ username, password: hashedPassword });
        await newAdmin.save();
        res.status(201).json({ message: 'Admin registered successfully' });
    } catch (error) {
        console.error('Admin registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        const adminUser = await Admin.findOne({ username });
        if (!adminUser) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        let isMatch = false;
        try {
            isMatch = await bcrypt.compare(password, adminUser.password);
        } catch (e) {}

        if (!isMatch && adminUser.password === password) {
            isMatch = true;
            adminUser.password = await bcrypt.hash(password, 10);
            await adminUser.save();
        }

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const adminToken = jwt.sign({ username: adminUser.username, isAdmin: true }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ success: true, adminToken });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/getallusers', async (req, res) => {
    const adminToken = req.headers['admintoken'];
    if (!adminToken) {
        return res.status(403).json({ message: 'Unauthorized access' });
    }

    try {
        const decoded = jwt.verify(adminToken, SECRET_KEY);
        if (!decoded || !decoded.username) {
            return res.status(403).json({ message: 'Unauthorized access' });
        }

        const users = await User.find({}, 'username'); // Secure: passwords excluded
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
});

// ─── User Auth Routes ───────────────────────────────────────────────────────
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ message: 'Username already taken' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Error registering user' });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Invalid username or password' });
        }

        let isMatch = false;
        try {
            isMatch = await bcrypt.compare(password, user.password);
        } catch (e) {}

        if (!isMatch && user.password === password) {
            isMatch = true;
            user.password = await bcrypt.hash(password, 10);
            await user.save();
        }

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid username or password' });
        }

        const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.status(200).json({ token, user: { id: user._id, username: user.username } });
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ message: 'Error logging in user' });
    }
});

// ─── Buildings CRUD ─────────────────────────────────────────────────────────
app.post('/buildings', authenticateToken, async (req, res) => {
    const { name, rooms } = req.body;
    if (!name || !rooms || !Array.isArray(rooms)) {
        return res.status(400).json({ message: 'Building name and valid rooms list are required.' });
    }

    try {
        const roomNumbers = rooms.map(r => r.roomNumber);
        const hasDuplicates = roomNumbers.some((val, i) => roomNumbers.indexOf(val) !== i);
        if (hasDuplicates) {
            return res.status(400).json({ message: 'Duplicate room/bed numbers are not allowed.' });
        }

        const newBuilding = new Building({
            name,
            rooms: rooms.map(r => ({
                roomNumber: r.roomNumber,
                roomName: r.roomName || `Bed ${r.roomNumber}`,
                active: true,
                logs: []
            })),
            user: req.user.id
        });
        await newBuilding.save();
        res.status(201).json(newBuilding);
    } catch (error) {
        console.error('Error creating building:', error);
        res.status(500).json({ message: 'Error creating building' });
    }
});

app.get('/buildings', authenticateToken, async (req, res) => {
    try {
        const buildings = await Building.find({ user: req.user.id });
        res.status(200).json(buildings);
    } catch (error) {
        console.error('Error fetching buildings:', error);
        res.status(500).json({ message: 'Error fetching buildings' });
    }
});

app.put('/buildings/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, rooms } = req.body;

    try {
        if (!name && !rooms) {
            return res.status(400).json({ message: 'Name or rooms must be provided' });
        }

        const building = await Building.findOne({ _id: id, user: req.user.id });
        if (!building) {
            return res.status(404).json({ message: 'Building not found' });
        }

        if (name) building.name = name;

        if (rooms && Array.isArray(rooms)) {
            const roomNumbers = rooms.map(r => r.roomNumber);
            const hasDuplicates = roomNumbers.some((val, i) => roomNumbers.indexOf(val) !== i);
            if (hasDuplicates) {
                return res.status(400).json({ message: 'Duplicate room/bed numbers are not allowed.' });
            }

            // Preservation Strategy: Never physically delete rooms with logs.
            building.rooms = building.rooms.filter(room => {
                const existsInRequest = rooms.some(nr => nr.roomNumber === room.roomNumber);
                if (existsInRequest) return true;
                return room.logs && room.logs.length > 0; // Retain room if it has historical logs
            });

            // Update existing or mark inactive
            building.rooms.forEach(room => {
                const reqRoom = rooms.find(nr => nr.roomNumber === room.roomNumber);
                if (reqRoom) {
                    room.roomName = reqRoom.roomName || room.roomName;
                    room.active = true;
                } else {
                    room.active = false; // Soft delete
                }
            });

            // Add new requested rooms
            rooms.forEach(nr => {
                const exists = building.rooms.some(r => r.roomNumber === nr.roomNumber);
                if (!exists) {
                    building.rooms.push({
                        roomNumber: nr.roomNumber,
                        roomName: nr.roomName || `Bed ${nr.roomNumber}`,
                        active: true,
                        logs: []
                    });
                }
            });
        }

        await building.save();
        res.status(200).json(building);
    } catch (error) {
        console.error('Error updating building:', error);
        res.status(500).json({ message: 'Error updating building' });
    }
});

app.delete('/buildings/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const deletedBuilding = await Building.findOneAndDelete({ _id: id, user: req.user.id });
        if (!deletedBuilding) {
            return res.status(404).json({ message: 'Building not found' });
        }
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting building:', error);
        res.status(500).json({ message: 'Error deleting building' });
    }
});

// ─── Check-In / Check-Out ──────────────────────────────────────────────────
app.post('/buildings/:buildingId/rooms/:roomId/checkin', authenticateToken, async (req, res) => {
    const { buildingId, roomId } = req.params;
    const { name, day, inTime } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: 'Employee name is required.' });
    }
    const checkInDt = combineDateTime(day, inTime);
    if (!checkInDt) {
        return res.status(400).json({ message: 'Invalid check-in date or time format.' });
    }
    if (checkInDt > new Date(Date.now() + 86400000)) {
        return res.status(400).json({ message: 'Check-in time cannot be in the far future.' });
    }

    try {
        const building = await Building.findOne({ _id: buildingId, user: req.user.id });
        if (!building) return res.status(404).json({ message: 'Building not found' });

        const room = building.rooms.id(roomId);
        if (!room) return res.status(404).json({ message: 'Room/bed not found' });

        // Enforce state rule: Prevent double check-in
        const activeLog = getActiveLog(room);
        if (activeLog) {
            return res.status(400).json({ message: 'Room/bed already has an active check-in.' });
        }

        room.logs.push({ name, day, inTime });
        await building.save();
        res.status(200).json({ message: 'Check-in time logged successfully' });
    } catch (error) {
        console.error('Error logging check-in:', error);
        res.status(500).json({ message: 'Error logging check-in' });
    }
});

app.post('/buildings/:buildingId/rooms/:roomId/checkout', authenticateToken, async (req, res) => {
    const { buildingId, roomId } = req.params;
    const { day, outTime } = req.body;

    const checkOutDt = combineDateTime(day, outTime);
    if (!checkOutDt) {
        return res.status(400).json({ message: 'Invalid check-out date or time format.' });
    }

    try {
        const building = await Building.findOne({ _id: buildingId, user: req.user.id });
        if (!building) return res.status(404).json({ message: 'Building not found' });

        const room = building.rooms.id(roomId);
        if (!room) return res.status(404).json({ message: 'Room/bed not found' });

        // Enforce state rule: Target the correct open log
        const activeLog = getActiveLog(room);
        if (!activeLog) {
            return res.status(400).json({ message: 'No active check-in record found for checkout.' });
        }

        const checkInDt = combineDateTime(activeLog.day, activeLog.inTime);
        if (checkInDt && checkOutDt <= checkInDt) {
            return res.status(400).json({ message: 'Check-out datetime must be strictly after check-in datetime.' });
        }

        activeLog.outTime = outTime;
        activeLog.outDay = day;
        await building.save();
        res.status(200).json({ message: 'Check-out time logged successfully' });
    } catch (error) {
        console.error('Error logging check-out:', error);
        res.status(500).json({ message: 'Error logging check-out' });
    }
});

// ─── Analytics & Statistics ────────────────────────────────────────────────
app.get('/getMonthlyStats', authenticateToken, async (req, res) => {
    try {
        const { month, year, todayOnly } = req.query;
        if (!month || !year) {
            return res.status(400).json({ message: 'Month and year are required.' });
        }

        const buildings = await Building.find({ user: req.user.id });
        let logsThisMonth = [];

        const monthStart = moment(`${year}-${month}-01`, 'YYYY-MM-DD');
        const monthEnd = monthStart.clone().endOf('month');
        const todayStr = moment().format('YYYY-MM-DD');

        buildings.forEach(b => {
            b.rooms.forEach(r => {
                r.logs.forEach(l => {
                    if (!l.day) return;
                    const logDate = moment(l.day, ['YYYY-MM-DD', 'YY-MM-DD']);
                    if (logDate.isValid() && logDate.isBetween(monthStart, monthEnd, 'day', '[]')) {
                        if (todayOnly === 'true' && l.day !== todayStr) return;
                        logsThisMonth.push({
                            building: b.name,
                            room: r.roomName || `Bed ${r.roomNumber}`,
                            name: l.name,
                            day: l.day,
                            inTime: l.inTime,
                            outTime: l.outTime || null,
                            outDay: l.outDay || null
                        });
                    }
                });
            });
        });

        res.json({
            totalLogs: logsThisMonth.length,
            logs: logsThisMonth
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching monthly stats' });
    }
});

app.get('/getPeakHour', authenticateToken, async (req, res) => {
    try {
        const { date, type } = req.query;
        const targetDateStr = date || moment().format('YYYY-MM-DD');
        const targetDate = moment(targetDateStr, 'YYYY-MM-DD');

        const buildings = await Building.find({ user: req.user.id });
        const hourCounts = Array(24).fill(0);

        buildings.forEach(b => {
            b.rooms.forEach(r => {
                r.logs.forEach(l => {
                    if (!l.inTime || !l.day) return;

                    const checkIn = moment(`${l.day}T${l.inTime}`, 'YYYY-MM-DDTHH:mm');
                    const checkOut = l.outTime && l.outDay
                        ? moment(`${l.outDay}T${l.outTime}`, 'YYYY-MM-DDTHH:mm')
                        : null;

                    if (!checkIn.isValid()) return;

                    if (type === 'arrivals') {
                        // Peak Arrival Hour: check-ins occurring within the hour on the target date
                        if (checkIn.format('YYYY-MM-DD') === targetDateStr) {
                            hourCounts[checkIn.hour()]++;
                        }
                    } else {
                        // Peak Occupancy Hour: stay covers start and end of hour H on selected date
                        for (let h = 0; h < 24; h++) {
                            const hourStart = targetDate.clone().hour(h).minute(0).second(0);
                            const hourEnd = targetDate.clone().hour(h).minute(59).second(59);

                            const hasCheckedIn = checkIn.isSameOrBefore(hourEnd);
                            const hasNotCheckedOut = !checkOut || checkOut.isAfter(hourStart);

                            if (hasCheckedIn && hasNotCheckedOut) {
                                hourCounts[h]++;
                            }
                        }
                    }
                });
            });
        });

        let peakHour = null;
        let maxCount = 0;
        for (let h = 0; h < 24; h++) {
            if (hourCounts[h] > maxCount) {
                maxCount = hourCounts[h];
                peakHour = h;
            }
        }

        const formatHour = (h) => {
            const period = h >= 12 ? 'PM' : 'AM';
            return `${h % 12 || 12}:00 ${period}`;
        };

        res.json({
            peakHour: peakHour !== null ? formatHour(peakHour) : 'No data',
            totalCheckins: maxCount,
            hourlyBreakdown: hourCounts.map((count, hour) => ({
                time: formatHour(hour),
                count
            }))
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching peak hour' });
    }
});

app.get('/getLastArrival', authenticateToken, async (req, res) => {
    const username = req.query.username?.toLowerCase();
    try {
        const buildings = await Building.find({ user: req.user.id });
        let latestLog = null;

        buildings.forEach(b => {
            b.rooms.forEach(r => {
                r.logs.forEach(l => {
                    if (!l.inTime || !l.day) return;
                    if (username && (!l.name || !l.name.toLowerCase().includes(username))) return;

                    const logTime = combineDateTime(l.day, l.inTime);
                    if (logTime) {
                        if (!latestLog || logTime > latestLog.time) {
                            latestLog = {
                                name: l.name,
                                day: l.day,
                                inTime: l.inTime,
                                outTime: l.outTime || null,
                                outDay: l.outDay || null,
                                building: b.name,
                                room: r.roomName || `Bed ${r.roomNumber}`,
                                time: logTime
                            };
                        }
                    }
                });
            });
        });

        if (!latestLog) return res.json({ message: 'No check-in found.' });
        res.json(latestLog);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching last arrival' });
    }
});

app.get('/getLastDeparture', authenticateToken, async (req, res) => {
    const username = req.query.username?.toLowerCase();
    try {
        const buildings = await Building.find({ user: req.user.id });
        let latestLog = null;

        buildings.forEach(b => {
            b.rooms.forEach(r => {
                r.logs.forEach(l => {
                    if (!l.outTime || !l.outDay) return;
                    if (username && (!l.name || !l.name.toLowerCase().includes(username))) return;

                    const logTime = combineDateTime(l.outDay, l.outTime);
                    if (logTime) {
                        if (!latestLog || logTime > latestLog.time) {
                            latestLog = {
                                name: l.name,
                                day: l.day,
                                inTime: l.inTime,
                                outTime: l.outTime,
                                outDay: l.outDay,
                                building: b.name,
                                room: r.roomName || `Bed ${r.roomNumber}`,
                                time: logTime
                            };
                        }
                    }
                });
            });
        });

        if (!latestLog) return res.json({ message: 'No check-out found.' });
        res.json(latestLog);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching last departure' });
    }
});

// ─── Safely Structured Ask GPT Endpoint ───────────────────────────────────
app.post('/ask', authenticateToken, async (req, res) => {
    const { question } = req.body;
    if (!question || typeof question !== 'string') {
        return res.json({ answer: "Please ask a valid question." });
    }

    try {
        console.log("\n🟢 /ask route triggered!");
        const lowerQ = question.toLowerCase();
        let matchedIntent = null;
        let queryParams = {};

        if (lowerQ.includes('peak') && (lowerQ.includes('occupancy') || lowerQ.includes('busy') || lowerQ.includes('occupied'))) {
            matchedIntent = '/getPeakHour';
        } else if (lowerQ.includes('peak') && (lowerQ.includes('arrival') || lowerQ.includes('check-in') || lowerQ.includes('checkin'))) {
            matchedIntent = '/getPeakHour';
            queryParams = { type: 'arrivals' };
        } else if (lowerQ.includes('last arrived') || lowerQ.includes('recent check-in') || (lowerQ.includes('arrive') && lowerQ.includes('last'))) {
            matchedIntent = '/getLastArrival';
        } else if (lowerQ.includes('last departure') || lowerQ.includes('checkout') || (lowerQ.includes('left') && lowerQ.includes('last'))) {
            matchedIntent = '/getLastDeparture';
        } else if (lowerQ.includes('monthly') || lowerQ.includes('this month') || lowerQ.includes('entries')) {
            matchedIntent = '/getMonthlyStats';
            const now = new Date();
            queryParams = {
                month: String(now.getMonth() + 1).padStart(2, '0'),
                year: String(now.getFullYear())
            };
        }

        if (!matchedIntent) {
            matchedIntent = '/buildings';
        }

        const axios = require('axios');
        const endpointResponse = await axios.get(`http://localhost:${PORT}${matchedIntent}`, {
            headers: { Authorization: req.headers['authorization'] },
            params: queryParams
        });

        const data = endpointResponse.data;
        const prompt = `You are a smart assistant for the Railway Running Room system.
The user asked: "${question}"
Here is the data from the system:
${JSON.stringify(data, null, 2)}

Answer the user's question in a clear, concise, and friendly manner based on the provided system data.`;

        // Direct HTTP call to local Ollama API - completely secure from RCE
        try {
            const ollamaResponse = await axios.post('http://localhost:11434/api/generate', {
                model: 'mistral',
                prompt: prompt,
                stream: false
            }, { timeout: 12000 });

            const answer = ollamaResponse.data.response?.trim() || "No response received from assistant.";
            return res.json({ answer });
        } catch (ollamaErr) {
            // Friendly fallback if local Ollama generates a connection error
            return res.json({
                answer: `Assistant service is temporarily offline. System data retrieved: Total logs/entries: ${data.totalLogs || data.length || 0}.`
            });
        }
    } catch (error) {
        console.error("❌ Error in /ask route:", error.message);
        res.status(500).json({ answer: "Error processing query." });
    }
});

const start = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error(error);
    }
};

start();
