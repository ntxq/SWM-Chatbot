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
      data.memberConversationId,
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
    //무한 루프
    while (true) {
      await timer(10000);

      //알람 처리
      while (this._queue.front().nextAlarmTime <= new Date()) {
        const schedule = this._queue.front();
        this._queue.pop();
        //남은 시간 전송
        schedule.sendProgressMessage();
        if (schedule.setNextPeriod()) {
          this._queue.push(schedule);
        }
        //응답 대기 큐에 추가
        this._waitingQueue.push(schedule);
      }
      //10분 시간 지나면 실패 처리
      while (this._queue.front().timeout <= new Date()) {
        const schedule = this._queue.front();
        this._queue.pop();
        schedule.setPeriodAchieve(false, null, true);
      }
    }
  }

  setPeriodAchieve(conversationId, id, isAchieve) {
    var schedule = null;
    var idx = null;
    for (var i = 0; i < this._waitingQueue.getSize(); i += 1) {
      if (this._waitingQueue.get(i).ID === id) {
        schedule = this._waitingQueue.get(i);
        idx = i;
        break;
      }
    }

    if (!schedule) return;

    //성공/실패 처리
    schedule.setPeriodAchieve(isAchieve, conversationId);
    //조건 만족하면 큐에서 비우기
    if (schedule.isPeriodicAnswerComplete()) {
      this._waitingQueue.splice(idx, 1);
    }
  }
}
exports.scheduleManager = new ScheduleManager();
