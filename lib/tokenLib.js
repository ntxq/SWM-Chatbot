const jwt = require("jsonwebtoken");

exports.genToken = (data, cb) => {
  jwt.sign({ data }, process.env.SECRET, { expiresIn: "1h" }, cb);
};

exports.verifyToken = (token, cb) => {
  jwt.verify(token, process.env.SECRET, cb);
};
