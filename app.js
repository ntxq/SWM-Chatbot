const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const router = require("./routes");
const api = require("./routes/API");
require("dotenv").config();

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(cors());

app.use(express.static("public"));

app.use("/", router);
app.use("/", api);

app.use(function (req, res, next) {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});

app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.json({ err });
});

const PORT = 443;

app.listen(443, () => console.log("Example app listening on port 443!"));

module.exports = app;
