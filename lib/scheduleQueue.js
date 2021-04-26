const scuduleCls = require("./schedule");

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
    return a.nextAlarmTime >= b.nextAlarmTime;
  }
}

class ScheduleManager {
  // _queue: ScheduleQueue;
  constructor() {
    this._queue = new ScheduleQueue();
    this.pushPersonalSchedule = this.pushPersonalSchedule.bind(this);
    this.startTimer = this.startTimer.bind(this);
    this.loadScheduleFromDB = this.loadScheduleFromDB.bind(this);
  }

  loadScheduleFromDB() {}

  pushPersonalSchedule(data) {
    const schdule = new scuduleCls.PersonalSchedule(
      data.time,
      data.conversationId,
      data.content,
      data.alarmPeriod
    );
    this._queue.push(schdule);
  }

  pushGroupSchedule(data) {
    const schdule = new scuduleCls.GroupSchedule(
      data.time,
      data.conversationId,
      data.groupConversationId,
      data.content,
      data.alarmPeriod
    );
    this._queue.push(schdule);
  }
  //별도 스레드로 관리한다.
  startTimer() {
    setTimeout(this._timer.bind(this), 0);
  }

  async _timer() {
    const timer = (ms) => new Promise((res) => setTimeout(res, ms));
    while (true) {
      await timer(30000);
      //무한 루프
      while (this._queue.front().nextAlarmTime <= new Date()) {
        const schedule = this._queue.front();
        this._queue.pop();
        //남은 시간 전송
        schedule.sendMessage();
        if (schedule.setNextPeriod()) {
          this._queue.push(schedule);
        }
      }
    }
  }
}
exports.scheduleManager = new ScheduleManager();
