Page({
  data: {
    userInfo: null,
    hasLogin: false,
    isLoading: false,
    checkinDays: [],
    completedDays: 0,
    currentDay: 1,
    period: 7
  },

  onLoad: function (options) {
    const period = getApp().globalData.period || 7;
    this.setData({ period });
    this.initCheckinDays();
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
    this.setData({ checkinDays });
  },

  loadCheckinProgress: function() {
    wx.cloud.callFunction({
      name: 'cloudUserInfo',
      data: {
        type: 'getCheckinProgress',
        openid: getApp().globalData.openid,
        period: getApp().globalData.period || 7
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
          completedDays,
          currentDay
        });
      }
    }).catch(err => {
      console.error('获取打卡进度失败:', err);
    });
  },

  goToForm: function() {
    // wx.cloud.callFunction({
    //   name: 'cloudUserInfo',
    //   data: {
    //     type: 'userInfo'
    //   }
    // }).then(res => {
    //   console.log(1, res)
    // })

    wx.login({
      success: (res) => {
        wx.showToast({
          // title: res.code,
          title: "模拟登录成功"
        });
        setTimeout(()=> {
      wx.navigateTo({
        url: `/pages/usage-form/index?day=${this.data.currentDay}`
      });
        }, 2000)
      }
    })

    // if (!this.data.hasLogin) {
      // this.login();
    // } else {
    //   wx.navigateTo({
    //     url: `/pages/usage-form/index?day=${this.data.currentDay}`
    //   });
    // }
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