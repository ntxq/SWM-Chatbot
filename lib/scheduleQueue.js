const scuduleCls = require("./schedule");
const { dbConnection } = require("./mysqlConnection");
const { getAlarmPeriod } = require("./utils");
const libKakaoWork = require("./kakaoWork");

class ScheduleQueue {
  // _queue: Array<Schedule>;
  constructor() {
    this._queue = [];
    this.push = this.push.bind(this);
    this.front = this.front.bind(this);
    this.pop = this.pop.bind(this);
    this.isempty = this.isempty.bind(this);
  }

  getSize() {
    return this._queue.length;
  }

  get(idx) {
    return this._queue[idx];
  }

  splice(item, idx) {
    this._queue.splice(item, idx);
  }

  push(schedule) {
    const idx = this._getIndex(schedule);
    this._queue.splice(idx, 0, schedule);
  }
  front() {
    if (this.isempty())
      return new scuduleCls.PersonalSchedule(new Date(9999, 11), 0);
    return this._queue[this._queue.length - 1];
  }
  pop() {
    this._queue.pop();
  }
  isempty() {
    return this._queue.length === 0;
  }
  _getIndex(schedule) {
    if (this.isempty()) return 0;
    return this._binSearch(0, this._queue.length, schedule);
  }
  _binSearch(start, end, value) {
    if (start === end) return start;
    const mid = Math.floor((start + end) / 2);
    if (this._compare(this._queue[mid], value)) {
      return this._binSearch(mid + 1, end, value);
    } else {
      return this._binSearch(start, mid, value);
    }
  }
  _compare(a, b) {
    return a.nextAlarmTime < b.nextAlarmTime;
  }
}

class ScheduleWaitingQueue extends ScheduleQueue {
  constructor() {
    super();
  }

  _compare(a, b) {
    return a.timeout >= b.timeout;
  }
}

class ScheduleManager {
  // _queue: ScheduleQueue;
  constructor() {
    this._queue = new ScheduleQueue();
    this._waitingQueue = new ScheduleWaitingQueue();
    this.pushPersonalSchedule = this.pushPersonalSchedule.bind(this);
    this.pushGroupSchedule = this.pushGroupSchedule.bind(this);
    this.startTimer = this.startTimer.bind(this);
    this.loadScheduleFromDB = this.loadScheduleFromDB.bind(this);
    this.loadScheduleFromDB();
  }

  loadScheduleFromDB() {
    dbConnection.query("pr_all_todo", [], (err, row) => {
      const result = row[row.length - 1][0]["@result"];
      if (result === 1) {
        const scheduleArray = row[0];
        const groupIDs = new Set();
        const deadline = new Date(new Date().getTime() + 1000 * 10 * 60);
        scheduleArray.map(async (data) => {
          try {
            const conversation = await libKakaoWork
              .openConversations({
                userId: data.usr_id,
              })
              .catch((err) => {
                throw `Invalid user_id ${data.usr_id}.`;
              });
            const conversationId = conversation.id;
            const alarmPeriod = getAlarmPeriod(data.nt_time, data.nt_it);
            if (data.ed_date < deadline) {
              return;
            }
            var schdule = null;
            if (data.public === 0) {
              schdule = new scuduleCls.PersonalSchedule(
                data.ed_date,
                conversationId,
                data.subject,
                alarmPeriod
              );
              schdule.ID = data.tdo_id;
              this._queue.push(schdule);
            } else {
              if (!groupIDs.has(data.tdo_id)) {
                schdule = new scuduleCls.GroupSchedule(
                  data.ed_date,
                  data.grp_id,
                  [conversationId],
                  data.subject,
                  alarmPeriod
                );
                schdule.ID = data.tdo_id;
                groupIDs.add(schdule.ID);
                this._queue.push(schdule);
              } else {
                for (let i = 0; i < this._queue.getSize(); i += 1) {
                  if (this._queue.get(i).ID === data.grp_id) {
                    schedule = this._queue.get(i);
                    break;
                  }
                }
                if (schedule)
                  schedule.memberConversationId.push(conversationId);
              }
            }
            if (schdule) {
              const prevAlarm =
                schdule.nextAlarmTime.getTime() - schdule.alarmPeriod;
              if (
                prevAlarm < new Date().getTime() &&
                prevAlarm > new Date().getTime() - 1000 * 10 * 60
              ) {
                this._waitingQueue.push(schedule);
              }
            }
          } catch (message) {
            console.error(message);
          }
        });
      }
    });
  }

