import express from "express";

const app = express();

const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("Aerovault backend running");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
