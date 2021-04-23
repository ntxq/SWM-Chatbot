const libKakaoWork = require("../lib/kakaoWork");
const initialMessage = require("../messages/initialMessage.json");

class Schedule {
  // deadline:Date;
  // nextAlarmTime:Date;
  // alarmPeriod:number; //in minute
  // conversationId:number; //in minute
  constructor(_deadline, _conversationId) {
    this.deadline = _deadline;
    this.nextAlarmTime = _deadline;
    this.conversationId = _conversationId;
  }
}
class ScheduleQueue {
  // _queue: Array<Schedule>;
  constructor() {
    this._queue = [];
    this.push = this.push.bind(this);
    this.front = this.front.bind(this);
    this.pop = this.pop.bind(this);
    this.isempty = this.isempty.bind(this);
  }
  push(schedule) {
    const idx = this._getIndex(schedule);
    this._queue.splice(idx, 0, schedule);
  }
  front() {
    if (this.isempty()) return new Schedule(new Date(9999, 11), 0);
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
    return a.nextAlarmTime >= b.nextAlarmTime;
  }
}

class ScheduleManager {
  // _queue: ScheduleQueue;
  constructor() {
    this._queue = new ScheduleQueue();
    this.pushSchedule = this.pushSchedule.bind(this);
    this.startTimer = this.startTimer.bind(this);
    this.loadScheduleFromDB = this.loadScheduleFromDB.bind(this);
  }

  loadScheduleFromDB() {}

  pushSchedule(data) {
    const schdule = new Schedule(data.time, data.conversationId);
    this._queue.push(schdule);
  }

  startTimer() {
    setTimeout(this._timer.bind(this), 0);
  }

  async _timer() {
    const timer = (ms) => new Promise((res) => setTimeout(res, ms));
    while (true) {
      await timer(30000);
      while (this._queue.front().nextAlarmTime <= new Date()) {
        const schedule = this._queue.front();
        this._queue.pop();
        libKakaoWork.sendMessage({
          conversationId: schedule.conversationId,
          ...initialMessage,
        });
      }
    }
  }
}
exports.scheduleManager = new ScheduleManager();
