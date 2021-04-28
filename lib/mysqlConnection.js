// import mysql, { Connection } from 'mysql';
// import { dbConnection } from '../config/secret'
const mysql = require("mysql");

class mysqlConnection {
  // connection:mysql.Pool;
  constructor(table) {
    this._connection = this._connect(table);
  }

  _connect(table) {
    const connection = mysql.createPool({
      //todo NorangBerry 임시 숫자
      connectionLimit: 50,
      host: "localhost",
      user: "root",
      password: "root",
      port: 99999,
      database: "chatbot",
      multipleStatements: true,
      charset: "utf8_general_ci",
    });
    connection.on("error", (err) => {
      console.log("db error", err);
      if (err.code === "PROTOCOL_CONNECTION_LOST") {
        return this._connect(table);
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
    const question_marks = question_marks_arr.join(",");
    return `SET @result=0; CALL ${procedure}(${question_marks}); SELECT @result;`;
  }
  query(procedure, params, callback) {
    const queryString = _getQueryString(procedure, params);
    this._connection.getConnection((err, conn) => {
      if (!err) {
        conn.query(queryString, params, (err, rows, fields) => {
          callback(err, rows, fields);
        });
      }
      conn.release();
    });
  }
  //todo NorangBerry check: is it fragile??
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
