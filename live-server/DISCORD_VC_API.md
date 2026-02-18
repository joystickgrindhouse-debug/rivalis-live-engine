# 📡 Live Room + Discord VC API

## API Documentation

### Create Live Room (with Discord VC)
**POST** `/api/live-rooms`

**Request Body:**
```json
{
  "roomData": {
    // ...your Firestore room fields (e.g., name, owner, etc.)
  }
}
```

**Response:**
```json
{
  "roomId": "generatedRoomId",
  "discordVcLink": "https://discord.gg/..."
}
```

---

### Delete Live Room (and Discord VC)
**DELETE** `/api/live-rooms/:roomId`

**Response:**
```json
{
  "success": true
}
```

---

**Behavior:**
- When you create a room, the backend:
  - Adds the room to Firestore.
  - Creates a Discord VC (voice channel) via the bot.
  - Stores the invite link in Firestore and returns it.
- When you delete a room, the backend:
  - Deletes the Discord VC.
  - Deletes the Firestore room document.

**Note:**  
- All logic is handled automatically by the backend endpoints above.
- You must provide the required Firestore fields in `roomData` when creating a room.

---

## Backend Implementation (Node.js/Express)

### liveRooms.js
```js
const { addDoc, updateDoc, deleteDoc, collection, doc } = require("firebase/firestore");
const fetch = require("node-fetch"); // If using Node 18+, you can use global fetch
const db = require("../yourFirestoreInstance"); // Replace with your Firestore instance

// Create a live room and Discord VC
async function createLiveRoomWithDiscordVC(roomData) {
  // 1. Create the room in Firestore
  const docRef = await addDoc(collection(db, "liveRooms"), roomData);
  const roomId = docRef.id;

  // 2. Create the Discord VC using the roomId as sessionId
  const discordBotUrl = process.env.DISCORD_BOT_URL || "http://localhost:5000";
  const createVcRes = await fetch(`${discordBotUrl}/create-vc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: roomId })
  });
  const vcData = await createVcRes.json();

  // 3. Store the inviteLink in the room document
  if (vcData.inviteLink) {
    await updateDoc(docRef, { discordVcLink: vcData.inviteLink });
  }

  return { roomId, discordVcLink: vcData.inviteLink || null };
}

// Delete a live room and its Discord VC
async function deleteLiveRoomAndDiscordVC(roomId) {
  const discordBotUrl = process.env.DISCORD_BOT_URL || "http://localhost:5000";
  // 1. Delete the Discord VC
  await fetch(`${discordBotUrl}/delete-vc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: roomId })
  });
  // 2. Delete the Firestore room document
  await deleteDoc(doc(db, "liveRooms", roomId));
}

module.exports = {
  createLiveRoomWithDiscordVC,
  deleteLiveRoomAndDiscordVC
};
```

### liveRooms.routes.js
```js
const express = require("express");
const router = express.Router();
const { createLiveRoomWithDiscordVC, deleteLiveRoomAndDiscordVC } = require("./liveRooms");

// Create room endpoint
router.post("/api/live-rooms", async (req, res) => {
  try {
    const { roomData } = req.body;
    const result = await createLiveRoomWithDiscordVC(roomData);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete room endpoint
router.delete("/api/live-rooms/:roomId", async (req, res) => {
  try {
    await deleteLiveRoomAndDiscordVC(req.params.roomId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

### Usage in your main Express app
```js
const express = require("express");
const app = express();
const liveRoomsRouter = require("./api/liveRooms.routes");

app.use(express.json());
app.use(liveRoomsRouter);

app.listen(8080, () => {
  console.log("Server running on port 8080");
});
```
