Page({
  data: {
    userInfo: null,
    hasLogin: false,
    isLoading: false,
    checkinDays: [],
    checkinWeeks: [],
    completedDays: 0,
    currentDay: 1,
    period: 21
  },

  onLoad: function (options) {
    const period = getApp().globalData.period || 21;
    this.setData({ period });
    this.initCheckinDays();
    this.loadSurveyConfig();
  },

  loadSurveyConfig: function() {
    wx.cloud.callFunction({
      name: 'cloudUserInfo',
      data: {
        type: 'getSurveyConfig'
      }
    }).then(res => {
      if (res.result && res.result.data && res.result.data.period) {
        const period = res.result.data.period;
        getApp().globalData.period = period;
        this.setData({ period }, () => {
          this.initCheckinDays();
          if (getApp().globalData.openid) {
            this.loadCheckinProgress();
          }
        });
      }
    }).catch(err => {
      console.error('获取问卷配置失败:', err);
    });
  },

  onShow: function() {
    if (this.data.hasLogin) {
      this.loadCheckinProgress();
    }
  },

  initCheckinDays: function() {
    const checkinDays = [];
    const period = this.data.period;
    for (let i = 1; i <= period; i++) {
      checkinDays.push({
        day: i,
        completed: false,
        current: i === 1
      });
    }
    this.setData({
      checkinDays,
      checkinWeeks: this.groupCheckinWeeks(checkinDays)
    });
  },

  groupCheckinWeeks: function(checkinDays) {
    const weeks = [];
    for (let i = 0; i < checkinDays.length; i += 7) {
      weeks.push({
        week: Math.floor(i / 7) + 1,
        days: checkinDays.slice(i, i + 7)
      });
    }
    return weeks;
  },

  loadCheckinProgress: function() {
    return wx.cloud.callFunction({
      name: 'cloudUserInfo',
      data: {
        type: 'getCheckinProgress',
        openid: getApp().globalData.openid,
        period: getApp().globalData.period || 21
      }
    }).then(res => {
      if (res.result && res.result.success) {
        const { records, currentDay } = res.result.data;
        const checkinDays = this.data.checkinDays.map(item => {
          return {
            ...item,
            completed: records.some(r => r.day === item.day),
            current: item.day === currentDay
          };
        });
        const completedDays = checkinDays.filter(item => item.completed).length;
        this.setData({
          checkinDays,
          checkinWeeks: this.groupCheckinWeeks(checkinDays),
          completedDays,
          currentDay
        });
      }
    }).catch(err => {
      console.error('获取打卡进度失败:', err);
    });
  },

  goToForm: function() {
    const app = getApp();
    if (app.globalData.openid) {
      this.loadCheckinProgress().then(() => {
        wx.navigateTo({
          url: `/pages/usage-form/index?day=${this.data.currentDay}`
        });
      });
      return;
    }

    this.setData({ isLoading: true });
    wx.cloud.callFunction({
      name: 'cloudUserInfo',
      data: {
        type: 'getOpenId'
      }
    }).then(res => {
      if (res.result && res.result.openid) {
        app.globalData.openid = res.result.openid;
        this.setData({
          hasLogin: true,
          isLoading: false
        });
        this.loadCheckinProgress().then(() => {
          wx.navigateTo({
            url: `/pages/usage-form/index?day=${this.data.currentDay}`
          });
        });
      } else {
        throw new Error('未获取到 openid');
      }
    }).catch(err => {
      console.error('获取 openid 失败:', err);
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
      this.setData({ isLoading: false });
    });
  },

  login: function() {
    // if (this.data.isLoading) {
    //   return;
    // }

    // this.setData({ isLoading: true });

    wx.getUserProfile({
      desc: '用于完善用户信息',
      success: (res) => {
        this.setData({
          userInfo: res.userInfo
        });

        this.getOpenId();
      },
      fail: (err) => {
        wx.showToast({
          title: '需要授权才能继续',
          icon: 'none'
        });
        this.setData({ isLoading: false });
      }
    });
  },

  getOpenId: function() {
    wx.cloud.callFunction({
      name: 'cloudUserInfo',
      data: {
        type: 'getOpenId'
      }
    }).then(res => {
      if (res.result && res.result.openid) {
        const app = getApp();
        app.globalData.userInfo = this.data.userInfo;
        app.globalData.openid = res.result.openid;
        
        this.setData({
          hasLogin: true,
          isLoading: false
        });

        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });

        this.loadCheckinProgress();
      }
    }).catch(err => {
      console.error('获取 openid 失败:', err);
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
      this.setData({ isLoading: false });
    });
  },

  goToHistory: function() {
    wx.navigateTo({
      url: '/pages/history/index'
    });
  }
});