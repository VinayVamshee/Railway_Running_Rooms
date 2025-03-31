require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const connectDB = require('./DB/ConnectDB');
const Building = require('./Models/Building');
const User = require('./Models/User');
const Admin = require('./Models/Admin');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;

const SECRET_KEY = process.env.SECRET_KEY;

app.post('/admin/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        const existingAdmin = await Admin.findOne({ username });
        if (existingAdmin) return res.status(400).json({ message: 'Username already exists' });

        const newAdmin = new Admin({ username, password });
        await newAdmin.save();
        res.status(201).json({ message: 'Admin registered successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;
    const isAdminAuthenticated = true;
    if (isAdminAuthenticated) {
        const adminToken = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ success: true, adminToken });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

app.get('/getallusers', async (req, res) => {
    const adminToken = req.headers['admintoken'];

    if (!adminToken) {
        return res.status(403).json({ message: 'Unauthorized access' });
    }

    try {
        const decoded = jwt.verify(adminToken, SECRET_KEY);
        if (!decoded) {
            return res.status(403).json({ message: 'Unauthorized access' });
        }

        const users = await User.find({}, 'username password');
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users', error });
    }
});

const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ message: 'Access Denied' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid Token' });
        req.user = user;
        next();
    });
};

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ message: 'Username already taken' });

        const newUser = new User({ username, password });
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
        const user = await User.findOne({ username });
        if (!user || user.password !== password) {
            return res.status(400).json({ message: 'Invalid username or password' });
        }

        const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET);
        res.status(200).json({ token, user: { id: user._id, username: user.username } });
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ message: 'Error logging in user' });
    }
});

app.post('/buildings', authenticateToken, async (req, res) => {
    const { name, rooms } = req.body;

    try {
        const newBuilding = new Building({
            name,
            rooms,
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

        // Update building name if provided
        if (name) {
            building.name = name;
        }

        // Update room details without deleting logs
        if (rooms) {
            rooms.forEach((newRoom) => {
                const existingRoom = building.rooms.find(room => room.roomNumber === newRoom.roomNumber);
                
                if (existingRoom) {
                    // Update only room name if it exists
                    existingRoom.roomName = newRoom.roomName || existingRoom.roomName;
                } else {
                    // If it's a new room, add it (without logs)
                    building.rooms.push({ roomNumber: newRoom.roomNumber, roomName: newRoom.roomName, logs: [] });
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

app.post('/buildings/:buildingId/rooms/:roomId/checkin', authenticateToken, async (req, res) => {
    const { buildingId, roomId } = req.params;
    const { name,day, inTime } = req.body;

    try {
        const building = await Building.findOne({ _id: buildingId, user: req.user.id });
        if (!building) {
            return res.status(404).json({ message: 'Building not found' });
        }
        const room = building.rooms.id(roomId);
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
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

    try {
        const building = await Building.findOne({ _id: buildingId, user: req.user.id });
        if (!building) return res.status(404).json({ message: 'Building not found' });

        const room = building.rooms.id(roomId);
        if (!room) return res.status(404).json({ message: 'Room not found' });

        const lastLog = room.logs[room.logs.length - 1];
        if (!lastLog || lastLog.outTime) {
            return res.status(400).json({ message: 'No check-in record found or check-out already logged' });
        }

        lastLog.outTime = outTime;
        lastLog.outDay = day;
        await building.save();

        res.status(200).json({ message: 'Check-out time logged successfully' });
    } catch (error) {
        console.error('Error logging check-out:', error);
        res.status(500).json({ message: 'Error logging check-out' });
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
