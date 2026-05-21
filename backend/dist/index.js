import "dotenv/config";
import express from "express";
import { db } from "./db/index.js";
import { users } from "./db/schema.js";
const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
app.get("/", (req, res) => {
    res.send("Hello World! Express + Drizzle backend is running.");
});
// Example route using Drizzle
app.get("/users", async (req, res) => {
    try {
        const allUsers = await db.select().from(users);
        res.json(allUsers);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
//# sourceMappingURL=index.js.map