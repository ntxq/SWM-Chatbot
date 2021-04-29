const mysql = require("mysql");
const dbConfig = require("../sql/db_config.json");

class mysqlConnection {
  // connection:mysql.Pool;
  constructor() {
    this._connection = this._connect();
  }

  _connect() {
    const connection = mysql.createPool(dbConfig);
    connection.on("error", (err) => {
      console.log("db error", err);
      if (err.code === "PROTOCOL_CONNECTION_LOST") {
        return this._connect();
      } else {
        throw err;
      }
    });
    return connection;
  }

  destroy() {
    this._connection.end();
  }

  _getQueryString(procedure, params) {
    const question_marks_arr = Array(params.length).fill("?");
    let question_marks = question_marks_arr.join(",");
    if (params.length !== 0) question_marks = question_marks.concat(",");
    return `SET @result=0; CALL ${procedure}(${question_marks} @result); SELECT @result;`;
  }

  _removeOkPackets(rows) {
    const ret = [];
    for (const [key, row] of Object.entries(rows)) {
      if (row.length) {
        ret.push(row);
      }
    }
    return ret;
  }

  query(procedure, params, callback = () => {}) {
    const queryString = this._getQueryString(procedure, params);
    this._connection.getConnection((err, conn) => {
      if (!err) {
        conn.query(queryString, params, (err, rows, fields) => {
          callback(err, this._removeOkPackets(rows), fields);
        });
      }
      conn.release();
    });
  }

  queryMultiple(procedureArr, paramsArr, callback) {
    this._connection.getConnection((err, conn) => {
      conn.beginTransaction(() => {
        for (var i = 0; i < procedureArr.length; i++) {
          const procedure = procedureArr[i];
          const params = paramsArr[i];
          const queryString = _getQueryString(procedure, params[i]);
          try {
            conn.query(queryString, params, function (err, rows, fields) {
              //todo All
            });
          } catch (error) {
            console.error(error);
            conn.rollback();
            conn.release();
            return;
          }
        }
        conn.commit();
        conn.release();
        callback();
      });
    });
  }
}

exports.dbConnection = new mysqlConnection();
