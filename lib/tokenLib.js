const jwt = require("jsonwebtoken");

exports.genToken = (data, cb) => {
  jwt.sign({ data }, process.env.SECRET, { expiresIn: "1h" }, (err, token) => {
    if (err) return cb(err);
    cb(null, token);
  });
};

exports.verifyToken = (token, cb) => {
  jwt.verify(token, process.env.SECRET, (err, decoded) => {
    if (err) return cb(err);
    cb(null, decoded);
  });
};