  pushPersonalSchedule(data) {
    const schdule = new scuduleCls.PersonalSchedule(
      data.time,
      data.conversationId,
      data.content,
      data.alarmPeriod
    );
    this._queue.push(schdule);

    //add_new_todo.sql
    dbConnection.query(
      "pr_add_new_todo",
      [
        data.userId,
        data.name,
        false,
        null,
        data.content,
        [
          data.time.getFullYear(),
          data.time.getMonth() + 1,
          data.time.getDate(),
        ].join("-"),
        data.ntType,

        //DB 수정예정: nt_it_... => alarmPeriod
        data.alarmPeriod,
        data.time.getHours() + ":" + data.time.getMinutes(),
      ],
      (err, row, field) => {
        const result = row[row.length - 1][0]["@result"];
        if (result === 1) {
          const ID = row[0][0]["v_ism_tdo_id"];
          schdule.ID = ID;
        }
      }
    );
  }

  pushGroupSchedule(data) {
    const schdule = new scuduleCls.GroupSchedule(
      data.time,
      data.conversationId,
      data.memberConversationId,
      data.content,
      data.alarmPeriod
    );
    this._queue.push(schdule);

    //add_new_todo.sql
    dbConnection.query(
      "pr_add_new_todo",
      [
        data.userId,
        data.name,
        true,
        data.conversationId,
        data.content,
        [
          data.time.getFullYear(),
          data.time.getMonth() + 1,
          data.time.getDate(),
        ].join("-"),
        data.ntType,

        //DB 수정예정: nt_it_... => alarmPeriod
        data.alarmPeriod,
        data.time.getHours() + ":" + data.time.getMinutes(),
      ],
      (err, row, field) => {
        const result = row[row.length - 1][0]["@result"];
        if (result === 1) {
          const ID = row[0][0]["v_ism_tdo_id"];
          schdule.ID = ID;
        }
      }
    );
  }
  //별도 스레드로 관리한다.
  startTimer() {
    setTimeout(this._timer.bind(this), 0);
  }

  async _timer() {
    const timer = (ms) => new Promise((res) => setTimeout(res, ms));
    //무한 루프
    while (true) {
      await timer(10000);

      //알람 처리
      while (this._queue.front().nextAlarmTime <= new Date()) {
        const schedule = this._queue.front();
        this._queue.pop();
        //DB초기화
        dbConnection.query(
          "pr_reset_cur_amt",
          [schedule.ID],
          (err, rows, field) => {}
        );
        //남은 시간 전송
        schedule.sendProgressMessage();
        if (schedule.setNextPeriod()) {
          this._queue.push(schedule);
        }
        //응답 대기 큐에 추가
        this._waitingQueue.push(schedule);
      }
      //10분 시간 지나면 실패 처리
      while (this._waitingQueue.front().timeout <= new Date()) {
        const schedule = this._waitingQueue.front();
        this._waitingQueue.pop();
        schedule.setPeriodAchieve(false, null, true);
      }
    }
  }

  setPeriodAchieve(userId, conversationId, todoId, isAchieve) {
    var schedule = null;
    var idx = null;
    for (var i = 0; i < this._waitingQueue.getSize(); i += 1) {
      if (this._waitingQueue.get(i).ID === todoId) {
        schedule = this._waitingQueue.get(i);
        idx = i;
        break;
      }
    }

    if (!schedule) return;

    //성공/실패 처리
    dbConnection.query(
      "pr_complete_todo",
      [userId, todoId],
      (err, rows, field) => {}
    );

    schedule.setPeriodAchieve(isAchieve, conversationId);
    //조건 만족하면 큐에서 비우기
    if (schedule.isPeriodicAnswerComplete()) {
      this._waitingQueue.splice(idx, 1);

      schedule.processAfterPeriodicAnswer();
    }
  }

  async groupMemberInsert(groupId, conversationId, userId, name) {
    let schedule = null;
    for (let i = 0; i < this._queue.getSize(); i += 1) {
      if (this._queue.get(i).ID === groupId) {
        schedule = this._queue.get(i);
        break;
      }
    }

    //Check if the given id is group schedule
    if (!schedule instanceof scuduleCls.GroupSchedule) return;

    schedule.memberConversationId.push(conversationId);
    await schedule.inviteNewMember(userId, name);

    //pr_add_existing_public_todo.sql
    dbConnection.query("pr_add_existing_public_todo", [userId, name, groupId]);
  }
}
exports.scheduleManager = new ScheduleManager();
