require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const connectDB = require('./DB/ConnectDB');
const Building = require('./Models/Building');
const User = require('./Models/User');
const Admin = require('./Models/Admin');
const OpenAI = require("openai");
const fs = require('fs');
const { exec } = require('child_process');
const moment = require('moment'); 

const app = express();

const allowedOrigins = ['https://rrr-secr.vercel.app', 'http://localhost:3000'];

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost:')) {
            return callback(null, true);
        } else {
            return callback(null, true); // Fallback: allow dynamically since we use custom verification as well
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'admintoken'],
    credentials: true
}));

// Add dynamic headers check for OPTIONS / preflight requests
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
const JWT_SECRET = process.env.JWT_SECRET;

const SECRET_KEY = process.env.SECRET_KEY;
const client = new OpenAI({ apiKey: process.env.GPT_API });

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
        const adminToken = jwt.sign({ username }, SECRET_KEY);
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
        // Update room details without deleting logs
        if (rooms) {
            // Remove extra rooms if the new list has fewer rooms
            building.rooms = building.rooms.filter(room =>
                rooms.some(newRoom => newRoom.roomNumber === room.roomNumber)
            );

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
    const { name, day, inTime } = req.body;

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



app.get('/getMonthlyStats', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    const buildings = await Building.find({ user: req.user.id });
    let logsThisMonth = [];

    const monthStart = moment(`${year}-${month}-01`);
    const monthEnd = monthStart.clone().endOf('month');

    buildings.forEach(b => {
      b.rooms.forEach(r => {
        r.logs.forEach(l => {
          const logDate = moment(l.day, 'YY-MM-DD');
          if (logDate.isBetween(monthStart, monthEnd, 'day', '[]')) {
            logsThisMonth.push({ building: b.name, room: r.roomName, ...l });
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
    const buildings = await Building.find({ user: req.user.id });
    const hourCount = {};

    buildings.forEach(b => {
      b.rooms.forEach(r => {
        r.logs.forEach(l => {
          if (l.inTime) {
            const hour = l.inTime.split(':')[0];
            hourCount[hour] = (hourCount[hour] || 0) + 1;
          }
        });
      });
    });

    let peakHour = null;
    let maxCount = 0;
    for (const [hour, count] of Object.entries(hourCount)) {
      if (count > maxCount) {
        maxCount = count;
        peakHour = hour;
      }
    }

    if (!peakHour) return res.json({ message: 'No check-in data available for peak hour.' });

    res.json({ peakHour, totalCheckins: maxCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching peak hour' });
  }
});

app.get('/getLastArrival', authenticateToken, async (req, res) => {
  const username = req.query.username?.toLowerCase();
  if (!username) return res.status(400).json({ message: 'Username is required as query param' });

  try {
    const buildings = await Building.find({ user: req.user.id });
    let latestLog = null;

    buildings.forEach(b => {
      b.rooms.forEach(r => {
        r.logs.forEach(l => {
          if (l.name && l.name.toLowerCase().includes(username)) {
            const logTime = new Date(`${l.day}T${l.inTime}`);
            if (!latestLog || logTime > latestLog.time) {
              latestLog = { ...l, building: b.name, room: r.roomName, time: logTime };
            }
          }
        });
      });
    });

    if (!latestLog) return res.json({ message: 'No check-in found for this user.' });

    res.json(latestLog);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching last arrival' });
  }
});


app.get('/getLastDeparture', authenticateToken, async (req, res) => {
  const username = req.query.username?.toLowerCase();
  if (!username) return res.status(400).json({ message: 'Username is required as query param' });

  try {
    const buildings = await Building.find({ user: req.user.id });
    let latestLog = null;

    buildings.forEach(b => {
      b.rooms.forEach(r => {
        r.logs.forEach(l => {
          if (l.name && l.name.toLowerCase().includes(username) && l.outTime) {
            const logTime = new Date(`${l.outDay}T${l.outTime}`);
            if (!latestLog || logTime > latestLog.time) {
              latestLog = { ...l, building: b.name, room: r.roomName, time: logTime };
            }
          }
        });
      });
    });

    if (!latestLog) return res.json({ message: 'No checkout found for this user.' });

    res.json(latestLog);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching last departure' });
  }
});



app.post('/ask', authenticateToken, async (req, res) => {
    const { question } = req.body;

    try {
        console.log("\n🟢 /ask route triggered!");
        console.log("👉 User ID:", req.user.id);
        console.log("👉 Question received:", question);

        // Map AI-detectable intents to backend endpoints
        const intentMapping = [
            { keywords: ['monthly', 'this month', 'total logs', 'entries'], endpoint: '/getMonthlyStats' },
            { keywords: ['peak', 'rush hour'], endpoint: '/getPeakHour' },
            { keywords: ['last arrived', 'arrive', 'check-in'], endpoint: '/getLastArrival' },
            { keywords: ['checkout', 'departure', 'left'], endpoint: '/getLastDeparture' }
        ];

        // Determine intent based on question
        let matchedIntent = null;
        for (const intent of intentMapping) {
            for (const kw of intent.keywords) {
                if (question.toLowerCase().includes(kw.toLowerCase())) {
                    matchedIntent = intent;
                    break;
                }
            }
            if (matchedIntent) break;
        }

        if (!matchedIntent) {
            return res.json({ answer: "Sorry, this feature is not yet supported." });
        }

        // Call the corresponding backend endpoint
        const axios = require('axios');
        const endpointUrl = `http://localhost:${PORT}${matchedIntent.endpoint}`;
        let endpointResponse;

        try {
            endpointResponse = await axios.get(endpointUrl, {
                headers: { Authorization: req.headers['authorization'] }
            });
        } catch (err) {
            console.error("❌ Error calling endpoint:", matchedIntent.endpoint, err.message);
            return res.json({ answer: `The feature for this request exists but could not return a proper response.` });
        }

        const data = endpointResponse.data;

        // Prepare prompt for Ollama
        const prompt = `
You are a smart assistant for the Railway Running Room system.
The user asked:
"${question}"

Here is the data from the system:
${JSON.stringify(data, null, 2)}

Answer the user in simple, clear language.
If no relevant data is available, say that clearly.
`;

        // Execute Ollama with a timeout
        const { exec } = require('child_process');
        const command = `ollama run mistral --model local --prompt '${prompt.replace(/'/g, '"')}'`;

        const child = exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
            if (error) {
                if (error.killed) {
                    console.error("❌ Ollama timeout reached.");
                    return res.json({ answer: "No answer found (LLM timeout)." });
                }
                console.error("❌ Ollama error:", error.message);
                return res.status(500).json({ answer: "Error with local LLM" });
            }

            const answer = stdout.trim();
            console.log("🤖 Ollama Answer:", answer);

            res.json({ answer });
        });

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
