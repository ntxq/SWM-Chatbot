const express = require("express");
const router = require("./routes");
require("dotenv").config();

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(express.static("public"));

app.use("/", router);

app.use(function (req, res, next) {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});

app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.json({ err });
});

const PORT = process.env.PORT || 3000;

app.listen(process.env.PORT || 3000, () =>
  console.log("Example app listening on port 3000!")
);

module.exports = app;
